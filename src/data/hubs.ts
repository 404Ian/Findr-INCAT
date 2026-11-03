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

export const CAMPUS_CENTER: [number, number] = [14.6538, 121.0685];

export const CAMPUS_HUBS: CampusHubPreset[] = [
    {
        name: "Main Gate / Guard House",
        shortLabel: "Guard House",
        buildingCode: "GATE-01",
        lat: 14.6529,
        lng: 121.0672,
        isOfficialDropoff: true,
        handoverInstructions:
            "Logbook desk at Main Entrance Security Guard House (Open 24/7). Bring School ID.",
    },
    {
        name: "Guidance Office",
        shortLabel: "Guidance Office",
        buildingCode: "ADM-102",
        lat: 14.6541,
        lng: 121.0681,
        isOfficialDropoff: true,
        handoverInstructions:
            "Ground Floor, Admin Bldg Room 102. Claim between 7:30 AM – 4:30 PM.",
    },
    {
        name: "SSG / Student Council Office",
        shortLabel: "SSG Office",
        buildingCode: "STU-204",
        lat: 14.6545,
        lng: 121.0689,
        isOfficialDropoff: true,
        handoverInstructions:
            "Student Center 2nd Floor, SSG Officer-on-Duty Desk.",
    },
    {
        name: "Principal's Office",
        shortLabel: "Principal's Office",
        buildingCode: "ADM-201",
        lat: 14.6542,
        lng: 121.0683,
        isOfficialDropoff: true,
        handoverInstructions:
            "High-value items vault at Reception Desk, 2nd Floor Admin Building.",
    },
    {
        name: "Canteen",
        shortLabel: "Campus Canteen",
        buildingCode: "CNT-01",
        lat: 14.6535,
        lng: 121.0691,
        isOfficialDropoff: false,
        handoverInstructions: "Near main dining tables / Cashier Counter #1.",
    },
    {
        name: "Library",
        shortLabel: "Main Library",
        buildingCode: "LIB-300",
        lat: 14.6548,
        lng: 121.0684,
        isOfficialDropoff: false,
        handoverInstructions:
            "Baggage Counter & Librarian Circulation Desk, 3rd Floor.",
    },
    {
        name: "Gymnasium",
        shortLabel: "Covered Gym",
        buildingCode: "GYM-01",
        lat: 14.6532,
        lng: 121.0698,
        isOfficialDropoff: false,
        handoverInstructions: "Bleachers Section B or PE Equipment Room.",
    },
    {
        name: "Computer Lab",
        shortLabel: "Comp Lab",
        buildingCode: "ICT-202",
        lat: 14.6546,
        lng: 121.0677,
        isOfficialDropoff: false,
        handoverInstructions: "ICT Building 2nd Floor, Lab Technician Station.",
    },
    {
        name: "Custom Room #",
        shortLabel: "Custom Room",
        buildingCode: "RM-CUSTOM",
        lat: 14.6538,
        lng: 121.0685,
        isOfficialDropoff: false,
        handoverInstructions:
            "See specific room number or click on the map pin.",
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
