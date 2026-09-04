import Link from "next/link";
import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export default async function AdminDashboard() {
  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("id, role, full_name, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (
    !profile ||
    profile.role !== "admin" ||
    profile.is_active === false
  ) {
    redirect("/");
  }

  const [
    profilesResult,
    studentsResult,
    teachersResult,
    classesResult,
    liveRoomsResult,
    submissionsResult,
  ] = await Promise.all([
    admin
      .from("profiles")
      .select("id", { count: "exact", head: true }),

    admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "student")
      .eq("is_active", true),

    admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "teacher")
      .eq("is_active", true),

    admin
      .from("classes")
      .select("id", { count: "exact", head: true }),

    admin
      .from("rooms")
      .select("id", { count: "exact", head: true })
      .eq("status", "live"),

    admin
      .from("submissions")
      .select("id", { count: "exact", head: true }),
  ]);

  const totalUsers = profilesResult.count ?? 0;
  const totalStudents = studentsResult.count ?? 0;
  const totalTeachers = teachersResult.count ?? 0;
  const totalClasses = classesResult.count ?? 0;
  const liveRooms = liveRoomsResult.count ?? 0;
  const totalSubmissions = submissionsResult.count ?? 0;

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm font-semibold text-blue-600">
              STUDY26 ADMIN
            </div>

            <h1 className="mt-1 text-3xl font-bold text-slate-900">
              Quản trị hệ thống
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Xin chào{" "}
              {profile.full_name || "Quản trị viên"}.
            </p>
          </div>

          <Link
            href="/admin/users"
            className="inline-flex w-fit rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Quản lý tài khoản
          </Link>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">
              Tổng tài khoản
            </div>
            <div className="mt-2 text-3xl font-bold text-slate-900">
              {totalUsers}
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">
              Học sinh hoạt động
            </div>
            <div className="mt-2 text-3xl font-bold text-emerald-600">
              {totalStudents}
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">
              Giáo viên hoạt động
            </div>
            <div className="mt-2 text-3xl font-bold text-blue-600">
              {totalTeachers}
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">
              Lớp học
            </div>
            <div className="mt-2 text-3xl font-bold text-slate-900">
              {totalClasses}
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">
              Phòng đang trực tiếp
            </div>
            <div className="mt-2 text-3xl font-bold text-red-600">
              {liveRooms}
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">
              Tổng bài đã nộp
            </div>
            <div className="mt-2 text-3xl font-bold text-violet-600">
              {totalSubmissions}
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">
              Quản lý nhanh
            </h2>

            <div className="mt-5 grid gap-3">
              <Link
                href="/admin/users?role=student"
                className="rounded-xl border border-slate-200 p-4 hover:bg-slate-50"
              >
                <div className="font-semibold text-slate-900">
                  Học sinh
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  Xem và quản lý tài khoản học sinh
                </div>
              </Link>

              <Link
                href="/admin/users?role=teacher"
                className="rounded-xl border border-slate-200 p-4 hover:bg-slate-50"
              >
                <div className="font-semibold text-slate-900">
                  Giáo viên
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  Xem và quản lý tài khoản giáo viên
                </div>
              </Link>

              <Link
                href="/teacher/classes"
                className="rounded-xl border border-slate-200 p-4 hover:bg-slate-50"
              >
                <div className="font-semibold text-slate-900">
                  Lớp học
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  Chuyển sang khu vực quản lý lớp
                </div>
              </Link>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-900 p-6 text-white shadow-sm">
            <div className="text-sm font-semibold text-blue-300">
              SYSTEM STATUS
            </div>

            <h2 className="mt-2 text-xl font-bold">
              Study26 đang hoạt động
            </h2>

            <div className="mt-6 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-300">
                  Database
                </span>
                <span className="font-semibold text-emerald-400">
                  Connected
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-300">
                  Authentication
                </span>
                <span className="font-semibold text-emerald-400">
                  Active
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-300">
                  Live classrooms
                </span>
                <span className="font-semibold text-emerald-400">
                  {liveRooms} live
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
