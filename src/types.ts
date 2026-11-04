export type PostType = "LOST" | "FOUND";
export type PostStatus = "OPEN" | "RESOLVED";
export type CustodyRole = "STUDENT" | "FACULTY" | "OFFICE" | "GUARD";

export interface ContactChannels {
    inAppChat: boolean;
    messenger?: string;
    sms?: string;
}

export interface ClaimAttempt {
    id: string;
    postId: string;
    claimantName: string;
    claimantRole: string;
    answer: string;
    contactInfo: string;
    status: "PENDING" | "APPROVED" | "REJECTED";
    createdAt: string;
}

export interface ChatMessage {
    id: string;
    postId: string;
    senderName: string;
    senderRole: string;
    text: string;
    createdAt: string;
}

export interface PostItem {
    id: string;
    type: PostType;
    status: PostStatus;
    title: string;
    category: string;
    description: string;
    hubId: string;
    locationDetail: string;
    posterName: string;
    posterRole: CustodyRole;
    posterDept: string;
    verificationQuestion?: string;
    expectedAnswerHint?: string;
    photoUrl?: string;
    linkedQrTag?: string;
    passcode?: string;
    createdAt: string;
    returnedAt?: string;
    contactChannels: ContactChannels;
    claims: ClaimAttempt[];
}

export interface QrGearItem {
    tagId: string;
    name: string;
    category: string;
    ownerName: string;
    ownerSection: string;
    preferredHubId: string;
    handoverNote: string;
    status: "SAFE" | "LOST";
    photoUrl?: string;
    lastPingLocation?: string;
    lastPingTime?: string;
    contactChannels: ContactChannels;
}

export interface CampusHub {
    id: string;
    code: string;
    name: string;
    building: string;
    custodyNote: string;
    lat: number;
    lng: number;
}

export interface DemoUser {
    id: string;
    name: string;
    role: CustodyRole;
    dept: string;
    initials: string;
}
