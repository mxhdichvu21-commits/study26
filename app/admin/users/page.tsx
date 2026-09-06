import Link from "next/link";
import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import UserToggleButton from "@/components/admin/user-toggle-button";

export const dynamic = "force-dynamic";

type SearchParams = {
  role?: string | string[];
  status?: string | string[];
  q?: string | string[];
};

function firstValue(
  value: string | string[] | undefined
) {
  return Array.isArray(value) ? value[0] : value;
}

function roleLabel(role: string) {
  if (role === "admin") return "Quản trị viên";
  if (role === "teacher") return "Giảng viên";
  if (role === "student") return "Học sinh";
  return role || "Chưa xác định";
}

function roleBadgeClass(role: string) {
  if (role === "admin") {
    return "bg-violet-100 text-violet-700";
  }

  if (role === "teacher") {
    return "bg-blue-100 text-blue-700";
  }

  if (role === "student") {
    return "bg-emerald-100 text-emerald-700";
  }

  return "bg-slate-100 text-slate-700";
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("id, role, is_active")
    .eq("id", user.id)
    .single();

  if (
    !currentProfile ||
    currentProfile.role !== "admin" ||
    !currentProfile.is_active
  ) {
    redirect("/");
  }

  const params = await searchParams;

  const selectedRole =
    firstValue(params.role) || "all";

  const selectedStatus =
    firstValue(params.status) || "all";

  const queryText =
    (firstValue(params.q) || "").trim();

  const admin = createAdminClient();

  let profileQuery = admin
    .from("profiles")
    .select(
      "id, full_name, role, is_active, avatar_url"
    )
    .order("full_name", {
      ascending: true,
    });

  if (
    selectedRole !== "all" &&
    ["admin", "teacher", "student"].includes(
      selectedRole
    )
  ) {
    profileQuery = profileQuery.eq(
      "role",
      selectedRole
    );
  }

  if (selectedStatus === "active") {
    profileQuery = profileQuery.eq(
      "is_active",
      true
    );
  }

  if (selectedStatus === "locked") {
    profileQuery = profileQuery.eq(
      "is_active",
      false
    );
  }

  if (queryText) {
    profileQuery = profileQuery.ilike(
      "full_name",
      `%${queryText}%`
    );
  }

  const { data: profiles, error } =
    await profileQuery;

  if (error) {
    throw new Error(error.message);
  }

  const {
    data: authUsersResult,
    error: authUsersError,
  } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (authUsersError) {
    throw new Error(authUsersError.message);
  }

  const emailMap = new Map<string, string>();

  for (const authUser of authUsersResult.users) {
    emailMap.set(
      authUser.id,
      authUser.email || ""
    );
  }

  const allProfilesResult = await admin
    .from("profiles")
    .select("id, role, is_active");

  const allProfiles =
    allProfilesResult.data ?? [];

  const totalUsers =
    allProfiles.length;

  const totalAdmins =
    allProfiles.filter(
      (item) => item.role === "admin"
    ).length;

  const totalTeachers =
    allProfiles.filter(
      (item) => item.role === "teacher"
    ).length;

  const totalStudents =
    allProfiles.filter(
      (item) => item.role === "student"
    ).length;

  const activeUsers =
    allProfiles.filter(
      (item) => item.is_active !== false
    ).length;

  const lockedUsers =
    allProfiles.filter(
      (item) => item.is_active === false
    ).length;

  function filterUrl(
    role: string,
    status = selectedStatus
  ) {
    const search = new URLSearchParams();

    if (role !== "all") {
      search.set("role", role);
    }

    if (status !== "all") {
      search.set("status", status);
    }

    if (queryText) {
      search.set("q", queryText);
    }

    const value = search.toString();

    return value
      ? `/admin/users?${value}`
      : "/admin/users";
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link
              href="/admin"
              className="text-sm font-medium text-violet-600"
            >
              ← Admin Dashboard
            </Link>

            <h1 className="mt-4 text-2xl font-bold text-slate-900">
              Quản lý người dùng
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Quản lý tài khoản Admin, giảng viên và học sinh.
            </p>
          </div>

          <div className="rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200">
            <div className="text-xs font-bold uppercase text-slate-400">
              Hiển thị
            </div>
            <div className="mt-1 text-xl font-bold text-slate-900">
              {profiles?.length ?? 0}
            </div>
          </div>
        </div>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ["Tất cả", totalUsers, "/admin/users"],
            ["Admin", totalAdmins, filterUrl("admin", "all")],
            ["Giảng viên", totalTeachers, filterUrl("teacher", "all")],
            ["Học sinh", totalStudents, filterUrl("student", "all")],
            ["Đã khóa", lockedUsers, filterUrl("all", "locked")],
          ].map(([label, value, href]) => (
            <Link
              href={String(href)}
              key={String(label)}
              className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="text-sm font-medium text-slate-500">
                {label}
              </div>

              <div className="mt-2 text-3xl font-bold text-slate-900">
                {value}
              </div>
            </Link>
          ))}
        </section>

        <section className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-wrap gap-2">
            {[
              ["all", "Tất cả"],
              ["admin", "Quản trị viên"],
              ["teacher", "Giảng viên"],
              ["student", "Học sinh"],
            ].map(([value, label]) => (
              <Link
                key={value}
                href={filterUrl(value)}
                className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                  selectedRole === value
                    ? "bg-violet-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {label}
              </Link>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {[
              ["all", "Tất cả trạng thái"],
              ["active", "Đang hoạt động"],
              ["locked", "Đã khóa"],
            ].map(([value, label]) => {
              const search = new URLSearchParams();

              if (selectedRole !== "all") {
                search.set(
                  "role",
                  selectedRole
                );
              }

              if (value !== "all") {
                search.set(
                  "status",
                  value
                );
              }

              if (queryText) {
                search.set(
                  "q",
                  queryText
                );
              }

              const qs = search.toString();

              return (
                <Link
                  key={value}
                  href={
                    qs
                      ? `/admin/users?${qs}`
                      : "/admin/users"
                  }
                  className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                    selectedStatus === value
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </div>

          <form
            action="/admin/users"
            method="get"
            className="mt-4 flex flex-col gap-3 md:flex-row"
          >
            {selectedRole !== "all" && (
              <input
                type="hidden"
                name="role"
                value={selectedRole}
              />
            )}

            {selectedStatus !== "all" && (
              <input
                type="hidden"
                name="status"
                value={selectedStatus}
              />
            )}

            <input
              type="search"
              name="q"
              defaultValue={queryText}
              placeholder="Tìm theo họ tên..."
              className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-violet-400 focus:bg-white"
            />

            <button
              type="submit"
              className="rounded-xl bg-violet-600 px-6 py-3 text-sm font-bold text-white hover:bg-violet-700"
            >
              Tìm kiếm
            </button>

            <Link
              href="/admin/users"
              className="rounded-xl bg-slate-100 px-6 py-3 text-center text-sm font-bold text-slate-600 hover:bg-slate-200"
            >
              Xóa lọc
            </Link>
          </form>
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="font-bold text-slate-900">
                Danh sách tài khoản
              </h2>

              <p className="mt-1 text-xs text-slate-400">
                Đang hoạt động: {activeUsers} · Đã khóa: {lockedUsers}
              </p>
            </div>
          </div>

          {!profiles?.length ? (
            <div className="p-12 text-center text-sm text-slate-500">
              Không tìm thấy tài khoản phù hợp.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-left">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-5 py-4 text-xs font-bold uppercase text-slate-500">
                      Người dùng
                    </th>

                    <th className="px-5 py-4 text-xs font-bold uppercase text-slate-500">
                      Email
                    </th>

                    <th className="px-5 py-4 text-xs font-bold uppercase text-slate-500">
                      Vai trò
                    </th>

                    <th className="px-5 py-4 text-xs font-bold uppercase text-slate-500">
                      Trạng thái
                    </th>

                    <th className="px-5 py-4 text-right text-xs font-bold uppercase text-slate-500">
                      Thao tác
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {profiles.map((item) => (
                    <tr
                      key={item.id}
                      className="border-t border-slate-100"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-violet-100 font-bold text-violet-700">
                            {item.avatar_url ? (
                              <img
                                src={item.avatar_url}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              (
                                item.full_name ||
                                "?"
                              )
                                .charAt(0)
                                .toUpperCase()
                            )}
                          </div>

                          <div>
                            <div className="font-semibold text-slate-900">
                              {item.full_name ||
                                "Chưa cập nhật"}
                            </div>

                            <div className="max-w-[300px] truncate font-mono text-[10px] text-slate-400">
                              {item.id}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {emailMap.get(item.id) || "—"}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${roleBadgeClass(
                            item.role
                          )}`}
                        >
                          {roleLabel(item.role)}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
                            item.is_active
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-rose-100 text-rose-700"
                          }`}
                        >
                          {item.is_active
                            ? "Đang hoạt động"
                            : "Đã khóa"}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        {item.id === user.id ? (
                          <span className="text-xs font-semibold text-slate-400">
                            Tài khoản hiện tại
                          </span>
                        ) : (
                          <UserToggleButton
                            userId={item.id}
                            active={item.is_active}
                          />
                        )}
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
