import { auth } from "./auth.ts";

const TOKEN = await auth();
await main();

function spotify(
  path: string,
  params?: Record<string, string>,
  init?: RequestInit
) {
  const queryString = params ? new URLSearchParams(params) : "";
  console.log(TOKEN);
  return fetch(`https://api.spotify.com/v1${path}?${queryString}`, {
    headers: new Headers({ Authorization: `Bearer ${TOKEN}` }),
    ...init,
  });
}

async function main() {
  const test = await spotify("/search", {
    q: "Magnolia Electric Co",
    type: "album",
    market: "from_token",
  });
  console.log(await test.json());
}
