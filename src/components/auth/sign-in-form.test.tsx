import { NextIntlClientProvider } from "next-intl";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { SignInForm } from "@/components/auth/sign-in-form";
import { SignUpForm } from "@/components/auth/sign-up-form";
import messages from "../../../messages/vi.json";

function render(oauth?: React.ReactNode) {
    return {
        signIn: renderToStaticMarkup(
            <NextIntlClientProvider locale="vi" messages={messages}>
                <SignInForm oauth={oauth} />
            </NextIntlClientProvider>,
        ),
        signUp: renderToStaticMarkup(
            <NextIntlClientProvider locale="vi" messages={messages}>
                <SignUpForm oauth={oauth} />
            </NextIntlClientProvider>,
        ),
    };
}

describe("the oauth slot", () => {
    it("renders above the email fields on both forms", () => {
        const { signIn, signUp } = render(<p>ĐĂNG NHẬP GOOGLE</p>);

        for (const [name, html] of Object.entries({ signIn, signUp })) {
            expect(html, name).toContain("ĐĂNG NHẬP GOOGLE");
            expect(html, `${name}: the divider follows it`).toContain("hoặc");
            expect(
                html.indexOf("ĐĂNG NHẬP GOOGLE"),
                `${name}: above the email field`,
            ).toBeLessThan(html.indexOf('type="email"'));
        }
    });

    it("leaves no divider behind when there is no provider to offer", () => {
        const { signIn, signUp } = render(undefined);

        for (const [name, html] of Object.entries({ signIn, signUp })) {
            expect(html, `${name}: still a working password form`).toContain(
                'type="password"',
            );
            expect(html, `${name}: no orphaned divider`).not.toContain("hoặc");
        }
    });
});
