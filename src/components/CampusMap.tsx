import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { CAMPUS_HUBS, getHubById } from "../data/hubs";
import type { PostItem } from "../types";

interface CampusMapProps {
    posts: PostItem[];
    selectedHubId: string;
    onSelectHub: (hubId: string) => void;
    onSelectPost: (post: PostItem) => void;
}

export const CampusMap: React.FC<CampusMapProps> = ({
    posts,
    selectedHubId,
    onSelectHub,
    onSelectPost,
}) => {
    const mapContainerRef = useRef<HTMLDivElement | null>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);
    const markersLayerRef = useRef<L.LayerGroup | null>(null);

    useEffect(() => {
        if (!mapContainerRef.current || mapInstanceRef.current) return;

        const map = L.map(mapContainerRef.current, {
            center: [18.1985, 120.5933],
            zoom: 18,
            zoomControl: true,
            attributionControl: true,
        });

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution: "&copy; OpenStreetMap",
        }).addTo(map);

        markersLayerRef.current = L.layerGroup().addTo(map);
        mapInstanceRef.current = map;

        return () => {
            map.remove();
            mapInstanceRef.current = null;
        };
    }, []);

    useEffect(() => {
        const layerGroup = markersLayerRef.current;
        if (!layerGroup) return;

        layerGroup.clearLayers();

        // Render Campus Hub pins (subtle neutral ring)
        CAMPUS_HUBS.forEach((hub) => {
            const isSelected = selectedHubId === hub.id;
            const hubIcon = L.divIcon({
                className: "bg-transparent border-0",
                html: `<div style="
          width: ${isSelected ? "14px" : "10px"};
          height: ${isSelected ? "14px" : "10px"};
          border-radius: 9999px;
          background: #284B3C;
          border: 2px solid #FFFFFF;
          box-shadow: 0 1px 3px rgba(0,0,0,0.25);
        " title="${hub.name}"></div>`,
                iconSize: [14, 14],
                iconAnchor: [7, 7],
            });

            const marker = L.marker([hub.lat, hub.lng], { icon: hubIcon });
            marker.bindTooltip(`${hub.name}`, {
                direction: "top",
                offset: [0, -6],
            });
            marker.on("click", () => {
                onSelectHub(selectedHubId === hub.id ? "ALL" : hub.id);
            });
            marker.addTo(layerGroup);
        });

        // Render active post dot pins with slight offset so they don't overlap hub center
        posts
            .filter((p) => p.status === "OPEN")
            .forEach((post, idx) => {
                const hub = getHubById(post.hubId);
                const angle = (idx * 1.4) % (Math.PI * 2);
                const latOffset = Math.cos(angle) * 0.00012;
                const lngOffset = Math.sin(angle) * 0.00012;

                const dotColor = post.type === "LOST" ? "#B91C1C" : "#B45309";

                const postIcon = L.divIcon({
                    className: "bg-transparent border-0",
                    html: `<div style="
            width: 12px;
            height: 12px;
            border-radius: 9999px;
            background: ${dotColor};
            border: 2px solid #FFFFFF;
            box-shadow: 0 1px 3px rgba(0,0,0,0.3);
          "></div>`,
                    iconSize: [12, 12],
                    iconAnchor: [6, 6],
                });

                const marker = L.marker(
                    [hub.lat + latOffset, hub.lng + lngOffset],
                    {
                        icon: postIcon,
                    },
                );
                marker.bindTooltip(
                    `${post.type === "LOST" ? "Lost" : "Found"}: ${post.title}`,
                    {
                        direction: "top",
                        offset: [0, -6],
                    },
                );
                marker.on("click", () => onSelectPost(post));
                marker.addTo(layerGroup);
            });
    }, [posts, selectedHubId, onSelectHub, onSelectPost]);

    return (
        <div className="border border-border rounded-lg overflow-hidden bg-surface mb-6">
            <div ref={mapContainerRef} className="h-64 w-full z-0" />
            <div className="px-4 py-2.5 border-t border-border flex flex-wrap items-center justify-between gap-4 text-xs text-muted bg-surface">
                <div className="flex items-center gap-5">
                    <span className="inline-flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-lost inline-block" />
                        Lost item
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-found inline-block" />
                        Found item
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-accent inline-block" />
                        Campus drop-off hub
                    </span>
                </div>
                <span>Click any pin to view item or filter by building</span>
            </div>
        </div>
    );
};
