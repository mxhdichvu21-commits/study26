"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  assignmentId: string;
  existingAttachment?: string | null;
  existingSubmittedAt?: string | null;
};

export default function AssignmentSubmitForm({
  assignmentId,
  existingAttachment,
  existingSubmittedAt,
}: Props) {
  const router = useRouter();

  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setSubmitting(true);
    setMessage("");

    try {
      const formData = new FormData();

      formData.append("assignmentId", assignmentId);
      formData.append("content", content);

      if (file) {
        formData.append("file", file);
      }

      const res = await fetch(
        "/api/student/assignments/submit",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data?.error || "Không thể nộp bài."
        );
      }

      setMessage("✓ Nộp bài thành công.");
      setFile(null);

      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Có lỗi xảy ra."
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
          onChange={(e) =>
            setFile(e.target.files?.[0] || null)
          }
          className="block w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm"
        />

        <p className="mt-2 text-xs text-slate-500">
          Dung lượng tối đa 10MB.
        </p>

        {existingAttachment && (
          <p className="mt-2 text-xs text-emerald-600">
            Đã có file bài nộp trước đó.
          </p>
        )}
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-800">
          Ghi chú / nội dung bài làm
        </label>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={7}
          placeholder="Nhập câu trả lời hoặc ghi chú cho giáo viên..."
          className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-blue-500"
        />
      </div>

      {existingSubmittedAt && (
        <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
          Lần nộp gần nhất:{" "}
          {new Date(existingSubmittedAt).toLocaleString("vi-VN")}
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
