"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AttendanceButton from "@/components/student/attendance-button";

type ClassItem = {
  id: string;
  name: string;
  code: string;
};

export default function StudentAttendancePanel() {
  const [classes, setClasses] =
    useState<ClassItem[]>([]);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadClasses() {
      try {
        const response =
          await fetch(
            "/api/student/attendance/classes",
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
          setClasses(
            data.classes || []
          );
        }
      } catch {
        if (!cancelled) {
          setClasses([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadClasses();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="mb-6 rounded-2xl border border-blue-100 bg-white p-5 shadow-sm md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-sm font-semibold text-blue-600">
            ATTENDANCE
          </div>

          <h2 className="mt-1 text-xl font-bold text-slate-900">
            Điểm danh
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Bạn có thể điểm danh ngay cả khi không có phòng học trực tuyến.
          </p>
        </div>

        <Link
          href="/student/attendance"
          className="w-fit rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Lịch sử điểm danh
        </Link>
      </div>

      <div className="mt-5">
        {loading ? (
          <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
            Đang tải lớp học...
          </div>
        ) : classes.length === 0 ? (
          <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
            Bạn chưa tham gia lớp học nào.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {classes.map(
              (item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <div className="font-semibold text-slate-900">
                    {item.name}
                  </div>

                  <div className="mt-1 text-sm text-slate-500">
                    Mã lớp: {item.code}
                  </div>

                  <div className="mt-4">
                    <AttendanceButton
                      classId={item.id}
                    />
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </section>
  );
}
