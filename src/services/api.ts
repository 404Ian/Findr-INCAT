import type {
    WallPost,
    RegisteredItem,
    ChatMessage,
    UserProfile,
} from "../types";

const STORAGE_KEYS = {
    POSTS: "campus_radar_posts_v2",
    ITEMS: "campus_radar_items_v2",
    MESSAGES: "campus_radar_messages_v2",
    USER: "campus_radar_user_v2",
};

export const INITIAL_DEMO_USERS: UserProfile[] = [
    {
        id: "usr-student-1",
        name: "Ian Dela Cruz",
        role: "student",
        department_or_section: "Grade 12 - STEM A",
    },
    {
        id: "usr-staff-1",
        name: "Ms. Clara Santos (Guidance Counselor)",
        role: "staff",
        department_or_section: "Guidance & Counseling Office",
    },
    {
        id: "usr-faculty-1",
        name: "Engr. Marco Reyes",
        role: "faculty",
        department_or_section: "Mathematics & Robotics Dept",
    },
];

export const INITIAL_REGISTERED_ITEMS: RegisteredItem[] = [
    {
        id: "item-calc-01",
        user_id: "usr-student-1",
        owner_name: "Ian Dela Cruz",
        owner_role: "student",
        owner_dept: "Grade 12 - STEM A",
        tag_code: "CR-991EX-STEM",
        name: "Casio fx-991EX ClassWiz Scientific Calculator",
        category: "Calculators",
        status: "safe",
        custom_note:
            "Has a small scratch near the SOLAR logo. Needed urgently for Calculus exam! Please drop off at SSG Office or message me on Messenger.",
        contact_config: {
            enableInAppChat: true,
            fbMessenger: "https://m.me/iandelacruz.stem",
            whatsApp: "639175550192",
            smsNumber: "+639175550192",
            phoneCall: "+639175550192",
            email: "ian.delacruz@campus.edu.ph",
            showMapPin: true,
        },
        meetup_hub: "SSG / Student Council Office",
        meetup_room: "STEM Bldg Room 304 (Homeroom)",
        lat: 14.6545,
        lng: 121.0689,
        last_ping_location: "Main Library — Table 4",
        last_ping_time: "Today, 10:42 AM",
        created_at: "2025-02-10T08:00:00Z",
    },
    {
        id: "item-flask-02",
        user_id: "usr-student-1",
        owner_name: "Ian Dela Cruz",
        owner_role: "student",
        owner_dept: "Grade 12 - STEM A",
        tag_code: "CR-AQUA-40OZ",
        name: "Obsidian Black 40oz AquaFlask (With Silicone Boot)",
        category: "Tumblers & Flasks",
        status: "lost",
        custom_note:
            "Left near the Gymnasium bleachers after 3rd period PE class. Has a Robotics Club holographic sticker near the base.",
        contact_config: {
            enableInAppChat: true,
            fbMessenger: "https://m.me/iandelacruz.stem",
            smsNumber: "+639175550192",
            showMapPin: true,
        },
        meetup_hub: "Main Gate / Guard House",
        meetup_room: "Guard House Lost & Found Shelf",
        lat: 14.6532,
        lng: 121.0698,
        last_ping_location: "Covered Gymnasium — Bleachers Section B",
        last_ping_time: "25 mins ago",
        created_at: "2025-02-12T09:15:00Z",
    },
    {
        id: "item-id-03",
        user_id: "usr-student-1",
        owner_name: "Ian Dela Cruz",
        owner_role: "student",
        owner_dept: "Grade 12 - STEM A",
        tag_code: "CR-ID-202588",
        name: "School RFID Card + Blue Campus Lanyard & USB Drive",
        category: "IDs & Lanyards",
        status: "safe",
        custom_note:
            "Contains my school RFID pass and a silver 64GB Kingston flash drive. Please return to the Guard House or ping me!",
        contact_config: {
            enableInAppChat: true,
            fbMessenger: "https://m.me/iandelacruz.stem",
            whatsApp: "639175550192",
            email: "ian.delacruz@campus.edu.ph",
            showMapPin: true,
        },
        meetup_hub: "Main Gate / Guard House",
        meetup_room: "Main Gate Security Desk",
        lat: 14.6529,
        lng: 121.0672,
        created_at: "2025-02-14T07:30:00Z",
    },
];

export const INITIAL_WALL_POSTS: WallPost[] = [
    {
        id: "post-101",
        user_id: "usr-staff-1",
        is_anonymous: false,
        poster_name: "Ms. Clara Santos (Guidance Office)",
        poster_role: "staff",
        poster_dept: "Official Custody • ADM-102",
        post_type: "found",
        title: "Found: Black Leather Bi-Fold Wallet with Cash & IDs",
        description:
            "Turned in by a junior high student who found it near the Canteen washing area during lunch break. Currently locked safely in the Guidance Office drawer.",
        category: "Wallets & Cash",
        campus_hub: "Guidance Office",
        room_detail: "Admin Bldg Room 102 — Ask for Ms. Santos",
        lat: 14.6541,
        lng: 121.0681,
        verification_question:
            "To prove ownership: Name the exact ID card inside the clear window slot and the two keychains attached to the zipper.",
        sensitive_pickup_note:
            "Approved! Please proceed to Admin Building Room 102 before 4:30 PM and present your School Registration Form. Reference Log #GO-2025-089.",
        contact_config: {
            enableInAppChat: true,
            email: "guidance.office@campus.edu.ph",
            showMapPin: true,
        },
        status: "verifying",
        created_at: "18 mins ago",
        claims: [
            {
                id: "claim-501",
                post_id: "post-101",
                claimant_name: "miguel_santos_g11",
                claimant_role: "student",
                verification_answer:
                    "It has my National ID (Miguel R. Santos) in the window slot, plus a mini Lego Spider-Man and a silver dorm key on the ring!",
                contact_info: "https://m.me/miguelsantos.g11 | 0918-334-9921",
                status: "pending",
                created_at: "6 mins ago",
            },
        ],
    },
    {
        id: "post-102",
        user_id: "usr-student-1",
        is_anonymous: false,
        poster_name: "Ian Dela Cruz",
        poster_role: "student",
        poster_dept: "Grade 12 - STEM A",
        linked_item_id: "item-flask-02",
        post_type: "lost",
        title: "LOST: Obsidian Black 40oz AquaFlask (QR Tag #CR-AQUA-40OZ)",
        description:
            "Accidentally left my matte black 40oz AquaFlask on the 2nd row bleachers of the Covered Gym after PE. It has a CampusRadar QR sticker on the side and a Robotics Club decal.",
        category: "Tumblers & Flasks",
        campus_hub: "Gymnasium",
        room_detail: "Bleachers Section B / Drop off at Guard House",
        lat: 14.6532,
        lng: 121.0698,
        contact_config: {
            enableInAppChat: true,
            fbMessenger: "https://m.me/iandelacruz.stem",
            smsNumber: "+639175550192",
            showMapPin: true,
        },
        status: "open",
        created_at: "25 mins ago",
        claims: [],
    },
    {
        id: "post-103",
        user_id: "usr-faculty-1",
        is_anonymous: false,
        poster_name: "Engr. Marco Reyes",
        poster_role: "faculty",
        poster_dept: "Mathematics & Robotics Dept",
        post_type: "found",
        title: "Found in Lab: Apple Pencil (2nd Gen) + Navy iPad Sleeve",
        description:
            "Left behind at Workstation #14 in Computer Lab 2 after the Grade 11 Programming class. Held safely at the ICT Faculty Desk.",
        category: "Phones & Gadgets",
        campus_hub: "Computer Lab",
        room_detail: "ICT Bldg Room 202 — Faculty Cubicle 4",
        lat: 14.6546,
        lng: 121.0677,
        verification_question:
            "What custom engraving text is printed on the side of the Apple Pencil, and what brand is the navy sleeve?",
        sensitive_pickup_note:
            "Ownership verified! You can pick it up at ICT Bldg Room 202 between periods. Ask for Engr. Reyes.",
        contact_config: {
            enableInAppChat: true,
            fbMessenger: "https://m.me/engr.marcoreyes",
            email: "m.reyes@campus.edu.ph",
            showMapPin: true,
        },
        status: "open",
        created_at: "1 hr ago",
        claims: [],
    },
    {
        id: "post-104",
        user_id: null,
        is_anonymous: true,
        poster_name: "Anonymous Student",
        poster_role: "student",
        poster_dept: "Anonymous Campus Tip",
        edit_passcode: "PASS-7741",
        post_type: "found",
        title: "Spotted & Turned In: Casio fx-570ES Plus Calculator",
        description:
            "Found this scientific calculator on the 3rd floor Library study carrel #9. I handed it directly to the Main Gate Guard House logbook desk on my way home.",
        category: "Calculators",
        campus_hub: "Main Gate / Guard House",
        room_detail: "Turned in to Officer Bautista at Main Gate Guard House",
        lat: 14.6529,
        lng: 121.0672,
        verification_question:
            "What name or section is written in silver permanent marker inside the slide-on hard cover?",
        sensitive_pickup_note:
            "Verified! Show this screen to Officer Bautista at the Main Gate Guard House (Log Entry #14).",
        contact_config: {
            enableInAppChat: true,
            showMapPin: true,
        },
        status: "open",
        created_at: "2 hrs ago",
        claims: [],
    },
];

export const INITIAL_MESSAGES: ChatMessage[] = [
    {
        id: "msg-1",
        post_id: "post-101",
        sender_name: "Ms. Clara Santos (Guidance Office)",
        sender_role: "staff",
        is_anonymous: false,
        content:
            "Hello! If you submitted a verification claim for the black leather wallet, please also bring your current school ID when claiming at Room 102.",
        created_at: "14 mins ago",
    },
    {
        id: "msg-2",
        post_id: "post-102",
        sender_name: "Anonymous Student",
        sender_role: "student",
        is_anonymous: true,
        content:
            "Hey Ian! I saw a black AquaFlask near the PE Equipment bench around 11:30 AM, the coach might have kept it inside the PE office!",
        created_at: "10 mins ago",
    },
];

export const apiService = {
    getPosts(): WallPost[] {
        const raw = localStorage.getItem(STORAGE_KEYS.POSTS);
        if (!raw) {
            localStorage.setItem(
                STORAGE_KEYS.POSTS,
                JSON.stringify(INITIAL_WALL_POSTS),
            );
            return INITIAL_WALL_POSTS;
        }
        return JSON.parse(raw);
    },

    savePosts(posts: WallPost[]): void {
        localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(posts));
        // Also attempt non-blocking sync with Cloudflare Pages D1 backend if running on Wrangler
        fetch("/api/posts", { method: "GET" }).catch(() => {});
    },

    getItems(): RegisteredItem[] {
        const raw = localStorage.getItem(STORAGE_KEYS.ITEMS);
        if (!raw) {
            localStorage.setItem(
                STORAGE_KEYS.ITEMS,
                JSON.stringify(INITIAL_REGISTERED_ITEMS),
            );
            return INITIAL_REGISTERED_ITEMS;
        }
        return JSON.parse(raw);
    },

    saveItems(items: RegisteredItem[]): void {
        localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(items));
    },

    getMessages(): ChatMessage[] {
        const raw = localStorage.getItem(STORAGE_KEYS.MESSAGES);
        if (!raw) {
            localStorage.setItem(
                STORAGE_KEYS.MESSAGES,
                JSON.stringify(INITIAL_MESSAGES),
            );
            return INITIAL_MESSAGES;
        }
        return JSON.parse(raw);
    },

    saveMessages(messages: ChatMessage[]): void {
        localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
    },

    resetDemoData(): {
        posts: WallPost[];
        items: RegisteredItem[];
        messages: ChatMessage[];
    } {
        localStorage.setItem(
            STORAGE_KEYS.POSTS,
            JSON.stringify(INITIAL_WALL_POSTS),
        );
        localStorage.setItem(
            STORAGE_KEYS.ITEMS,
            JSON.stringify(INITIAL_REGISTERED_ITEMS),
        );
        localStorage.setItem(
            STORAGE_KEYS.MESSAGES,
            JSON.stringify(INITIAL_MESSAGES),
        );
        return {
            posts: INITIAL_WALL_POSTS,
            items: INITIAL_REGISTERED_ITEMS,
            messages: INITIAL_MESSAGES,
        };
    },
};
