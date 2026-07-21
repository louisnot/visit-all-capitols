import { useEffect, useRef, useState } from "react";
import mapHtml from "./view-map.html?raw";
import tripHtml from "./view-trip.html?raw";
import trip2Html from "./view-trip2.html?raw";
import { initMapApp } from "./mapApp";
import { initTripApp } from "./tripApp";
import { initTrip2App } from "./trip2App";

type View = "map" | "trip" | "trip2";

export default function App() {
  const [view, setView] = useState<View>(
    /(^|#)trip2/.test(location.hash) ? "trip2" : /(^|#)trip/.test(location.hash) ? "trip" : "map"
  );
  const mapApi = useRef<{ draw: () => void; zoomToRegion: (n: string[]) => void } | null>(null);
  const started = useRef(false);

  // Mount the (imperative) map + trip apps once, after their markup is in the DOM.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    mapApi.current = initMapApp() as any;
    initTripApp();
    initTrip2App();
    const cta1 = document.getElementById("tripSeeMap");
    if (cta1)
      cta1.onclick = () => {
        setView("map");
        mapApi.current?.zoomToRegion(["Springfield", "Indianapolis"]);
      };
    const cta2 = document.getElementById("trip2SeeMap");
    if (cta2)
      cta2.onclick = () => {
        setView("map");
        mapApi.current?.zoomToRegion(["Olympia", "Salem", "Boise", "Helena", "Cheyenne"]);
      };
  }, []);

  // Keep the URL hash in sync, and refit the map whenever it becomes visible again.
  useEffect(() => {
    const hash =
      view === "trip" ? "#trip" : view === "trip2" ? "#trip2" : location.pathname + location.search;
    history.replaceState(null, "", hash);
    if (view === "map") mapApi.current?.draw();
  }, [view]);

  const tab = (id: View, label: string) => (
    <button className={"tab" + (view === id ? " active" : "")} onClick={() => setView(id)}>
      {label}
    </button>
  );

  return (
    <div className="wrap">
      <nav className="tabnav">
        {tab("map", "🗺️  The 50-Capitals Map")}
        {tab("trip", "🧳  Trip #1 · Chicago Loop")}
        {tab("trip2", "🏔️  Trip #2 · Cascades & Rockies")}
      </nav>
      <div id="view-map" className="viewpane" hidden={view !== "map"} dangerouslySetInnerHTML={{ __html: mapHtml }} />
      <div id="view-trip1" className="viewpane trip" hidden={view !== "trip"} dangerouslySetInnerHTML={{ __html: tripHtml }} />
      <div id="view-trip2" className="viewpane trip" hidden={view !== "trip2"} dangerouslySetInnerHTML={{ __html: trip2Html }} />
    </div>
  );
}
