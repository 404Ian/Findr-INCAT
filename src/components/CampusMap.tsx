import React, { useEffect } from "react";
import {
    MapContainer,
    TileLayer,
    Marker,
    Popup,
    useMapEvents,
    useMap,
} from "react-leaflet";
import L from "leaflet";
import { CAMPUS_CENTER, CAMPUS_HUBS } from "../data/hubs";
import type { WallPost } from "../types";

function createRadarPin(color: string, pulse = false) {
    return L.divIcon({
        className: "custom-radar-pin",
        html: `
      <div style="position: relative; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;">
        ${
            pulse
                ? `<span style="position: absolute; width: 28px; height: 28px; border-radius: 9999px; background: ${color}; opacity: 0.45; animation: pulse-ring 2s infinite;"></span>`
                : ""
        }
        <span style="position: relative; width: 14px; height: 14px; border-radius: 9999px; background: ${color}; border: 2.5px solid #090A0F; box-shadow: 0 0 12px ${color};"></span>
      </div>
    `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
    });
}

interface MapClickHandlerProps {
    onSelectCoords?: (lat: number, lng: number) => void;
}

const MapClickHandler: React.FC<MapClickHandlerProps> = ({
    onSelectCoords,
}) => {
    useMapEvents({
        click(e) {
            if (onSelectCoords) {
                onSelectCoords(
                    Number(e.latlng.lat.toFixed(5)),
                    Number(e.latlng.lng.toFixed(5)),
                );
            }
        },
    });
    return null;
};

const MapRecenter: React.FC<{ center: [number, number] }> = ({ center }) => {
    const map = useMap();
    useEffect(() => {
        map.setView(center, map.getZoom(), { animate: true });
    }, [center, map]);
    return null;
};

interface CampusMapProps {
    center?: [number, number];
    zoom?: number;
    posts?: WallPost[];
    selectedPin?: { lat: number; lng: number; label?: string; color?: string };
    interactivePicker?: boolean;
    onSelectCoords?: (lat: number, lng: number) => void;
    onSelectPost?: (post: WallPost) => void;
    heightClass?: string;
}

export const CampusMap: React.FC<CampusMapProps> = ({
    center = CAMPUS_CENTER,
    zoom = 18,
    posts = [],
    selectedPin,
    interactivePicker = false,
    onSelectCoords,
    onSelectPost,
    heightClass = "h-72",
}) => {
    return (
        <div
            className={`relative w-full ${heightClass} rounded-xl overflow-hidden border border-white/10`}
        >
            <MapContainer
                center={center}
                zoom={zoom}
                scrollWheelZoom={false}
                className="w-full h-full z-0"
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    maxZoom={19}
                />
                <MapRecenter center={center} />
                {interactivePicker && (
                    <MapClickHandler onSelectCoords={onSelectCoords} />
                )}

                {/* Official INCAT Drop-off Hubs */}
                {CAMPUS_HUBS.filter((h) => h.isOfficialDropoff).map((hub) => (
                    <Marker
                        key={hub.name}
                        position={[hub.lat, hub.lng]}
                        icon={createRadarPin("#3B82F6", false)}
                    >
                        <Popup>
                            <div className="text-xs space-y-1">
                                <div className="font-mono-tabular text-[10px] text-blue-400 uppercase font-semibold">
                                    INCAT Official Hub • {hub.buildingCode}
                                </div>
                                <div className="font-bold text-white text-sm">
                                    {hub.name}
                                </div>
                                <p className="text-slate-300 leading-snug">
                                    {hub.handoverInstructions}
                                </p>
                            </div>
                        </Popup>
                    </Marker>
                ))}

                {/* Active Wall Posts Pins */}
                {posts.map((post) => {
                    const pinColor =
                        post.status === "resolved"
                            ? "#10B981"
                            : post.post_type === "lost"
                              ? "#EF4444"
                              : "#F59E0B";
                    return (
                        <Marker
                            key={post.id}
                            position={[post.lat, post.lng]}
                            icon={createRadarPin(
                                pinColor,
                                post.status !== "resolved",
                            )}
                        >
                            <Popup>
                                <div className="text-xs space-y-1.5 min-w-[180px]">
                                    <span
                                        className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-mono-tabular font-semibold uppercase ${
                                            post.post_type === "lost"
                                                ? "bg-red-500/20 text-red-400"
                                                : "bg-amber-500/20 text-amber-300"
                                        }`}
                                    >
                                        {post.post_type.toUpperCase()} •{" "}
                                        {post.campus_hub}
                                    </span>
                                    <div className="font-bold text-white">
                                        {post.title}
                                    </div>
                                    <div className="text-slate-400 text-[11px]">
                                        {post.room_detail}
                                    </div>
                                    {onSelectPost && (
                                        <button
                                            onClick={() => onSelectPost(post)}
                                            className="mt-1 w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-1 px-2 rounded text-[11px] transition cursor-pointer"
                                        >
                                            Inspect Post Details
                                        </button>
                                    )}
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}

                {/* Selected / Custom Pin */}
                {selectedPin && (
                    <Marker
                        position={[selectedPin.lat, selectedPin.lng]}
                        icon={createRadarPin(
                            selectedPin.color || "#10B981",
                            true,
                        )}
                    >
                        {selectedPin.label && (
                            <Popup>
                                <div className="text-xs font-semibold text-white">
                                    {selectedPin.label}
                                </div>
                            </Popup>
                        )}
                    </Marker>
                )}
            </MapContainer>

            {/* Floating INCAT Radar Legend Overlay */}
            <div className="absolute bottom-2.5 left-2.5 z-10 radar-glass px-2.5 py-1.5 rounded-lg flex flex-wrap items-center gap-3 text-[11px] text-slate-300 pointer-events-none">
                <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-radar-lost inline-block"></span>
                    Lost Alert
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-radar-found inline-block"></span>
                    Found / Custody
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-radar-blue inline-block"></span>
                    INCAT Drop-off Office
                </span>
                {interactivePicker && (
                    <span className="text-blue-400 font-mono-tabular">
                        Click anywhere on INCAT map to move pin
                    </span>
                )}
            </div>
        </div>
    );
};
