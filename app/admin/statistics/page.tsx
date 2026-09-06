import Link from "next/link";
import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminStatisticsPage() {
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

  const [
    profilesResult,
    classesResult,
    roomsResult,
    lessonsResult,
    assignmentsResult,
    materialsResult,
    membersResult,
  ] = await Promise.all([
    admin.from("profiles").select("id, role, is_active"),
    admin.from("classes").select("id"),
    admin.from("rooms").select("id, status"),
    admin.from("lessons").select("id"),
    admin.from("assignments").select("id"),
    admin.from("materials").select("id"),
    admin.from("class_members").select("user_id, class_id"),
  ]);

  const profiles = profilesResult.data ?? [];

  const stats = {
    totalUsers: profiles.length,
    students: profiles.filter((x) => x.role === "student").length,
    teachers: profiles.filter((x) => x.role === "teacher").length,
    activeUsers: profiles.filter((x) => x.is_active !== false).length,
    classes: classesResult.data?.length ?? 0,
    rooms: roomsResult.data?.length ?? 0,
    liveRooms:
      roomsResult.data?.filter((x) => x.status === "live").length ?? 0,
    lessons: lessonsResult.data?.length ?? 0,
    assignments: assignmentsResult.data?.length ?? 0,
    materials: materialsResult.data?.length ?? 0,
    memberships: membersResult.data?.length ?? 0,
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <Link href="/admin" className="text-sm font-medium text-violet-600">
          ← Admin Dashboard
        </Link>

        <div className="mb-8 mt-4">
          <h1 className="text-2xl font-bold text-slate-900">Thống kê</h1>
          <p className="mt-1 text-sm text-slate-500">
            Số liệu tổng hợp trực tiếp từ hệ thống Study26.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Người dùng", stats.totalUsers],
            ["Học sinh", stats.students],
            ["Giảng viên", stats.teachers],
            ["Đang hoạt động", stats.activeUsers],
            ["Lớp học", stats.classes],
            ["Phòng học", stats.rooms],
            ["Phòng đang live", stats.liveRooms],
            ["Bài học", stats.lessons],
            ["Bài tập", stats.assignments],
            ["Tài liệu", stats.materials],
            ["Lượt tham gia lớp", stats.memberships],
          ].map(([label, value]) => (
            <div
              key={String(label)}
              className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
            >
              <div className="text-sm font-medium text-slate-500">{label}</div>
              <div className="mt-2 text-3xl font-bold text-slate-900">
                {value}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-lg font-bold text-slate-900">
            Phân bổ người dùng
          </h2>

          <div className="mt-5 space-y-4">
            {[
              ["Học sinh", stats.students, stats.totalUsers],
              ["Giảng viên", stats.teachers, stats.totalUsers],
            ].map(([name, count, total]) => {
              const percent =
                Number(total) > 0
                  ? Math.round((Number(count) / Number(total)) * 100)
                  : 0;

              return (
                <div key={String(name)}>
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="font-medium text-slate-700">{name}</span>
                    <span className="text-slate-500">
                      {count} · {percent}%
                    </span>
                  </div>

                  <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-violet-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
