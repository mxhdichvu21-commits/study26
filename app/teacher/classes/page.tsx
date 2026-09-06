import Link from "next/link";
import { redirect } from "next/navigation";

import {
  Bell,
  BookOpen,
  CalendarDays,
  ChevronDown,
  Clock3,
  GraduationCap,
  Home,
  LogOut,
  Plus,
  Settings,
  Users,
  Video,
  FileText,
  ClipboardCheck,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function TeacherClassesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role, is_active")
    .eq("id", user.id)
    .single();

  if (
    !profile ||
    profile.role !== "teacher" ||
    !profile.is_active
  ) {
    redirect("/");
  }

  const { data: classes, error } = await supabase
    .from("classes")
    .select(`
      id,
      name,
      code,
      description,
      subject_id,
      subjects (
        id,
        name,
        code
      )
    `)
    .eq("teacher_id", user.id)
    .order("name", {
      ascending: true,
    });

  if (error) {
    throw new Error(error.message);
  }

  const classIds = (classes ?? []).map(
    (item) => item.id
  );

  const { data: members } =
    classIds.length > 0
      ? await supabase
          .from("class_members")
          .select("class_id, user_id")
          .in("class_id", classIds)
      : { data: [] };

  const { data: rooms } =
    classIds.length > 0
      ? await supabase
          .from("rooms")
          .select(
            "id, class_id, name, code, status"
          )
          .in("class_id", classIds)
          .order("created_at", {
            ascending: false,
          })
      : { data: [] };

  const { data: lessons } =
    classIds.length > 0
      ? await supabase
          .from("lessons")
          .select("id, class_id")
          .in("class_id", classIds)
      : { data: [] };

  const { data: assignments } =
    classIds.length > 0
      ? await supabase
          .from("assignments")
          .select("id, class_id")
          .in("class_id", classIds)
      : { data: [] };

  const memberCount = new Map<string, number>();
  const lessonCount = new Map<string, number>();
  const assignmentCount = new Map<string, number>();
  const liveRoomCount = new Map<string, number>();

  for (const item of members ?? []) {
    memberCount.set(
      item.class_id,
      (memberCount.get(item.class_id) ?? 0) + 1
    );
  }

  for (const item of lessons ?? []) {
    lessonCount.set(
      item.class_id,
      (lessonCount.get(item.class_id) ?? 0) + 1
    );
  }

  for (const item of assignments ?? []) {
    assignmentCount.set(
      item.class_id,
      (assignmentCount.get(item.class_id) ?? 0) + 1
    );
  }

  for (const item of rooms ?? []) {
    if (item.status === "live") {
      liveRoomCount.set(
        item.class_id,
        (liveRoomCount.get(item.class_id) ?? 0) + 1
      );
    }
  }

  const totalStudents = new Set(
    (members ?? []).map(
      (item) => item.user_id
    )
  ).size;

  const liveClasses = (classes ?? []).filter(
    (item) =>
      (liveRoomCount.get(item.id) ?? 0) > 0
  ).length;

  return (
    <main className="min-h-screen bg-[#f7f7fb] text-slate-900">
      <div className="flex min-h-screen">
        {/* SIDEBAR */}
        <aside className="hidden w-[270px] shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
          <div className="px-6 pb-5 pt-7">
            <Link
              href="/teacher"
              className="flex items-center gap-3"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
                <GraduationCap size={26} />
              </div>

              <div>
                <div className="text-xl font-extrabold tracking-tight">
                  Study26
                </div>
                <div className="mt-0.5 text-xs text-slate-400">
                  Dạy học trực tuyến
                </div>
              </div>
            </Link>
          </div>

          <nav className="flex-1 px-4">
            <div className="space-y-1.5">
              <Link
                href="/teacher"
                className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-500 transition hover:bg-violet-50 hover:text-violet-700"
              >
                <Home size={18} />
                Trang chủ
              </Link>

              <Link
                href="/teacher/classes"
                className="flex items-center gap-3 rounded-2xl bg-violet-100 px-4 py-3 text-sm font-bold text-violet-700"
              >
                <BookOpen size={18} />
                Lớp học
              </Link>

              <Link
                href="/teacher/classes"
                className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-500 transition hover:bg-violet-50 hover:text-violet-700"
              >
                <Users size={18} />
                Học sinh
              </Link>

              <Link
                href="/teacher/classes"
                className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-500 transition hover:bg-violet-50 hover:text-violet-700"
              >
                <FileText size={18} />
                Bài học
              </Link>

              <Link
                href="/teacher/classes"
                className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-500 transition hover:bg-violet-50 hover:text-violet-700"
              >
                <ClipboardCheck size={18} />
                Bài tập
              </Link>

              <Link
                href="/teacher/classes"
                className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-500 transition hover:bg-violet-50 hover:text-violet-700"
              >
                <CalendarDays size={18} />
                Lịch dạy
              </Link>

              <Link
                href="/teacher/classes"
                className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-500 transition hover:bg-violet-50 hover:text-violet-700"
              >
                <Video size={18} />
                Phòng học
              </Link>

              <Link
                href="/teacher/notifications"
                className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-500 transition hover:bg-violet-50 hover:text-violet-700"
              >
                <Bell size={18} />
                Thông báo
              </Link>
            </div>
          </nav>

          <div className="border-t border-slate-100 p-4">
            <div className="mb-3 rounded-2xl bg-slate-50 p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 font-bold text-violet-700">
                  {(profile.full_name || "G")
                    .charAt(0)
                    .toUpperCase()}
                </div>

                <div className="min-w-0">
                  <div className="truncate text-sm font-bold text-slate-800">
                    {profile.full_name || "Giáo viên"}
                  </div>

                  <div className="text-xs text-slate-400">
                    Giáo viên
                  </div>
                </div>

                <ChevronDown
                  size={16}
                  className="ml-auto text-slate-400"
                />
              </div>
            </div>

            <Link
              href="/profile"
              className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-500 hover:bg-slate-50"
            >
              <Settings size={18} />
              Cài đặt tài khoản
            </Link>

            <Link
              href="/login"
              className="mt-1 flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-500 hover:bg-rose-50 hover:text-rose-600"
            >
              <LogOut size={18} />
              Đăng xuất
            </Link>
          </div>
        </aside>

        {/* CONTENT */}
        <section className="min-w-0 flex-1">
          {/* MOBILE HEADER */}
          <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-4 lg:hidden">
            <Link
              href="/teacher"
              className="flex items-center gap-2"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                <GraduationCap size={22} />
              </div>
              <span className="font-extrabold">
                Study26
              </span>
            </Link>

            <Link
              href="/teacher"
              className="rounded-xl bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-700"
            >
              Dashboard
            </Link>
          </div>

          <div className="mx-auto max-w-[1280px] px-4 py-7 sm:px-6 lg:px-8 lg:py-10">
            {/* HEADER */}
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
              <div>
                <Link
                  href="/teacher"
                  className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-violet-600 hover:text-violet-700"
                >
                  ← Dashboard
                </Link>

                <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                  Lớp học
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
                  Quản lý các lớp bạn đang giảng dạy,
                  học sinh, nội dung và phòng học trực tuyến.
                </p>
              </div>

              <Link
                href="/teacher/classes/new"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-violet-200 transition hover:-translate-y-0.5 hover:bg-violet-700"
              >
                <Plus size={19} />
                Tạo lớp mới
              </Link>
            </div>

            {/* STATS */}
            <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-400">
                    Tổng số lớp
                  </span>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                    <BookOpen size={19} />
                  </div>
                </div>

                <div className="mt-4 text-3xl font-extrabold">
                  {classes?.length ?? 0}
                </div>

                <div className="mt-1 text-xs text-slate-400">
                  Dữ liệu hiện tại
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-400">
                    Tổng học sinh
                  </span>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                    <Users size={19} />
                  </div>
                </div>

                <div className="mt-4 text-3xl font-extrabold">
                  {totalStudents}
                </div>

                <div className="mt-1 text-xs text-slate-400">
                  Đang tham gia các lớp
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-400">
                    Phòng đang live
                  </span>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                    <Video size={19} />
                  </div>
                </div>

                <div className="mt-4 text-3xl font-extrabold">
                  {liveClasses}
                </div>

                <div className="mt-1 text-xs text-slate-400">
                  Lớp đang diễn ra
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-400">
                    Nội dung
                  </span>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                    <Clock3 size={19} />
                  </div>
                </div>

                <div className="mt-4 text-3xl font-extrabold">
                  {(lessons?.length ?? 0) +
                    (assignments?.length ?? 0)}
                </div>

                <div className="mt-1 text-xs text-slate-400">
                  Bài học + bài tập
                </div>
              </div>
            </div>

            {/* CLASS LIST */}
            <div className="mt-8">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Các lớp của bạn
                  </h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Chọn một lớp để quản lý chi tiết.
                  </p>
                </div>
              </div>

              {!classes || classes.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
                    <BookOpen size={25} />
                  </div>

                  <h3 className="mt-4 text-lg font-bold text-slate-900">
                    Chưa có lớp học
                  </h3>

                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                    Tạo lớp đầu tiên để bắt đầu quản lý học sinh
                    và nội dung giảng dạy.
                  </p>

                  <Link
                    href="/teacher/classes/new"
                    className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 text-sm font-bold text-white hover:bg-violet-700"
                  >
                    <Plus size={18} />
                    Tạo lớp mới
                  </Link>
                </div>
              ) : (
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {classes.map((item) => {
                    const subject = Array.isArray(
                      item.subjects
                    )
                      ? item.subjects[0]
                      : item.subjects;

                    const students =
                      memberCount.get(item.id) ?? 0;

                    const lessonsTotal =
                      lessonCount.get(item.id) ?? 0;

                    const assignmentsTotal =
                      assignmentCount.get(item.id) ?? 0;

                    const isLive =
                      (liveRoomCount.get(item.id) ?? 0) >
                      0;

                    return (
                      <Link
                        href={`/teacher/classes/${item.id}`}
                        key={item.id}
                        className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-violet-200 hover:shadow-xl hover:shadow-violet-100/60"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-600 transition group-hover:bg-violet-600 group-hover:text-white">
                            <BookOpen size={22} />
                          </div>

                          <span
                            className={
                              isLive
                                ? "rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700"
                                : "rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500"
                            }
                          >
                            {isLive
                              ? "● Đang diễn ra"
                              : "Sẵn sàng"}
                          </span>
                        </div>

                        <div className="mt-5">
                          <div className="text-lg font-extrabold text-slate-900">
                            {item.name}
                          </div>

                          <div className="mt-1 text-sm font-semibold text-violet-600">
                            {subject?.name ||
                              "Chưa có môn học"}
                          </div>

                          <p className="mt-3 min-h-[42px] text-sm leading-6 text-slate-500">
                            {item.description ||
                              "Quản lý học sinh, bài học, bài tập và phòng học trực tuyến."}
                          </p>
                        </div>

                        <div className="mt-5 border-t border-slate-100 pt-4">
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <div className="text-xl font-extrabold text-slate-900">
                                {students}
                              </div>
                              <div className="text-xs text-slate-400">
                                Học sinh
                              </div>
                            </div>

                            <div>
                              <div className="text-xl font-extrabold text-slate-900">
                                {lessonsTotal}
                              </div>
                              <div className="text-xs text-slate-400">
                                Bài học
                              </div>
                            </div>

                            <div>
                              <div className="text-xl font-extrabold text-slate-900">
                                {assignmentsTotal}
                              </div>
                              <div className="text-xs text-slate-400">
                                Bài tập
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-5 flex items-center justify-between">
                          <div className="font-mono text-xs text-slate-400">
                            Mã lớp:{" "}
                            <span className="font-bold text-slate-600">
                              {item.code || "—"}
                            </span>
                          </div>

                          <span className="text-sm font-bold text-violet-600 transition group-hover:translate-x-1">
                            Xem lớp →
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
