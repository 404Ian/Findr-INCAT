import React, { useEffect, useMemo, useRef, useState } from "react";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import { AnimatePresence, motion } from "motion/react";
import {
    ChevronLeft,
    ChevronRight,
    Compass,
    ExternalLink,
    Layers,
    LocateFixed,
    MapPin,
    Navigation,
    ShieldCheck,
    X,
} from "lucide-react";
import {
    CAMPUS_BOUNDS,
    CAMPUS_CENTER,
    CAMPUS_DEFAULT_ZOOM,
    CAMPUS_HUBS,
    CAMPUS_MAX_BOUNDS_VISCOSITY,
    CAMPUS_MAX_ZOOM,
    CAMPUS_MIN_ZOOM,
    HUB_SNAP_RADIUS_METERS,
    INCAT_PICKER_ZOOM,
    findNearestCampusHub,
    haversineMeters,
    isWithinCampusBounds,
} from "../lib/campus";
import { SPRING_SHEET } from "../lib/motion";
import { useThemeAndI18n } from "../lib/themeAndI18n";
import type { CampusLocation, Post } from "../types";
import { formatCategoryLabel, getCategoryIcon } from "./CategoryArt";
import { Button, StatusBadge } from "./ui/primitives";

export interface CampusMapProps {
    /** Primary posts list */
    posts?: Post[];
    /** Legacy alias if App.tsx passes `items` instead of `posts` */
    items?: Post[];
    /** Optional locations list from /api/locations; falls back to CAMPUS_HUBS */
    locations?: CampusLocation[];
    /** Currently selected post ID */
    selectedPostId?: string | null;
    /** Callback when a user clicks a post marker or detail action */
    onSelectPost?: (post: Post) => void;
    /** Legacy alias if App.tsx passes `onSelectItem` */
    onSelectItem?: (post: Post) => void;
    /** Interactive coordinate picker mode (used inside PostModal) */
    interactivePicker?: boolean;
    pickedCoords?: { lat: number; lng: number } | null;
    onPickCoords?: (coords: {
        lat: number;
        lng: number;
        nearestHubId?: string;
        nearestHubName?: string;
    }) => void;
    className?: string;
    heightClassName?: string;
}

interface ClusteredGroup {
    key: string;
    lat: number;
    lng: number;
    posts: Post[];
}

function formatRelativeTime(iso: string): string {
    const diffMs = Date.now() - new Date(iso).getTime();
    if (Number.isNaN(diffMs)) return "Recently";
    const mins = Math.max(1, Math.floor(diffMs / 60000));
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

export const CampusMap: React.FC<CampusMapProps> = ({
    posts,
    items,
    locations,
    selectedPostId,
    onSelectPost,
    onSelectItem,
    interactivePicker = false,
    pickedCoords = null,
    onPickCoords,
    className = "",
    heightClassName = "h-[360px] min-h-[360px] sm:h-[480px] sm:min-h-[480px]",
}) => {
    const { theme } = useThemeAndI18n();
    const mapWrapperRef = useRef<HTMLDivElement | null>(null);
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);
    const markersLayerRef = useRef<L.LayerGroup | null>(null);
    const hubsLayerRef = useRef<L.LayerGroup | null>(null);
    const pickerMarkerRef = useRef<L.Marker | null>(null);
    const userLocationMarkerRef = useRef<L.CircleMarker | null>(null);
    const toastTimeoutRef = useRef<number | null>(null);

    const allPosts = useMemo(() => posts ?? items ?? [], [posts, items]);
    const allHubs: readonly CampusLocation[] = useMemo(() => {
        if (
            locations &&
            locations.length > 0 &&
            locations.every((loc) => isWithinCampusBounds(loc.lat, loc.lng))
        ) {
            return locations;
        }
        return CAMPUS_HUBS;
    }, [locations]);

    const [activeCluster, setActiveCluster] = useState<ClusteredGroup | null>(
        null,
    );
    const [activePostIndex, setActivePostIndex] = useState(0);
    const [showHubLabels, setShowHubLabels] = useState(true);
    const [locatingUser, setLocatingUser] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [snappedHubName, setSnappedHubName] = useState<string | null>(null);

    const showMapToast = React.useCallback((msg: string) => {
        if (toastTimeoutRef.current !== null) {
            window.clearTimeout(toastTimeoutRef.current);
        }
        setToastMessage(msg);
        toastTimeoutRef.current = window.setTimeout(() => {
            setToastMessage(null);
            toastTimeoutRef.current = null;
        }, 4000);
    }, []);

    useEffect(() => {
        return () => {
            if (toastTimeoutRef.current !== null) {
                window.clearTimeout(toastTimeoutRef.current);
            }
        };
    }, []);

    // Group posts that share the same or very close coordinates (~12 meters)
    const clusteredGroups = useMemo<ClusteredGroup[]>(() => {
        const groups: ClusteredGroup[] = [];
        for (const post of allPosts) {
            const matchingHub = allHubs.find((h) => h.id === post.locationId);
            const rawLat = Number(post.lat);
            const rawLng = Number(post.lng);
            const validInBounds =
                Number.isFinite(rawLat) &&
                Number.isFinite(rawLng) &&
                isWithinCampusBounds(rawLat, rawLng);
            const lat = validInBounds
                ? rawLat
                : (matchingHub?.lat ?? CAMPUS_CENTER[0]);
            const lng = validInBounds
                ? rawLng
                : (matchingHub?.lng ?? CAMPUS_CENTER[1]);
            const existing = groups.find(
                (g) => haversineMeters(g.lat, g.lng, lat, lng) < 12,
            );
            if (existing) {
                existing.posts.push(post);
            } else {
                groups.push({
                    key: `${lat.toFixed(5)}:${lng.toFixed(5)}:${post.id}`,
                    lat,
                    lng,
                    posts: [post],
                });
            }
        }
        return groups;
    }, [allPosts, allHubs]);

    // Sync external selectedPostId from Wall with the map's active cluster preview
    useEffect(() => {
        if (!selectedPostId || interactivePicker) return;
        const foundCluster = clusteredGroups.find((c) =>
            c.posts.some((p) => p.id === selectedPostId),
        );
        if (foundCluster) {
            const idx = foundCluster.posts.findIndex(
                (p) => p.id === selectedPostId,
            );
            setActiveCluster(foundCluster);
            setActivePostIndex(Math.max(0, idx));
            mapInstanceRef.current?.panTo(
                [foundCluster.lat, foundCluster.lng],
                { animate: true },
            );
        }
    }, [selectedPostId, clusteredGroups, interactivePicker]);

    // Initialize Leaflet Map centered on INCAT Campus with bounds & ResizeObserver
    useEffect(() => {
        const container = mapContainerRef.current;
        if (!container || mapInstanceRef.current) return;

        const initialZoom = interactivePicker
            ? INCAT_PICKER_ZOOM
            : CAMPUS_DEFAULT_ZOOM;

        const map = L.map(container, {
            center: CAMPUS_CENTER,
            zoom: initialZoom,
            minZoom: CAMPUS_MIN_ZOOM,
            maxZoom: CAMPUS_MAX_ZOOM,
            maxBounds: CAMPUS_BOUNDS,
            maxBoundsViscosity: CAMPUS_MAX_BOUNDS_VISCOSITY,
            zoomControl: false,
        });

        map.setView(CAMPUS_CENTER, initialZoom);

        L.control.zoom({ position: "bottomright" }).addTo(map);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution:
                '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: CAMPUS_MAX_ZOOM,
        }).addTo(map);

        const hubsLayer = L.layerGroup().addTo(map);
        const markersLayer = L.layerGroup().addTo(map);

        hubsLayerRef.current = hubsLayer;
        markersLayerRef.current = markersLayer;
        mapInstanceRef.current = map;

        const invalidate = () => {
            map.invalidateSize({ pan: false });
        };

        const rafId = window.requestAnimationFrame(invalidate);
        const timer1 = window.setTimeout(invalidate, 120);
        const timer2 = window.setTimeout(invalidate, 360);
        const timer3 = window.setTimeout(invalidate, 600);

        const resizeObserver =
            typeof ResizeObserver !== "undefined"
                ? new ResizeObserver(() => {
                      invalidate();
                  })
                : null;

        resizeObserver?.observe(container);
        if (mapWrapperRef.current) {
            resizeObserver?.observe(mapWrapperRef.current);
        }

        window.addEventListener("resize", invalidate);

        return () => {
            window.cancelAnimationFrame(rafId);
            window.clearTimeout(timer1);
            window.clearTimeout(timer2);
            window.clearTimeout(timer3);
            window.removeEventListener("resize", invalidate);
            resizeObserver?.disconnect();
            map.remove();
            mapInstanceRef.current = null;
            markersLayerRef.current = null;
            hubsLayerRef.current = null;
            pickerMarkerRef.current = null;
            userLocationMarkerRef.current = null;
        };
    }, [interactivePicker]);

    // Helper to resolve coordinates & snap to nearest INCAT hub when within threshold
    const emitPickedCoordinates = React.useCallback(
        (rawLat: number, rawLng: number, snapToHub = false) => {
            const nearest = findNearestCampusHub(rawLat, rawLng, allHubs);
            const shouldSnap =
                snapToHub ||
                (nearest !== null &&
                    nearest.distanceMeters <= HUB_SNAP_RADIUS_METERS);
            const finalLat =
                shouldSnap && snapToHub && nearest
                    ? nearest.hub.lat
                    : Number(rawLat.toFixed(6));
            const finalLng =
                shouldSnap && snapToHub && nearest
                    ? nearest.hub.lng
                    : Number(rawLng.toFixed(6));

            if (nearest) {
                setSnappedHubName(
                    nearest.distanceMeters <= HUB_SNAP_RADIUS_METERS
                        ? `${nearest.hub.name} (${nearest.hub.buildingCode})`
                        : `Near ${nearest.hub.name} (${Math.round(nearest.distanceMeters)}m)`,
                );
            }

            onPickCoords?.({
                lat: finalLat,
                lng: finalLng,
                nearestHubId: nearest?.hub.id,
                nearestHubName: nearest?.hub.name,
            });
        },
        [allHubs, onPickCoords],
    );

    // Handle interactive map click when used inside PostModal
    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map || !interactivePicker) return;

        const handleMapClick = (e: L.LeafletMouseEvent) => {
            emitPickedCoordinates(e.latlng.lat, e.latlng.lng, false);
        };

        map.on("click", handleMapClick);
        return () => {
            map.off("click", handleMapClick);
        };
    }, [interactivePicker, emitPickedCoordinates]);

    // Render draggable picked coordinate pin in interactive picker mode
    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map) return;

        if (!interactivePicker || !pickedCoords) {
            if (pickerMarkerRef.current) {
                pickerMarkerRef.current.remove();
                pickerMarkerRef.current = null;
            }
            return;
        }

        const nearest = findNearestCampusHub(
            pickedCoords.lat,
            pickedCoords.lng,
            allHubs,
        );
        if (nearest) {
            setSnappedHubName(
                nearest.distanceMeters <= HUB_SNAP_RADIUS_METERS
                    ? `${nearest.hub.name} (${nearest.hub.buildingCode})`
                    : `Near ${nearest.hub.name} (${Math.round(nearest.distanceMeters)}m)`,
            );
        }

        const icon = L.divIcon({
            className: "incat-pin-wrapper",
            html: `
        <div class="incat-pin-drop" style="
          width:38px;height:38px;border-radius:9999px;
          background:#234b38;color:#fafaf9;
          border:3px solid #ffffff;
          box-shadow:0 8px 20px rgba(35,75,56,0.45);
          transform:translate(-50%,-50%);
          cursor:grab;
        " title="Drag to fine-tune location">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
      `,
            iconSize: [0, 0],
        });

        if (!pickerMarkerRef.current) {
            const marker = L.marker([pickedCoords.lat, pickedCoords.lng], {
                icon,
                draggable: true,
                zIndexOffset: 1000,
            }).addTo(map);

            marker.on("dragend", () => {
                const pos = marker.getLatLng();
                emitPickedCoordinates(pos.lat, pos.lng, false);
            });

            pickerMarkerRef.current = marker;
        } else {
            pickerMarkerRef.current.setLatLng([
                pickedCoords.lat,
                pickedCoords.lng,
            ]);
        }

        map.panTo([pickedCoords.lat, pickedCoords.lng], { animate: true });
    }, [interactivePicker, pickedCoords, allHubs, emitPickedCoordinates]);

    // Render INCAT campus building hubs (Distinct style for official drop-off hubs)
    useEffect(() => {
        const hubsLayer = hubsLayerRef.current;
        if (!hubsLayer) return;

        hubsLayer.clearLayers();
        if (!showHubLabels) return;

        for (const hub of allHubs) {
            const isOfficialHub = hub.isDropOffHub;
            const bg = isOfficialHub ? "#234b38" : "#44403c";
            const border = isOfficialHub ? "#86efac" : "#a8a29e";

            const badgeHtml = `
        <div class="incat-pin-drop" style="
          width:auto;height:auto;
          display:inline-flex;align-items:center;gap:4px;
          padding:2px 8px;border-radius:9999px;
          background:${bg};
          color:#fafaf9;
          border:1.5px solid ${border};
          font-size:10px;font-weight:700;white-space:nowrap;
          box-shadow:0 2px 8px rgba(0,0,0,0.28);
          transform:translate(-50%, -50%);
          cursor:pointer;
        ">
          ${
              isOfficialHub
                  ? `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#86efac" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`
                  : `<span style="width:5px;height:5px;border-radius:9999px;background:#d6d3d1;"></span>`
          }
          <span>${hub.buildingCode}</span>
        </div>
      `;

            const marker = L.marker([hub.lat, hub.lng], {
                icon: L.divIcon({
                    className: "incat-pin-wrapper",
                    html: badgeHtml,
                    iconSize: [0, 0],
                }),
            });

            marker.bindTooltip(
                `<div style="font-size:11px;line-height:1.35;">
                    <strong>${hub.name}</strong><br/>
                    <span style="opacity:0.85;">${
                        isOfficialHub
                            ? "Official Drop-off & Safekeeping Hub"
                            : "Campus Landmark"
                    }</span>
                </div>`,
                {
                    direction: "top",
                    offset: [0, -12],
                    className: "incat-hub-tooltip",
                },
            );

            if (interactivePicker) {
                marker.on("click", () => {
                    emitPickedCoordinates(hub.lat, hub.lng, true);
                });
            }

            marker.addTo(hubsLayer);
        }
    }, [allHubs, showHubLabels, interactivePicker, emitPickedCoordinates]);

    // Render Lost / Found / Returned item markers with clustering & mount scale-in
    useEffect(() => {
        const markersLayer = markersLayerRef.current;
        if (!markersLayer) return;

        markersLayer.clearLayers();
        if (interactivePicker) return;

        for (const cluster of clusteredGroups) {
            const primary = cluster.posts[0];
            const count = cluster.posts.length;
            const isSelected =
                cluster.posts.some((p) => p.id === selectedPostId) ||
                activeCluster?.key === cluster.key;

            const hasLost = cluster.posts.some(
                (p) => p.type === "lost" && p.status !== "returned",
            );
            const hasFound = cluster.posts.some(
                (p) => p.type === "found" && p.status !== "returned",
            );

            let bg = "#4b6356"; // Returned muted green/gray
            let ring = "rgba(75,99,86,0.35)";
            if (hasLost) {
                bg = "#c23b2b"; // Lost coral/red
                ring = "rgba(194,59,43,0.4)";
            } else if (hasFound) {
                bg = "#c87a19"; // Found warm amber
                ring = "rgba(200,122,25,0.42)";
            }

            const sizePx = count > 1 ? 36 : 30;

            const pinHtml = `
        <div class="incat-pin-drop" style="
          position:relative;
          display:flex;align-items:center;justify-content:center;
          width:${sizePx}px;
          height:${sizePx}px;
          border-radius:9999px;
          background:${bg};
          color:#ffffff;
          font-weight:700;font-size:12px;
          border:2.5px solid #ffffff;
          box-shadow:0 0 0 ${isSelected ? "7px" : "4px"} ${ring}, 0 6px 14px rgba(0,0,0,0.35);
          transform:translate(-50%, -50%) scale(${isSelected ? "1.18" : "1"});
          transition:transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1);
          cursor:pointer;
        ">
          ${
              count > 1
                  ? `<span>${count}</span>`
                  : `<span style="width:8px;height:8px;border-radius:9999px;background:#ffffff;"></span>`
          }
        </div>
      `;

            const marker = L.marker([cluster.lat, cluster.lng], {
                icon: L.divIcon({
                    className: "incat-pin-wrapper",
                    html: pinHtml,
                    iconSize: [0, 0],
                }),
                zIndexOffset: isSelected ? 950 : 500,
            });

            marker.on("click", () => {
                setActiveCluster(cluster);
                setActivePostIndex(0);
                mapInstanceRef.current?.panTo([cluster.lat, cluster.lng], {
                    animate: true,
                });
            });

            marker.bindTooltip(
                count > 1
                    ? `${count} notices at ${primary.locationName}`
                    : `${primary.status === "returned" ? "RETURNED" : primary.type.toUpperCase()}: ${primary.title}`,
                {
                    direction: "top",
                    offset: [0, -14],
                    className: "incat-hub-tooltip",
                },
            );

            marker.addTo(markersLayer);
        }
    }, [
        clusteredGroups,
        selectedPostId,
        activeCluster?.key,
        interactivePicker,
    ]);

    const handleResetIncatCenter = () => {
        setToastMessage(null);
        mapInstanceRef.current?.setView(CAMPUS_CENTER, CAMPUS_DEFAULT_ZOOM, {
            animate: true,
        });
    };

    const handleLocateMe = () => {
        setToastMessage(null);
        if (!("geolocation" in navigator)) {
            showMapToast("Geolocation is not supported by your browser.");
            return;
        }
        setLocatingUser(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setLocatingUser(false);
                const { latitude, longitude } = pos.coords;
                const map = mapInstanceRef.current;
                if (!map) return;

                if (!isWithinCampusBounds(latitude, longitude)) {
                    showMapToast("You're not on campus. Showing INCAT.");
                    return;
                }

                if (userLocationMarkerRef.current) {
                    userLocationMarkerRef.current.remove();
                }

                userLocationMarkerRef.current = L.circleMarker(
                    [latitude, longitude],
                    {
                        radius: 8,
                        color: "#ffffff",
                        weight: 2.5,
                        fillColor: "#1d6fa5",
                        fillOpacity: 1,
                    },
                )
                    .bindTooltip("Your GPS location", {
                        direction: "top",
                        className: "incat-hub-tooltip",
                    })
                    .addTo(map);

                map.flyTo([latitude, longitude], 18, { duration: 0.75 });

                if (interactivePicker) {
                    emitPickedCoordinates(latitude, longitude, false);
                }
            },
            () => {
                setLocatingUser(false);
                showMapToast("You're not on campus. Showing INCAT.");
            },
            { enableHighAccuracy: true, timeout: 8000 },
        );
    };

    const activePost =
        activeCluster && activeCluster.posts[activePostIndex]
            ? activeCluster.posts[activePostIndex]
            : null;

    const lostCount = useMemo(
        () =>
            allPosts.filter((p) => p.type === "lost" && p.status !== "returned")
                .length,
        [allPosts],
    );
    const foundCount = useMemo(
        () =>
            allPosts.filter(
                (p) => p.type === "found" && p.status !== "returned",
            ).length,
        [allPosts],
    );
    const returnedCount = useMemo(
        () => allPosts.filter((p) => p.status === "returned").length,
        [allPosts],
    );

    return (
        <div
            className={`theme-surface overflow-hidden rounded-2xl border border-border bg-surface shadow-md ${
                theme === "dark" ? "incat-osm-dark-raster" : ""
            } ${className}`}
        >
            {/* Relative Map Wrapper with Explicit Height */}
            <div
                ref={mapWrapperRef}
                className={`relative w-full ${heightClassName}`}
            >
                {/* Leaflet Map Canvas */}
                <div
                    ref={mapContainerRef}
                    className={`w-full ${heightClassName} bg-subtle`}
                    aria-label="INCAT Campus interactive map"
                />

                {/* Top Overlay Controls (Inside relative wrapper, z-1000) */}
                <div className="pointer-events-none absolute top-2.5 right-2.5 left-2.5 z-1000 flex flex-wrap items-start justify-between gap-1.5 sm:top-3 sm:right-3 sm:left-3 sm:items-center sm:gap-2">
                    <div className="pointer-events-auto inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface/92 px-2.5 py-1.5 text-[11px] font-medium text-text shadow-sm backdrop-blur-md sm:px-3 sm:text-xs">
                        <Compass className="h-3.5 w-3.5 shrink-0 text-accent" />
                        <span className="font-semibold">INCAT Campus</span>
                        {interactivePicker && snappedHubName ? (
                            <span className="rounded-md bg-accent-soft px-1.5 py-0.5 text-[10px] font-semibold text-accent sm:text-[11px]">
                                {snappedHubName}
                            </span>
                        ) : (
                            <span className="hidden text-muted md:inline">
                                &middot; P. Gomez St., Laoag City
                            </span>
                        )}
                    </div>

                    <div className="pointer-events-auto flex flex-wrap items-center gap-1 sm:gap-1.5">
                        <button
                            type="button"
                            onClick={() => setShowHubLabels((prev) => !prev)}
                            className={`inline-flex min-h-8 items-center gap-1 rounded-xl border px-2 py-1 text-[11px] font-semibold shadow-sm backdrop-blur-md transition-colors cursor-pointer sm:min-h-9 sm:gap-1.5 sm:px-2.5 sm:py-1.5 sm:text-xs ${
                                showHubLabels
                                    ? "border-accent bg-accent text-accent-fg"
                                    : "border-border bg-surface/92 text-text-secondary hover:bg-subtle"
                            }`}
                            title="Toggle INCAT building hub badges"
                        >
                            <Layers className="h-3.5 w-3.5 shrink-0" />
                            <span>Hubs</span>
                        </button>

                        <button
                            type="button"
                            onClick={handleLocateMe}
                            disabled={locatingUser}
                            className="inline-flex min-h-8 items-center gap-1 rounded-xl border border-border bg-surface/92 px-2 py-1 text-[11px] font-semibold text-text shadow-sm backdrop-blur-md transition-colors hover:bg-subtle disabled:opacity-50 cursor-pointer sm:min-h-9 sm:gap-1.5 sm:px-2.5 sm:py-1.5 sm:text-xs"
                            title="Locate me via GPS"
                        >
                            <LocateFixed
                                className={`h-3.5 w-3.5 shrink-0 text-accent ${
                                    locatingUser ? "animate-spin" : ""
                                }`}
                            />
                            <span>
                                {locatingUser ? "Locating..." : "Locate me"}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={handleResetIncatCenter}
                            className="inline-flex min-h-8 items-center gap-1 rounded-xl border border-border bg-surface/92 px-2 py-1 text-[11px] font-semibold text-text shadow-sm backdrop-blur-md transition-colors hover:bg-subtle cursor-pointer sm:min-h-9 sm:gap-1.5 sm:px-2.5 sm:py-1.5 sm:text-xs"
                            title="Reset view to INCAT Campus center"
                        >
                            <Navigation className="h-3.5 w-3.5 shrink-0 text-accent" />
                            <span>Reset view</span>
                        </button>
                    </div>
                </div>

                {/* Dismissible 4-Second Toast Overlay */}
                <AnimatePresence>
                    {toastMessage && (
                        <motion.div
                            key="campus-map-toast"
                            role="status"
                            aria-live="polite"
                            initial={{ opacity: 0, y: -8, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -8, scale: 0.96 }}
                            transition={SPRING_SHEET}
                            className="pointer-events-auto absolute top-20 left-1/2 z-1000 flex max-w-[calc(100%-1.5rem)] -translate-x-1/2 items-center gap-2 rounded-xl border border-border-strong bg-surface/95 px-3 py-1.5 text-xs font-semibold text-text shadow-md backdrop-blur-md sm:top-14"
                        >
                            <span>{toastMessage}</span>
                            <button
                                type="button"
                                onClick={() => setToastMessage(null)}
                                aria-label="Dismiss notification"
                                className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-muted hover:bg-subtle hover:text-text cursor-pointer"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Bottom-Left Wrapping Legend Overlay (Inside relative wrapper, z-[1000]) */}
                <div className="pointer-events-auto absolute bottom-6 left-2.5 z-1000 flex max-w-[calc(100%-3.75rem)] flex-wrap items-center gap-x-2.5 gap-y-1 rounded-xl border border-border bg-surface/92 px-2.5 py-1.5 text-[11px] leading-tight text-text-secondary shadow-sm backdrop-blur-md sm:bottom-3 sm:left-3 sm:max-w-[calc(100%-14rem)]">
                    {interactivePicker ? (
                        <span className="inline-flex items-center gap-1.5 font-medium">
                            <MapPin className="h-3 w-3 shrink-0 text-accent" />
                            <span>
                                Tap campus, drag pin, or tap a hub badge.
                            </span>
                        </span>
                    ) : (
                        <>
                            <span className="inline-flex items-center gap-1 font-medium">
                                <span className="h-2 w-2 shrink-0 rounded-full bg-lost" />
                                <span>Lost ({lostCount})</span>
                            </span>
                            <span className="inline-flex items-center gap-1 font-medium">
                                <span className="h-2 w-2 shrink-0 rounded-full bg-found" />
                                <span>Found ({foundCount})</span>
                            </span>
                            <span className="inline-flex items-center gap-1 font-medium">
                                <span className="h-2 w-2 shrink-0 rounded-full bg-returned" />
                                <span>Returned ({returnedCount})</span>
                            </span>
                            <span className="inline-flex items-center gap-1 font-semibold text-accent">
                                <ShieldCheck className="h-3 w-3 shrink-0" />
                                <span>Official Drop-off Hubs</span>
                            </span>
                        </>
                    )}
                </div>

                {/* Slide-Up Detail Card (Bottom Sheet on Mobile, Floating Side Panel on Desktop) */}
                <AnimatePresence>
                    {!interactivePicker && activePost && activeCluster && (
                        <motion.div
                            key={activeCluster.key}
                            initial={{ opacity: 0, y: 24, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 16, scale: 0.98 }}
                            transition={SPRING_SHEET}
                            className="theme-surface absolute right-3 bottom-16 left-3 z-1000 rounded-2xl border border-border-strong bg-surface/98 p-3.5 shadow-lg backdrop-blur-md sm:right-auto sm:bottom-14 sm:left-3 sm:w-96"
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex flex-wrap items-center gap-1.5">
                                    <StatusBadge
                                        type={activePost.type}
                                        status={activePost.status}
                                    />
                                    <span className="text-[11px] text-muted">
                                        {formatRelativeTime(
                                            activePost.createdAt,
                                        )}
                                    </span>
                                    {activeCluster.posts.length > 1 && (
                                        <span className="rounded-full bg-subtle px-2 py-0.5 text-[11px] font-semibold text-text-secondary">
                                            {activePostIndex + 1} of{" "}
                                            {activeCluster.posts.length} here
                                        </span>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setActiveCluster(null)}
                                    aria-label="Close pin preview"
                                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted hover:bg-subtle hover:text-text cursor-pointer"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            {/* Thumbnail + Title + Summary */}
                            <div className="mt-2.5 flex gap-3">
                                <div className="h-16 w-20 shrink-0 overflow-hidden rounded-xl border border-border bg-subtle">
                                    {activePost.imageUrls.length > 0 ? (
                                        <img
                                            src={activePost.imageUrls[0]}
                                            alt={activePost.title}
                                            loading="lazy"
                                            decoding="async"
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center text-muted">
                                            {getCategoryIcon(
                                                activePost.category,
                                                24,
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="text-[11px] font-medium text-muted">
                                        {formatCategoryLabel(
                                            activePost.category,
                                        )}
                                    </div>
                                    <h4 className="font-display truncate text-sm font-bold text-text">
                                        {activePost.title}
                                    </h4>
                                    <p className="mt-0.5 line-clamp-2 text-xs text-text-secondary">
                                        {activePost.description}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-2.5 text-xs">
                                <span className="inline-flex items-center gap-1 truncate font-medium text-text-secondary">
                                    <MapPin className="h-3.5 w-3.5 shrink-0 text-accent" />
                                    <span className="truncate">
                                        {activePost.locationName}
                                    </span>
                                </span>

                                <div className="flex shrink-0 items-center gap-1.5">
                                    {activeCluster.posts.length > 1 && (
                                        <div className="inline-flex items-center rounded-lg border border-border bg-subtle p-0.5">
                                            <button
                                                type="button"
                                                aria-label="Previous item at this location"
                                                onClick={() =>
                                                    setActivePostIndex(
                                                        (prev) =>
                                                            (prev -
                                                                1 +
                                                                activeCluster
                                                                    .posts
                                                                    .length) %
                                                            activeCluster.posts
                                                                .length,
                                                    )
                                                }
                                                className="rounded p-1 text-text-secondary hover:bg-surface hover:text-text cursor-pointer"
                                            >
                                                <ChevronLeft className="h-3.5 w-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                aria-label="Next item at this location"
                                                onClick={() =>
                                                    setActivePostIndex(
                                                        (prev) =>
                                                            (prev + 1) %
                                                            activeCluster.posts
                                                                .length,
                                                    )
                                                }
                                                className="rounded p-1 text-text-secondary hover:bg-surface hover:text-text cursor-pointer"
                                            >
                                                <ChevronRight className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    )}
                                    {(onSelectPost || onSelectItem) && (
                                        <Button
                                            variant="primary"
                                            size="sm"
                                            onClick={() => {
                                                onSelectPost?.(activePost);
                                                onSelectItem?.(activePost);
                                            }}
                                            rightIcon={
                                                <ExternalLink className="h-3 w-3" />
                                            }
                                        >
                                            View
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Quick-Snap Building Hub Pills in Interactive Picker Mode */}
            {interactivePicker && (
                <div className="flex items-center gap-1.5 overflow-x-auto border-t border-border bg-subtle/60 px-3 py-2 text-xs">
                    <span className="shrink-0 font-semibold text-muted">
                        Snap to hub:
                    </span>
                    {allHubs.slice(0, 7).map((hub) => (
                        <button
                            key={hub.id}
                            type="button"
                            onClick={() =>
                                emitPickedCoordinates(hub.lat, hub.lng, true)
                            }
                            className="shrink-0 rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] font-medium text-text-secondary transition-colors hover:border-accent hover:text-accent cursor-pointer"
                        >
                            {hub.name}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CampusMap;
