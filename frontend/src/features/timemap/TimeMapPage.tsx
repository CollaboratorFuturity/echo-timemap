import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { fetchTimemapData, setTimemapData } from "./data";

// Three.js and the map component load as a separate chunk, in parallel with the data.
const loadMap = () => import("./TimeMap");
const TimeMap = lazy(loadMap);

type Status = "loading" | "ready" | "error";

// Same theme choice as the map (stored key, else OS preference) so the loading screen matches it.
function prefersLight(): boolean {
  try {
    const s = localStorage.getItem("tm-theme");
    if (s === "light" || s === "dark") return s === "light";
  } catch {
    /* storage unavailable */
  }
  return typeof window.matchMedia === "function" && window.matchMedia("(prefers-color-scheme: light)").matches;
}

function Screen({ children }: { children: React.ReactNode }) {
  const light = prefersLight();
  return (
    <main
      lang="en"
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        fontFamily: "'DM Sans',sans-serif",
        background: light ? "#eef1f6" : "#070a12",
        color: light ? "#19212e" : "#e8ecf2",
      }}
    >
      <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: "1.45rem", fontWeight: 700, margin: 0 }}>5D TimeMap</h1>
      {children}
    </main>
  );
}

const Loading = () => (
  <Screen>
    <p role="status" style={{ margin: 0, fontSize: "0.875rem" }}>
      Loading map data…
    </p>
  </Screen>
);

export default function TimeMapPage() {
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setStatus("loading");
    Promise.all([fetchTimemapData(), loadMap()])
      .then(([payload]) => {
        setTimemapData(payload);
        setStatus("ready");
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : String(e));
        setStatus("error");
      });
  }, []);

  useEffect(load, [load]);

  if (status === "loading") return <Loading />;
  if (status === "error")
    return (
      <Screen>
        <div role="alert" style={{ textAlign: "center", fontSize: "0.875rem", maxWidth: 420 }}>
          <p style={{ margin: "0 0 6px" }}>The map data could not be loaded.</p>
          <p style={{ margin: 0, opacity: 0.85 }}>{error}</p>
        </div>
        <button
          onClick={load}
          style={{ minHeight: 32, padding: "6px 16px", borderRadius: 7, font: "inherit", fontSize: "0.875rem", cursor: "pointer" }}
        >
          Try again
        </button>
      </Screen>
    );
  return (
    <Suspense fallback={<Loading />}>
      <TimeMap />
    </Suspense>
  );
}
