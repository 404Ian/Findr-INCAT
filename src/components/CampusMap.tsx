import React, { useEffect, useRef, useState } from "react";
import { L, maplibregl } from "../lib/setupMaplibre";
import "@maplibre/maplibre-gl-leaflet";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { Crosshair, X, ArrowUpRight } from "lucide-react";
import {
    CAMPUS_HUBS,
    INCAT_CENTER,
    INCAT_MAX_BOUNDS,
    getHubById,
} from "../data/hubs";
import { BUILDINGS, INCAT_BUILDINGS_GEOJSON } from "../data/buildings";
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

const OPENFREEMAP_LIBERTY_STYLE =
    "https://tiles.openfreemap.org/styles/liberty";
const OPENFREEMAP_DARK_STYLE = "https://tiles.openfreemap.org/styles/dark";

const ESRI_WORLD_IMAGERY_TILES =
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const ESRI_LIGHT_GRAY_FALLBACK =
    "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}";

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
    const satelliteLayerRef = useRef<L.TileLayer | null>(null);
    const buildingsLayerRef = useRef<L.GeoJSON | null>(null);
    const labelsLayerRef = useRef<L.LayerGroup | null>(null);
    const markersLayerRef = useRef<L.LayerGroup | null>(null);

    const [baseMode, setBaseMode] = useState<BaseMapMode>("map");
    const [currentZoom, setCurrentZoom] = useState<number>(18);
    const [popoverPost, setPopoverPost] = useState<PostItem | null>(null);

    // Initialize Leaflet map, OpenFreeMap Liberty/Dark vector layer, Satellite layer, and GeoJSON buildings
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

        setCurrentZoom(map.getZoom());
        map.on("zoomend", () => {
            setCurrentZoom(map.getZoom());
        });

        const mountEsriFallbackOnlyOnFatalFailure = () => {
            if (!mapInstanceRef.current) return;
            L.tileLayer(ESRI_LIGHT_GRAY_FALLBACK, {
                minZoom: 16,
                maxZoom: 20,
                maxNativeZoom: 16,
            }).addTo(mapInstanceRef.current);
        };

        const styleUrl = darkMode
            ? OPENFREEMAP_DARK_STYLE
            : OPENFREEMAP_LIBERTY_STYLE;

        const leafletWithGL = L as unknown as {
            maplibreGL?: (options: {
                style: string;
                attributionControl?: boolean;
            }) => MaplibreGLLayer;
        };

        if (
            isWebGLSupported() &&
            typeof leafletWithGL.maplibreGL === "function"
        ) {
            try {
                const glLayer = leafletWithGL
                    .maplibreGL({
                        style: styleUrl,
                        attributionControl: false,
                    })
                    .addTo(map);
                glLayerRef.current = glLayer;

                // Verify the style JSON endpoint itself is reachable; do NOT trigger fallback on minor glyph/tile warnings
                fetch(styleUrl, { method: "GET" }).catch(() => {
                    mountEsriFallbackOnlyOnFatalFailure();
                });
            } catch {
                mountEsriFallbackOnlyOnFatalFailure();
            }
        } else {
            mountEsriFallbackOnlyOnFatalFailure();
        }

        // Satellite raster layer kept ready at opacity 0 for instant 250ms crossfade
        const satLayer = L.tileLayer(ESRI_WORLD_IMAGERY_TILES, {
            minZoom: 16,
            maxZoom: 20,
            maxNativeZoom: 19,
            opacity: baseMode === "satellite" ? 1 : 0,
            className: "incat-satellite-layer",
        }).addTo(map);
        satelliteLayerRef.current = satLayer;

        // Layer groups for buildings, zoom-gated building labels, and pins
        labelsLayerRef.current = L.layerGroup().addTo(map);
        markersLayerRef.current = L.layerGroup().addTo(map);
        mapInstanceRef.current = map;

        // Keep MapLibre WebGL canvas synced when expand animation runs
        const resizeObserver = new ResizeObserver(() => {
            map.invalidateSize();
            const glMap = glLayerRef.current?.getMaplibreMap();
            if (glMap) glMap.resize();
        });
        resizeObserver.observe(mapContainerRef.current);

        return () => {
            resizeObserver.disconnect();
            map.remove();
            mapInstanceRef.current = null;
            glLayerRef.current = null;
            satelliteLayerRef.current = null;
            buildingsLayerRef.current = null;
            labelsLayerRef.current = null;
            markersLayerRef.current = null;
        };
    }, [isOpen]);

    // Switch between OpenFreeMap Liberty (light) and Dark (dark) in place via setStyle()
    useEffect(() => {
        const glMap = glLayerRef.current?.getMaplibreMap();
        if (!glMap) return;

        const targetStyle = darkMode
            ? OPENFREEMAP_DARK_STYLE
            : OPENFREEMAP_LIBERTY_STYLE;
        glMap.setStyle(targetStyle);
    }, [darkMode]);

    // Crossfade Map <-> Satellite over 250ms and update attribution
    useEffect(() => {
        const map = mapInstanceRef.current;
        const satLayer = satelliteLayerRef.current;
        const glContainer = glLayerRef.current
            ?.getMaplibreMap()
            ?.getContainer();

        if (!map || !satLayer) return;

        if (baseMode === "satellite") {
            satLayer.setOpacity(1);
            if (glContainer) {
                glContainer.style.transition = "opacity 250ms ease";
                glContainer.style.opacity = "0";
            }
            map.attributionControl.removeAttribution(OPENFREEMAP_ATTRIBUTION);
            map.attributionControl.addAttribution(ESRI_SATELLITE_ATTRIBUTION);
        } else {
            satLayer.setOpacity(0);
            if (glContainer) {
                glContainer.style.transition = "opacity 250ms ease";
                glContainer.style.opacity = "1";
            }
            map.attributionControl.removeAttribution(
                ESRI_SATELLITE_ATTRIBUTION,
            );
            map.attributionControl.addAttribution(OPENFREEMAP_ATTRIBUTION);
        }
    }, [baseMode]);

    // Render INCAT Building Polygons (12% green fill, 1px outline, hover highlight, click to filter)
    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map || !isOpen) return;

        if (buildingsLayerRef.current) {
            map.removeLayer(buildingsLayerRef.current);
        }

        const strokeColor =
            baseMode === "satellite"
                ? "#4ADE80"
                : darkMode
                  ? "#4ADE80"
                  : "#234B38";
        const fillColor =
            baseMode === "satellite"
                ? "#22C55E"
                : darkMode
                  ? "#356B52"
                  : "#234B38";

        const geoJsonLayer = L.geoJSON(INCAT_BUILDINGS_GEOJSON, {
            style: (feature) => {
                const isSelected = feature?.properties?.hubId === selectedHubId;
                return {
                    color: strokeColor,
                    weight: isSelected ? 2 : 1,
                    opacity: isSelected ? 0.95 : 0.7,
                    fillColor,
                    fillOpacity: isSelected ? 0.26 : 0.12,
                    lineJoin: "round",
                };
            },
            onEachFeature: (feature, layer) => {
                const pathLayer = layer as L.Path;
                const hubId = feature.properties.hubId;
                const isSelected = hubId === selectedHubId;

                layer.on("mouseover", () => {
                    pathLayer.setStyle({
                        fillOpacity: 0.24,
                        weight: 1.5,
                        opacity: 0.9,
                    });
                });

                layer.on("mouseout", () => {
                    pathLayer.setStyle({
                        fillOpacity: isSelected ? 0.26 : 0.12,
                        weight: isSelected ? 2 : 1,
                        opacity: isSelected ? 0.95 : 0.7,
                    });
                });

                layer.on("click", (e) => {
                    L.DomEvent.stopPropagation(e);
                    setPopoverPost(null);
                    onSelectHub(selectedHubId === hubId ? "ALL" : hubId);
                });
            },
        }).addTo(map);

        buildingsLayerRef.current = geoJsonLayer;
    }, [isOpen, selectedHubId, darkMode, baseMode, onSelectHub]);

    // Render 11px Muted Building Name Labels (shown only at zoom >= 18)
    useEffect(() => {
        const labelsGroup = labelsLayerRef.current;
        if (!labelsGroup || !isOpen) return;

        labelsGroup.clearLayers();
        if (currentZoom < 18) return;

        BUILDINGS.forEach((bldg) => {
            const labelIcon = L.divIcon({
                className: "incat-bldg-label-wrapper",
                html: `<span class="incat-bldg-label ${
                    baseMode === "satellite" ? "incat-bldg-label-sat" : ""
                }">${bldg.shortLabel}</span>`,
                iconSize: [120, 18],
                iconAnchor: [60, 9],
            });

            const labelMarker = L.marker(bldg.labelPosition, {
                icon: labelIcon,
                interactive: false,
            });
            labelMarker.addTo(labelsGroup);
        });
    }, [isOpen, currentZoom, baseMode]);

    // Render 10px Ringed Hub & Item Pins at Building Entrances
    useEffect(() => {
        const layerGroup = markersLayerRef.current;
        if (!layerGroup || !isOpen) return;

        layerGroup.clearLayers();

        // 1. Campus Drop-off Hub Dots (INCAT Green #234B38) placed at building entrances
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

        // 2. Active Lost/Found Item Dots placed slightly offset from the building entrance
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
                        {/* Map Viewport: 300px on mobile, 420px on desktop */}
                        <div
                            ref={mapContainerRef}
                            className="h-[300px] sm:h-[420px] w-full z-0"
                        />

                        {/* Top-Right Controls: Map / Satellite Segmented Control + Recenter Button */}
                        <div className="absolute top-3 right-3 z-[400] flex items-center gap-2">
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

                        {/* Active Building Filter Pill (when a building polygon is clicked) */}
                        {selectedHubId !== "ALL" && (
                            <div className="absolute bottom-12 left-3 z-[400] inline-flex items-center gap-2 px-3 py-1.5 bg-surface border border-border rounded-md text-xs text-text">
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
                                    className="absolute bottom-12 left-3 right-3 sm:left-auto sm:right-3 sm:w-72 z-[400] bg-surface border border-border rounded-md p-3.5 shadow-popover"
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
