import { useEffect, useRef, useState } from "react";
import mapHtml from "./view-map.html?raw";
import trip2Html from "./view-trip2.html?raw";
import { initMapApp } from "./mapApp";
import { initTrip2App } from "./trip2App";

type View = "map" | "trip2";

export default function App() {
  const [view, setView] = useState<View>(/(^|#)trip/.test(location.hash) ? "trip2" : "map");
  const mapApi = useRef<{ draw: () => void; zoomToRegion: (n: string[]) => void } | null>(null);
  const started = useRef(false);

  // Mount the (imperative) map + trip apps once, after their markup is in the DOM.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    mapApi.current = initMapApp() as any;
    initTrip2App();
    const cta = document.getElementById("trip2SeeMap");
    if (cta)
      cta.onclick = () => {
        setView("map");
        mapApi.current?.zoomToRegion(["Olympia", "Salem", "Boise", "Helena", "Cheyenne", "Denver"]);
      };
  }, []);

  // Keep the URL hash in sync, and refit the map whenever it becomes visible again.
  useEffect(() => {
    history.replaceState(null, "", view === "trip2" ? "#trip" : location.pathname + location.search);
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
        {tab("trip2", "🏔️  Cascades & Rockies Trip")}
      </nav>
      <div id="view-map" className="viewpane" hidden={view !== "map"} dangerouslySetInnerHTML={{ __html: mapHtml }} />
      <div id="view-trip2" className="viewpane trip" hidden={view !== "trip2"} dangerouslySetInnerHTML={{ __html: trip2Html }} />
    </div>
  );
}
