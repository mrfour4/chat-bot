/**
 * Grants the teacher role to an existing account.
 *
 *   npm run promote:teacher -- someone@example.com
 *
 * Role assignment is environment data, not schema, so it does not belong in a
 * migration. This uses the secret key rather than the database password, so it
 * works against local or hosted without extra credentials — and there is
 * deliberately no in-app path to the teacher role.
 */
import { createClient } from "@supabase/supabase-js";

const email = process.argv[2];
if (!email) {
    console.error("Usage: npm run promote:teacher -- <email>");
    process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
    console.error(
        "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set in .env.local.",
    );
    process.exit(1);
}

const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
});

const { data, error } = await supabase
    .from("profiles")
    .update({ role: "teacher" })
    .eq("email", email)
    .select("email, role");

if (error) {
    console.error(`Failed: ${error.message}`);
    process.exit(1);
}

if (!data || data.length === 0) {
    console.error(`No account found for ${email}. Sign up at /login first.`);
    process.exit(1);
}

console.log(`${data[0].email} is now ${data[0].role}.`);
