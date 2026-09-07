"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = {
  assignmentId: string;
  existingSubmittedAt?: string | null;
};

type UploadResult = {
  bucket: string;
  path: string;
  token: string;
};

const MAX_FILE_SIZE = 50 * 1024 * 1024;

const ACCEPT =
  ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.jpg,.jpeg,.png,.webp";

export default function AssignmentSubmitForm({
  assignmentId,
  existingSubmittedAt,
}: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [files, setFiles] =
    useState<File[]>([]);
  const [submitting, setSubmitting] =
    useState(false);
  const [progress, setProgress] =
    useState(0);
  const [message, setMessage] =
    useState("");

  function handleFiles(
    list: FileList | null
  ) {
    const incoming = Array.from(
      list ?? []
    );

    for (const file of incoming) {
      if (file.size > MAX_FILE_SIZE) {
        setMessage(
          `"${file.name}" vượt quá 50MB.`
        );
        return;
      }
    }

    setFiles((current) => [
      ...current,
      ...incoming,
    ]);

    setMessage("");
  }

  async function prepareSubmission() {
    const response = await fetch(
      "/api/student/assignments/submit",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assignmentId,
          mode: "prepare",
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data?.error ||
          "Không thể chuẩn bị bài nộp."
      );
    }

    return String(data.submissionId);
  }

  async function uploadFile(
    submissionId: string,
    file: File
  ): Promise<UploadResult> {
    const response = await fetch(
      "/api/learning/upload-url",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          kind: "submission",
          entityId: submissionId,
          fileName: file.name,
          fileSize: file.size,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data?.error ||
          "Không thể chuẩn bị upload."
      );
    }

    const {
      error: uploadError,
    } = await supabase.storage
      .from(data.bucket)
      .uploadToSignedUrl(
        data.path,
        data.token,
        file
      );

    if (uploadError) {
      throw new Error(
        uploadError.message
      );
    }

    const metadataResponse =
      await fetch(
        "/api/learning/attachments",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            kind: "submission",
            entityId: submissionId,
            storagePath: data.path,
            fileName: file.name,
            mimeType:
              file.type ||
              "application/octet-stream",
            fileSize: file.size,
          }),
        }
      );

    const metadata =
      await metadataResponse.json();

    if (!metadataResponse.ok) {
      throw new Error(
        metadata?.error ||
          "Không thể lưu metadata file."
      );
    }

    return data;
  }

  async function finalizeSubmission(
    submissionId: string
  ) {
    const response = await fetch(
      "/api/student/assignments/submit",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assignmentId,
          submissionId,
          mode: "finalize",
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data?.error ||
          "Không thể hoàn tất nộp bài."
      );
    }

    return data;
  }

  async function handleSubmit(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    if (!files.length) {
      setMessage(
        "Hãy chọn ít nhất một file bài làm."
      );
      return;
    }

    setSubmitting(true);
    setProgress(0);
    setMessage("");

    try {
      const submissionId =
        await prepareSubmission();

      for (
        let i = 0;
        i < files.length;
        i++
      ) {
        await uploadFile(
          submissionId,
          files[i]
        );

        setProgress(
          Math.round(
            ((i + 1) / files.length) *
              100
          )
        );
      }

      const result =
        await finalizeSubmission(
          submissionId
        );

      setFiles([]);

      setMessage(
        result.status === "late"
          ? "✓ Đã nộp bài. Bài được ghi nhận là nộp muộn."
          : "✓ Nộp bài thành công."
      );

      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Không thể nộp bài."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-800">
          File bài làm
        </label>

        <input
          type="file"
          multiple
          accept={ACCEPT}
          disabled={submitting}
          onChange={(e) =>
            handleFiles(
              e.target.files
            )
          }
          className="block w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm"
        />

        <p className="mt-2 text-xs text-slate-500">
          Tối đa 50MB / file.
        </p>

        {files.length > 0 && (
          <div className="mt-3 space-y-2">
            {files.map(
              (file, index) => (
                <div
                  key={`${file.name}-${index}`}
                  className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm"
                >
                  <span className="min-w-0 truncate">
                    {file.name} ·{" "}
                    {(
                      file.size /
                      1024 /
                      1024
                    ).toFixed(2)}
                    MB
                  </span>

                  <button
                    type="button"
                    disabled={submitting}
                    className="ml-3 shrink-0 text-red-600"
                    onClick={() =>
                      setFiles(
                        (current) =>
                          current.filter(
                            (_, i) =>
                              i !== index
                          )
                      )
                    }
                  >
                    Xóa
                  </button>
                </div>
              )
            )}
          </div>
        )}
      </div>

      {existingSubmittedAt && (
        <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
          Lần nộp gần nhất:{" "}
          {new Date(
            existingSubmittedAt
          ).toLocaleString("vi-VN", {
            timeZone:
              "Asia/Ho_Chi_Minh",
            hour12: false,
          })}
        </div>
      )}

      {submitting && (
        <div>
          <div className="mb-2 flex justify-between text-xs text-slate-500">
            <span>
              Đang upload bài làm...
            </span>
            <span>{progress}%</span>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-blue-600 transition-all"
              style={{
                width: `${progress}%`,
              }}
            />
          </div>
        </div>
      )}

      {message && (
        <div className="rounded-xl bg-slate-50 p-3 text-sm font-medium text-slate-700">
          {message}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting
          ? "Đang nộp bài..."
          : "Nộp bài"}
      </button>
    </form>
  );
}
