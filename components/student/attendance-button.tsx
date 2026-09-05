"use client";

import {
  useEffect,
  useState,
} from "react";

type Props = {
  classId?: string;
  roomId?: string;
};

type Attendance = {
  id: string;
  joined_at: string | null;
};

function formatVietnamDateTime(
  value: string
) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return {
    date: new Intl.DateTimeFormat(
      "vi-VN",
      {
        timeZone:
          "Asia/Ho_Chi_Minh",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }
    ).format(date),

    time: new Intl.DateTimeFormat(
      "vi-VN",
      {
        timeZone:
          "Asia/Ho_Chi_Minh",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }
    ).format(date),
  };
}

export default function AttendanceButton({
  classId,
  roomId,
}: Props) {
  const [resolvedClassId, setResolvedClassId] =
    useState(classId || "");

  const [loading, setLoading] =
    useState(true);

  const [checkedIn, setCheckedIn] =
    useState(false);

  const [attendance, setAttendance] =
    useState<Attendance | null>(null);

  const [error, setError] =
    useState("");

  useEffect(() => {
    let cancelled = false;

    async function resolveClass() {
      try {
        if (classId) {
          setResolvedClassId(classId);
          return;
        }

        if (!roomId) {
          return;
        }

        const response = await fetch(
          `/api/attendance/resolve-room?roomId=${encodeURIComponent(
            roomId
          )}`,
          {
            cache: "no-store",
          }
        );

        if (!response.ok) {
          return;
        }

        const data =
          await response.json();

        if (!cancelled) {
          setResolvedClassId(
            data.classId || ""
          );
        }
      } catch {
        // Không làm dashboard lỗi.
      }
    }

    resolveClass();

    return () => {
      cancelled = true;
    };
  }, [classId, roomId]);

  useEffect(() => {
    if (!resolvedClassId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadStatus() {
      try {
        const response =
          await fetch(
            `/api/attendance/status?classId=${encodeURIComponent(
              resolvedClassId
            )}`,
            {
              cache: "no-store",
            }
          );

        if (!response.ok) {
          return;
        }

        const data =
          await response.json();

        if (!cancelled) {
          setCheckedIn(
            !!data.checkedIn
          );

          setAttendance(
            data.attendance || null
          );
        }
      } catch {
        // Không làm dashboard lỗi.
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadStatus();

    return () => {
      cancelled = true;
    };
  }, [resolvedClassId]);

  async function handleCheckIn() {
    if (
      loading ||
      checkedIn ||
      !resolvedClassId
    ) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response =
        await fetch(
          "/api/attendance/check-in",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              classId:
                resolvedClassId,
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Không thể điểm danh."
        );
      }

      setCheckedIn(true);

      setAttendance(
        data.attendance || null
      );

      setError("");
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

  if (loading) {
    return (
      <button
        type="button"
        disabled
        className="live-attendance-button"
      >
        Đang kiểm tra...
      </button>
    );
  }

  if (!resolvedClassId) {
    return (
      <span className="live-attendance-error">
        Không xác định được lớp học.
      </span>
    );
  }

  if (checkedIn) {
    const formatted =
      attendance?.joined_at
        ? formatVietnamDateTime(
            attendance.joined_at
          )
        : null;

    return (
      <div className="live-attendance-checked">
        <span>
          ✓ Đã điểm danh hôm nay
        </span>

        {formatted && (
          <small>
            Ngày: {formatted.date}
            <br />
            Thời gian: {formatted.time}
          </small>
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
        ✓ Điểm danh
      </button>

      {error && (
        <span className="live-attendance-error">
          {error}
        </span>
      )}
    </div>
  );
}
