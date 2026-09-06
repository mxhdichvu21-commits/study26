import Link from "next/link";
import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminRoomsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, is_active")
    .eq("id", user.id)
    .single();

  if (
    !profile ||
    profile.role !== "admin" ||
    !profile.is_active
  ) {
    redirect("/");
  }

  const admin = createAdminClient();

  const { data: rooms, error } = await admin
    .from("rooms")
    .select(`
      id,
      name,
      code,
      status,
      class_id,
      teacher_id,
      scheduled_at,
      started_at,
      ended_at,
      created_at
    `)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw new Error(error.message);
  }

  const classIds = [
    ...new Set(
      (rooms ?? [])
        .map((item) => item.class_id)
        .filter(Boolean)
    ),
  ];

  const teacherIds = [
    ...new Set(
      (rooms ?? [])
        .map((item) => item.teacher_id)
        .filter(Boolean)
    ),
  ];

  const [classesResult, teachersResult] =
    await Promise.all([
      classIds.length > 0
        ? admin
            .from("classes")
            .select(
              "id, name, code"
            )
            .in(
              "id",
              classIds
            )
        : Promise.resolve({
            data: [],
          }),

      teacherIds.length > 0
        ? admin
            .from("profiles")
            .select(
              "id, full_name"
            )
            .in(
              "id",
              teacherIds
            )
        : Promise.resolve({
            data: [],
          }),
    ]);

  const classMap = new Map(
    (classesResult.data ?? []).map(
      (item) => [
        item.id,
        item,
      ]
    )
  );

  const teacherMap = new Map(
    (teachersResult.data ?? []).map(
      (item) => [
        item.id,
        item,
      ]
    )
  );

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <Link
              href="/admin"
              className="text-sm font-medium text-violet-600"
            >
              ← Admin Dashboard
            </Link>

            <h1 className="mt-3 text-2xl font-bold text-slate-900">
              Quản lý phòng học
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Theo dõi toàn bộ phòng học trực tuyến.
            </p>
          </div>

          <div className="rounded-xl bg-white px-4 py-3 text-sm font-semibold shadow-sm ring-1 ring-slate-200">
            Tổng phòng: {rooms?.length ?? 0}
          </div>
        </div>

        <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          {!rooms || rooms.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-500">
              Chưa có phòng học nào.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-5 py-4 text-xs font-bold uppercase text-slate-500">
                      Phòng
                    </th>

                    <th className="px-5 py-4 text-xs font-bold uppercase text-slate-500">
                      Mã phòng
                    </th>

                    <th className="px-5 py-4 text-xs font-bold uppercase text-slate-500">
                      Lớp
                    </th>

                    <th className="px-5 py-4 text-xs font-bold uppercase text-slate-500">
                      Giáo viên
                    </th>

                    <th className="px-5 py-4 text-xs font-bold uppercase text-slate-500">
                      Trạng thái
                    </th>

                    <th className="px-5 py-4 text-xs font-bold uppercase text-slate-500">
                      Thời gian
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {rooms.map((room) => {
                    const classData =
                      classMap.get(
                        room.class_id
                      );

                    const teacher =
                      teacherMap.get(
                        room.teacher_id
                      );

                    const statusClass =
                      room.status === "live"
                        ? "bg-emerald-100 text-emerald-700"
                        : room.status === "ended"
                          ? "bg-slate-100 text-slate-600"
                          : "bg-blue-100 text-blue-700";

                    const statusText =
                      room.status === "live"
                        ? "Đang trực tuyến"
                        : room.status === "ended"
                          ? "Đã kết thúc"
                          : "Sẵn sàng";

                    return (
                      <tr
                        key={room.id}
                        className="border-b border-slate-100 last:border-0"
                      >
                        <td className="px-5 py-4">
                          <Link
                            href={`/teacher/rooms/${room.id}`}
                            className="font-semibold text-slate-900 hover:text-violet-600"
                          >
                            {room.name}
                          </Link>
                        </td>

                        <td className="px-5 py-4 font-mono text-sm text-slate-600">
                          {room.code || "—"}
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-700">
                          {classData?.name ||
                            "Không rõ lớp"}
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-700">
                          {teacher?.full_name ||
                            "Không rõ giáo viên"}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${statusClass}`}
                          >
                            {statusText}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-xs text-slate-500">
                          {room.scheduled_at
                            ? new Intl.DateTimeFormat(
                                "vi-VN",
                                {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  timeZone:
                                    "Asia/Ho_Chi_Minh",
                                }
                              ).format(
                                new Date(
                                  room.scheduled_at
                                )
                              )
                            : "Chưa đặt lịch"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
