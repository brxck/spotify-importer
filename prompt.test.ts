import { assertEquals } from "https://deno.land/std@0.107.0/testing/asserts.ts";
import { possibleMatchPrompt } from "./prompt.ts";

const matchesFixture = JSON.parse(
  Deno.readTextFileSync("./fixtures/matches.json")
);

Deno.test("hello world #1", () => {
  possibleMatchPrompt(matchesFixture);
});
