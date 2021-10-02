import "./spotify.ts";

export const searchTypes = ["album", "artist", "track"] as const;
export type SearchType = typeof searchTypes[number];

export type SearchTarget = Record<string, string>;

export type SearchResult =
  | SpotifyApi.AlbumObjectSimplified
  | SpotifyApi.ArtistObjectFull
  | SpotifyApi.TrackObjectFull;

export type PossibleMatch = {
  target: SearchTarget;
  matches: SearchResult[];
};

export type Matches = {
  unmatched: SearchTarget[];
  definite: SearchResult[];
  possible: PossibleMatch[];
};
