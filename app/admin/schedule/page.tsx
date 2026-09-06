import Link from "next/link";
import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminSchedulePage() {
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

  if (!profile || profile.role !== "admin" || !profile.is_active) {
    redirect("/");
  }

  const admin = createAdminClient();

  const { data: schedules, error } = await admin
    .from("schedules")
    .select("id, class_id, room_id, starts_at, ends_at")
    .order("starts_at", { ascending: true })
    .limit(200);

  if (error) throw new Error(error.message);

  const classIds = [
    ...new Set(
      (schedules ?? [])
        .map((item) => item.class_id)
        .filter(Boolean)
    ),
  ];

  const roomIds = [
    ...new Set(
      (schedules ?? [])
        .map((item) => item.room_id)
        .filter(Boolean)
    ),
  ];

  const [classesResult, roomsResult] = await Promise.all([
    classIds.length
      ? admin
          .from("classes")
          .select("id, name, code")
          .in("id", classIds)
      : Promise.resolve({ data: [] }),

    roomIds.length
      ? admin
          .from("rooms")
          .select("id, name, code")
          .in("id", roomIds)
      : Promise.resolve({ data: [] }),
  ]);

  const classMap = new Map(
    (classesResult.data ?? []).map((item) => [item.id, item])
  );

  const roomMap = new Map(
    (roomsResult.data ?? []).map((item) => [item.id, item])
  );

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <Link href="/admin" className="text-sm font-medium text-violet-600">
          ← Admin Dashboard
        </Link>

        <div className="mb-6 mt-4">
          <h1 className="text-2xl font-bold text-slate-900">Lịch dạy</h1>
          <p className="mt-1 text-sm text-slate-500">
            Tổng hợp lịch học và phòng học của toàn hệ thống.
          </p>
        </div>

        <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          {!schedules?.length ? (
            <div className="p-12 text-center text-sm text-slate-500">
              Chưa có lịch dạy.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-5 py-4 text-xs font-bold uppercase text-slate-500">
                      Lớp
                    </th>
                    <th className="px-5 py-4 text-xs font-bold uppercase text-slate-500">
                      Phòng
                    </th>
                    <th className="px-5 py-4 text-xs font-bold uppercase text-slate-500">
                      Bắt đầu
                    </th>
                    <th className="px-5 py-4 text-xs font-bold uppercase text-slate-500">
                      Kết thúc
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {schedules.map((item) => {
                    const cls = classMap.get(item.class_id);
                    const room = roomMap.get(item.room_id);

                    return (
                      <tr
                        key={item.id}
                        className="border-b border-slate-100 last:border-0"
                      >
                        <td className="px-5 py-4">
                          <div className="font-semibold text-slate-900">
                            {cls?.name || "Không rõ lớp"}
                          </div>
                          <div className="text-xs text-slate-400">
                            {cls?.code || ""}
                          </div>
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-700">
                          {room?.name || "Chưa có phòng"}
                          {room?.code && (
                            <div className="text-xs text-slate-400">
                              {room.code}
                            </div>
                          )}
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {item.starts_at
                            ? new Intl.DateTimeFormat("vi-VN", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                                timeZone: "Asia/Ho_Chi_Minh",
                              }).format(new Date(item.starts_at))
                            : "—"}
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {item.ends_at
                            ? new Intl.DateTimeFormat("vi-VN", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                                timeZone: "Asia/Ho_Chi_Minh",
                              }).format(new Date(item.ends_at))
                            : "—"}
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
