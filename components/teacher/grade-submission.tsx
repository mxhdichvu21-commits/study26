"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  submissionId: string;
  maxPoints: number;
  currentScore?: number | null;
  currentFeedback?: string | null;
};

export default function GradeSubmission({
  submissionId,
  maxPoints,
  currentScore,
  currentFeedback,
}: Props) {
  const router = useRouter();

  const [score, setScore] = useState(
    currentScore !== null && currentScore !== undefined
      ? String(currentScore)
      : ""
  );

  const [feedback, setFeedback] = useState(
    currentFeedback || ""
  );

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function submitGrade(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setSaving(true);
    setMessage("");

    try {
      const res = await fetch(
        "/api/teacher/submissions/grade",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            submissionId,
            score,
            feedback,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data?.error || "Không thể lưu điểm."
        );
      }

      setMessage("✓ Đã lưu điểm và nhận xét.");
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Có lỗi xảy ra."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={submitGrade}
      className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4"
    >
      <div className="grid gap-4 md:grid-cols-[180px_1fr]">
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Điểm
          </label>

          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              max={maxPoints > 0 ? maxPoints : undefined}
              step="0.01"
              value={score}
              onChange={(e) => setScore(e.target.value)}
              placeholder="0"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
            />

            <span className="whitespace-nowrap text-sm text-slate-500">
              / {maxPoints}
            </span>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Nhận xét
          </label>

          <textarea
            value={feedback}
            onChange={(e) =>
              setFeedback(e.target.value)
            }
            rows={3}
            placeholder="Nhập nhận xét cho học sinh..."
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Đang lưu..." : "Lưu điểm"}
        </button>

        {message && (
          <span className="text-sm font-medium text-slate-600">
            {message}
          </span>
        )}
      </div>
    </form>
  );
}
