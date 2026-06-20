import type { ExplainPrompt } from "../data/explain";

// Optional Claude AI-grade. Lazy — only runs when the user supplies a key and
// opts in. Uses the Anthropic Messages API directly from the browser with the
// dangerous-direct-browser-access header (this is a local single-user study app;
// the key is the user's own and stored only in their localStorage).

export type GradeResult = {
  score: number; // 0..100
  hit: string[]; // rubric points covered
  missed: string[]; // rubric points missed
  feedback: string;
};

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
// Always default to Sonnet (per project convention).
const MODEL = "claude-sonnet-4-6";

export async function aiGrade(
  prompt: ExplainPrompt,
  answer: string,
  apiKey: string,
): Promise<GradeResult> {
  const rubric = prompt.rubric.map((r, i) => `${i + 1}. ${r}`).join("\n");
  const system = `You are a precise technical interviewer grading a candidate's spoken answer about the architecture of "Aether", a conversational-explorer web app.
Grade ONLY against the provided rubric. Be fair but exacting: a point counts as hit only if the answer demonstrates real understanding, not just a keyword.
Respond with ONLY a JSON object, no prose, of shape:
{"score": <0-100 integer>, "hit": [<rubric point texts covered>], "missed": [<rubric point texts not covered>], "feedback": "<2-3 sentences of specific coaching>"}`;

  const user = `Interview question:\n${prompt.prompt}\n\nRubric (the must-hit points):\n${rubric}\n\nCandidate's answer:\n"""\n${answer}\n"""\n\nGrade it. Score = roughly (rubric points clearly hit / total) * 100, adjusted for correctness.`;

  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Claude API ${res.status}: ${text.slice(0, 300)}`);
  }

  const data = await res.json();
  const textOut: string =
    data?.content?.find((b: { type: string }) => b.type === "text")?.text ?? "";
  return parseGrade(textOut, prompt);
}

/** Defensive parse — tolerate prose-wrapped JSON, fall back gracefully. */
export function parseGrade(raw: string, prompt: ExplainPrompt): GradeResult {
  const match = raw.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      const obj = JSON.parse(match[0]);
      return {
        score: clampScore(obj.score),
        hit: Array.isArray(obj.hit) ? obj.hit.map(String) : [],
        missed: Array.isArray(obj.missed) ? obj.missed.map(String) : [],
        feedback: typeof obj.feedback === "string" ? obj.feedback : "",
      };
    } catch {
      // fall through
    }
  }
  return {
    score: 0,
    hit: [],
    missed: prompt.rubric,
    feedback: "Could not parse the grader response.",
  };
}

function clampScore(n: unknown): number {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(100, Math.round(v)));
}
