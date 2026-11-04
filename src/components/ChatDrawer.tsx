import React, { useEffect, useState } from "react";
import { X, Send } from "lucide-react";
import type { ChatMessage, DemoUser, PostItem } from "../types";
import { api } from "../services/api";

interface ChatDrawerProps {
    post: PostItem | null;
    currentUser: DemoUser;
    onClose: () => void;
}

export const ChatDrawer: React.FC<ChatDrawerProps> = ({
    post,
    currentUser,
    onClose,
}) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [draft, setDraft] = useState("");

    useEffect(() => {
        if (post) {
            setMessages(api.getChats(post.id));
        }
    }, [post]);

    if (!post) return null;

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (!draft.trim()) return;
        const updated = api.sendChatMessage(
            post.id,
            currentUser.name,
            currentUser.dept,
            draft.trim(),
        );
        setMessages(updated);
        setDraft("");
    };

    return (
        <div
            className="fixed inset-0 z-50 flex justify-end bg-black/25 dark:bg-black/50"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-label="Campus chat"
        >
            <div
                className="w-full max-w-md bg-surface border-l border-border h-full flex flex-col justify-between p-6 shadow-popover"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="pb-4 border-b border-border flex items-start justify-between gap-4">
                    <div>
                        <div className="text-xs text-muted">Campus chat</div>
                        <h2 className="text-base font-medium text-text line-clamp-1">
                            {post.title}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        aria-label="Close chat"
                        className="p-1 text-muted hover:text-text rounded-md"
                    >
                        <X size={18} strokeWidth={1.5} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto py-4 space-y-4">
                    {messages.map((msg) => {
                        const isSelf = msg.senderName === currentUser.name;
                        return (
                            <div
                                key={msg.id}
                                className={`flex flex-col ${isSelf ? "items-end" : "items-start"}`}
                            >
                                <div className="text-xs text-muted mb-1">
                                    {msg.senderName} · {msg.createdAt}
                                </div>
                                <div
                                    className={`max-w-[85%] px-3.5 py-2 rounded-md text-sm border ${
                                        isSelf
                                            ? "bg-subtle border-border text-text"
                                            : "bg-surface border-border text-text"
                                    }`}
                                >
                                    {msg.text}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <form
                    onSubmit={handleSend}
                    className="pt-4 border-t border-border flex items-center gap-2"
                >
                    <input
                        type="text"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        placeholder="Write a message..."
                        className="flex-1 px-3 py-2 text-sm bg-bg border border-border rounded-md text-text placeholder:text-muted"
                    />
                    <button
                        type="submit"
                        aria-label="Send message"
                        className="px-3.5 py-2 bg-accent text-accent-fg text-sm font-medium rounded-md hover:opacity-90 transition-opacity duration-150 inline-flex items-center gap-1.5"
                    >
                        <Send size={15} strokeWidth={1.5} />
                        Send
                    </button>
                </form>
            </div>
        </div>
    );
};
