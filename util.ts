export function openBrowser(url: string) {
  const programAliases = {
    windows: "explorer",
    darwin: "open",
    linux: "sensible-browser",
  };
  return Deno.run({ cmd: [programAliases[Deno.build.os], url] });
}
