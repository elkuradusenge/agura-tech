import { describe, expect, it } from "vitest";
import { DICTIONARIES, interpolate, translate } from "../lib/i18n";

describe("interpolate", () => {
  it("replaces every occurrence of a variable", () => {
    expect(interpolate("{name} and {name}", { name: "Uwase" })).toBe("Uwase and Uwase");
  });

  it("leaves an unknown placeholder untouched", () => {
    expect(interpolate("{a} {b}", { a: "1" })).toBe("1 {b}");
  });

  it("returns the template when there are no params", () => {
    expect(interpolate("plain text")).toBe("plain text");
  });
});

describe("translate", () => {
  it("reads the chosen language", () => {
    expect(translate(DICTIONARIES, "en", "app.name")).toBe(DICTIONARIES.en["app.name"]);
  });

  it("falls back to English when a key is missing in Kinyarwanda", () => {
    const partial = { rw: {}, en: { greeting: "Hello" }, fr: {} } as unknown as typeof DICTIONARIES;
    expect(translate(partial, "rw", "greeting")).toBe("Hello");
  });

  it("returns the key itself when nothing matches, never an empty string", () => {
    expect(translate(DICTIONARIES, "en", "totally.missing.key")).toBe("totally.missing.key");
  });
});

describe("dictionaries", () => {
  it("define the same keys in all three languages", () => {
    const en = Object.keys(DICTIONARIES.en).sort();
    expect(Object.keys(DICTIONARIES.rw).sort()).toEqual(en);
    expect(Object.keys(DICTIONARIES.fr).sort()).toEqual(en);
  });

  it("contain no em dash, which the house style bans", () => {
    for (const dictionary of Object.values(DICTIONARIES)) {
      for (const value of Object.values(dictionary)) {
        expect(value).not.toContain("\u2014");
      }
    }
  });
});
