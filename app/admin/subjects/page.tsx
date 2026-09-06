import Link from "next/link";
import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminSubjectsPage() {
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

  const { data: subjects, error } = await admin
    .from("subjects")
    .select("id, name, code")
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/admin"
          className="text-sm font-medium text-violet-600"
        >
          ← Admin Dashboard
        </Link>

        <div className="mb-6 mt-4 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Môn học
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Danh sách các môn học trong hệ thống Study26.
            </p>
          </div>

          <div className="rounded-xl bg-white px-4 py-3 text-sm font-semibold shadow-sm ring-1 ring-slate-200">
            Tổng môn: {subjects?.length ?? 0}
          </div>
        </div>

        <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          {!subjects || subjects.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-500">
              Chưa có môn học nào.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-left">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-5 py-4 text-xs font-bold uppercase text-slate-500">
                      Môn học
                    </th>
                    <th className="px-5 py-4 text-xs font-bold uppercase text-slate-500">
                      Mã môn
                    </th>
                    <th className="px-5 py-4 text-xs font-bold uppercase text-slate-500">
                      ID
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {subjects.map((subject) => (
                    <tr
                      key={subject.id}
                      className="border-b border-slate-100 last:border-0"
                    >
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-900">
                          {subject.name}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {subject.code || "—"}
                      </td>

                      <td className="px-5 py-4 font-mono text-xs text-slate-400">
                        {subject.id}
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
