import Link from "next/link";
import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function textValue(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value);
}

export default async function AdminMaterialsPage() {
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

  const { data, error } = await admin
    .from("materials")
    .select("*")
    .limit(200);

  if (error) {
    throw new Error(error.message);
  }

  const materials = (data ?? []) as Record<string, unknown>[];

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
              Tài liệu
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Tài nguyên học tập được lưu trong hệ thống.
            </p>
          </div>

          <div className="rounded-xl bg-white px-4 py-3 text-sm font-semibold shadow-sm ring-1 ring-slate-200">
            Tổng tài liệu: {materials.length}
          </div>
        </div>

        <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          {materials.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-500">
              Chưa có tài liệu nào.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-5 py-4 text-xs font-bold uppercase text-slate-500">
                      Tài liệu
                    </th>

                    <th className="px-5 py-4 text-xs font-bold uppercase text-slate-500">
                      Loại
                    </th>

                    <th className="px-5 py-4 text-xs font-bold uppercase text-slate-500">
                      Liên kết
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {materials.map((item, index) => {
                    const title =
                      textValue(item.title) ||
                      textValue(item.name) ||
                      textValue(item.file_name) ||
                      textValue(item.filename) ||
                      `Tài liệu #${index + 1}`;

                    const type =
                      textValue(item.type) ||
                      textValue(item.file_type) ||
                      textValue(item.mime_type) ||
                      "—";

                    const url =
                      textValue(item.url) ||
                      textValue(item.file_url) ||
                      textValue(item.storage_url) ||
                      "";

                    return (
                      <tr
                        key={textValue(item.id) || index}
                        className="border-b border-slate-100 last:border-0"
                      >
                        <td className="px-5 py-4">
                          <div className="font-semibold text-slate-900">
                            {title}
                          </div>

                          {textValue(item.description) && (
                            <div className="mt-1 max-w-xl truncate text-xs text-slate-400">
                              {textValue(item.description)}
                            </div>
                          )}
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {type}
                        </td>

                        <td className="px-5 py-4">
                          {url ? (
                            <a
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="max-w-[360px] truncate text-sm font-medium text-violet-600 hover:underline"
                            >
                              Mở tài liệu
                            </a>
                          ) : (
                            <span className="text-sm text-slate-400">
                              Không có liên kết
                            </span>
                          )}
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
