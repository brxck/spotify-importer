const data = [["artist", "album"]];

for await (const artistEntry of Deno.readDir(Deno.args[0])) {
  if (!artistEntry.isDirectory) continue;
  for await (const albumEntry of Deno.readDir(
    `${Deno.args[0]}/${artistEntry.name}`
  )) {
    if (!albumEntry.isDirectory) continue;
    data.push([artistEntry.name, albumEntry.name]);
  }
}

const csv = data.map((row) => row.join("|")).join("\n");
await Deno.writeTextFile("out.csv", csv);
