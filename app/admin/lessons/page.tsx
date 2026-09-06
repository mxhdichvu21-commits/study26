import Link from "next/link";
import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminLessonsPage() {
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

  const { data: lessons, error } = await admin
    .from("lessons")
    .select("id, title, description, status, created_at, class_id")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const classIds = [
    ...new Set(
      (lessons ?? [])
        .map((lesson) => lesson.class_id)
        .filter(Boolean)
    ),
  ];

  const { data: classes } =
    classIds.length > 0
      ? await admin
          .from("classes")
          .select("id, name, code")
          .in("id", classIds)
      : { data: [] };

  const classMap = new Map(
    (classes ?? []).map((item) => [item.id, item])
  );

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/admin"
          className="text-sm font-medium text-violet-600"
        >
          ← Admin Dashboard
        </Link>

        <div className="mb-6 mt-4 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Bài học
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Toàn bộ bài học được tạo trong các lớp.
            </p>
          </div>

          <div className="rounded-xl bg-white px-4 py-3 text-sm font-semibold shadow-sm ring-1 ring-slate-200">
            Tổng bài: {lessons?.length ?? 0}
          </div>
        </div>

        <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          {!lessons || lessons.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-500">
              Chưa có bài học nào.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-5 py-4 text-xs font-bold uppercase text-slate-500">
                      Bài học
                    </th>

                    <th className="px-5 py-4 text-xs font-bold uppercase text-slate-500">
                      Lớp
                    </th>

                    <th className="px-5 py-4 text-xs font-bold uppercase text-slate-500">
                      Trạng thái
                    </th>

                    <th className="px-5 py-4 text-xs font-bold uppercase text-slate-500">
                      Ngày tạo
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {lessons.map((lesson) => {
                    const classData = classMap.get(lesson.class_id);

                    return (
                      <tr
                        key={lesson.id}
                        className="border-b border-slate-100 last:border-0"
                      >
                        <td className="px-5 py-4">
                          <div className="font-semibold text-slate-900">
                            {lesson.title}
                          </div>

                          <div className="mt-1 max-w-xl truncate text-xs text-slate-400">
                            {lesson.description ||
                              "Chưa có mô tả bài học"}
                          </div>
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-700">
                          {classData?.name || "Không rõ lớp"}

                          {classData?.code && (
                            <div className="mt-1 text-xs text-slate-400">
                              {classData.code}
                            </div>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                            {lesson.status || "draft"}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-xs text-slate-500">
                          {lesson.created_at
                            ? new Intl.DateTimeFormat("vi-VN", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                                timeZone: "Asia/Ho_Chi_Minh",
                              }).format(new Date(lesson.created_at))
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
