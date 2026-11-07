import { CAMPUS_HUBS } from "../data/hubs";
import type { CampusLocation } from "../types";

export { CAMPUS_HUBS };

export const CAMPUS_CENTER: [number, number] = [18.20389, 120.59268];
export const CAMPUS_DEFAULT_ZOOM = 17;
export const CAMPUS_MIN_ZOOM = 16;
export const CAMPUS_MAX_ZOOM = 19;

/**
 * Bounding box around INCAT Campus (P. Gomez St., Laoag City)
 * +/- 0.004 degrees around CAMPUS_CENTER [18.20389, 120.59268]
 */
export const CAMPUS_BOUNDS: [[number, number], [number, number]] = [
    [18.1999, 120.5887], // Southwest corner
    [18.2079, 120.5967], // Northeast corner
];
export const CAMPUS_MAX_BOUNDS_VISCOSITY = 0.8;

export const INCAT_CENTER = {
    lat: CAMPUS_CENTER[0],
    lng: CAMPUS_CENTER[1],
    zoom: CAMPUS_DEFAULT_ZOOM,
} as const;

export const INCAT_DEFAULT_ZOOM = CAMPUS_DEFAULT_ZOOM;
export const INCAT_PICKER_ZOOM = 18;
export const INCAT_MIN_ZOOM = CAMPUS_MIN_ZOOM;
export const INCAT_MAX_ZOOM = CAMPUS_MAX_ZOOM;
export const INCAT_MAX_BOUNDS = CAMPUS_BOUNDS;

/**
 * Distance threshold (meters) within which a dropped pin snaps to a known INCAT building hub
 */
export const HUB_SNAP_RADIUS_METERS = 38;

export function isWithinCampusBounds(lat: number, lng: number): boolean {
    const [[swLat, swLng], [neLat, neLng]] = CAMPUS_BOUNDS;
    return lat >= swLat && lat <= neLat && lng >= swLng && lng <= neLng;
}

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
