import { createHash } from "https://deno.land/std@0.107.0/hash/mod.ts";
import { openBrowser } from "./util.ts";

const PORT = 4242;
const CLIENT_ID = "c2c4830c1bd64f0a9cb932091a365d0c";
const SCOPES = "user-library-modify user-read-private";

interface Pkce {
  codeVerifier: string;
  codeChallenge: string;
}

function generatePkce(): Pkce {
  const hash = createHash("sha256");
  const codeVerifier = crypto.randomUUID() + crypto.randomUUID();
  hash.update(codeVerifier);
  const codeChallenge = hash
    .toString("base64")
    // for base64url
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return { codeVerifier, codeChallenge };
}

function getAuthUri(codeChallenge: string) {
  const queryString = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: "code",
    redirect_uri: `http://localhost:${PORT}/oauth2/callback`,
    code_challenge_method: "S256",
    code_challenge: codeChallenge,
    scope: SCOPES,
  });

  return `https://accounts.spotify.com/authorize?${queryString}`;
}

async function getAccessToken(
  server: Deno.Listener,
  authUri: string,
  codeVerifier: string
) {
  console.log(`Please open http://localhost:${PORT}/login`);
  let accessToken: string | null = null;

  serverLoop: for await (const conn of server) {
    const httpConn = Deno.serveHttp(conn);
    for await (const event of httpConn) {
      const path = new URL(event.request.url).pathname;
      switch (path) {
        // 1. User visits this url and is redirected to Spotify auth
        case "/login":
          event.respondWith(
            new Response("", {
              status: 302,
              headers: new Headers({
                Location: authUri,
              }),
            })
          );
          break;
        // 2. User confirms auth and is redirected here with auth code in querystring
        case "/oauth2/callback": {
          event.respondWith(
            new Response("Success!", {
              status: 200,
            })
          );
          // 3. We request to exchange the code for an access token
          accessToken = await exchangeToken(event, codeVerifier);
          break serverLoop;
        }

        default:
          event.respondWith(
            new Response("", {
              status: 404,
            })
          );
      }
    }
  }

  if (!accessToken) throw new Error("Couldn't get access token.");
  return accessToken;
}

async function exchangeToken(event: Deno.RequestEvent, codeVerifier: string) {
  const url = new URL(`http://localhost${event.request.url}`);
  const authCode = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  if (!authCode || error) {
    throw new Error(`Spotify redirected without token: ${error}`);
  }

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: "authorization_code",
      code: authCode,
      redirect_uri: `http://localhost:${PORT}/oauth2/callback`,
      code_verifier: codeVerifier,
    }),
    headers: new Headers({
      "Content-Type": "application/x-www-form-urlencoded",
    }),
  });
  const body = await response.json();
  return body.access_token as string;
}

export async function auth() {
  const pkce = generatePkce();
  const authUri = getAuthUri(pkce.codeChallenge);
  const server = Deno.listen({ port: PORT });
  // openBrowser(`http://localhost:${PORT}`);
  const token = await getAccessToken(server, authUri, pkce.codeVerifier);
  console.debug("Access token retrieved.", token);
  return token;
}
