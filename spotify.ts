import { SpotifyApi } from "./types/spotify.ts";
interface RequestOptions extends RequestInit {
  params?: Record<string, any>;
}

class Spotify {
  baseUrl = `https://api.spotify.com/v1`;
  token = "";

  init(token: string) {
    this.token = token;
  }

  async request(path: string, options: RequestOptions): Promise<Response> {
    const { method, params, ...init } = options;
    let uri = `https://api.spotify.com/v1${path}`;

    const req: RequestInit = {
      headers: new Headers({
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "application/json",
      }),
      method,
      ...init,
    };

    if (method === "GET" || !method) {
      uri += `?` + new URLSearchParams(params).toString();
    } else if (params) {
      req.body = JSON.stringify(params);
    }

    const response = await fetch(uri, req);

    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get("Retry-After") ?? "100");
      console.log(`Retrying after ${retryAfter}ms`);
      await new Promise((resolve) => setTimeout(resolve, retryAfter));
      return this.request(path, { method, params, ...init });
    } else if (!response.ok) {
      console.error(
        "Spotify fetch error:",
        response.status,
        response.statusText,
        await response.json()
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

    return this.request("/search", { params });
  }

  async saveAlbums(
    ids: string[]
  ): Promise<SpotifyApi.SaveAlbumsForUserResponse[]> {
    const chunkSize = 40;
    const responses = [];
    for (let i = 0; i < ids.length; i += chunkSize) {
      const idChunk = ids.slice(i, i + chunkSize);
      const res = await this.request("/me/albums", {
        method: "PUT",
        params: { ids: idChunk },
      });
      responses.push(res);
    }
    return responses;
  }
}

export const spotify = new Spotify();
