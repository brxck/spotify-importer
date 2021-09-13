import { auth } from "./auth.ts";
import { spotify } from "./spotify.ts";
import "./types/spotify.ts";

const searchTypes = ["album", "artist", "track"] as const;
type SearchType = typeof searchTypes[number];

type SearchTarget = Record<string, string>;

type SearchResult =
  | SpotifyApi.AlbumObjectSimplified
  | SpotifyApi.ArtistObjectFull
  | SpotifyApi.TrackObjectFull
  | SpotifyApi.PlaylistObjectSimplified
  | SpotifyApi.ShowObjectSimplified
  | SpotifyApi.EpisodeObjectSimplified;

type PossibleMatch = {
  target: SearchTarget;
  matches: SearchResult[];
};

async function findSpotifyMatches(type: SearchType, targets: SearchTarget[]) {
  const unmatched: SearchTarget[] = [];
  const definiteMatches: SearchResult[] = [];
  const possibleMatches: PossibleMatch[] = [];

  for (const target of targets) {
    const response = await spotify.search(type, target);
    const body: SpotifyApi.SearchResponse = await response.json();
    const resultsKey = (type + "s") as keyof SpotifyApi.SearchResponse;
    const results = body[resultsKey]?.items;

    if (!results?.length) {
      unmatched.push(target);
      console.log("No match", JSON.stringify(target));
    } else if (results.length === 1) {
      definiteMatches.push(results[0]);
      console.log("Definite match", JSON.stringify(target));
    } else {
      possibleMatches.push({ target, matches: results });
      console.log("Possible match", JSON.stringify(target));
    }
  }

  return { unmatched, definiteMatches, possibleMatches };
}

function parseCsv(lines: string[]) {
  const headers = lines.shift()?.split("|");
  const targets: SearchTarget[] = [];
  lines.forEach((line, index) => {
    const values = line.split("|");
    if (!line || !values.length) return;

    if (values.length !== headers?.length) {
      console.error("Headers: ", headers, "Values:", values);
      const message = `Line ${index}: Header/value mismatch. Found ${headers?.length} headers but ${values.length} values.`;
      throw new Error(message);
    }

    const target: SearchTarget = {};
    for (let i = 0; i < headers.length; i++) {
      target[headers[i]] = values[i];
    }
    targets.push(target);
  });
  return targets;
}

async function main() {
  const [searchType, csvPath, ..._] = Deno.args;

  if (!csvPath) {
    throw new Error("CSV path required");
  } else if (!searchTypes.find((validType) => validType === searchType)) {
    throw new Error(`type must be one of ${searchTypes}`);
  }

  const csv = Deno.readTextFileSync(csvPath).split("\n");
  const targets = parseCsv(csv);

  const token = await auth();
  spotify.init(token);

  const results = await findSpotifyMatches(searchType as SearchType, targets);
  Deno.writeTextFile("results.json", JSON.stringify(results, null, 2));
}

await main();
