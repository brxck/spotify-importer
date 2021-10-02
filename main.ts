import { auth } from "./auth.ts";
import { spotify } from "./spotify.ts";
import { definiteMatchPrompt } from "./prompt.ts";
import {
  searchTypes,
  SearchType,
  SearchTarget,
  Matches,
  SearchResult,
  PossibleMatch,
} from "./types/index.ts";

async function findSpotifyMatches(
  type: SearchType,
  targets: SearchTarget[]
): Promise<Matches> {
  const unmatched: SearchTarget[] = [];
  const definite: SearchResult[] = [];
  const possible: PossibleMatch[] = [];

  for (const target of targets) {
    const response = await spotify.search(type, target);
    const body: SpotifyApi.SearchResponse = await response.json();
    const resultsKey = (type + "s") as keyof SpotifyApi.SearchResponse;
    const results = body[resultsKey]?.items as SearchResult[];

    if (!results?.length) {
      unmatched.push(target);
      console.log("No match", JSON.stringify(target));
    } else if (results.length === 1) {
      definite.push(results[0]);
      console.log("Definite match", JSON.stringify(target));
    } else {
      possible.push({ target, matches: results });
      console.log("Possible match", JSON.stringify(target));
    }
  }

  return { unmatched, definite, possible };
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

  let matches;
  if (searchType === "matches") {
    console.log("Loading matches json");
    matches = JSON.parse(Deno.readTextFileSync(csvPath));
  } else if (!csvPath) {
    throw new Error("CSV path required");
  } else if (!searchTypes.find((validType) => validType === searchType)) {
    throw new Error(`type must be one of ${searchTypes}`);
  }

  const csv = Deno.readTextFileSync(csvPath).split("\n");
  const targets = parseCsv(csv);

  const token = await auth();
  spotify.init(token);

  if (!matches)
    matches = await findSpotifyMatches(searchType as SearchType, targets);
  definiteMatchPrompt(matches);
}

await main();
