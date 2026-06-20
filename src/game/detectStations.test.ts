import { describe, it, expect } from "vitest";
import { detectStations } from "./Explain";

describe("detectStations", () => {
  it("returns [] for empty / irrelevant text", () => {
    expect(detectStations("")).toEqual([]);
    expect(detectStations("hello world nothing here")).toEqual([]);
  });

  it("detects a station by name", () => {
    expect(detectStations("the planner runs first")).toContain("planner");
  });

  it("detects a station by alias", () => {
    expect(detectStations("useChat opens the SSE connection")).toContain(
      "chat-pipe",
    );
    expect(detectStations("the Hono routes check ownership")).toContain(
      "backend",
    );
  });

  it("orders stations by first mention (drives the live trace)", () => {
    const order = detectStations(
      "First the frontend sends to useChat, then the planner, then the agent loop.",
    );
    expect(order.indexOf("frontend")).toBeLessThan(order.indexOf("chat-pipe"));
    expect(order.indexOf("chat-pipe")).toBeLessThan(order.indexOf("planner"));
    expect(order.indexOf("planner")).toBeLessThan(order.indexOf("agent-loop"));
  });

  it("detects multiple stations in a full walkthrough", () => {
    const found = detectStations(
      "Frontend useChat hits the backend, the planner decides, the agent loop calls providers and tools, SSE streams back to the widgets and Bigsail, then it persists to Supabase and deploys on Fly.",
    );
    for (const s of [
      "frontend",
      "backend",
      "planner",
      "agent-loop",
      "providers",
      "tools",
      "sse",
      "widgets",
      "bigsail",
      "persistence",
      "deploy",
    ]) {
      expect(found).toContain(s);
    }
  });
});
