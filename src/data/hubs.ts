import type { CampusHub, DemoUser } from "../types";

/**
 * Exact INCAT Campus Center (P. Gomez St / General Segundo Ave, Laoag City)
 */
export const INCAT_CENTER: [number, number] = [18.20389, 120.59268];

/**
 * Campus bounding box (~400m padding around INCAT)
 */
export const INCAT_MAX_BOUNDS: [[number, number], [number, number]] = [
    [18.2002, 120.5888], // South-West corner
    [18.2076, 120.5966], // North-East corner
];

/**
 * INCAT Drop-off Hubs — coordinates sit directly on each building's entrance
 */
export const CAMPUS_HUBS: CampusHub[] = [
    {
        id: "guard-house",
        code: "INCAT-GATE",
        name: "Main Gate / Guard House",
        building: "Main Gate Guard House & RFID Turnstile Desk",
        custodyNote:
            "INCAT Main Gate Guard House along P. Gomez St. Logbook available 6:00 AM – 7:00 PM.",
        lat: 18.20354,
        lng: 120.59219,
    },
    {
        id: "guidance",
        code: "INCAT-GUID",
        name: "Guidance Office",
        building: "Admin Building Room 102 — Ask for Ms. Santos",
        custodyNote:
            "INCAT Guidance & Counseling Office. Claim between 7:30 AM – 4:30 PM with your school ID.",
        lat: 18.20376,
        lng: 120.59242,
    },
    {
        id: "ict-building",
        code: "INCAT-ICT",
        name: "ICT Building",
        building: "ICT Building Room 202 — Faculty Cubicle 4",
        custodyNote:
            "TVL-ICT Department Desk. Open during school hours 7:30 AM – 5:00 PM.",
        lat: 18.20416,
        lng: 120.59256,
    },
    {
        id: "computer-lab",
        code: "INCAT-LAB",
        name: "Computer Lab",
        building: "Computer Systems Servicing (CSS) Lab 2",
        custodyNote:
            "Held at the Computer Lab technician desk. Bring your INCAT ID to verify.",
        lat: 18.20415,
        lng: 120.59284,
    },
    {
        id: "gymnasium",
        code: "INCAT-GYM",
        name: "Gymnasium",
        building: "Covered Court Bleachers / PE Department Desk",
        custodyNote:
            "INCAT Covered Gymnasium. Unclaimed items are turned over to the Main Gate by 5:00 PM.",
        lat: 18.20398,
        lng: 120.59308,
    },
    {
        id: "library",
        code: "INCAT-LIB",
        name: "Library / Social Hall",
        building: "Library & Social Hall Building — Circulation Desk",
        custodyNote:
            "INCAT Campus Library. Open Monday to Friday, 8:00 AM – 5:00 PM.",
        lat: 18.20372,
        lng: 120.59292,
    },
    {
        id: "ssg-office",
        code: "INCAT-SSG",
        name: "SSG / Student Council Office",
        building: "Student Center Room 104",
        custodyNote:
            "Supreme Student Government Office. Officer on duty during recess, lunch, and dismissal.",
        lat: 18.20395,
        lng: 120.59236,
    },
    {
        id: "canteen",
        code: "INCAT-CNT",
        name: "School Canteen",
        building: "Main Canteen Counter & Washing Area",
        custodyNote:
            "Held at the Canteen Co-op Counter during lunch, then forwarded to Guidance.",
        lat: 18.20356,
        lng: 120.59268,
    },
    {
        id: "related-subjects",
        code: "INCAT-RSB",
        name: "Related Subjects Building",
        building: "Related Subjects Bldg — 1st Floor Faculty Room",
        custodyNote: "Academic & Related Subjects Department Faculty Room.",
        lat: 18.20438,
        lng: 120.59268,
    },
];

export const ITEM_CATEGORIES = [
    "Wallets & Cash",
    "Tumblers & Flasks",
    "Phones & Gadgets",
    "Calculators",
    "IDs & Lanyards",
    "Bags & Pouches",
    "Keys & Locks",
    "Books & Notebooks",
];

export const DEMO_USERS: DemoUser[] = [
    {
        id: "student-ian",
        name: "Ian Dela Cruz",
        role: "STUDENT",
        dept: "Grade 12 - STEM A",
        initials: "ID",
    },
    {
        id: "office-clara",
        name: "Ms. Clara Santos",
        role: "OFFICE",
        dept: "Guidance Office (ADM-102)",
        initials: "CS",
    },
    {
        id: "faculty-marco",
        name: "Engr. Marco Reyes",
        role: "FACULTY",
        dept: "Mathematics & Robotics Dept",
        initials: "MR",
    },
    {
        id: "guard-bautista",
        name: "Officer Bautista",
        role: "GUARD",
        dept: "Main Gate Security Desk",
        initials: "OB",
    },
];

export function getHubById(hubId: string): CampusHub {
    return CAMPUS_HUBS.find((h) => h.id === hubId) || CAMPUS_HUBS[0];
}
