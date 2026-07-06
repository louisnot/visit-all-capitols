import { useEffect, useRef, useState } from "react";
import mapHtml from "./view-map.html?raw";
import tripHtml from "./view-trip.html?raw";
import { initMapApp } from "./mapApp";
import { initTripApp } from "./tripApp";

type View = "map" | "trip";

export default function App() {
  const [view, setView] = useState<View>(
    /(^|#)trip/.test(location.hash) ? "trip" : "map"
  );
  const mapApi = useRef<{ draw: () => void; zoomToRegion: (n: string[]) => void } | null>(null);
  const started = useRef(false);

  // Mount the (imperative) map + trip apps once, after their markup is in the DOM.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    mapApi.current = initMapApp() as any;
    initTripApp();
    const cta = document.getElementById("tripSeeMap");
    if (cta)
      cta.onclick = () => {
        setView("map");
        mapApi.current?.zoomToRegion(["Springfield", "Indianapolis"]);
      };
  }, []);

  // Keep the URL hash in sync, and refit the map whenever it becomes visible again.
  useEffect(() => {
    history.replaceState(null, "", view === "trip" ? "#trip" : location.pathname + location.search);
    if (view === "map") mapApi.current?.draw();
  }, [view]);

  return (
    <div className="wrap">
      <nav className="tabnav">
        <button
          className={"tab" + (view === "map" ? " active" : "")}
          onClick={() => setView("map")}
        >
          🗺️&nbsp; The 50-Capitals Map
        </button>
        <button
          className={"tab" + (view === "trip" ? " active" : "")}
          onClick={() => setView("trip")}
        >
          🧳&nbsp; Trip #1 · Chicago Loop
        </button>
      </nav>
      <div
        id="view-map"
        className="viewpane"
        hidden={view !== "map"}
        dangerouslySetInnerHTML={{ __html: mapHtml }}
      />
      <div
        id="view-trip1"
        className="viewpane trip"
        hidden={view !== "trip"}
        dangerouslySetInnerHTML={{ __html: tripHtml }}
      />
    </div>
  );
}
