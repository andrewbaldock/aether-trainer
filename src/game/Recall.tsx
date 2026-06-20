import { useState } from "react";
import { Machine } from "../machine/Machine";
import { CardReviewer } from "./CardReviewer";
import { CARDS_BY_STATION } from "../data/cards";
import { STATION_BY_ID, type StationId } from "../data/stations";
import { useProgress } from "./useProgress";
import { dueCards } from "./srs";

type Review = { cardIds: string[]; title: string } | null;

export function Recall({ reviewSignal }: { reviewSignal: number }) {
  const { srs } = useProgress();
  const [review, setReview] = useState<Review>(null);
  const [lastSignal, setLastSignal] = useState(reviewSignal);

  // When the HUD "Due" button bumps reviewSignal, open the due queue.
  if (reviewSignal !== lastSignal) {
    setLastSignal(reviewSignal);
    const allIds = Object.values(CARDS_BY_STATION)
      .flat()
      .map((c) => c.id);
    const due = dueCards(allIds, srs, Date.now());
    if (due.length > 0) setReview({ cardIds: due, title: "Due review" });
  }

  function openStation(stationId: StationId) {
    const ids = (CARDS_BY_STATION[stationId] ?? []).map((c) => c.id);
    if (ids.length === 0) return;
    setReview({ cardIds: ids, title: STATION_BY_ID[stationId].name });
  }

  function openCard(cardId: string) {
    setReview({ cardIds: [cardId], title: "Single card" });
  }

  return (
    <>
      <Machine
        onPartClick={openCard}
        onZoneClick={openStation}
        animateFlow
      />
      <div className="pointer-events-none absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full border border-shop-700 bg-shop-900/90 px-4 py-1.5 text-xs text-shop-600 backdrop-blur">
        Click a <span className="text-shop-100">part</span> to study it, or a{" "}
        <span className="text-shop-100">zone header</span> to run its whole deck.
        Master parts to light up the machine.
      </div>
      {review && (
        <CardReviewer
          cardIds={review.cardIds}
          title={review.title}
          onClose={() => setReview(null)}
        />
      )}
    </>
  );
}
