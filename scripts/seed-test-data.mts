/**
 * Fills the database with enough rows to make paging, virtualization,
 * searching and filtering real things you can see.
 *
 *   npm run seed:test -- <email>          create
 *   npm run seed:test -- <email> --clean  remove everything it created
 *
 * Every row it writes is prefixed with a marker, and `--clean` deletes exactly
 * the rows carrying it. Nothing else is touched, so this is safe to run
 * against the project you are actually using.
 *
 * The documents it creates have no PDF in Storage and no document in Gemini.
 * They cannot affect an answer -- retrieval happens in Gemini, which has never
 * heard of them -- but they do count towards the "no documents yet" notice on
 * the chat page, and previewing one will fail. They exist to be listed,
 * searched, filtered and paged.
 */
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const MARK = "[SEED]";

const CONVERSATIONS = 60;
const MESSAGES_IN_LONG_CONVERSATION = 200;
const DOCUMENTS = 80;

const SUBJECTS = [
    "Đề án tuyển sinh",
    "Học phí và học bổng",
    "Chỉ tiêu ngành Công nghệ thông tin",
    "Quy chế xét tuyển học bạ",
    "Ký túc xá và chỗ ở",
    "Điểm chuẩn các năm trước",
    "Chương trình chất lượng cao",
    "Tuyển thẳng và ưu tiên xét tuyển",
];

const UNIVERSITIES = ["UIT", "IUH", "HCMUS", "HCMUT", "UEH"];

const QUESTIONS = [
    "Điểm chuẩn ngành Công nghệ thông tin năm ngoái là bao nhiêu?",
    "Học phí một năm khoảng bao nhiêu?",
    "Trường có xét học bạ không?",
    "Hồ sơ xét tuyển gồm những gì?",
    "Ký túc xá có đủ chỗ cho sinh viên năm nhất không?",
    "Có chương trình chất lượng cao không?",
    "Thời hạn nộp hồ sơ là khi nào?",
    "Chỉ tiêu năm nay thay đổi thế nào?",
];

const email = process.argv[2];
const clean = process.argv.includes("--clean");

if (!email) {
    console.error("Usage: npm run seed:test -- <teacher-email> [--clean]");
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

const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("email", email)
    .maybeSingle();

if (profileError || !profile) {
    console.error(`No account found for ${email}.`);
    process.exit(1);
}

if (clean) {
    await removeSeed();
    process.exit(0);
}

if (profile.role !== "teacher") {
    console.error(
        `${email} is a ${profile.role}. Seeded documents need a teacher: ` +
            `npm run promote:teacher -- ${email}`,
    );
    process.exit(1);
}

await removeSeed();
await seedDocuments(profile.id);
await seedConversations(profile.id);

console.log(
    `\nDone. Remove it all with: npm run seed:test -- ${email} --clean`,
);

async function removeSeed() {
    const { count: documents } = await supabase
        .from("documents")
        .delete({ count: "exact" })
        .like("title", `${MARK}%`);

    const { count: conversations } = await supabase
        .from("conversations")
        .delete({ count: "exact" })
        .like("title", `${MARK}%`);

    console.log(
        `Removed ${documents ?? 0} seeded documents and ` +
            `${conversations ?? 0} seeded conversations.`,
    );
}

async function seedDocuments(uploadedBy: string) {
    // A shape worth looking at rather than an even split: most documents are
    // fine, a few are still working, a couple failed, some are archived, and
    // there are tombstones to find behind the Deleted filter.
    const rows = Array.from({ length: DOCUMENTS }, (_, index) => {
        const title =
            `${MARK} ${UNIVERSITIES[index % UNIVERSITIES.length]} — ` +
            `${SUBJECTS[index % SUBJECTS.length]} ${2020 + (index % 6)}`;

        // Archived and deleted rows are `ready` underneath, because that is
        // what they were before someone archived or deleted them (5.3).
        const shape = index % 20;
        const status =
            shape < 13 || shape >= 18
                ? "ready"
                : shape < 15
                  ? "pending"
                  : shape < 17
                    ? "indexing"
                    : "failed";

        return {
            id: randomUUID(),
            title,
            file_name: `seed-${index}.pdf`,
            file_size: 200_000 + index * 37_000,
            checksum: `seed-${randomUUID()}`,
            uploaded_by: uploadedBy,
            status,
            error_message:
                status === "failed"
                    ? "Không đọc được nội dung từ tệp này. (dữ liệu thử nghiệm)"
                    : null,
            archived_at:
                shape === 18
                    ? new Date(Date.now() - 86_400_000).toISOString()
                    : null,
            deleted_at:
                shape === 19
                    ? new Date(Date.now() - 43_200_000).toISOString()
                    : null,
            created_at: new Date(Date.now() - index * 3_600_000).toISOString(),
        };
    });

    const { error } = await supabase.from("documents").insert(rows);
    if (error) {
        console.error("Could not seed documents:", error.message);
        process.exit(1);
    }

    console.log(
        `Seeded ${rows.length} documents ` +
            `(${rows.filter((r) => r.deleted_at).length} deleted, ` +
            `${rows.filter((r) => r.archived_at).length} archived, ` +
            `${rows.filter((r) => r.status === "failed").length} failed).`,
    );
}

async function seedConversations(userId: string) {
    const conversations = Array.from({ length: CONVERSATIONS }, (_, index) => ({
        id: randomUUID(),
        user_id: userId,
        title: `${MARK} ${QUESTIONS[index % QUESTIONS.length]} (${index + 1})`,
        created_at: new Date(Date.now() - index * 7_200_000).toISOString(),
    }));

    const { error } = await supabase
        .from("conversations")
        .insert(conversations);
    if (error) {
        console.error("Could not seed conversations:", error.message);
        process.exit(1);
    }

    // Every conversation gets a couple of turns; the first gets enough to page
    // through eight times, which is what message paging needs to be visible.
    const messages = conversations.flatMap((conversation, index) => {
        const turns =
            index === 0 ? MESSAGES_IN_LONG_CONVERSATION / 2 : 1 + (index % 3);

        return Array.from({ length: turns }, (_, turn) => {
            // Both halves of a turn share a timestamp, which is what the
            // (created_at, id) cursor exists for.
            const at = new Date(
                Date.parse(conversation.created_at) + turn * 60_000,
            ).toISOString();

            return [
                {
                    id: randomUUID(),
                    conversation_id: conversation.id,
                    role: "user",
                    content: `${QUESTIONS[turn % QUESTIONS.length]} (lượt ${turn + 1})`,
                    citations: [],
                    created_at: at,
                },
                {
                    id: randomUUID(),
                    conversation_id: conversation.id,
                    role: "assistant",
                    content:
                        `Theo tài liệu tuyển sinh, **thông tin ở lượt ${turn + 1}** ` +
                        "được nêu trong phần quy định chung.\n\n" +
                        "- Mục thứ nhất\n- Mục thứ hai\n",
                    citations: [],
                    created_at: at,
                },
            ];
        }).flat();
    });

    for (let start = 0; start < messages.length; start += 500) {
        const { error: messageError } = await supabase
            .from("messages")
            .insert(messages.slice(start, start + 500));

        if (messageError) {
            console.error("Could not seed messages:", messageError.message);
            process.exit(1);
        }
    }

    console.log(
        `Seeded ${conversations.length} conversations and ${messages.length} messages ` +
            `(the newest holds ${MESSAGES_IN_LONG_CONVERSATION}).`,
    );
}
