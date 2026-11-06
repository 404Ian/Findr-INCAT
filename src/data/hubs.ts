export const INCAT_CENTER = {
    lat: 18.1966,
    lng: 120.5927,
    zoom: 17,
} as const;

export const CAMPUS_HUB_NAMES = [
    "Guard House",
    "Guidance Office",
    "SSG / Student Affairs Office",
    "ICT / Computer Lab",
    "Electronics & Electrical Lab",
    "Automotive & Mechanical Shop",
    "Garments & Cosmetology Lab",
    "Food Trades / Culinary Lab",
    "Drafting & Civil Tech Studio",
    "Main Library",
    "School Canteen",
    "Covered Court / Gymnasium",
] as const;

export type CampusHubName = (typeof CAMPUS_HUB_NAMES)[number];

export interface CampusHubSeed {
    id: string;
    name: CampusHubName;
    buildingCode: string;
    isDropOffHub: boolean;
    lat: number;
    lng: number;
    description: string;
}

export const CAMPUS_HUBS: readonly CampusHubSeed[] = [
    {
        id: "loc-guard-house",
        name: "Guard House",
        buildingCode: "GATE-1",
        isDropOffHub: true,
        lat: 18.1961,
        lng: 120.5923,
        description:
            "Main gate security post along P. Gomez St. Open 24/7 for item drop-off.",
    },
    {
        id: "loc-guidance",
        name: "Guidance Office",
        buildingCode: "ADMIN-1F",
        isDropOffHub: true,
        lat: 18.1965,
        lng: 120.5926,
        description:
            "Ground floor, Administration Building. Official safekeeping for IDs and valuables.",
    },
    {
        id: "loc-ssg",
        name: "SSG / Student Affairs Office",
        buildingCode: "OSA-1F",
        isDropOffHub: true,
        lat: 18.1967,
        lng: 120.5925,
        description:
            "Supreme Student Government office near the student quadrangle.",
    },
    {
        id: "loc-ict-lab",
        name: "ICT / Computer Lab",
        buildingCode: "ICT-2F",
        isDropOffHub: true,
        lat: 18.1969,
        lng: 120.5929,
        description:
            "2nd floor ICT Building. Check with the lab technician for flash drives and gadgets.",
    },
    {
        id: "loc-electronics-lab",
        name: "Electronics & Electrical Lab",
        buildingCode: "TECH-A",
        isDropOffHub: true,
        lat: 18.1971,
        lng: 120.5924,
        description:
            "Trade & Tech Building A. Multimeters, calculators, and lab tools.",
    },
    {
        id: "loc-automotive-shop",
        name: "Automotive & Mechanical Shop",
        buildingCode: "SHOP-B",
        isDropOffHub: true,
        lat: 18.1972,
        lng: 120.5931,
        description: "North Workshop Complex.",
    },
    {
        id: "loc-garments-lab",
        name: "Garments & Cosmetology Lab",
        buildingCode: "TVL-1F",
        isDropOffHub: true,
        lat: 18.1964,
        lng: 120.593,
        description: "TVL Home Economics wing, 1st floor.",
    },
    {
        id: "loc-food-trades",
        name: "Food Trades / Culinary Lab",
        buildingCode: "TVL-2F",
        isDropOffHub: true,
        lat: 18.1963,
        lng: 120.5932,
        description: "Baking and culinary arts laboratory.",
    },
    {
        id: "loc-drafting-studio",
        name: "Drafting & Civil Tech Studio",
        buildingCode: "TECH-C",
        isDropOffHub: true,
        lat: 18.197,
        lng: 120.5927,
        description: "T-squares, canisters, and engineering calculators.",
    },
    {
        id: "loc-library",
        name: "Main Library",
        buildingCode: "LIB-2F",
        isDropOffHub: true,
        lat: 18.1966,
        lng: 120.5928,
        description:
            "Circulation desk holds notebooks, books, and umbrellas left at tables.",
    },
    {
        id: "loc-canteen",
        name: "School Canteen",
        buildingCode: "CANT",
        isDropOffHub: false,
        lat: 18.1962,
        lng: 120.5927,
        description: "Main student dining area.",
    },
    {
        id: "loc-covered-court",
        name: "Covered Court / Gymnasium",
        buildingCode: "GYM",
        isDropOffHub: false,
        lat: 18.1968,
        lng: 120.5922,
        description: "Campus covered court and bleachers.",
    },
] as const;
