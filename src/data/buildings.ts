import type { FeatureCollection, Polygon } from "geojson";

export interface IncatBuildingConfig {
    id: string;
    hubId: string;
    name: string;
    shortLabel: string;
    /** Pin position placed directly at the building entrance [lat, lng] */
    entrance: [number, number];
    /** Label anchor position [lat, lng] (defaults to polygon center) */
    labelPosition: [number, number];
    /**
     * GeoJSON Polygon ring in [lng, lat] order for direct copy-pasting with geojson.io.
     * First and last coordinate pairs must match.
     */
    polygonLngLat: [number, number][];
}

export const BUILDINGS: IncatBuildingConfig[] = [
    {
        id: "bldg-guard-house",
        hubId: "guard-house",
        name: "Main Gate / Guard House",
        shortLabel: "Main Gate",
        entrance: [18.20354, 120.59219],
        labelPosition: [18.20354, 120.59214],
        polygonLngLat: [
            [120.59208, 18.20359],
            [120.59221, 18.20359],
            [120.59221, 18.20349],
            [120.59208, 18.20349],
            [120.59208, 18.20359],
        ],
    },
    {
        id: "bldg-guidance",
        hubId: "guidance",
        name: "Guidance Office (Admin Building)",
        shortLabel: "Admin / Guidance",
        entrance: [18.20376, 120.59242],
        labelPosition: [18.20376, 120.59252],
        polygonLngLat: [
            [120.59238, 18.20385],
            [120.59266, 18.20385],
            [120.59266, 18.20367],
            [120.59238, 18.20367],
            [120.59238, 18.20385],
        ],
    },
    {
        id: "bldg-ssg",
        hubId: "ssg-office",
        name: "SSG / Student Council Office",
        shortLabel: "SSG Office",
        entrance: [18.20395, 120.59236],
        labelPosition: [18.20398, 120.59231],
        polygonLngLat: [
            [120.59222, 18.20404],
            [120.59239, 18.20404],
            [120.59239, 18.20391],
            [120.59222, 18.20391],
            [120.59222, 18.20404],
        ],
    },
    {
        id: "bldg-ict",
        hubId: "ict-building",
        name: "ICT Building",
        shortLabel: "ICT Bldg",
        entrance: [18.20416, 120.59256],
        labelPosition: [18.20422, 120.59256],
        polygonLngLat: [
            [120.59242, 18.20429],
            [120.59271, 18.20429],
            [120.59271, 18.20415],
            [120.59242, 18.20415],
            [120.59242, 18.20429],
        ],
    },
    {
        id: "bldg-computer-lab",
        hubId: "computer-lab",
        name: "Computer Lab",
        shortLabel: "Computer Lab",
        entrance: [18.20415, 120.59284],
        labelPosition: [18.20422, 120.59288],
        polygonLngLat: [
            [120.59276, 18.20429],
            [120.59301, 18.20429],
            [120.59301, 18.20415],
            [120.59276, 18.20415],
            [120.59276, 18.20429],
        ],
    },
    {
        id: "bldg-related-subjects",
        hubId: "related-subjects",
        name: "Related Subjects Building",
        shortLabel: "Related Subjects",
        entrance: [18.20438, 120.59268],
        labelPosition: [18.20444, 120.59268],
        polygonLngLat: [
            [120.59246, 18.20451],
            [120.59291, 18.20451],
            [120.59291, 18.20437],
            [120.59246, 18.20437],
            [120.59246, 18.20451],
        ],
    },
    {
        id: "bldg-gymnasium",
        hubId: "gymnasium",
        name: "Gymnasium / Covered Court",
        shortLabel: "Gymnasium",
        entrance: [18.20398, 120.59308],
        labelPosition: [18.20402, 120.59324],
        polygonLngLat: [
            [120.59308, 18.20418],
            [120.59342, 18.20418],
            [120.59342, 18.20386],
            [120.59308, 18.20386],
            [120.59308, 18.20418],
        ],
    },
    {
        id: "bldg-library",
        hubId: "library",
        name: "Library / Social Hall",
        shortLabel: "Library & Social Hall",
        entrance: [18.20372, 120.59292],
        labelPosition: [18.20366, 120.59304],
        polygonLngLat: [
            [120.59288, 18.20376],
            [120.59321, 18.20376],
            [120.59321, 18.20356],
            [120.59288, 18.20356],
            [120.59288, 18.20376],
        ],
    },
    {
        id: "bldg-canteen",
        hubId: "canteen",
        name: "School Canteen",
        shortLabel: "Canteen",
        entrance: [18.20356, 120.59268],
        labelPosition: [18.20351, 120.59268],
        polygonLngLat: [
            [120.59256, 18.20358],
            [120.59281, 18.20358],
            [120.59281, 18.20344],
            [120.59256, 18.20344],
            [120.59256, 18.20358],
        ],
    },
];

export const INCAT_BUILDINGS_GEOJSON: FeatureCollection<
    Polygon,
    { id: string; hubId: string; name: string; shortLabel: string }
> = {
    type: "FeatureCollection",
    features: BUILDINGS.map((b) => ({
        type: "Feature",
        properties: {
            id: b.id,
            hubId: b.hubId,
            name: b.name,
            shortLabel: b.shortLabel,
        },
        geometry: {
            type: "Polygon",
            coordinates: [b.polygonLngLat],
        },
    })),
};
