"use client";

import { useEffect, useRef, useState } from "react";

import { DOCUMENTS_CHANNEL } from "@/constants/documents";
import { createClient } from "@/lib/supabase/client";

export function useDocumentsRealtime(onChange: () => void) {
    const [connected, setConnected] = useState(false);
    const latest = useRef(onChange);

    useEffect(() => {
        latest.current = onChange;
    }, [onChange]);

    useEffect(() => {
        const supabase = createClient();

        const channel = supabase
            .channel(DOCUMENTS_CHANNEL, { config: { private: true } })
            .on("broadcast", { event: "*" }, () => latest.current())
            .subscribe((status) => setConnected(status === "SUBSCRIBED"));

        return () => {
            setConnected(false);
            void supabase.removeChannel(channel);
        };
    }, []);

    return connected;
}
