import L from "leaflet";
import * as maplibregl from "maplibre-gl";
import "leaflet/dist/leaflet.css";
import "maplibre-gl/dist/maplibre-gl.css";

if (typeof window !== "undefined") {
    const win = window as unknown as {
        L: typeof L;
        maplibregl: typeof maplibregl;
    };
    win.L = L;
    win.maplibregl = maplibregl;
}

export { L, maplibregl };
