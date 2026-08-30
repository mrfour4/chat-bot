import { NextResponse } from "next/server";

import { getSessionUser, getTeacher } from "@/lib/auth";
import { sha256Hex } from "@/lib/documents/checksum";
import {
  createDocument,
  findByChecksum,
  listDocuments,
} from "@/lib/documents/repo";
import { deriveTitle } from "@/lib/documents/title";
import { validateUpload } from "@/lib/documents/validate";
import { createClient } from "@/lib/supabase/server";

function fail(status: number, code: string, message: string) {
  return NextResponse.json({ code, message }, { status });
}

/**
 * 401 for a guest, 403 for a signed-in non-teacher. The distinction matters:
 * 401 means "log in", 403 means "logging in will not help".
 */
async function denyReason() {
  const user = await getSessionUser();
  return user
    ? fail(403, "forbidden", "Chỉ giáo viên mới có quyền quản lý tài liệu.")
    : fail(401, "unauthenticated", "Vui lòng đăng nhập để tiếp tục.");
}

export async function GET() {
  const teacher = await getTeacher();
  if (!teacher) return denyReason();

  const supabase = await createClient();
  const documents = await listDocuments(supabase);

  return NextResponse.json({ documents });
}

export async function POST(request: Request) {
  const teacher = await getTeacher();
  if (!teacher) return denyReason();

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return fail(400, "no-file", "Không tìm thấy tệp trong yêu cầu tải lên.");
  }

  // Read once: validation needs the bytes for the signature check and the
  // checksum needs them for dedupe.
  const bytes = new Uint8Array(await file.arrayBuffer());

  const validation = validateUpload({
    fileName: file.name,
    mimeType: file.type,
    bytes,
  });
  if (!validation.ok) {
    return fail(400, validation.code, validation.message);
  }

  const supabase = await createClient();
  const checksum = await sha256Hex(bytes);

  // Dedupe on content, not filename: the same document saved under two names is
  // still the same document, and File Search would index it twice.
  const existing = await findByChecksum(supabase, checksum);
  if (existing) {
    return NextResponse.json(
      {
        code: "duplicate",
        message: `Tài liệu này đã được tải lên với tên "${existing.title}".`,
        existing: { id: existing.id, title: existing.title },
      },
      { status: 409 },
    );
  }

  const document = await createDocument(supabase, {
    title: deriveTitle(file.name),
    fileName: file.name,
    fileSize: bytes.length,
    checksum,
    uploadedBy: teacher.id,
  });

  // Stops at `pending`. 2.1.5 takes it from here.
  return NextResponse.json(document, { status: 201 });
}
