import { SpotifyApi } from "./types/spotify.ts";

class Spotify {
  baseUrl = `https://api.spotify.com/v1`;
  token = "";

  init(token: string) {
    this.token = token;
  }

  async request(
    path: string,
    params?: Record<string, any>,
    init?: RequestInit
  ): Promise<Response> {
    const queryString = params ? new URLSearchParams(params) : "";
    const response = await fetch(
      `https://api.spotify.com/v1${path}?${queryString}`,
      {
        headers: new Headers({ Authorization: `Bearer ${this.token}` }),
        ...init,
      }
    );

    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get("Retry-After") ?? "100");
      console.log(`Retrying after ${retryAfter}ms`);
      await new Promise((resolve) => setTimeout(resolve, retryAfter));
      return this.request(path, params, init);
    } else if (!response.ok) {
      console.error(
        "Spotify fetch error:",
        response.status,
        response.statusText
      );
    }

    return response;
  }

  search(type: string, query: string | Record<string, any>) {
    let queryString: string;
    if (typeof query === "string") {
      queryString = query;
    } else {
      queryString = Object.entries(query)
        .map((x) => `${x[0]}:${x[1]}`)
        .join(" ");
    }

    const params: SpotifyApi.SearchForItemParameterObject = {
      type,
      q: queryString,
      market: "from_token",
    };

    return this.request("/search", params);
  }
}

export const spotify = new Spotify();
