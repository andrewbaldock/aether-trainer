import { useState } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { ProgressProvider } from "./game/useProgress";
import { Hud, type Mode } from "./components/Hud";
import { Recall } from "./game/Recall";
import { Diagnose } from "./game/Diagnose";
import { Explain } from "./game/Explain";

export function App() {
  const [mode, setMode] = useState<Mode>("recall");
  const [reviewSignal, setReviewSignal] = useState(0);

  return (
    <ProgressProvider>
      <ReactFlowProvider>
        <div className="flex h-full flex-col">
          <Hud
            mode={mode}
            onMode={setMode}
            onReviewDue={() => {
              setMode("recall");
              setReviewSignal((n) => n + 1);
            }}
          />
          <main className="relative flex-1 overflow-hidden">
            {mode === "recall" && <Recall reviewSignal={reviewSignal} />}
            {mode === "diagnose" && <Diagnose />}
            {mode === "explain" && <Explain />}
          </main>
        </div>
      </ReactFlowProvider>
    </ProgressProvider>
  );
}
