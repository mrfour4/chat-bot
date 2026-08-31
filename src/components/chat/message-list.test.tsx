import { NextIntlClientProvider } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MessageList } from "@/components/chat/message-list";
import messages from "../../../messages/vi.json";
import type { ChatMessage } from "@/types/chat";

function render(props: { hasOlder: boolean; messages?: ChatMessage[] }) {
    return renderToStaticMarkup(
        <NextIntlClientProvider locale="vi" messages={messages}>
            <MessageList
                intro={<p>GIỚI THIỆU</p>}
                messages={props.messages ?? []}
                pending={false}
                hasOlder={props.hasOlder}
                loadingOlder={false}
                restoreTo={null}
                onLoadOlder={() => {}}
            />
        </NextIntlClientProvider>,
    );
}

describe("MessageList", () => {
    it("shows the intro at the top of an empty conversation", () => {
        expect(render({ hasOlder: false })).toContain("GIỚI THIỆU");
    });

    it("keeps the intro out of the way of a prepend", () => {
        expect(
            render({ hasOlder: true }),
            "an intro pinned above the messages is always the first child, " +
                "which is how the scroller stops recognising a prepend",
        ).not.toContain("GIỚI THIỆU");
    });

    it("makes a message the first child whenever older ones can arrive", () => {
        const html = render({
            hasOlder: true,
            messages: [
                {
                    id: "m1",
                    role: "user",
                    content: "Câu hỏi",
                    citations: [],
                    grounded: true,
                },
            ],
        });

        const firstItem = html.indexOf('data-message-id="');
        expect(firstItem).toBeGreaterThan(-1);
        expect(html.slice(firstItem, firstItem + 40)).toContain(
            'data-message-id="m1"',
        );
    });
});
