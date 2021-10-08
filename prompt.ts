import { Matches } from "./types/index.ts";
import { spotify } from "./spotify.ts";

type Action = {
  id: string;
  text: string;
  [key: string]: unknown;
};

function formatRecord(record: any) {
  const keys = ["name", "artists", "album", "release_date"];
  return Object.entries(record)
    .filter(([key]) => keys.includes(key))
    .map(([key, value], i) => {
      return key === "artists"
        ? (value as SpotifyApi.ArtistObjectFull[]).map((a) => a.name).join(", ")
        : value;
    })
    .join("\n     ");
}

export function promptActions(options: {
  before?: string;
  after?: string;
  actions: Readonly<Action[]>;
  /** Index of default action */
  defaultValue?: number;
  color?: boolean;
  space?: boolean;
}): Action | null {
  const { before = "", after = "", actions, defaultValue } = options;
  console.log(before + "\n");
  actions.forEach((action, i) => {
    console.log(`  ${i}) ${action.text}`);
    if (options.space) console.log("");
  });
  console.log("\n" + after);

  const result = prompt("> ") ?? defaultValue ?? null;
  if (!result) return null;

  const index = parseInt(String(result));
  if (isNaN(index) || !actions[index]) {
    promptActions({ ...options, before: "Invalid input. Please retry:" });
  }

  return actions[index];
}

export async function definiteMatchPrompt(matches: Matches) {
  const { unmatched, definite, possible } = matches;
  if (definite.length) {
    const actions = [
      { id: "playlist", text: "Add to playlist" },
      { id: "library", text: "Save to library" },
      { id: "json", text: "Save as json file" },
      { id: "skip", text: "Skip" },
    ];
    const action = promptActions({
      actions,
      before: `${definite.length} definite matches found.`,
    });
    switch (action?.id) {
      case "playlist":
        console.log("todo");
        break;
      case "library":
        await spotify.saveAlbums(definite.map((x) => x.id));
        console.log(definite.length, "albums saved.");
        break;
      case "json":
        Deno.writeTextFile("matches.json", JSON.stringify(matches, null, 2));
        break;
      case "skip":
      default:
        break;
    }
  }
}

export function possibleMatchPrompt(matches: Matches) {
  const { unmatched, definite, possible } = matches;
  const save = [];
  console.log(`${possible.length} possible matches.`);
  possible.forEach((item) => {
    const matchActions = item.matches.map((match) => ({
      id: match.uri,
      text: formatRecord(match),
      match,
    }));
    const action = promptActions({
      actions: [...matchActions, { id: "skip", text: "Skip (enter)" }],
      before: formatRecord(item.target),
      after: "Select the correct match.",
      space: true,
    });
    if (action?.id) save.push(action.match);
  });
}
