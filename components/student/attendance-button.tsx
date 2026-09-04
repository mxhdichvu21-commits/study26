"use client";

import { useEffect, useState } from "react";

type Props = {
  roomId: string;
};

export default function AttendanceButton({ roomId }: Props) {
  const [loading, setLoading] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);
  const [streak, setStreak] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function checkStatus() {
      try {
        const response = await fetch(
          `/api/attendance/status?roomId=${encodeURIComponent(roomId)}`,
          {
            cache: "no-store",
          }
        );

        if (!response.ok) return;

        const data = await response.json();

        if (!cancelled && data.checkedIn) {
          setCheckedIn(true);
        }
      } catch {}
    }

    checkStatus();

    return () => {
      cancelled = true;
    };
  }, [roomId]);

  async function handleCheckIn() {
    if (loading || checkedIn) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/attendance/check-in", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          roomId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Không thể điểm danh."
        );
      }

      setCheckedIn(true);

      if (data.streak?.currentStreak) {
        setStreak(data.streak.currentStreak);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Không thể điểm danh."
      );
    } finally {
      setLoading(false);
    }
  }

  if (checkedIn) {
    return (
      <div className="live-attendance-checked">
        <span>✓ Đã điểm danh</span>

        {streak !== null && (
          <strong>🔥 {streak} ngày</strong>
        )}
      </div>
    );
  }

  return (
    <div className="live-attendance-wrap">
      <button
        type="button"
        className="live-attendance-button"
        onClick={handleCheckIn}
        disabled={loading}
      >
        {loading ? "Đang điểm danh..." : "✓ Điểm danh"}
      </button>

      {error && (
        <span className="live-attendance-error">
          {error}
        </span>
      )}
    </div>
  );
}
