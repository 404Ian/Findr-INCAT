import { CAMPUS_HUBS, INCAT_CENTER } from "../data/hubs";
import type { CampusLocation } from "../types";

export { CAMPUS_HUBS, INCAT_CENTER };

export const INCAT_DEFAULT_ZOOM = 18;
export const INCAT_PICKER_ZOOM = 18;
export const INCAT_MIN_ZOOM = 16;
export const INCAT_MAX_ZOOM = 20;

/**
 * Bounding box around INCAT Campus (P. Gomez St., Laoag City) with comfortable pan margin
 */
export const INCAT_MAX_BOUNDS: [[number, number], [number, number]] = [
    [18.193, 120.5885], // Southwest corner
    [18.2005, 120.597], // Northeast corner
];

/**
 * Distance threshold (meters) within which a dropped pin snaps to a known INCAT building hub
 */
export const HUB_SNAP_RADIUS_METERS = 38;

export function haversineMeters(
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

export function findNearestCampusHub(
    lat: number,
    lng: number,
    locations: readonly CampusLocation[] = CAMPUS_HUBS,
): { hub: CampusLocation; distanceMeters: number } | null {
    if (locations.length === 0) return null;
    let nearest = locations[0];
    let minDistance = haversineMeters(lat, lng, nearest.lat, nearest.lng);

    for (let i = 1; i < locations.length; i += 1) {
        const candidate = locations[i];
        const d = haversineMeters(lat, lng, candidate.lat, candidate.lng);
        if (d < minDistance) {
            minDistance = d;
            nearest = candidate;
        }
    }

    return { hub: nearest, distanceMeters: minDistance };
}
