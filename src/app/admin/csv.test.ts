import { describe, expect, it } from "vitest";
import { parseSuggestionsCsv } from "./csv";

const rows = Array.from({ length: 3 }, (_, index) => `Namn ${index + 1},Motivation ${index + 1}`).join("\n");

describe("parseSuggestionsCsv", () => {
  it("preserves quoted commas, quotes, Swedish characters, and line breaks", () => {
    const csv = `suggestion,motivation\n"Kör, ""Stjärnor""","Å, ä och\nen ny rad"\n${rows.split("\n").slice(1).join("\n")}`;
    expect(parseSuggestionsCsv(csv)[0]).toEqual({ suggestion: 'Kör, "Stjärnor"', motivation: "Å, ä och\nen ny rad" });
  });

  it("accepts any positive number of rows and explains other errors", () => {
    expect(() => parseSuggestionsCsv(`name,motivation\n${rows}`)).toThrow("rubrikerna");
    expect(parseSuggestionsCsv("suggestion,motivation\nNamn,Varför")).toHaveLength(1);
    expect(() => parseSuggestionsCsv("suggestion,motivation\n")).toThrow("minst en");
    expect(() => parseSuggestionsCsv(`suggestion,motivation\n,Varför\n${rows.split("\n").slice(1).join("\n")}`)).toThrow("saknar");
    expect(() => parseSuggestionsCsv(`suggestion,motivation\n"Oavslutad\n${rows}`)).toThrow("oavslutat");
  });
});
