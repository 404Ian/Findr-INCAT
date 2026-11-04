import type { ChatMessage, ClaimAttempt, PostItem, QrGearItem } from "../types";

const POSTS_KEY = "campusradar_posts_v2";
const GEAR_KEY = "campusradar_gear_v2";
const CHATS_KEY = "campusradar_chats_v2";
const VERIFIED_KEY = "campusradar_verified_posts_v2";

const INITIAL_POSTS: PostItem[] = [
    {
        id: "post-wallet-1",
        type: "FOUND",
        status: "OPEN",
        title: "Black Leather Bi-Fold Wallet with Cash & IDs",
        category: "Wallets & Cash",
        description:
            "Turned in by a junior high student who found it near the Canteen washing area during lunch break. Currently locked safely in the Guidance Office drawer.",
        hubId: "guidance",
        locationDetail: "Admin Bldg Room 102 — Ask for Ms. Santos",
        posterName: "Ms. Clara Santos",
        posterRole: "OFFICE",
        posterDept: "Guidance Office • ADM-102",
        verificationQuestion:
            "To prove ownership: Name the exact ID card inside the clear window slot and the two keychains attached to the zipper.",
        expectedAnswerHint: "national id",
        createdAt: "18 min ago",
        contactChannels: {
            inAppChat: true,
        },
        claims: [
            {
                id: "claim-101",
                postId: "post-wallet-1",
                claimantName: "Kevin Ramos",
                claimantRole: "Grade 10 - STE",
                answer: "PhilSys National ID under Kevin Ramos, plus a mini bronze wrench keychain and blue whistle.",
                contactInfo: "0917-555-0149",
                status: "PENDING",
                createdAt: "9 min ago",
            },
        ],
    },
    {
        id: "post-aquaflask-2",
        type: "LOST",
        status: "OPEN",
        title: "Obsidian Black 40oz AquaFlask (QR Tag #CR-AQUA-40OZ)",
        category: "Tumblers & Flasks",
        description:
            "Accidentally left my matte black 40oz AquaFlask on the 2nd row bleachers of the Covered Gym after PE. It has a CampusRadar QR sticker on the side and a Robotics Club decal.",
        hubId: "gymnasium",
        locationDetail: "Bleachers Section B / Drop off at Guard House",
        posterName: "Ian Dela Cruz",
        posterRole: "STUDENT",
        posterDept: "Grade 12 - STEM A",
        linkedQrTag: "CR-AQUA-40OZ",
        createdAt: "25 min ago",
        contactChannels: {
            inAppChat: true,
            messenger: "m.me/iandelacruz.incat",
            sms: "0917-842-9910",
        },
        claims: [],
    },
    {
        id: "post-pencil-3",
        type: "FOUND",
        status: "OPEN",
        title: "Apple Pencil (2nd Gen) + Navy iPad Sleeve",
        category: "Phones & Gadgets",
        description:
            "Left behind at Workstation #14 in Computer Lab 2 after the Grade 11 Programming class. Held safely at the ICT Faculty Desk.",
        hubId: "computer-lab",
        locationDetail: "ICT Bldg Room 202 — Faculty Cubicle 4",
        posterName: "Engr. Marco Reyes",
        posterRole: "FACULTY",
        posterDept: "Mathematics & Robotics Dept",
        verificationQuestion:
            "What custom engraving text is printed on the side of the Apple Pencil, and what brand is the navy sleeve?",
        expectedAnswerHint: "tomtoc",
        createdAt: "1 hr ago",
        contactChannels: {
            inAppChat: true,
            messenger: "m.me/marcoreyes.ict",
        },
        claims: [],
    },
    {
        id: "post-calc-4",
        type: "FOUND",
        status: "OPEN",
        title: "Casio fx-570ES Plus Calculator",
        category: "Calculators",
        description:
            "Found this scientific calculator on the 3rd floor Library study carrel #9. I handed it directly to the Main Gate Guard House logbook desk on my way home.",
        hubId: "guard-house",
        locationDetail:
            "Turned in to Officer Bautista at Main Gate Guard House",
        posterName: "Anonymous Student",
        posterRole: "STUDENT",
        posterDept: "Anonymous Campus Tip",
        verificationQuestion:
            "What name or section is written in silver permanent marker inside the slide-on hard cover?",
        expectedAnswerHint: "stem",
        passcode: "1234",
        createdAt: "2 hrs ago",
        contactChannels: {
            inAppChat: true,
        },
        claims: [],
    },
];

const INITIAL_GEAR: QrGearItem[] = [
    {
        tagId: "CR-991EX-STEM",
        name: "Casio fx-991EX ClassWiz Scientific Calculator",
        category: "Calculators",
        ownerName: "Ian Dela Cruz",
        ownerSection: "Grade 12 - STEM A",
        preferredHubId: "ssg-office",
        handoverNote:
            "Has a small scratch near the SOLAR logo. Needed urgently for Calculus exam! Please drop off at SSG Office or message me on Messenger.",
        status: "SAFE",
        lastPingLocation: "Main Library — Table 4",
        lastPingTime: "Today, 10:42 AM",
        contactChannels: {
            inAppChat: true,
            messenger: "m.me/iandelacruz.incat",
            sms: "0917-842-9910",
        },
    },
    {
        tagId: "CR-AQUA-40OZ",
        name: "Obsidian Black 40oz AquaFlask (With Silicone Boot)",
        category: "Tumblers & Flasks",
        ownerName: "Ian Dela Cruz",
        ownerSection: "Grade 12 - STEM A",
        preferredHubId: "guard-house",
        handoverNote:
            "Left near the Gymnasium bleachers after 3rd period PE class. Has a Robotics Club holographic sticker near the base.",
        status: "LOST",
        lastPingLocation: "Main Gate / Guard House — Security Desk",
        lastPingTime: "Just now",
        contactChannels: {
            inAppChat: true,
            messenger: "m.me/iandelacruz.incat",
            sms: "0917-842-9910",
        },
    },
    {
        tagId: "CR-ID-202588",
        name: "School RFID Card + Blue Campus Lanyard & USB Drive",
        category: "IDs & Lanyards",
        ownerName: "Ian Dela Cruz",
        ownerSection: "Grade 12 - STEM A",
        preferredHubId: "guard-house",
        handoverNote:
            "Contains my school RFID pass and a silver 64GB Kingston flash drive. Please return to the Guard House or ping me!",
        status: "SAFE",
        contactChannels: {
            inAppChat: true,
            messenger: "m.me/iandelacruz.incat",
        },
    },
];

export const api = {
    getPosts(): PostItem[] {
        const raw = localStorage.getItem(POSTS_KEY);
        if (!raw) {
            localStorage.setItem(POSTS_KEY, JSON.stringify(INITIAL_POSTS));
            return INITIAL_POSTS;
        }
        try {
            return JSON.parse(raw);
        } catch {
            return INITIAL_POSTS;
        }
    },

    savePosts(posts: PostItem[]): void {
        localStorage.setItem(POSTS_KEY, JSON.stringify(posts));
    },

    getGear(): QrGearItem[] {
        const raw = localStorage.getItem(GEAR_KEY);
        if (!raw) {
            localStorage.setItem(GEAR_KEY, JSON.stringify(INITIAL_GEAR));
            return INITIAL_GEAR;
        }
        try {
            return JSON.parse(raw);
        } catch {
            return INITIAL_GEAR;
        }
    },

    saveGear(gear: QrGearItem[]): void {
        localStorage.setItem(GEAR_KEY, JSON.stringify(gear));
    },

    getVerifiedPostIds(): string[] {
        const raw = localStorage.getItem(VERIFIED_KEY);
        if (!raw) return [];
        try {
            return JSON.parse(raw);
        } catch {
            return [];
        }
    },

    markPostVerifiedForSession(postId: string): string[] {
        const current = this.getVerifiedPostIds();
        if (!current.includes(postId)) {
            const updated = [...current, postId];
            localStorage.setItem(VERIFIED_KEY, JSON.stringify(updated));
            return updated;
        }
        return current;
    },

    getChats(postId: string): ChatMessage[] {
        const raw = localStorage.getItem(CHATS_KEY);
        const all: Record<string, ChatMessage[]> = raw ? JSON.parse(raw) : {};
        if (!all[postId]) {
            all[postId] = [
                {
                    id: "msg-init-1",
                    postId,
                    senderName: "Campus Dispatch",
                    senderRole: "SYSTEM",
                    text: "Thread opened for handover coordination. Keep personal details private until identity is confirmed.",
                    createdAt: "Today",
                },
            ];
            localStorage.setItem(CHATS_KEY, JSON.stringify(all));
        }
        return all[postId];
    },

    sendChatMessage(
        postId: string,
        senderName: string,
        senderRole: string,
        text: string,
    ): ChatMessage[] {
        const raw = localStorage.getItem(CHATS_KEY);
        const all: Record<string, ChatMessage[]> = raw ? JSON.parse(raw) : {};
        const list = all[postId] || [];
        const nextMsg: ChatMessage = {
            id: `msg-${Date.now()}`,
            postId,
            senderName,
            senderRole,
            text,
            createdAt: new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
            }),
        };
        const updated = [...list, nextMsg];
        all[postId] = updated;
        localStorage.setItem(CHATS_KEY, JSON.stringify(all));
        return updated;
    },

    submitClaim(
        postId: string,
        claim: Omit<ClaimAttempt, "id" | "postId" | "createdAt">,
    ): PostItem[] {
        const posts = this.getPosts();
        const updated = posts.map((p) => {
            if (p.id !== postId) return p;
            const newClaim: ClaimAttempt = {
                ...claim,
                id: `claim-${Date.now()}`,
                postId,
                createdAt: "Just now",
            };
            return { ...p, claims: [newClaim, ...p.claims] };
        });
        this.savePosts(updated);
        return updated;
    },

    updateClaimStatus(
        postId: string,
        claimId: string,
        status: "APPROVED" | "REJECTED",
    ): PostItem[] {
        const posts = this.getPosts();
        const updated = posts.map((p) => {
            if (p.id !== postId) return p;
            return {
                ...p,
                claims: p.claims.map((c) =>
                    c.id === claimId ? { ...c, status } : c,
                ),
            };
        });
        this.savePosts(updated);
        if (status === "APPROVED") {
            this.markPostVerifiedForSession(postId);
        }
        return updated;
    },
};
