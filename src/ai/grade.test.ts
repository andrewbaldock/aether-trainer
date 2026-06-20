import { describe, it, expect } from "vitest";
import { parseGrade } from "./grade";
import { EXPLAIN_PROMPTS } from "../data/explain";

const prompt = EXPLAIN_PROMPTS[0];

describe("parseGrade", () => {
  it("parses a clean JSON grade", () => {
    const raw = JSON.stringify({
      score: 80,
      hit: ["a", "b"],
      missed: ["c"],
      feedback: "Good coverage.",
    });
    const g = parseGrade(raw, prompt);
    expect(g.score).toBe(80);
    expect(g.hit).toEqual(["a", "b"]);
    expect(g.missed).toEqual(["c"]);
    expect(g.feedback).toBe("Good coverage.");
  });

  it("extracts JSON wrapped in prose", () => {
    const raw = `Here is my grade:\n{"score": 55, "hit": [], "missed": [], "feedback": "ok"}\nThanks!`;
    const g = parseGrade(raw, prompt);
    expect(g.score).toBe(55);
  });

  it("clamps out-of-range scores", () => {
    expect(parseGrade('{"score": 250}', prompt).score).toBe(100);
    expect(parseGrade('{"score": -10}', prompt).score).toBe(0);
    expect(parseGrade('{"score": "not a number"}', prompt).score).toBe(0);
  });

  it("falls back gracefully on unparseable output", () => {
    const g = parseGrade("the model said something weird", prompt);
    expect(g.score).toBe(0);
    expect(g.missed).toEqual(prompt.rubric);
  });
});
