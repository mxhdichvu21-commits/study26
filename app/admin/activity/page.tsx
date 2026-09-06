import Link from "next/link";
import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Activity = {
  id: string;
  title: string;
  type: string;
  created_at: string;
};

export default async function AdminActivityPage() {
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

  const [classesResult, lessonsResult, assignmentsResult, roomsResult] =
    await Promise.all([
      admin
        .from("classes")
        .select("id, name, created_at")
        .order("created_at", { ascending: false })
        .limit(20),

      admin
        .from("lessons")
        .select("id, title, created_at")
        .order("created_at", { ascending: false })
        .limit(20),

      admin
        .from("assignments")
        .select("id, title, created_at")
        .order("created_at", { ascending: false })
        .limit(20),

      admin
        .from("rooms")
        .select("id, name, created_at")
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

  const activity: Activity[] = [
    ...(classesResult.data ?? []).map((x) => ({
      id: `class-${x.id}`,
      title: `Tạo lớp: ${x.name}`,
      type: "Lớp học",
      created_at: x.created_at,
    })),

    ...(lessonsResult.data ?? []).map((x) => ({
      id: `lesson-${x.id}`,
      title: `Tạo bài học: ${x.title}`,
      type: "Bài học",
      created_at: x.created_at,
    })),

    ...(assignmentsResult.data ?? []).map((x) => ({
      id: `assignment-${x.id}`,
      title: `Tạo bài tập: ${x.title}`,
      type: "Bài tập",
      created_at: x.created_at,
    })),

    ...(roomsResult.data ?? []).map((x) => ({
      id: `room-${x.id}`,
      title: `Tạo phòng: ${x.name}`,
      type: "Phòng học",
      created_at: x.created_at,
    })),
  ]
    .filter((x) => !!x.created_at)
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() -
        new Date(a.created_at).getTime()
    )
    .slice(0, 50);

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-5xl">
        <Link href="/admin" className="text-sm font-medium text-violet-600">
          ← Admin Dashboard
        </Link>

        <div className="mb-6 mt-4">
          <h1 className="text-2xl font-bold text-slate-900">
            Nhật ký hoạt động
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Dòng thời gian hoạt động gần đây của hệ thống.
          </p>
        </div>

        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          {!activity.length ? (
            <div className="py-10 text-center text-sm text-slate-500">
              Chưa có hoạt động.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {activity.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-5 py-4"
                >
                  <div>
                    <div className="font-semibold text-slate-900">
                      {item.title}
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      {item.type}
                    </div>
                  </div>

                  <time className="shrink-0 text-xs text-slate-500">
                    {new Intl.DateTimeFormat("vi-VN", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: "Asia/Ho_Chi_Minh",
                    }).format(new Date(item.created_at))}
                  </time>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
