import L from "leaflet";
import * as maplibregl from "maplibre-gl";
import { setWorkerUrl } from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import "leaflet/dist/leaflet.css";
import "maplibre-gl/dist/maplibre-gl.css";

// Configure MapLibre worker for Vite bundle pipeline
setWorkerUrl(workerUrl);

if (typeof window !== "undefined") {
    (window as unknown as { L: typeof L; maplibregl: typeof maplibregl }).L = L;
    (
        window as unknown as { L: typeof L; maplibregl: typeof maplibregl }
    ).maplibregl = maplibregl;
}

export { L, maplibregl };
