import Link from "next/link";
import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import UserToggle from "@/components/admin/user-toggle";

type Props = {
  searchParams: Promise<{
    role?: string;
  }>;
};

type UserRow = {
  id: string;
  role: string;
  full_name: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type StudentRow = {
  id: string;
  student_code: string | null;
  grade_level: string | null;
};

type TeacherRow = {
  id: string;
  employee_code: string | null;
};

export default async function AdminUsersPage({
  searchParams,
}: Props) {
  const { role: roleParam } =
    await searchParams;

  const role =
    roleParam === "student" ||
    roleParam === "teacher" ||
    roleParam === "admin"
      ? roleParam
      : "all";

  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: currentProfile } = await admin
    .from("profiles")
    .select("id, role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (
    !currentProfile ||
    currentProfile.role !== "admin" ||
    currentProfile.is_active === false
  ) {
    redirect("/");
  }

  let query = admin
    .from("profiles")
    .select(
      "id, role, full_name, avatar_url, is_active, created_at, updated_at"
    )
    .order("created_at", {
      ascending: false,
    });

  if (role !== "all") {
    query = query.eq("role", role);
  }

  const { data: usersData, error } =
    await query;

  if (error) {
    throw new Error(error.message);
  }

  const users = (usersData ?? []) as UserRow[];

  const ids = users.map((item) => item.id);

  const [studentsResult, teachersResult] =
    await Promise.all([
      ids.length
        ? admin
            .from("students")
            .select("id, student_code, grade_level")
            .in("id", ids)
        : Promise.resolve({
            data: [] as StudentRow[],
          }),

      ids.length
        ? admin
            .from("teachers")
            .select("id, employee_code")
            .in("id", ids)
        : Promise.resolve({
            data: [] as TeacherRow[],
          }),
    ]);

  const students =
    (studentsResult.data ??
      []) as StudentRow[];

  const teachers =
    (teachersResult.data ??
      []) as TeacherRow[];

  const studentMap = new Map(
    students.map((item) => [
      item.id,
      item,
    ])
  );

  const teacherMap = new Map(
    teachers.map((item) => [
      item.id,
      item,
    ])
  );

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Link
              href="/admin"
              className="text-sm font-medium text-blue-600 hover:underline"
            >
              ← Dashboard Admin
            </Link>

            <h1 className="mt-2 text-2xl font-bold text-slate-900">
              Quản lý tài khoản
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              {users.length} tài khoản
            </p>
          </div>
        </div>

        <div className="mb-5 flex flex-wrap gap-2">
          {[
            ["all", "Tất cả"],
            ["student", "Học sinh"],
            ["teacher", "Giáo viên"],
            ["admin", "Admin"],
          ].map(([value, label]) => (
            <Link
              key={value}
              href={
                value === "all"
                  ? "/admin/users"
                  : `/admin/users?role=${value}`
              }
              className={
                role === value
                  ? "rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
                  : "rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm hover:bg-slate-50"
              }
            >
              {label}
            </Link>
          ))}
        </div>

        <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
          {users.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-500">
              Không có tài khoản nào.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-200 text-left">
                    <th className="px-5 py-4 font-semibold text-slate-600">
                      Người dùng
                    </th>

                    <th className="px-5 py-4 font-semibold text-slate-600">
                      Vai trò
                    </th>

                    <th className="px-5 py-4 font-semibold text-slate-600">
                      Mã
                    </th>

                    <th className="px-5 py-4 font-semibold text-slate-600">
                      Ngày tạo
                    </th>

                    <th className="px-5 py-4 font-semibold text-slate-600">
                      Trạng thái
                    </th>

                    <th className="px-5 py-4 text-right font-semibold text-slate-600">
                      Thao tác
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {users.map((item) => {
                    const student =
                      studentMap.get(item.id);

                    const teacher =
                      teacherMap.get(item.id);

                    const code =
                      item.role === "student"
                        ? student?.student_code
                        : item.role === "teacher"
                        ? teacher?.employee_code
                        : "—";

                    const roleLabel =
                      item.role === "student"
                        ? "Học sinh"
                        : item.role === "teacher"
                        ? "Giáo viên"
                        : "Admin";

                    return (
                      <tr
                        key={item.id}
                        className="border-b border-slate-100 last:border-b-0"
                      >
                        <td className="px-5 py-4">
                          <div className="font-semibold text-slate-900">
                            {item.full_name ||
                              "Chưa cập nhật tên"}
                          </div>

                          <div className="mt-1 text-xs text-slate-400">
                            {item.id}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                            {roleLabel}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-slate-500">
                          {code || "—"}
                        </td>

                        <td className="px-5 py-4 text-slate-500">
                          {new Date(
                            item.created_at
                          ).toLocaleDateString(
                            "vi-VN"
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={
                              item.is_active
                                ? "rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"
                                : "rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700"
                            }
                          >
                            {item.is_active
                              ? "Hoạt động"
                              : "Đã khóa"}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <UserToggle
                            userId={item.id}
                            isActive={
                              item.is_active
                            }
                            isSelf={
                              item.id === user.id
                            }
                          />
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
