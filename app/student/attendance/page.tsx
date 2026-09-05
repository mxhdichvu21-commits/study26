import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Props = {
  searchParams: Promise<{
    from?: string;
    to?: string;
    classId?: string;
  }>;
};

export default async function StudentAttendanceHistory({
  searchParams,
}: Props) {
  const filters = await searchParams;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: attendanceRows } =
    await supabase
      .from("attendance")
      .select(
        "id, session_id, student_id, class_id, status, joined_at"
      )
      .eq("student_id", user.id)
      .order("joined_at", {
        ascending: false,
      });

  const attendance = attendanceRows || [];

  const classIds = [
    ...new Set(
      attendance
        .map((item) => item.class_id)
        .filter(Boolean)
    ),
  ];

  const { data: classes } =
    classIds.length
      ? await supabase
          .from("classes")
          .select("id, name, code")
          .in("id", classIds)
      : { data: [] };

  const classMap = new Map(
    (classes || []).map((item) => [
      item.id,
      item,
    ])
  );

  let rows = attendance.map(
    (item) => ({
      ...item,
      classData: item.class_id
        ? classMap.get(
            item.class_id
          )
        : null,
    })
  );

  if (filters.classId) {
    rows = rows.filter(
      (row) =>
        row.classData?.id ===
        filters.classId
    );
  }

  if (filters.from) {
    rows = rows.filter((row) => {
      if (!row.joined_at) return false;

      const date = new Date(
        row.joined_at
      );

      return (
        date >=
        new Date(
          `${filters.from}T00:00:00+07:00`
        )
      );
    });
  }

  if (filters.to) {
    rows = rows.filter((row) => {
      if (!row.joined_at) return false;

      const date = new Date(
        row.joined_at
      );

      return (
        date <=
        new Date(
          `${filters.to}T23:59:59+07:00`
        )
      );
    });
  }

  const formatDateTime = (
    value: string | null
  ) => {
    if (!value) return "—";

    return new Intl.DateTimeFormat(
      "vi-VN",
      {
        timeZone:
          "Asia/Ho_Chi_Minh",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }
    ).format(new Date(value));
  };

  const formatDate = (
    value: string | null
  ) => {
    if (!value) return "—";

    return new Intl.DateTimeFormat(
      "vi-VN",
      {
        timeZone:
          "Asia/Ho_Chi_Minh",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }
    ).format(new Date(value));
  };

  const formatTime = (
    value: string | null
  ) => {
    if (!value) return "—";

    return new Intl.DateTimeFormat(
      "vi-VN",
      {
        timeZone:
          "Asia/Ho_Chi_Minh",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }
    ).format(new Date(value));
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/student"
          className="text-sm font-medium text-blue-600 hover:underline"
        >
          ← Dashboard
        </Link>

        <div className="mt-3">
          <div className="text-sm font-semibold text-blue-600">
            ATTENDANCE HISTORY
          </div>

          <h1 className="mt-1 text-3xl font-bold text-slate-900">
            Lịch sử điểm danh
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Các lần điểm danh của tài khoản hiện tại.
          </p>
        </div>

        <form
          className="mt-6 grid gap-3 rounded-2xl bg-white p-5 shadow-sm md:grid-cols-4"
          method="get"
        >
          <input
            type="date"
            name="from"
            defaultValue={filters.from || ""}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />

          <input
            type="date"
            name="to"
            defaultValue={filters.to || ""}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />

          <select
            name="classId"
            defaultValue={
              filters.classId || ""
            }
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">
              Tất cả lớp
            </option>

            {(classes || []).map((item) => (
              <option
                key={item.id}
                value={item.id}
              >
                {item.name}
              </option>
            ))}
          </select>

          <button
            type="submit"
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Lọc
          </button>
        </form>

        <section className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm">
          {rows.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-500">
              Chưa có dữ liệu điểm danh.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-sm">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-200 text-left">
                    <th className="px-5 py-4 font-semibold text-slate-600">
                      Ngày
                    </th>
                    <th className="px-5 py-4 font-semibold text-slate-600">
                      Thời gian
                    </th>
                    <th className="px-5 py-4 font-semibold text-slate-600">
                      Lớp học
                    </th>
                    <th className="px-5 py-4 font-semibold text-slate-600">
                      Phòng
                    </th>
                    <th className="px-5 py-4 font-semibold text-slate-600">
                      Trạng thái
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-slate-100 last:border-b-0"
                    >
                      <td className="px-5 py-4 text-slate-600">
                        {formatDate(
                          row.joined_at
                        )}
                      </td>

                      <td className="px-5 py-4 font-medium text-slate-900">
                        {formatTime(
                          row.joined_at
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-900">
                          {row.classData
                            ?.name ||
                            "Không xác định"}
                        </div>

                        <div className="mt-1 text-xs text-slate-400">
                          {formatDateTime(
                            row.joined_at
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-slate-500">
                        {"—"}
                      </td>

                      <td className="px-5 py-4">
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                          ✓{" "}
                          {row.status ===
                          "late"
                            ? "Đi muộn"
                            : "Đã điểm danh"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
