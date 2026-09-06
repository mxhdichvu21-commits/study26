import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
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

  if (!profile || profile.role !== "admin" || !profile.is_active) {
    redirect("/");
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-5xl">
        <Link href="/admin" className="text-sm font-medium text-violet-600">
          ← Admin Dashboard
        </Link>

        <div className="mb-6 mt-4">
          <h1 className="text-2xl font-bold text-slate-900">Cài đặt</h1>
          <p className="mt-1 text-sm text-slate-500">
            Thông tin quản trị và cấu hình cơ bản của tài khoản Admin.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="font-bold text-slate-900">Tài khoản quản trị</h2>

            <div className="mt-5 space-y-4">
              <div>
                <div className="text-xs font-bold uppercase text-slate-400">
                  Họ tên
                </div>
                <div className="mt-1 font-medium text-slate-900">
                  {profile.full_name || "Chưa cập nhật"}
                </div>
              </div>

              <div>
                <div className="text-xs font-bold uppercase text-slate-400">
                  Vai trò
                </div>
                <div className="mt-1 font-medium text-slate-900">
                  {profile.role}
                </div>
              </div>

              <div>
                <div className="text-xs font-bold uppercase text-slate-400">
                  Trạng thái
                </div>
                <div className="mt-1 font-medium text-emerald-600">
                  Đang hoạt động
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="font-bold text-slate-900">Hệ thống</h2>

            <div className="mt-5 space-y-3 text-sm text-slate-600">
              <div className="rounded-xl bg-slate-50 p-4">
                Xác thực người dùng: Supabase Auth
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                Cơ sở dữ liệu: Supabase
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                Phòng học trực tuyến: LiveKit
              </div>
            </div>
          </section>
        </div>

        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
          Các thiết lập hạ tầng nhạy cảm được giữ ở biến môi trường server,
          không hiển thị trực tiếp trên giao diện.
        </div>
      </div>
    </main>
  );
}
