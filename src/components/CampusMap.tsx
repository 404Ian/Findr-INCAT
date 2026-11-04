import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// Expose maplibregl on window for @maplibre/maplibre-gl-leaflet compatibility
if (typeof window !== "undefined") {
    (window as unknown as { maplibregl: typeof maplibregl }).maplibregl =
        maplibregl;
}
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

const OPENFREEMAP_LIGHT_STYLE = "https://tiles.openfreemap.org/styles/positron";
const OPENFREEMAP_DARK_STYLE = "https://tiles.openfreemap.org/styles/dark";
const OPENFREEMAP_DARK_FALLBACK_STYLE =
    "https://tiles.openfreemap.org/styles/fiord";

const ESRI_LIGHT_GRAY_RASTER =
    "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}";

const OPENFREEMAP_ATTRIBUTION =
    '<a href="https://openfreemap.org" target="_blank" rel="noreferrer">OpenFreeMap</a> &copy; <a href="https://www.openmaptiles.org/" target="_blank" rel="noreferrer">OpenMapTiles</a> Data from <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>';

function canUseWebGL(): boolean {
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

async function resolveDarkStyleUrl(): Promise<string> {
    try {
        const res = await fetch(OPENFREEMAP_DARK_STYLE, { method: "HEAD" });
        if (res.ok) return OPENFREEMAP_DARK_STYLE;
    } catch {
        // Fall through to fiord backup style
    }
    return OPENFREEMAP_DARK_FALLBACK_STYLE;
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
    const fallbackRasterRef = useRef<L.TileLayer | null>(null);
    const markersLayerRef = useRef<L.LayerGroup | null>(null);

    const [popoverPost, setPopoverPost] = useState<PostItem | null>(null);

    // Mount Leaflet map with explicit minZoom/maxZoom and OpenFreeMap MapLibre layer
    useEffect(() => {
        if (!isOpen || !mapContainerRef.current || mapInstanceRef.current)
            return;

        const map = L.map(mapContainerRef.current, {
            center: INCAT_CENTER,
            zoom: 18,
            minZoom: 16,
            maxZoom: 20,
            maxBounds: INCAT_MAX_BOUNDS,
            maxBoundsViscosity: 0.9,
            zoomControl: true,
            attributionControl: true,
        });

        map.attributionControl.setPrefix(false);
        map.attributionControl.addAttribution(OPENFREEMAP_ATTRIBUTION);

        const mountEsriFallback = () => {
            if (fallbackRasterRef.current || !mapInstanceRef.current) return;
            if (glLayerRef.current) {
                try {
                    mapInstanceRef.current.removeLayer(glLayerRef.current);
                } catch {
                    // Ignore removal error
                }
                glLayerRef.current = null;
            }
            fallbackRasterRef.current = L.tileLayer(ESRI_LIGHT_GRAY_RASTER, {
                minZoom: 16,
                maxZoom: 20,
                maxNativeZoom: 16,
                attribution: "Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ",
            }).addTo(mapInstanceRef.current);
        };

        const leafletWithGL = L as unknown as {
            maplibreGL?: (options: {
                style: string;
                attributionControl?: boolean;
            }) => MaplibreGLLayer;
        };

        if (canUseWebGL() && typeof leafletWithGL.maplibreGL === "function") {
            try {
                const initialStyle = darkMode
                    ? OPENFREEMAP_DARK_STYLE
                    : OPENFREEMAP_LIGHT_STYLE;

                const glLayer = leafletWithGL
                    .maplibreGL({
                        style: initialStyle,
                        attributionControl: false,
                    })
                    .addTo(map);

                glLayerRef.current = glLayer;

                const glMap = glLayer.getMaplibreMap();
                if (glMap) {
                    glMap.on(
                        "error",
                        (err) => {
                            const status = (
                                err.error as { status?: number } | undefined
                            )?.status;
                            // If dark style URL 404s, try fiord before falling back to raster
                            if (darkMode && status === 404) {
                                glMap.setStyle(OPENFREEMAP_DARK_FALLBACK_STYLE);
                                return;
                            }
                            if (!glMap.isStyleLoaded()) {
                                mountEsriFallback();
                            }
                        },
                    );
                }
            } catch {
                mountEsriFallback();
            }
        } else {
            mountEsriFallback();
        }

        markersLayerRef.current = L.layerGroup().addTo(map);
        mapInstanceRef.current = map;

        const invalidateTimer = setTimeout(() => {
            map.invalidateSize();
            const glMap = glLayerRef.current?.getMaplibreMap();
            if (glMap) glMap.resize();
        }, 320);

        return () => {
            clearTimeout(invalidateTimer);
            map.remove();
            mapInstanceRef.current = null;
            glLayerRef.current = null;
            fallbackRasterRef.current = null;
            markersLayerRef.current = null;
        };
    }, [isOpen]);

    // Switch OpenFreeMap style in place on theme toggle without removing the layer
    useEffect(() => {
        const glLayer = glLayerRef.current;
        if (!glLayer) return;

        const glMap = glLayer.getMaplibreMap();
        if (!glMap) return;

        let cancelled = false;

        if (darkMode) {
            resolveDarkStyleUrl().then((darkUrl) => {
                if (!cancelled && glLayerRef.current) {
                    glMap.setStyle(darkUrl);
                }
            });
        } else {
            glMap.setStyle(OPENFREEMAP_LIGHT_STYLE);
        }

        return () => {
            cancelled = true;
        };
    }, [darkMode]);

    // Render custom 10px divIcon pins with staggered drop-in and 1.3x selected spring scale
    useEffect(() => {
        const layerGroup = markersLayerRef.current;
        if (!layerGroup || !isOpen) return;

        layerGroup.clearLayers();

        // 1. Campus Drop-off Hub Dots (INCAT Green #234B38)
        CAMPUS_HUBS.forEach((hub, idx) => {
            const isSelected = selectedHubId === hub.id;
            const delayMs = prefersReducedMotion ? 0 : Math.min(idx * 25, 180);

            const hubIcon = L.divIcon({
                className: "incat-pin-wrapper",
                html: `<div class="incat-pin-drop" style="animation-delay: ${delayMs}ms;">
          <div class="incat-pin-dot ${isSelected ? "incat-pin-active" : ""}" style="background-color: #234B38;"></div>
        </div>`,
                iconSize: [14, 14],
                iconAnchor: [7, 7],
            });

            const marker = L.marker([hub.lat, hub.lng], { icon: hubIcon });
            marker.bindTooltip(`${hub.name}`, {
                direction: "top",
                offset: [0, -8],
                className: "incat-map-tooltip",
            });
            marker.on("click", () => {
                setPopoverPost(null);
                onSelectHub(selectedHubId === hub.id ? "ALL" : hub.id);
            });
            marker.addTo(layerGroup);
        });

        // 2. Active Lost/Found Item Dots (Red = Lost, Amber = Found)
        posts
            .filter((p) => p.status === "OPEN")
            .forEach((post, idx) => {
                const hub = getHubById(post.hubId);
                const angle = (idx * 1.65) % (Math.PI * 2);
                const latOffset = Math.cos(angle) * 0.00009;
                const lngOffset = Math.sin(angle) * 0.00009;

                const isSelected =
                    activePinPostId === post.id || popoverPost?.id === post.id;
                const dotColor = post.type === "LOST" ? "#B91C1C" : "#D97706";
                const delayMs = prefersReducedMotion
                    ? 0
                    : Math.min((idx + 4) * 35, 260);

                const postIcon = L.divIcon({
                    className: "incat-pin-wrapper",
                    html: `<div class="incat-pin-drop" style="animation-delay: ${delayMs}ms;">
            <div class="incat-pin-dot ${isSelected ? "incat-pin-active" : ""}" style="background-color: ${dotColor};"></div>
          </div>`,
                    iconSize: [14, 14],
                    iconAnchor: [7, 7],
                });

                const marker = L.marker(
                    [hub.lat + latOffset, hub.lng + lngOffset],
                    {
                        icon: postIcon,
                        zIndexOffset: isSelected ? 300 : 100,
                    },
                );

                marker.on("click", () => {
                    setPopoverPost(post);
                    onHighlightPost(post);
                });

                marker.addTo(layerGroup);
            });
    }, [
        isOpen,
        posts,
        selectedHubId,
        activePinPostId,
        popoverPost,
        prefersReducedMotion,
        onSelectHub,
        onHighlightPost,
    ]);

    const handleRecenter = () => {
        if (!mapInstanceRef.current) return;
        mapInstanceRef.current.flyTo(INCAT_CENTER, 18, {
            duration: prefersReducedMotion ? 0 : 0.8,
        });
    };

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
                    className="overflow-hidden mb-6"
                >
                    <div className="border border-border rounded-lg overflow-hidden bg-surface relative">
                        {/* Map Canvas: 260px on mobile, 360px on desktop */}
                        <div
                            ref={mapContainerRef}
                            className="h-65 sm:h-90 w-full z-0"
                        />

                        {/* Recenter on campus button */}
                        <button
                            type="button"
                            onClick={handleRecenter}
                            className="absolute top-3 right-3 z-400 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-surface text-text border border-border rounded-md hover:border-muted transition-colors duration-150"
                        >
                            <Crosshair size={14} strokeWidth={1.5} />
                            Recenter on campus
                        </button>

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
                            <span>INCAT Campus · General Segundo Ave</span>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
