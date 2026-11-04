import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { Crosshair, X, ArrowUpRight } from "lucide-react";
import {
    CAMPUS_HUBS,
    INCAT_CENTER,
    INCAT_MAX_BOUNDS,
    getHubById,
} from "../data/hubs";
import type { PostItem } from "../types";

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

const LIGHT_TILES =
    "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
const DARK_TILES =
    "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";

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
    const tileLayerRef = useRef<L.TileLayer | null>(null);
    const markersLayerRef = useRef<L.LayerGroup | null>(null);

    const [popoverPost, setPopoverPost] = useState<PostItem | null>(null);

    // Initialize Leaflet map inside INCAT bounds when opened
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

        const tileLayer = L.tileLayer(darkMode ? DARK_TILES : LIGHT_TILES, {
            maxZoom: 20,
            subdomains: "abcd",
            attribution: "&copy; OpenStreetMap &copy; CARTO",
        }).addTo(map);

        tileLayerRef.current = tileLayer;
        markersLayerRef.current = L.layerGroup().addTo(map);
        mapInstanceRef.current = map;

        const invalidateTimer = setTimeout(() => {
            map.invalidateSize();
        }, 320);

        return () => {
            clearTimeout(invalidateTimer);
            map.remove();
            mapInstanceRef.current = null;
            tileLayerRef.current = null;
            markersLayerRef.current = null;
        };
    }, [isOpen]);

    // Switch CARTO Positron / Dark Matter tiles with theme
    useEffect(() => {
        if (!tileLayerRef.current) return;
        tileLayerRef.current.setUrl(darkMode ? DARK_TILES : LIGHT_TILES);
    }, [darkMode]);

    // Render custom 10px divIcon pins with staggered drop-in and 1.3x selected spring scale
    useEffect(() => {
        const layerGroup = markersLayerRef.current;
        if (!layerGroup || !isOpen) return;

        layerGroup.clearLayers();

        // 1. Campus Drop-off Hub Dots (Green #234B38)
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

        // 2. Active Lost/Found Item Dots (Red = Lost, Amber/Warm Yellow = Found)
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
