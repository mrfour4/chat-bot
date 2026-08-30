import { after, NextResponse } from "next/server";

import { getSessionUser, getTeacher } from "@/lib/auth";
import { runIndexingJob } from "@/lib/documents/job";
import { getDocument, resetToPending } from "@/lib/documents/repo";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 90;

/**
 * Re-indexes one document from the PDF already stored.
 *
 * 2.1.8 concluded that retry *was* re-upload, because we kept no bytes. 3.3
 * changed that premise, so retrying is now a button rather than a request to
 * go and find the file again.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const teacher = await getTeacher();
  if (!teacher) {
    const user = await getSessionUser();
    return NextResponse.json(
      user
        ? { code: "forbidden", message: "Chỉ giáo viên mới có quyền." }
        : { code: "unauthenticated", message: "Vui lòng đăng nhập." },
      { status: user ? 403 : 401 },
    );
  }

  const { id } = await params;
  const supabase = await createClient();

  const document = await getDocument(supabase, id);
  if (!document) {
    return NextResponse.json(
      { code: "not-found", message: "Không tìm thấy tài liệu." },
      { status: 404 },
    );
  }

  if (!document.storage_path) {
    return NextResponse.json(
      {
        code: "no-file",
        message:
          "Tệp PDF của tài liệu này không được lưu lại. Hãy tải lên lại tệp.",
      },
      { status: 409 },
    );
  }

  await resetToPending(supabase, id);
  after(() => runIndexingJob(id));

  return NextResponse.json({ ...document, status: "pending" });
}
