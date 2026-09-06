import Link from "next/link";
import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminRolesPage() {
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

  const { data: profiles, error } = await admin
    .from("profiles")
    .select("id, full_name, role, is_active")
    .order("role", { ascending: true });

  if (error) throw new Error(error.message);

  const groups = [
    {
      key: "admin",
      title: "Quản trị viên",
      description: "Toàn quyền quản lý hệ thống.",
    },
    {
      key: "teacher",
      title: "Giảng viên",
      description: "Quản lý lớp, bài học, bài tập và phòng học.",
    },
    {
      key: "student",
      title: "Học sinh",
      description: "Tham gia lớp, học bài và nộp bài tập.",
    },
  ];

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/admin" className="text-sm font-medium text-violet-600">
          ← Admin Dashboard
        </Link>

        <div className="mb-6 mt-4">
          <h1 className="text-2xl font-bold text-slate-900">
            Vai trò & phân quyền
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Tổng quan các vai trò hiện có trong Study26.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {groups.map((group) => {
            const users =
              profiles?.filter((item) => item.role === group.key) ?? [];

            return (
              <section
                key={group.key}
                className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
              >
                <div className="text-sm font-bold uppercase text-violet-600">
                  {group.key}
                </div>

                <h2 className="mt-2 text-lg font-bold text-slate-900">
                  {group.title}
                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  {group.description}
                </p>

                <div className="mt-5 text-3xl font-bold text-slate-900">
                  {users.length}
                </div>

                <div className="text-sm text-slate-500">
                  tài khoản
                </div>
              </section>
            );
          })}
        </div>

        <section className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="font-bold text-slate-900">Danh sách tài khoản</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[750px] text-left">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-5 py-4 text-xs font-bold uppercase text-slate-500">
                    Họ tên
                  </th>
                  <th className="px-5 py-4 text-xs font-bold uppercase text-slate-500">
                    Vai trò
                  </th>
                  <th className="px-5 py-4 text-xs font-bold uppercase text-slate-500">
                    Trạng thái
                  </th>
                </tr>
              </thead>

              <tbody>
                {(profiles ?? []).map((item) => (
                  <tr
                    key={item.id}
                    className="border-t border-slate-100"
                  >
                    <td className="px-5 py-4 font-medium text-slate-900">
                      {item.full_name || "Chưa cập nhật"}
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-600">
                      {item.role}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
                          item.is_active
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {item.is_active ? "Đang hoạt động" : "Đã khóa"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
