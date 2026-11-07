export { CAMPUS_CENTER, INCAT_CENTER } from "../lib/campus";

export const CAMPUS_HUB_NAMES = [
    "Guard House",
    "Administration Building",
    "Guidance Office",
    "ICT (JHS)",
    "ICT (SHS)",
    "Garments",
    "Practical Arts",
    "Science Building",
    "Centennial Park",
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

const NOT_A_HUB =
    "Campus location, not a drop-off point. Turn found items in at the Guard House, Administration Building or Guidance Office.";

export const CAMPUS_HUBS: readonly CampusHubSeed[] = [
    {
        id: "loc-guard-house",
        name: "Guard House",
        buildingCode: "GATE",
        isDropOffHub: true,
        lat: 18.203499,
        lng: 120.592695,
        description: "Guard House. Official drop-off point for found items.",
    },
    {
        id: "loc-admin",
        name: "Administration Building",
        buildingCode: "ADMIN",
        isDropOffHub: true,
        lat: 18.203466,
        lng: 120.592876,
        description:
            "Administration Building. Official drop-off point for found items.",
    },
    {
        id: "loc-guidance",
        name: "Guidance Office",
        buildingCode: "GUIDANCE",
        isDropOffHub: true,
        lat: 18.203874,
        lng: 120.593395,
        description:
            "Guidance Office, JHS building. Official drop-off point for found items.",
    },
    {
        id: "loc-ict-jhs",
        name: "ICT (JHS)",
        buildingCode: "ICT-JHS",
        isDropOffHub: false,
        lat: 18.203857,
        lng: 120.592504,
        description: NOT_A_HUB,
    },
    {
        id: "loc-ict-shs",
        name: "ICT (SHS)",
        buildingCode: "ICT-SHS",
        isDropOffHub: false,
        lat: 18.203611,
        lng: 120.592416,
        description: NOT_A_HUB,
    },
    {
        id: "loc-garments",
        name: "Garments",
        buildingCode: "GARMENTS",
        isDropOffHub: false,
        lat: 18.204366,
        lng: 120.592019,
        description: NOT_A_HUB,
    },
    {
        id: "loc-practical-arts",
        name: "Practical Arts",
        buildingCode: "PRACTICAL",
        isDropOffHub: false,
        lat: 18.204866,
        lng: 120.592829,
        description: NOT_A_HUB,
    },
    {
        id: "loc-science",
        name: "Science Building",
        buildingCode: "SCIENCE",
        isDropOffHub: false,
        lat: 18.204721,
        lng: 120.59212,
        description: NOT_A_HUB,
    },
    {
        id: "loc-centennial-park",
        name: "Centennial Park",
        buildingCode: "PARK",
        isDropOffHub: false,
        lat: 18.204481,
        lng: 120.592751,
        description: NOT_A_HUB,
    },
] as const;
