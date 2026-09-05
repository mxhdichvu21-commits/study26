"use client";

import { useState } from "react";

type Props = {
  classId: string;
  studentId?: string;
};

export default function AttendanceExportButton({
  classId,
  studentId,
}: Props) {
  const [loading, setLoading] =
    useState(false);

  async function exportCsv() {
    try {
      setLoading(true);

      const params =
        new URLSearchParams();

      params.set(
        "classId",
        classId
      );

      if (studentId) {
        params.set(
          "studentId",
          studentId
        );
      }

      const response =
        await fetch(
          `/api/teacher/attendance/export?${params.toString()}`,
          {
            cache: "no-store",
          }
        );

      if (!response.ok) {
        const data =
          await response
            .json()
            .catch(() => ({}));

        throw new Error(
          data.error ||
            "Không thể tải file điểm danh."
        );
      }

      const blob =
        await response.blob();

      const url =
        URL.createObjectURL(blob);

      const link =
        document.createElement("a");

      link.href = url;
      link.download =
        "diem-danh.csv";

      document.body.appendChild(
        link
      );

      link.click();

      link.remove();

      URL.revokeObjectURL(url);
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "Không thể tải file điểm danh."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={exportCsv}
      disabled={loading}
      className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading
        ? "Đang tạo file..."
        : "Tải file điểm danh"}
    </button>
  );
}
