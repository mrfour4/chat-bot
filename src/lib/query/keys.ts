export type DocumentsQueryKeyInput = {
    search: string;
    status: string;
    page: number;
    pageSize: number;
};

export const queryKeys = {
    documents: ["documents"] as const,

    documentsPage: (input: DocumentsQueryKeyInput) =>
        ["documents", "page", input] as const,

    conversations: ["conversations"] as const,

    messages: (conversationId: string) => ["messages", conversationId] as const,
};
