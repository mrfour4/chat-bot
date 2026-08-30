"use client";

import { useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { TriangleAlertIcon } from "lucide-react";

export function DocumentUploadForm({
    uploading,
    error,
    onUpload,
    onReset,
}: {
    uploading: boolean;
    error: string | null;
    onUpload: (file: File) => void;
    onReset: () => void;
}) {
    const [file, setFile] = useState<File | null>(null);

    return (
        <form
            onSubmit={(event) => {
                event.preventDefault();
                if (file) onUpload(file);
            }}
            className="mt-8 rounded-lg border border-rule bg-panel/60 p-5"
        >
            <div className="flex flex-wrap items-center gap-3">
                <Input
                    type="file"
                    accept="application/pdf,.pdf"
                    disabled={uploading}
                    onChange={(event) => {
                        setFile(event.target.files?.[0] ?? null);
                        onReset();
                    }}
                    className="h-9 min-w-0 flex-1 border-rule bg-paper py-1.5 text-ink-soft file:mr-3 file:cursor-pointer file:font-medium file:text-ink"
                />
                <Button type="submit" disabled={!file || uploading}>
                    {uploading && <Spinner />}
                    {uploading ? "Đang tải lên…" : "Tải lên"}
                </Button>
            </div>

            {error && (
                <Alert variant="destructive" className="mt-3">
                    <TriangleAlertIcon />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {!uploading && !error && (
                <p className="mt-3 text-sm text-ink-soft">
                    Chỉ nhận tệp PDF, tối đa 20 MB. Sau khi tải lên xong, việc
                    lập chỉ mục chạy nền — bạn có thể rời khỏi trang hoặc đóng
                    trình duyệt.
                </p>
            )}
        </form>
    );
}
