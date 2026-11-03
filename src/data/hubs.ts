import type { CampusHubName, ItemCategory } from "../types";

export interface CampusHubPreset {
    name: CampusHubName;
    shortLabel: string;
    buildingCode: string;
    lat: number;
    lng: number;
    isOfficialDropoff: boolean;
    handoverInstructions: string;
}

// Exact Coordinates for Ilocos Norte College of Arts and Trades (P. Gomez St., Brgy. 5, Laoag City)
export const CAMPUS_CENTER: [number, number] = [18.20419, 120.59265];

export const CAMPUS_HUBS: CampusHubPreset[] = [
    {
        name: "Main Gate / Guard House",
        shortLabel: "INCAT Main Gate",
        buildingCode: "INCAT-GATE",
        lat: 18.20382,
        lng: 120.59285,
        isOfficialDropoff: true,
        handoverInstructions:
            "INCAT Main Gate Guard House & RFID Turnstile Desk along P. Gomez St. (Logbook available).",
    },
    {
        name: "Guidance Office",
        shortLabel: "Guidance Office",
        buildingCode: "INCAT-GUID",
        lat: 18.20415,
        lng: 120.59255,
        isOfficialDropoff: true,
        handoverInstructions:
            "INCAT Guidance & Counseling Office. Claim between 7:30 AM – 4:30 PM with your INCAT ID.",
    },
    {
        name: "SSG / Student Council Office",
        shortLabel: "SSLG Office",
        buildingCode: "INCAT-SSLG",
        lat: 18.20432,
        lng: 120.59272,
        isOfficialDropoff: true,
        handoverInstructions:
            "INCAT Supreme Secondary Learner Government (SSLG) Office — Officer-on-Duty Desk.",
    },
    {
        name: "Principal's Office",
        shortLabel: "Principal's Office",
        buildingCode: "INCAT-ADMIN",
        lat: 18.20408,
        lng: 120.59262,
        isOfficialDropoff: true,
        handoverInstructions:
            "INCAT Admin Building — Principal’s Office Reception Desk (for high-value gadgets & wallets).",
    },
    {
        name: "Canteen",
        shortLabel: "INCAT Canteen",
        buildingCode: "INCAT-COOP",
        lat: 18.20428,
        lng: 120.59242,
        isOfficialDropoff: false,
        handoverInstructions:
            "INCAT Multi-Purpose Cooperative Canteen Counter #1.",
    },
    {
        name: "Library",
        shortLabel: "Social Hall & Library",
        buildingCode: "INCAT-LIB",
        lat: 18.20445,
        lng: 120.59295,
        isOfficialDropoff: false,
        handoverInstructions:
            "INCAT Social Hall & Library — Librarian Circulation Desk.",
    },
    {
        name: "Gymnasium",
        shortLabel: "Covered Court / Practical Arts",
        buildingCode: "INCAT-CRT",
        lat: 18.20452,
        lng: 120.59235,
        isOfficialDropoff: false,
        handoverInstructions:
            "INCAT Covered Court Bleachers / Practical Arts & TVL Trade Shops.",
    },
    {
        name: "Computer Lab",
        shortLabel: "ICT / CSS Lab",
        buildingCode: "INCAT-ICT",
        lat: 18.20395,
        lng: 120.59225,
        isOfficialDropoff: false,
        handoverInstructions:
            "INCAT ICT Building — TVL-ICT / Computer Systems Servicing (CSS) Laboratory.",
    },
    {
        name: "Custom Room #",
        shortLabel: "Custom Room / Shop",
        buildingCode: "INCAT-RM",
        lat: 18.20419,
        lng: 120.59265,
        isOfficialDropoff: false,
        handoverInstructions:
            "Specify Old/New RTS Building, SHS Classroom, or TVL Workshop.",
    },
];

export const ITEM_CATEGORIES: ItemCategory[] = [
    "IDs & Lanyards",
    "Tumblers & Flasks",
    "Phones & Gadgets",
    "Calculators",
    "Books & Notebooks",
    "Wallets & Cash",
    "Uniforms & PE Gear",
    "Keys & Umbrellas",
];
