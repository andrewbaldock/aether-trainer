import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { App } from "./App";

// React Flow measures the DOM; jsdom has no layout, so it logs a benign warning
// but still renders nodes. These tests assert the app mounts and the three modes
// switch without throwing — the smoke test module-transform checks can't do.

afterEach(cleanup);

describe("App", () => {
  it("mounts and shows the readiness HUD", () => {
    render(<App />);
    expect(screen.getByText(/The Aether Machine/i)).toBeInTheDocument();
    expect(screen.getByText(/Readiness/i)).toBeInTheDocument();
  });

  it("switches to Diagnose mode and shows a symptom", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Diagnose" }));
    expect(screen.getByText(/Symptom/i)).toBeInTheDocument();
  });

  it("switches to Explain mode and shows a prompt", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Explain" }));
    expect(
      screen.getByRole("button", { name: /Start — the clock runs/i }),
    ).toBeInTheDocument();
  });
});
