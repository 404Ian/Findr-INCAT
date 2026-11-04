import type { CampusHub, DemoUser } from "../types";

export const CAMPUS_HUBS: CampusHub[] = [
    {
        id: "guidance",
        code: "INCAT-GUID",
        name: "Guidance Office",
        building: "Admin Bldg Room 102 — Ask for Ms. Santos",
        custodyNote:
            "INCAT Guidance & Counseling Office. Claim between 7:30 AM – 4:30 PM with your INCAT ID.",
        lat: 18.1986,
        lng: 120.5932,
    },
    {
        id: "guard-house",
        code: "INCAT-GATE",
        name: "Main Gate / Guard House",
        building: "Turned in to Officer Bautista at Main Gate Guard House",
        custodyNote:
            "INCAT Main Gate Guard House & RFID Turnstile Desk along P. Gomez St. (Logbook available).",
        lat: 18.1981,
        lng: 120.5927,
    },
    {
        id: "computer-lab",
        code: "INCAT-ICT",
        name: "Computer Lab",
        building: "ICT Bldg Room 202 — Faculty Cubicle 4",
        custodyNote:
            "INCAT ICT Building — TVL-ICT / Computer Systems Servicing (CSS) Laboratory.",
        lat: 18.1984,
        lng: 120.5936,
    },
    {
        id: "gymnasium",
        code: "INCAT-CRT",
        name: "Gymnasium",
        building: "Bleachers Section B / Drop off at Guard House",
        custodyNote:
            "INCAT Covered Court Bleachers / Practical Arts & TVL Trade Shops.",
        lat: 18.1989,
        lng: 120.5935,
    },
    {
        id: "library",
        code: "INCAT-LIB",
        name: "Main Library",
        building: "Social Hall & Library Bldg — 3rd Floor Circulation Desk",
        custodyNote:
            "INCAT School Library. Open Monday to Friday, 8:00 AM – 5:00 PM.",
        lat: 18.1983,
        lng: 120.5939,
    },
    {
        id: "ssg-office",
        code: "INCAT-SSG",
        name: "SSG / Student Council Office",
        building: "Student Center Room 104",
        custodyNote:
            "Supreme Student Government Office. Officer on duty available during lunch and dismissal.",
        lat: 18.1987,
        lng: 120.593,
    },
    {
        id: "canteen",
        code: "INCAT-CNT",
        name: "School Canteen",
        building: "Main Canteen Counter & Washing Area",
        custodyNote:
            "Turned over to Canteen Co-op Manager or Guidance Office after lunch period.",
        lat: 18.1985,
        lng: 120.5929,
    },
];

export const ITEM_CATEGORIES = [
    "Wallets & Cash",
    "Tumblers & Flasks",
    "Phones & Gadgets",
    "Calculators",
    "IDs & Lanyards",
    "Keys & Locks",
    "Books & Notebooks",
    "Uniform & Apparel",
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
