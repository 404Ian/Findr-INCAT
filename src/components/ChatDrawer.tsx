import React, { useState } from "react";
import { X, Send, MessageSquare, EyeOff } from "lucide-react";
import type { ChatMessage, UserProfile } from "../types";

interface ChatDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    targetTitle: string;
    postId?: string;
    itemId?: string;
    messages: ChatMessage[];
    currentUser: UserProfile;
    onSendMessage: (content: string, isAnonymous: boolean) => void;
}

export const ChatDrawer: React.FC<ChatDrawerProps> = ({
    isOpen,
    onClose,
    targetTitle,
    messages,
    currentUser,
    onSendMessage,
}) => {
    const [draft, setDraft] = useState("");
    const [sendAnonymously, setSendAnonymously] = useState(false);

    if (!isOpen) return null;

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (!draft.trim()) return;
        onSendMessage(draft.trim(), sendAnonymously);
        setDraft("");
    };

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-sm">
            <div className="radar-card w-full max-w-md h-full flex flex-col justify-between border-l border-white/15">
                {/* Header */}
                <div className="p-4 border-b border-white/10 bg-radar-elevated flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-blue-500/15 text-blue-400">
                            <MessageSquare className="w-4 h-4" />
                        </div>
                        <div>
                            <div className="text-[10px] font-mono-tabular uppercase text-blue-400">
                                In-App Campus Relay Thread
                            </div>
                            <h3 className="text-sm font-bold text-white line-clamp-1">
                                {targetTitle}
                            </h3>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Messages Feed */}
                <div className="flex-1 p-4 overflow-y-auto space-y-3">
                    {messages.length === 0 ? (
                        <div className="text-center py-12 text-xs text-slate-400">
                            No messages yet. Start a conversation to coordinate
                            pickup or share a sighting!
                        </div>
                    ) : (
                        messages.map((m) => (
                            <div
                                key={m.id}
                                className="p-3 rounded-xl bg-radar-bg border border-white/10 space-y-1"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                                        {m.is_anonymous
                                            ? "Anonymous Student / Onlooker"
                                            : m.sender_name}
                                        <span className="font-mono-tabular text-[10px] uppercase px-1.5 py-0.5 rounded bg-white/5 text-slate-300">
                                            {m.sender_role}
                                        </span>
                                    </span>
                                    <span className="text-[10px] font-mono-tabular text-slate-400">
                                        {m.created_at}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-200 leading-relaxed">
                                    {m.content}
                                </p>
                            </div>
                        ))
                    )}
                </div>

                {/* Input Footer */}
                <form
                    onSubmit={handleSend}
                    className="p-4 border-t border-white/10 bg-radar-elevated space-y-2.5"
                >
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 text-[11px]">
                            Posting as:{" "}
                            <strong className="text-white">
                                {sendAnonymously
                                    ? "Anonymous Student"
                                    : currentUser.name}
                            </strong>
                        </span>
                        <label className="inline-flex items-center gap-1.5 cursor-pointer text-[11px] text-amber-300">
                            <input
                                type="checkbox"
                                checked={sendAnonymously}
                                onChange={(e) =>
                                    setSendAnonymously(e.target.checked)
                                }
                                className="accent-amber-400"
                            />
                            <EyeOff className="w-3 h-3" /> Hide My Name
                        </label>
                    </div>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            placeholder="Write a campus message or sighting update..."
                            className="flex-1 px-3.5 py-2.5 rounded-xl bg-radar-bg border border-white/10 text-xs text-white focus:border-blue-500 outline-none"
                        />
                        <button
                            type="submit"
                            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                        >
                            <Send className="w-3.5 h-3.5" />
                            Send
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
