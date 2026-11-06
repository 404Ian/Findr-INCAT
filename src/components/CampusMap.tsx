import React, { useCallback, useEffect, useRef, useState } from "react";
import { L, maplibregl } from "../lib/setupMapLibre";
import "@maplibre/maplibre-gl-leaflet";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { Crosshair, X, ArrowUpRight } from "lucide-react";
import {
    CAMPUS_HUBS,
    INCAT_CENTER,
    INCAT_MAX_BOUNDS,
    getHubById,
} from "../data/hubs";
import type { PostItem } from "../types";

interface MaplibreGLLayer extends L.Layer {
    getMaplibreMap(): maplibregl.Map;
}

type BaseMapMode = "map" | "satellite";

interface CampusMapProps {
    isOpen: boolean;
    darkMode: boolean;
    posts: PostItem[];
    selectedHubId: string;
    activePinPostId: string | null;
    onSelectHub: (hubId: string) => void;
    onHighlightPost: (post: PostItem) => void;
    onOpenPostDetail: (post: PostItem) => void;
}

const MIN_ZOOM = 16;
const MAX_ZOOM = 20;
const DEFAULT_ZOOM = 18;
const FALLBACK_TIMEOUT_MS = 3000;

const OPENFREEMAP_LIBERTY_STYLE =
    "https://tiles.openfreemap.org/styles/liberty";
const OPENFREEMAP_DARK_STYLE = "https://tiles.openfreemap.org/styles/dark";

const OSM_RASTER_TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTRIBUTION = "© OpenStreetMap contributors";

const ESRI_WORLD_IMAGERY_TILES =
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

const OPENFREEMAP_ATTRIBUTION =
    '<a href="https://openfreemap.org" target="_blank" rel="noreferrer">OpenFreeMap</a> &copy; <a href="https://www.openmaptiles.org/" target="_blank" rel="noreferrer">OpenMapTiles</a> Data from <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>';

const ESRI_SATELLITE_ATTRIBUTION =
    "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community";

function isWebGLSupported(): boolean {
    if (typeof window === "undefined") return false;
    try {
        const canvas = document.createElement("canvas");
        return Boolean(
            window.WebGLRenderingContext &&
            (canvas.getContext("webgl2") ||
                canvas.getContext("webgl") ||
                canvas.getContext("experimental-webgl")),
        );
    } catch {
        return false;
    }
}

export const CampusMap: React.FC<CampusMapProps> = ({
    isOpen,
    darkMode,
    posts,
    selectedHubId,
    activePinPostId,
    onSelectHub,
    onHighlightPost,
    onOpenPostDetail,
}) => {
    const prefersReducedMotion = useReducedMotion();
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);
    const glLayerRef = useRef<MaplibreGLLayer | null>(null);
    const osmFallbackLayerRef = useRef<L.TileLayer | null>(null);
    const satelliteLayerRef = useRef<L.TileLayer | null>(null);
    const markersLayerRef = useRef<L.LayerGroup | null>(null);
    const activeStyleRef = useRef<string | null>(null);

    const [baseMode, setBaseMode] = useState<BaseMapMode>("map");
    const [usingOsmFallback, setUsingOsmFallback] = useState<boolean>(false);
    const [currentZoom, setCurrentZoom] = useState<number>(DEFAULT_ZOOM);
    const [popoverPost, setPopoverPost] = useState<PostItem | null>(null);

    const baseModeRef = useRef<BaseMapMode>(baseMode);
    baseModeRef.current = baseMode;

    // Resolve hub label collisions & zoom >= 18 visibility so labels never overlap
    const updateHubLabelCollisions = useCallback(() => {
        const container = mapContainerRef.current;
        const map = mapInstanceRef.current;
        if (!container || !map) return;

        const tooltips = Array.from(
            container.querySelectorAll<HTMLElement>(
                ".leaflet-tooltip.incat-hub-label",
            ),
        );

        const zoom = map.getZoom();
        if (zoom < 18) {
            tooltips.forEach((el) => {
                el.style.opacity = "0";
                el.style.visibility = "hidden";
            });
            return;
        }

        const visibleRects: DOMRect[] = [];
        tooltips.forEach((el) => {
            el.style.opacity = "1";
            el.style.visibility = "visible";

            const rect = el.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) return;

            const isOverlapping = visibleRects.some(
                (r) =>
                    !(
                        rect.right < r.left ||
                        rect.left > r.right ||
                        rect.bottom < r.top ||
                        rect.top > r.bottom
                    ),
            );

            if (isOverlapping) {
                el.style.opacity = "0";
                el.style.visibility = "hidden";
            } else {
                visibleRects.push(rect);
            }
        });
    }, []);

    // Synchronize both Leaflet viewport and MapLibre WebGL canvas dimensions
    const syncMapSize = useCallback(() => {
        const map = mapInstanceRef.current;
        if (!map) return;

        map.invalidateSize();
        try {
            const glMap = glLayerRef.current?.getMaplibreMap?.();
            if (glMap) {
                glMap.resize();
            }
        } catch (err) {
            console.log("[CampusMap] MapLibre resize failed:", err);
        }
        updateHubLabelCollisions();
    }, [updateHubLabelCollisions]);

    // Initialize Leaflet map, OpenFreeMap Liberty/Dark vector layer, 3s OSM raster fallback, and Satellite layer
    useEffect(() => {
        if (!isOpen || !mapContainerRef.current || mapInstanceRef.current)
            return;

        setUsingOsmFallback(false);

        const map = L.map(mapContainerRef.current, {
            center: INCAT_CENTER,
            zoom: DEFAULT_ZOOM,
            minZoom: MIN_ZOOM,
            maxZoom: MAX_ZOOM,
            maxBounds: INCAT_MAX_BOUNDS,
            maxBoundsViscosity: 0.9,
            zoomControl: true,
            attributionControl: true,
        });
        mapInstanceRef.current = map;

        map.attributionControl.setPrefix(false);
        map.attributionControl.addAttribution(OPENFREEMAP_ATTRIBUTION);

        map.on("error", (err) => {
            console.log("[CampusMap] Leaflet map error:", err);
        });

        setCurrentZoom(map.getZoom());
        map.on("zoomend", () => {
            setCurrentZoom(map.getZoom());
            updateHubLabelCollisions();
        });
        map.on("moveend", () => {
            updateHubLabelCollisions();
        });

        // Dev-only coordinate helper: Shift+click logs "lat, lng" and copies to clipboard
        if (import.meta.env.DEV) {
            map.on("click", (e: L.LeafletMouseEvent) => {
                if (!e.originalEvent.shiftKey) return;
                const coords = `${e.latlng.lat.toFixed(6)}, ${e.latlng.lng.toFixed(6)}`;
                console.log(coords);
                navigator.clipboard?.writeText(coords).catch((err) => {
                    console.log("[CampusMap] Clipboard copy error:", err);
                });
            });
        }

        let fallbackTriggered = false;
        let hasRenderedFeatures = false;
        let fallbackTimer: number | undefined;

        const mountOsmRasterFallback = (reason: string) => {
            if (fallbackTriggered || !mapInstanceRef.current) return;
            fallbackTriggered = true;
            if (fallbackTimer !== undefined) {
                window.clearTimeout(fallbackTimer);
            }

            console.log(
                `[CampusMap] Switching to OpenStreetMap raster fallback: ${reason}`,
            );

            if (glLayerRef.current) {
                try {
                    mapInstanceRef.current.removeLayer(glLayerRef.current);
                } catch (err) {
                    console.log(
                        "[CampusMap] Error removing MapLibre layer:",
                        err,
                    );
                }
                glLayerRef.current = null;
            }

            const osmLayer = L.tileLayer(OSM_RASTER_TILES, {
                minZoom: MIN_ZOOM,
                maxZoom: MAX_ZOOM,
                maxNativeZoom: 19,
                attribution: OSM_ATTRIBUTION,
                opacity: baseModeRef.current === "satellite" ? 0 : 1,
            }).addTo(mapInstanceRef.current);

            osmLayer.on("tileerror", (err) => {
                console.log("[CampusMap] OSM raster tile error:", err);
            });

            osmFallbackLayerRef.current = osmLayer;
            setUsingOsmFallback(true);

            if (baseModeRef.current === "map") {
                mapInstanceRef.current.attributionControl.removeAttribution(
                    OPENFREEMAP_ATTRIBUTION,
                );
                mapInstanceRef.current.attributionControl.addAttribution(
                    OSM_ATTRIBUTION,
                );
            }
        };

        const styleUrl = darkMode
            ? OPENFREEMAP_DARK_STYLE
            : OPENFREEMAP_LIBERTY_STYLE;

        const leafletWithGL = L as unknown as {
            maplibreGL?: (options: {
                style: string;
                minZoom?: number;
                maxZoom?: number;
                attributionControl?: boolean;
            }) => MaplibreGLLayer;
        };

        if (
            isWebGLSupported() &&
            typeof leafletWithGL.maplibreGL === "function"
        ) {
            fallbackTimer = window.setTimeout(() => {
                if (hasRenderedFeatures || fallbackTriggered) return;
                try {
                    const glMap = glLayerRef.current?.getMaplibreMap?.();
                    const features = glMap?.queryRenderedFeatures?.() ?? [];
                    if (features.length > 0) {
                        hasRenderedFeatures = true;
                        return;
                    }
                } catch (err) {
                    console.log(
                        "[CampusMap] queryRenderedFeatures threw at 3s check:",
                        err,
                    );
                }
                mountOsmRasterFallback(
                    "MapLibre layer did not render features within 3 seconds",
                );
            }, FALLBACK_TIMEOUT_MS);

            try {
                const glLayer = leafletWithGL
                    .maplibreGL({
                        style: styleUrl,
                        minZoom: MIN_ZOOM,
                        maxZoom: MAX_ZOOM,
                        attributionControl: false,
                    })
                    .addTo(map);
                glLayerRef.current = glLayer;

                const glMap = glLayer.getMaplibreMap?.();
                if (!glMap) {
                    throw new Error("getMaplibreMap() returned null/undefined");
                }

                if (typeof glMap.setMissingStyleImageResolver === "function") {
                    glMap.setMissingStyleImageResolver((id) => {
                        // Register a 1x1 transparent image for any missing sprite icon.
                        const canvas = document.createElement("canvas");
                        canvas.width = 1;
                        canvas.height = 1;
                        const context = canvas.getContext("2d");
                        if (context) {
                            context.clearRect(0, 0, 1, 1);
                            glMap.addImage(
                                id,
                                context.getImageData(0, 0, 1, 1),
                            );
                        }
                    });
                }

                const checkFeaturesRendered = () => {
                    if (hasRenderedFeatures || fallbackTriggered) return;
                    try {
                        const features = glMap.queryRenderedFeatures();
                        if (Array.isArray(features) && features.length > 0) {
                            hasRenderedFeatures = true;
                            if (fallbackTimer !== undefined) {
                                window.clearTimeout(fallbackTimer);
                            }
                        }
                    } catch {
                        // Ignore transient query errors before style finishes loading
                    }
                };

                glMap.on("style.load", () => {
                    console.log("[CampusMap] MapLibre style loaded:", styleUrl);
                    glMap.resize();
                    checkFeaturesRendered();
                });

                glMap.on("load", () => {
                    glMap.resize();
                    checkFeaturesRendered();
                });

                glMap.on("idle", checkFeaturesRendered);
                glMap.on("render", checkFeaturesRendered);

                glMap.on("error", (err) => {
                    console.log("[CampusMap] MapLibre error:", err);
                    if (!hasRenderedFeatures) {
                        mountOsmRasterFallback(
                            "MapLibre emitted an error before rendering features",
                        );
                    }
                });
            } catch (err) {
                console.log(
                    "[CampusMap] MapLibre initialization threw an error:",
                    err,
                );
                mountOsmRasterFallback("MapLibre initialization threw");
            }
        } else {
            console.log(
                "[CampusMap] WebGL or L.maplibreGL unavailable; falling back to OSM raster tiles.",
            );
            mountOsmRasterFallback("WebGL or maplibreGL plugin unavailable");
        }

        // Satellite raster layer kept ready at opacity 0 for instant 250ms crossfade
        const satLayer = L.tileLayer(ESRI_WORLD_IMAGERY_TILES, {
            minZoom: MIN_ZOOM,
            maxZoom: MAX_ZOOM,
            maxNativeZoom: 19,
            opacity: baseModeRef.current === "satellite" ? 1 : 0,
            className: "incat-satellite-layer",
        }).addTo(map);
        satelliteLayerRef.current = satLayer;

        // Layer group for hub, lost, and found pins
        markersLayerRef.current = L.layerGroup().addTo(map);

        // Sync size immediately after container is shown, on container resize, and on window resize
        const rafId = window.requestAnimationFrame(() => syncMapSize());
        const showTimerId = window.setTimeout(() => syncMapSize(), 100);

        const resizeObserver = new ResizeObserver(() => {
            syncMapSize();
        });
        resizeObserver.observe(mapContainerRef.current);

        window.addEventListener("resize", syncMapSize);

        return () => {
            if (fallbackTimer !== undefined) {
                window.clearTimeout(fallbackTimer);
            }
            window.cancelAnimationFrame(rafId);
            window.clearTimeout(showTimerId);
            window.removeEventListener("resize", syncMapSize);
            resizeObserver.disconnect();
            map.remove();
            mapInstanceRef.current = null;
            glLayerRef.current = null;
            osmFallbackLayerRef.current = null;
            satelliteLayerRef.current = null;
            markersLayerRef.current = null;
        };
    }, [isOpen, syncMapSize, updateHubLabelCollisions]);

    // Switch between OpenFreeMap Liberty (light) and Dark (dark) in place via setStyle()
    useEffect(() => {
        if (usingOsmFallback) return;
        const glMap = glLayerRef.current?.getMaplibreMap?.();
        if (!glMap) return;

        const targetStyle = darkMode
            ? OPENFREEMAP_DARK_STYLE
            : OPENFREEMAP_LIBERTY_STYLE;

        if (activeStyleRef.current === targetStyle) return;
        activeStyleRef.current = targetStyle;

        try {
            glMap.setStyle(targetStyle);
        } catch (err) {
            console.log(
                "[CampusMap] Failed switching style with setStyle:",
                err,
            );
        }
    }, [darkMode, usingOsmFallback]);

    // Crossfade Map <-> Satellite over 250ms and update attribution
    useEffect(() => {
        const map = mapInstanceRef.current;
        const satLayer = satelliteLayerRef.current;
        const osmLayer = osmFallbackLayerRef.current;
        const glContainer = glLayerRef.current
            ?.getMaplibreMap?.()
            ?.getContainer?.();

        if (!map || !satLayer) return;

        if (baseMode === "satellite") {
            satLayer.setOpacity(1);
            if (osmLayer) osmLayer.setOpacity(0);
            if (glContainer) {
                glContainer.style.transition = "opacity 250ms ease";
                glContainer.style.opacity = "0";
            }
            map.attributionControl.removeAttribution(OPENFREEMAP_ATTRIBUTION);
            map.attributionControl.removeAttribution(OSM_ATTRIBUTION);
            map.attributionControl.addAttribution(ESRI_SATELLITE_ATTRIBUTION);
        } else {
            satLayer.setOpacity(0);
            if (osmLayer) osmLayer.setOpacity(1);
            if (glContainer) {
                glContainer.style.transition = "opacity 250ms ease";
                glContainer.style.opacity = "1";
            }
            map.attributionControl.removeAttribution(
                ESRI_SATELLITE_ATTRIBUTION,
            );
            map.attributionControl.addAttribution(
                usingOsmFallback ? OSM_ATTRIBUTION : OPENFREEMAP_ATTRIBUTION,
            );
            syncMapSize();
        }
    }, [baseMode, usingOsmFallback, syncMapSize]);

    // Render 10px Ringed Hub & Item Pins + Permanent Zoom 18+ Hub Tooltip Labels
    useEffect(() => {
        const layerGroup = markersLayerRef.current;
        if (!layerGroup || !isOpen) return;

        layerGroup.clearLayers();

        // 1. Campus Drop-off Hub Dots (INCAT Green #234B38) with permanent 11px tooltip at zoom 18+
        CAMPUS_HUBS.forEach((hub, idx) => {
            const isSelected = selectedHubId === hub.id;
            const delayMs = prefersReducedMotion ? 0 : Math.min(idx * 25, 180);

            const hubIcon = L.divIcon({
                className: "incat-pin-wrapper",
                html: `<div class="incat-pin-drop" style="animation-delay: ${delayMs}ms;">
          <div class="incat-pin-dot ${
              isSelected ? "incat-pin-active" : ""
          }" style="background-color: #234B38;"></div>
        </div>`,
                iconSize: [14, 14],
                iconAnchor: [7, 7],
            });

            const marker = L.marker([hub.lat, hub.lng], {
                icon: hubIcon,
                zIndexOffset: 150,
            });

            marker.bindTooltip(`${hub.name}`, {
                permanent: true,
                direction: "right",
                offset: [8, 0],
                className: "incat-hub-label",
            });

            marker.on("click", () => {
                setPopoverPost(null);
                onSelectHub(selectedHubId === hub.id ? "ALL" : hub.id);
            });
            marker.addTo(layerGroup);
        });

        // 2. Active Lost/Found Item Dots placed slightly offset from the hub pin
        posts
            .filter((p) => p.status === "OPEN")
            .forEach((post, idx) => {
                const hub = getHubById(post.hubId);
                const angle = (idx * 1.45) % (Math.PI * 2);
                const latOffset = Math.cos(angle) * 0.000055;
                const lngOffset = Math.sin(angle) * 0.000055;

                const isSelected =
                    activePinPostId === post.id || popoverPost?.id === post.id;
                const dotColor = post.type === "LOST" ? "#B91C1C" : "#D97706";
                const delayMs = prefersReducedMotion
                    ? 0
                    : Math.min((idx + 4) * 35, 260);

                const postIcon = L.divIcon({
                    className: "incat-pin-wrapper",
                    html: `<div class="incat-pin-drop" style="animation-delay: ${delayMs}ms;">
            <div class="incat-pin-dot ${
                isSelected ? "incat-pin-active" : ""
            }" style="background-color: ${dotColor};"></div>
          </div>`,
                    iconSize: [14, 14],
                    iconAnchor: [7, 7],
                });

                const marker = L.marker(
                    [hub.lat + latOffset, hub.lng + lngOffset],
                    {
                        icon: postIcon,
                        zIndexOffset: isSelected ? 400 : 250,
                    },
                );

                marker.on("click", () => {
                    setPopoverPost(post);
                    onHighlightPost(post);
                });

                marker.addTo(layerGroup);
            });

        window.requestAnimationFrame(() => {
            updateHubLabelCollisions();
        });
    }, [
        isOpen,
        posts,
        selectedHubId,
        activePinPostId,
        popoverPost,
        prefersReducedMotion,
        currentZoom,
        onSelectHub,
        onHighlightPost,
        updateHubLabelCollisions,
    ]);

    const handleRecenter = () => {
        if (!mapInstanceRef.current) return;
        mapInstanceRef.current.flyTo(INCAT_CENTER, DEFAULT_ZOOM, {
            duration: prefersReducedMotion ? 0 : 0.8,
        });
    };

    const shouldFilterRasterPane =
        usingOsmFallback && darkMode && baseMode === "map";

    return (
        <AnimatePresence initial={false}>
            {isOpen && (
                <motion.div
                    key="incat-campus-map-shell"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{
                        duration: prefersReducedMotion ? 0.15 : 0.3,
                        ease: [0.22, 1, 0.36, 1],
                    }}
                    onAnimationComplete={() => {
                        syncMapSize();
                    }}
                    className="overflow-hidden mb-6"
                >
                    <div className="border border-border rounded-lg overflow-hidden bg-surface relative">
                        {/* Map Viewport: 300px on mobile, 420px on desktop */}
                        <div
                            ref={mapContainerRef}
                            className={`h-75 sm:h-105 w-full z-0 ${
                                shouldFilterRasterPane
                                    ? "incat-osm-dark-raster"
                                    : ""
                            }`}
                        />

                        {/* Top-Right Controls: Map / Satellite Segmented Control + Recenter Button */}
                        <div className="absolute top-3 right-3 z-400 flex items-center gap-2">
                            <div
                                role="group"
                                aria-label="Map view mode"
                                className="inline-flex p-0.5 bg-surface border border-border rounded-md"
                            >
                                <button
                                    type="button"
                                    onClick={() => setBaseMode("map")}
                                    className={`px-2.5 py-1 text-xs font-medium rounded transition-colors duration-150 ${
                                        baseMode === "map"
                                            ? "bg-subtle text-text"
                                            : "text-muted hover:text-text"
                                    }`}
                                >
                                    Map
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setBaseMode("satellite")}
                                    className={`px-2.5 py-1 text-xs font-medium rounded transition-colors duration-150 ${
                                        baseMode === "satellite"
                                            ? "bg-subtle text-text"
                                            : "text-muted hover:text-text"
                                    }`}
                                >
                                    Satellite
                                </button>
                            </div>

                            <button
                                type="button"
                                onClick={handleRecenter}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-surface text-text border border-border rounded-md hover:border-muted transition-colors duration-150"
                            >
                                <Crosshair size={14} strokeWidth={1.5} />
                                Recenter on campus
                            </button>
                        </div>

                        {/* Active Hub Filter Pill */}
                        {selectedHubId !== "ALL" && (
                            <div className="absolute bottom-12 left-3 z-400 inline-flex items-center gap-2 px-3 py-1.5 bg-surface border border-border rounded-md text-xs text-text">
                                <span>
                                    Building: {getHubById(selectedHubId).name}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => onSelectHub("ALL")}
                                    className="text-muted hover:text-text"
                                    aria-label="Clear building filter"
                                >
                                    <X size={13} strokeWidth={1.5} />
                                </button>
                            </div>
                        )}

                        {/* Pin Popover Card */}
                        <AnimatePresence>
                            {popoverPost && (
                                <motion.div
                                    key={popoverPost.id}
                                    initial={
                                        prefersReducedMotion
                                            ? { opacity: 0 }
                                            : { opacity: 0, y: 6, scale: 0.97 }
                                    }
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 4, scale: 0.97 }}
                                    transition={{
                                        duration: 0.18,
                                        ease: [0.22, 1, 0.36, 1],
                                    }}
                                    className="absolute bottom-12 left-3 right-3 sm:left-auto sm:right-3 sm:w-72 z-400 bg-surface border border-border rounded-md p-3.5 shadow-popover"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-1.5 text-xs text-muted">
                                                <span
                                                    className={`w-1.5 h-1.5 rounded-full ${
                                                        popoverPost.type ===
                                                        "LOST"
                                                            ? "bg-lost"
                                                            : "bg-found"
                                                    }`}
                                                />
                                                <span>
                                                    {popoverPost.type === "LOST"
                                                        ? "Lost"
                                                        : "Found"}
                                                </span>
                                                <span>·</span>
                                                <span>
                                                    {popoverPost.createdAt}
                                                </span>
                                            </div>
                                            <h3 className="text-sm font-medium text-text truncate mt-0.5">
                                                {popoverPost.title}
                                            </h3>
                                            <p className="text-xs text-muted truncate mt-0.5">
                                                {
                                                    getHubById(
                                                        popoverPost.hubId,
                                                    ).name
                                                }
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setPopoverPost(null)}
                                            aria-label="Close pin popover"
                                            className="p-1 text-muted hover:text-text rounded"
                                        >
                                            <X size={14} strokeWidth={1.5} />
                                        </button>
                                    </div>

                                    <div className="mt-2.5 pt-2 border-t border-border flex items-center justify-between text-xs">
                                        <span className="text-muted truncate">
                                            {popoverPost.posterName}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                onOpenPostDetail(popoverPost)
                                            }
                                            className="inline-flex items-center gap-1 font-medium text-accent hover:opacity-80 shrink-0"
                                        >
                                            View
                                            <ArrowUpRight
                                                size={13}
                                                strokeWidth={1.5}
                                            />
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Legend Footer */}
                        <div className="px-4 py-2.5 border-t border-border flex flex-wrap items-center justify-between gap-4 text-xs text-muted bg-surface">
                            <div className="flex items-center gap-5">
                                <span className="inline-flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full bg-lost border border-white inline-block" />
                                    Lost
                                </span>
                                <span className="inline-flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full bg-found border border-white inline-block" />
                                    Found
                                </span>
                                <span className="inline-flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full bg-accent border border-white inline-block" />
                                    INCAT drop-off hub
                                </span>
                            </div>
                            <span>INCAT Campus · P. Gomez Street</span>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
