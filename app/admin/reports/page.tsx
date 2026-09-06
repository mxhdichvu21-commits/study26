import Link from "next/link";
import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
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
    classesResult,
    roomsResult,
    lessonsResult,
    assignmentsResult,
    membersResult,
  ] = await Promise.all([
    admin.from("classes").select("id, name"),
    admin.from("rooms").select("id, status, class_id"),
    admin.from("lessons").select("id, class_id"),
    admin.from("assignments").select("id, class_id"),
    admin.from("class_members").select("class_id, user_id"),
  ]);

  const classes = classesResult.data ?? [];
  const rooms = roomsResult.data ?? [];
  const lessons = lessonsResult.data ?? [];
  const assignments = assignmentsResult.data ?? [];
  const members = membersResult.data ?? [];

  const roomClassCounts = new Map<string, number>();
  const lessonClassCounts = new Map<string, number>();
  const assignmentClassCounts = new Map<string, number>();
  const memberClassCounts = new Map<string, number>();

  for (const item of rooms) {
    if (item.class_id) {
      roomClassCounts.set(
        item.class_id,
        (roomClassCounts.get(item.class_id) ?? 0) + 1
      );
    }
  }

  for (const item of lessons) {
    if (item.class_id) {
      lessonClassCounts.set(
        item.class_id,
        (lessonClassCounts.get(item.class_id) ?? 0) + 1
      );
    }
  }

  for (const item of assignments) {
    if (item.class_id) {
      assignmentClassCounts.set(
        item.class_id,
        (assignmentClassCounts.get(item.class_id) ?? 0) + 1
      );
    }
  }

  for (const item of members) {
    if (item.class_id) {
      memberClassCounts.set(
        item.class_id,
        (memberClassCounts.get(item.class_id) ?? 0) + 1
      );
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <Link href="/admin" className="text-sm font-medium text-violet-600">
          ← Admin Dashboard
        </Link>

        <div className="mb-6 mt-4">
          <h1 className="text-2xl font-bold text-slate-900">Báo cáo</h1>
          <p className="mt-1 text-sm text-slate-500">
            Báo cáo tổng hợp theo từng lớp học.
          </p>
        </div>

        <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          {!classes.length ? (
            <div className="p-12 text-center text-sm text-slate-500">
              Chưa có dữ liệu lớp học.
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
                      Học sinh
                    </th>
                    <th className="px-5 py-4 text-xs font-bold uppercase text-slate-500">
                      Bài học
                    </th>
                    <th className="px-5 py-4 text-xs font-bold uppercase text-slate-500">
                      Bài tập
                    </th>
                    <th className="px-5 py-4 text-xs font-bold uppercase text-slate-500">
                      Phòng học
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {classes.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-slate-100 last:border-0"
                    >
                      <td className="px-5 py-4 font-semibold text-slate-900">
                        {item.name}
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-700">
                        {memberClassCounts.get(item.id) ?? 0}
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-700">
                        {lessonClassCounts.get(item.id) ?? 0}
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-700">
                        {assignmentClassCounts.get(item.id) ?? 0}
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-700">
                        {roomClassCounts.get(item.id) ?? 0}
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
