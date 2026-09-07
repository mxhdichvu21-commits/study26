"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  lessonId: string;
  viewedAt?: string | null;
};

export default function LessonViewButton({
  lessonId,
  viewedAt,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [localViewedAt, setLocalViewedAt] =
    useState(viewedAt ?? null);
  const [error, setError] = useState("");

  async function markViewed() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "/api/student/lessons/view",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            lessonId,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Không thể đánh dấu đã xem."
        );
      }

      setLocalViewedAt(data.viewedAt);
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Có lỗi xảy ra."
      );
    } finally {
      setLoading(false);
    }
  }

  if (localViewedAt) {
    return (
      <div className="mt-8 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700">
        <strong>✓ Đã xem</strong>

        <div className="mt-1">
          Đã xem lúc{" "}
          {new Date(localViewedAt).toLocaleString(
            "vi-VN",
            {
              timeZone: "Asia/Ho_Chi_Minh",
              hour12: false,
            }
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <button
        type="button"
        onClick={markViewed}
        disabled={loading}
        className="rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading
          ? "Đang lưu..."
          : "Đánh dấu đã xem"}
      </button>

      {error && (
        <div className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}
