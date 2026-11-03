export type CampusRole = "student" | "faculty" | "staff";

export type PostType = "lost" | "found";

export type PostStatus = "open" | "verifying" | "resolved";

export type ItemCategory =
    | "IDs & Lanyards"
    | "Tumblers & Flasks"
    | "Phones & Gadgets"
    | "Calculators"
    | "Books & Notebooks"
    | "Wallets & Cash"
    | "Uniforms & PE Gear"
    | "Keys & Umbrellas";

export type CampusHubName =
    | "Main Gate / Guard House"
    | "Guidance Office"
    | "SSG / Student Council Office"
    | "Principal's Office"
    | "Canteen"
    | "Library"
    | "Gymnasium"
    | "Computer Lab"
    | "Custom Room #";

export interface ContactConfig {
    enableInAppChat: boolean;
    fbMessenger?: string; // e.g., https://m.me/username or profile link
    whatsApp?: string; // e.g., 639171234567
    smsNumber?: string; // e.g., +639171234567
    phoneCall?: string; // e.g., +639171234567
    email?: string; // e.g., student@school.edu
    showMapPin: boolean;
}

export interface UserProfile {
    id: string;
    name: string;
    role: CampusRole;
    department_or_section: string;
}

export interface VerificationClaim {
    id: string;
    post_id: string;
    claimant_name: string;
    claimant_role: CampusRole;
    verification_answer: string;
    contact_info: string;
    status: "pending" | "approved" | "rejected";
    created_at: string;
}

export interface WallPost {
    id: string;
    user_id?: string | null;
    is_anonymous: boolean;
    poster_name: string;
    poster_role: CampusRole;
    poster_dept?: string;
    edit_passcode?: string; // Kept locally when user generates an anonymous post
    linked_item_id?: string | null;
    post_type: PostType;
    title: string;
    description: string;
    category: ItemCategory;
    campus_hub: CampusHubName;
    room_detail?: string;
    lat: number;
    lng: number;
    verification_question?: string | null;
    sensitive_pickup_note?: string | null;
    contact_config: ContactConfig;
    status: PostStatus;
    created_at: string;
    claims: VerificationClaim[];
}

export interface RegisteredItem {
    id: string;
    user_id: string;
    owner_name: string;
    owner_role: CampusRole;
    owner_dept: string;
    tag_code: string;
    name: string;
    category: ItemCategory;
    status: "safe" | "lost";
    custom_note: string;
    contact_config: ContactConfig;
    meetup_hub: CampusHubName;
    meetup_room?: string;
    lat: number;
    lng: number;
    last_ping_location?: string;
    last_ping_time?: string;
    created_at: string;
}

export interface ChatMessage {
    id: string;
    post_id?: string;
    item_id?: string;
    sender_name: string;
    sender_role: CampusRole;
    is_anonymous: boolean;
    content: string;
    created_at: string;
}

export type StickerFormat = "micro-strip" | "standard-square" | "id-card-back";
