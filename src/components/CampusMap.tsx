import React, { useEffect, useMemo, useRef, useState } from "react";
import * as L from "leaflet";
import {
    Compass,
    ExternalLink,
    Layers,
    LocateFixed,
    MapPin,
    Navigation,
    ShieldCheck,
    X,
} from "lucide-react";
import { CAMPUS_HUBS, INCAT_CENTER } from "../data/hubs";
import type { CampusLocation, Post } from "../types";

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

const LEAFLET_CSS_ID = "findr-leaflet-css";

function ensureLeafletStylesheet(): void {
    if (typeof document === "undefined") return;
    if (document.getElementById(LEAFLET_CSS_ID)) return;
    const link = document.createElement("link");
    link.id = LEAFLET_CSS_ID;
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    link.crossOrigin = "";
    document.head.appendChild(link);
}

function haversineMeters(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
): number {
    const R = 6371e3;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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
    heightClassName = "h-[440px]",
}) => {
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);
    const markersLayerRef = useRef<L.LayerGroup | null>(null);
    const hubsLayerRef = useRef<L.LayerGroup | null>(null);
    const pickerMarkerRef = useRef<L.Marker | null>(null);
    const userLocationMarkerRef = useRef<L.CircleMarker | null>(null);

    const allPosts = useMemo(() => posts ?? items ?? [], [posts, items]);
    const allHubs: readonly CampusLocation[] = useMemo(
        () => (locations && locations.length > 0 ? locations : CAMPUS_HUBS),
        [locations],
    );

    const [activeCluster, setActiveCluster] = useState<ClusteredGroup | null>(
        null,
    );
    const [activePostIndex, setActivePostIndex] = useState(0);
    const [showHubLabels, setShowHubLabels] = useState(true);
    const [locatingUser, setLocatingUser] = useState(false);
    const [geoError, setGeoError] = useState<string | null>(null);

    // Group posts that share the same or very close coordinates (~12 meters)
    const clusteredGroups = useMemo<ClusteredGroup[]>(() => {
        const groups: ClusteredGroup[] = [];
        for (const post of allPosts) {
            const lat = Number(post.lat) || INCAT_CENTER.lat;
            const lng = Number(post.lng) || INCAT_CENTER.lng;
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
    }, [allPosts]);

    // Initialize Leaflet Map centered on INCAT Campus
    useEffect(() => {
        ensureLeafletStylesheet();
        if (!mapContainerRef.current || mapInstanceRef.current) return;

        const map = L.map(mapContainerRef.current, {
            center: [INCAT_CENTER.lat, INCAT_CENTER.lng],
            zoom: interactivePicker ? 18 : INCAT_CENTER.zoom,
            minZoom: 15,
            maxZoom: 20,
            zoomControl: false,
        });

        L.control.zoom({ position: "bottomright" }).addTo(map);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution:
                "&copy; OpenStreetMap contributors &middot; INCAT Laoag City",
            maxZoom: 20,
        }).addTo(map);

        const hubsLayer = L.layerGroup().addTo(map);
        const markersLayer = L.layerGroup().addTo(map);

        hubsLayerRef.current = hubsLayer;
        markersLayerRef.current = markersLayer;
        mapInstanceRef.current = map;

        setTimeout(() => {
            map.invalidateSize();
        }, 150);

        return () => {
            map.remove();
            mapInstanceRef.current = null;
            markersLayerRef.current = null;
            hubsLayerRef.current = null;
            pickerMarkerRef.current = null;
        };
    }, [interactivePicker]);

    // Handle interactive map click when used inside PostModal
    useEffect(() => {
        const map = mapInstanceRef.current;
        if (!map || !interactivePicker) return;

        const handleMapClick = (e: L.LeafletMouseEvent) => {
            const { lat, lng } = e.latlng;
            let nearestHub: CampusLocation | undefined;
            let minDistance = Number.POSITIVE_INFINITY;

            for (const hub of allHubs) {
                const d = haversineMeters(lat, lng, hub.lat, hub.lng);
                if (d < minDistance) {
                    minDistance = d;
                    nearestHub = hub;
                }
            }

            onPickCoords?.({
                lat: Number(lat.toFixed(6)),
                lng: Number(lng.toFixed(6)),
                nearestHubId: nearestHub?.id,
                nearestHubName: nearestHub?.name,
            });
        };

        map.on("click", handleMapClick);
        return () => {
            map.off("click", handleMapClick);
        };
    }, [interactivePicker, allHubs, onPickCoords]);

    // Render picked coordinate pin in interactive picker mode
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

        const icon = L.divIcon({
            className: "findr-picker-pin",
            html: `
        <div style="
          display:flex;align-items:center;justify-content:center;
          width:34px;height:34px;border-radius:9999px;
          background:#10b981;color:#052e16;
          border:3px solid #ffffff;
          box-shadow:0 8px 20px rgba(16,185,129,0.55);
          transform:translate(-50%,-50%);
        ">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
      `,
            iconSize: [0, 0],
        });

        if (!pickerMarkerRef.current) {
            pickerMarkerRef.current = L.marker(
                [pickedCoords.lat, pickedCoords.lng],
                {
                    icon,
                    zIndexOffset: 1000,
                },
            ).addTo(map);
        } else {
            pickerMarkerRef.current.setLatLng([
                pickedCoords.lat,
                pickedCoords.lng,
            ]);
        }

        map.panTo([pickedCoords.lat, pickedCoords.lng], { animate: true });
    }, [interactivePicker, pickedCoords]);

    // Render INCAT campus building hubs
    useEffect(() => {
        const hubsLayer = hubsLayerRef.current;
        if (!hubsLayer) return;
        hubsLayer.clearLayers();

        if (!showHubLabels) return;

        for (const hub of allHubs) {
            const badgeHtml = `
        <div style="
          display:inline-flex;align-items:center;gap:4px;
          padding:2px 7px;border-radius:9999px;
          background:${hub.isDropOffHub ? "rgba(6,78,59,0.92)" : "rgba(23,23,23,0.88)"};
          color:${hub.isDropOffHub ? "#a7f3d0" : "#d4d4d8"};
          border:1px solid ${hub.isDropOffHub ? "rgba(52,211,153,0.45)" : "rgba(82,82,91,0.5)"};
          font-size:10px;font-weight:600;white-space:nowrap;
          box-shadow:0 2px 8px rgba(0,0,0,0.35);
          transform:translate(-50%, -50%);
          cursor:pointer;
        ">
          <span style="width:6px;height:6px;border-radius:9999px;background:${
              hub.isDropOffHub ? "#34d399" : "#a1a1aa"
          };"></span>
          <span>${hub.buildingCode}</span>
        </div>
      `;

            const marker = L.marker([hub.lat, hub.lng], {
                icon: L.divIcon({
                    className: "findr-hub-badge",
                    html: badgeHtml,
                    iconSize: [0, 0],
                }),
            });

            marker.bindTooltip(
                `<strong>${hub.name}</strong><br/><span>${
                    hub.isDropOffHub
                        ? "Official Drop-off Hub"
                        : "Campus Landmark"
                }</span>`,
                { direction: "top", offset: [0, -10] },
            );

            if (interactivePicker) {
                marker.on("click", () => {
                    onPickCoords?.({
                        lat: hub.lat,
                        lng: hub.lng,
                        nearestHubId: hub.id,
                        nearestHubName: hub.name,
                    });
                });
            }

            marker.addTo(hubsLayer);
        }
    }, [allHubs, showHubLabels, interactivePicker, onPickCoords]);

    // Render Lost / Found / Returned item markers with clustering
    useEffect(() => {
        const markersLayer = markersLayerRef.current;
        if (!markersLayer) return;
        markersLayer.clearLayers();

        if (interactivePicker) return;

        for (const cluster of clusteredGroups) {
            const primary = cluster.posts[0];
            const count = cluster.posts.length;
            const isSelected = cluster.posts.some(
                (p) => p.id === selectedPostId,
            );

            const hasLost = cluster.posts.some(
                (p) => p.type === "lost" && p.status !== "returned",
            );
            const hasFound = cluster.posts.some(
                (p) => p.type === "found" && p.status !== "returned",
            );

            let bg = "#52525b"; // returned / slate
            let ring = "rgba(161,161,170,0.35)";
            if (hasLost) {
                bg = "#e11d48"; // rose-600
                ring = "rgba(225,29,72,0.4)";
            } else if (hasFound) {
                bg = "#059669"; // emerald-600
                ring = "rgba(5,150,105,0.4)";
            }

            const pinHtml = `
        <div style="
          position:relative;
          display:flex;align-items:center;justify-content:center;
          width:${count > 1 ? "36px" : "30px"};
          height:${count > 1 ? "36px" : "30px"};
          border-radius:9999px;
          background:${bg};
          color:#ffffff;
          font-weight:700;font-size:12px;
          border:2.5px solid #ffffff;
          box-shadow:0 0 0 ${isSelected ? "7px" : "4px"} ${ring}, 0 6px 16px rgba(0,0,0,0.45);
          transform:translate(-50%, -50%) scale(${isSelected ? "1.15" : "1"});
          transition:transform 0.2s ease;
          cursor:pointer;
        ">
          ${
              count > 1
                  ? `<span>${count}</span>`
                  : `<span style="width:8px;height:8px;border-radius:9999px;background:#fff;"></span>`
          }
        </div>
      `;

            const marker = L.marker([cluster.lat, cluster.lng], {
                icon: L.divIcon({
                    className: "findr-post-pin",
                    html: pinHtml,
                    iconSize: [0, 0],
                }),
                zIndexOffset: isSelected ? 900 : 500,
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
                    ? `${count} items at ${primary.locationName}`
                    : `${primary.type.toUpperCase()}: ${primary.title}`,
                { direction: "top", offset: [0, -14] },
            );

            marker.addTo(markersLayer);
        }
    }, [clusteredGroups, selectedPostId, interactivePicker]);

    const handleResetIncatCenter = () => {
        setGeoError(null);
        mapInstanceRef.current?.flyTo(
            [INCAT_CENTER.lat, INCAT_CENTER.lng],
            interactivePicker ? 18 : INCAT_CENTER.zoom,
            { duration: 0.7 },
        );
    };

    const handleLocateMe = () => {
        setGeoError(null);
        if (!("geolocation" in navigator)) {
            setGeoError("Geolocation is not supported by your browser.");
            return;
        }
        setLocatingUser(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setLocatingUser(false);
                const { latitude, longitude } = pos.coords;
                const map = mapInstanceRef.current;
                if (!map) return;

                if (userLocationMarkerRef.current) {
                    userLocationMarkerRef.current.remove();
                }
                userLocationMarkerRef.current = L.circleMarker(
                    [latitude, longitude],
                    {
                        radius: 8,
                        color: "#ffffff",
                        weight: 2.5,
                        fillColor: "#3b82f6",
                        fillOpacity: 1,
                    },
                )
                    .bindTooltip("Your current location", { direction: "top" })
                    .addTo(map);

                map.flyTo([latitude, longitude], 18, { duration: 0.8 });

                if (interactivePicker && onPickCoords) {
                    onPickCoords({
                        lat: Number(latitude.toFixed(6)),
                        lng: Number(longitude.toFixed(6)),
                    });
                }
            },
            () => {
                setLocatingUser(false);
                setGeoError(
                    "Could not access GPS location. Check browser permissions.",
                );
            },
            { enableHighAccuracy: true, timeout: 8000 },
        );
    };

    const activePost =
        activeCluster && activeCluster.posts[activePostIndex]
            ? activeCluster.posts[activePostIndex]
            : null;

    return (
        <div
            className={`relative overflow-hidden rounded-2xl border border-neutral-800/90 bg-neutral-950 shadow-xl ${className}`}
        >
            {/* Top Floating Bar */}
            <div className="pointer-events-none absolute top-3 right-3 left-3 z-400 flex flex-wrap items-center justify-between gap-2">
                <div className="pointer-events-auto inline-flex items-center gap-2 rounded-xl border border-neutral-800/90 bg-neutral-950/90 px-3 py-1.5 text-xs text-neutral-200 backdrop-blur-md">
                    <Compass className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="font-semibold">INCAT Campus Map</span>
                    <span className="hidden text-neutral-400 sm:inline">
                        &middot; P. Gomez St., Laoag City
                    </span>
                </div>

                <div className="pointer-events-auto flex items-center gap-1.5">
                    <button
                        type="button"
                        onClick={() => setShowHubLabels((prev) => !prev)}
                        className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-medium backdrop-blur-md transition-colors ${
                            showHubLabels
                                ? "border-emerald-700/60 bg-emerald-950/85 text-emerald-200"
                                : "border-neutral-800 bg-neutral-950/85 text-neutral-300 hover:bg-neutral-900"
                        }`}
                        title="Toggle INCAT building hub labels"
                    >
                        <Layers className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Hubs</span>
                    </button>

                    <button
                        type="button"
                        onClick={handleLocateMe}
                        disabled={locatingUser}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-800 bg-neutral-950/90 px-2.5 py-1.5 text-xs font-medium text-neutral-200 backdrop-blur-md transition-colors hover:border-neutral-700 hover:bg-neutral-900 disabled:opacity-50"
                        title="Center on my GPS location"
                    >
                        <LocateFixed
                            className={`h-3.5 w-3.5 text-emerald-400 ${
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
                        className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-800 bg-neutral-950/90 px-2.5 py-1.5 text-xs font-medium text-neutral-200 backdrop-blur-md transition-colors hover:border-neutral-700 hover:bg-neutral-900"
                        title="Reset view to INCAT Campus"
                    >
                        <Navigation className="h-3.5 w-3.5 text-emerald-400" />
                        <span>INCAT Center</span>
                    </button>
                </div>
            </div>

            {/* Map Canvas */}
            <div
                ref={mapContainerRef}
                className={`w-full ${heightClassName} bg-neutral-900`}
                aria-label="INCAT Campus interactive map"
            />

            {/* Legend / Interactive Picker Helper */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-neutral-800/80 bg-neutral-950 px-3.5 py-2 text-xs text-neutral-400">
                {interactivePicker ? (
                    <div className="flex items-center gap-2 text-emerald-300">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span>
                            Tap anywhere on the INCAT map or click a building
                            badge to pin the exact spot.
                        </span>
                    </div>
                ) : (
                    <div className="flex flex-wrap items-center gap-3">
                        <span className="inline-flex items-center gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-full bg-rose-600" />
                            Lost (
                            {
                                allPosts.filter(
                                    (p) =>
                                        p.type === "lost" &&
                                        p.status !== "returned",
                                ).length
                            }
                            )
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
                            Found (
                            {
                                allPosts.filter(
                                    (p) =>
                                        p.type === "found" &&
                                        p.status !== "returned",
                                ).length
                            }
                            )
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <span className="h-2.5 w-2.5 rounded-full bg-neutral-500" />
                            Returned (
                            {
                                allPosts.filter((p) => p.status === "returned")
                                    .length
                            }
                            )
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-emerald-300">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Drop-off Hubs
                        </span>
                    </div>
                )}

                {geoError && <span className="text-rose-400">{geoError}</span>}
            </div>

            {/* Slide-Up Detail Card on Pin Click */}
            {!interactivePicker && activePost && activeCluster && (
                <div className="absolute right-3 bottom-12 left-3 z-450 max-w-md rounded-2xl border border-neutral-700/90 bg-neutral-950/95 p-3.5 shadow-2xl backdrop-blur-md sm:left-4">
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                            <span
                                className={`rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase ${
                                    activePost.status === "returned"
                                        ? "bg-neutral-800 text-neutral-300"
                                        : activePost.type === "lost"
                                          ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                                          : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                }`}
                            >
                                {activePost.status === "returned"
                                    ? "Returned"
                                    : activePost.type.toUpperCase()}
                            </span>
                            <span className="text-xs text-neutral-400">
                                {formatRelativeTime(activePost.createdAt)}
                            </span>
                            {activeCluster.posts.length > 1 && (
                                <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-[11px] text-neutral-300">
                                    Item {activePostIndex + 1} of{" "}
                                    {activeCluster.posts.length} here
                                </span>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={() => setActiveCluster(null)}
                            aria-label="Close pin preview"
                            className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    <h4 className="mt-1.5 font-semibold text-neutral-100">
                        {activePost.title}
                    </h4>
                    <p className="mt-1 line-clamp-2 text-xs text-neutral-400">
                        {activePost.description}
                    </p>

                    <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-neutral-800/80 pt-2.5 text-xs">
                        <span className="inline-flex items-center gap-1 text-neutral-300">
                            <MapPin className="h-3.5 w-3.5 text-emerald-400" />
                            {activePost.locationName}
                        </span>

                        <div className="flex items-center gap-1.5">
                            {activeCluster.posts.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        setActivePostIndex(
                                            (prev) =>
                                                (prev + 1) %
                                                activeCluster.posts.length,
                                        )
                                    }
                                    className="rounded-lg border border-neutral-700 bg-neutral-900 px-2.5 py-1 text-xs font-medium text-neutral-200 hover:bg-neutral-800"
                                >
                                    Next item
                                </button>
                            )}

                            {(onSelectPost || onSelectItem) && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        onSelectPost?.(activePost);
                                        onSelectItem?.(activePost);
                                    }}
                                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-500"
                                >
                                    <span>Details</span>
                                    <ExternalLink className="h-3 w-3" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CampusMap;
