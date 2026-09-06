import Link from "next/link";
import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminClassesPage() {
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

  const { data: classes, error } = await admin
    .from("classes")
    .select(`
      id,
      name,
      code,
      description,
      teacher_id,
      created_at
    `)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw new Error(error.message);
  }

  const teacherIds = [
    ...new Set(
      (classes ?? [])
        .map((item) => item.teacher_id)
        .filter(Boolean)
    ),
  ];

  const { data: teachers } =
    teacherIds.length > 0
      ? await admin
          .from("profiles")
          .select(
            "id, full_name, avatar_url"
          )
          .in("id", teacherIds)
      : { data: [] };

  const { data: members } =
    (classes ?? []).length > 0
      ? await admin
          .from("class_members")
          .select(
            "class_id, user_id"
          )
          .in(
            "class_id",
            (classes ?? []).map(
              (item) => item.id
            )
          )
      : { data: [] };

  const teacherMap = new Map(
    (teachers ?? []).map(
      (teacher) => [
        teacher.id,
        teacher,
      ]
    )
  );

  const studentCountMap = new Map<
    string,
    number
  >();

  for (const member of members ?? []) {
    studentCountMap.set(
      member.class_id,
      (studentCountMap.get(
        member.class_id
      ) ?? 0) + 1
    );
  }

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
              Quản lý lớp học
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Danh sách toàn bộ lớp học trong hệ thống.
            </p>
          </div>

          <div className="rounded-xl bg-white px-4 py-3 text-sm font-semibold shadow-sm ring-1 ring-slate-200">
            Tổng lớp: {classes?.length ?? 0}
          </div>
        </div>

        <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          {!classes || classes.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-500">
              Chưa có lớp học nào.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-5 py-4 text-xs font-bold uppercase text-slate-500">
                      Lớp
                    </th>

                    <th className="px-5 py-4 text-xs font-bold uppercase text-slate-500">
                      Mã lớp
                    </th>

                    <th className="px-5 py-4 text-xs font-bold uppercase text-slate-500">
                      Giáo viên
                    </th>

                    <th className="px-5 py-4 text-xs font-bold uppercase text-slate-500">
                      Học sinh
                    </th>

                    <th className="px-5 py-4 text-xs font-bold uppercase text-slate-500">
                      Ngày tạo
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {classes.map((item) => {
                    const teacher =
                      teacherMap.get(
                        item.teacher_id
                      );

                    return (
                      <tr
                        key={item.id}
                        className="border-b border-slate-100 last:border-0"
                      >
                        <td className="px-5 py-4">
                          <Link
                            href={`/teacher/classes/${item.id}`}
                            className="font-semibold text-slate-900 hover:text-violet-600"
                          >
                            {item.name}
                          </Link>

                          {item.description && (
                            <div className="mt-1 max-w-md truncate text-xs text-slate-400">
                              {item.description}
                            </div>
                          )}
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {item.code || "—"}
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-700">
                          {teacher?.full_name ||
                            "Chưa có giáo viên"}
                        </td>

                        <td className="px-5 py-4 text-sm font-semibold text-slate-700">
                          {studentCountMap.get(
                            item.id
                          ) ?? 0}
                        </td>

                        <td className="px-5 py-4 text-xs text-slate-500">
                          {item.created_at
                            ? new Intl.DateTimeFormat(
                                "vi-VN",
                                {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                  timeZone:
                                    "Asia/Ho_Chi_Minh",
                                }
                              ).format(
                                new Date(
                                  item.created_at
                                )
                              )
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
