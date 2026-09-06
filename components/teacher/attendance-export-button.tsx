"use client";

type Props = {
  classId: string;
  date?: string;
};

export default function AttendanceExportButton({
  classId,
  date,
}: Props) {
  const selectedDate =
    date ||
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

  const exportUrl =
    `/api/teacher/attendance/export?classId=${encodeURIComponent(
      classId
    )}&date=${encodeURIComponent(selectedDate)}`;

  return (
    <a
      href={exportUrl}
      className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
    >
      Tải điểm danh
    </a>
  );
}
