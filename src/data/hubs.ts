// src/data/hubs.ts
export const INCAT_CAMPUS_CENTER = {
    lat: 18.1988,
    lng: 120.5936,
    zoom: 18,
} as const;

export const INCAT_HUBS = [
    {
        id: "hub-guard-house",
        name: "Guard House",
        building: "Main Gate (P. Gomez St.)",
        type: "dropoff",
        lat: 18.19845,
        lng: 120.59315,
        description:
            "24/7 main entrance security desk and primary drop-off point.",
    },
    {
        id: "hub-guidance",
        name: "Guidance Office",
        building: "Administration Building",
        type: "dropoff",
        lat: 18.19878,
        lng: 120.59348,
        description: "Student affairs and lost ID / valuable item safekeeping.",
    },
    {
        id: "hub-ssg-office",
        name: "SSG / Student Center",
        building: "Student Center Pavilion",
        type: "dropoff",
        lat: 18.19895,
        lng: 120.59372,
        description:
            "Supreme Student Government desk for student-turned-in items.",
    },
    {
        id: "hub-ict-lab",
        name: "ICT / Computer Lab",
        building: "TVL & ICT Building, 2F",
        type: "lab",
        lat: 18.19912,
        lng: 120.59395,
        description: "Computer programming and networking laboratories.",
    },
    {
        id: "hub-electronics-lab",
        name: "Electronics & Electrical Lab",
        building: "Industrial Arts Building",
        type: "lab",
        lat: 18.19925,
        lng: 120.59355,
        description: "EIM and EPAS workshop rooms.",
    },
    {
        id: "hub-automotive-shop",
        name: "Automotive & Welding Shop",
        building: "North Trade Complex",
        type: "lab",
        lat: 18.19942,
        lng: 120.59328,
        description: "Automotive servicing and SMAW trade bays.",
    },
    {
        id: "hub-food-trades",
        name: "Food Trades & Garments Lab",
        building: "Home Economics Building",
        type: "lab",
        lat: 18.19862,
        lng: 120.59388,
        description: "Bread & Pastry, Cookery, and Dressmaking laboratories.",
    },
    {
        id: "hub-library",
        name: "Campus Library",
        building: "Academic Building, 2F",
        type: "facility",
        lat: 18.19885,
        lng: 120.59412,
        description: "Reading hall and study tables.",
    },
    {
        id: "hub-gymnasium",
        name: "INCAT Covered Court",
        building: "Campus Quadrangle",
        type: "facility",
        lat: 18.19892,
        lng: 120.59362,
        description: "Main assembly court, bleachers, and stage area.",
    },
    {
        id: "hub-canteen",
        name: "Campus Canteen",
        building: "South Wing",
        type: "facility",
        lat: 18.19852,
        lng: 120.59358,
        description: "Main dining area and food stalls.",
    },
] as const;

export type CampusHubName = (typeof INCAT_HUBS)[number]["name"];
export type CampusHubId = (typeof INCAT_HUBS)[number]["id"];

export interface CampusLocation {
    id: string;
    name: CampusHubName | string;
    building: string;
    type: "dropoff" | "lab" | "facility";
    lat: number;
    lng: number;
    description: string;
}
