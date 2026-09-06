import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import AttendanceExportButton from "@/components/teacher/attendance-export-button";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    date?: string;
  }>;
};

type Member = {
  user_id: string;
  role: string;
};

type Profile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
};

type Student = {
  id: string;
  student_code: string | null;
};

type AttendanceRow = {
  id: string;
  student_id: string;
  class_id: string;
  status: string;
  joined_at: string | null;
  left_at: string | null;
  attendance_date?: string | null;
};

function getVietnamToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function formatVietnamDateTime(value: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

function formatVietnamTime(value: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

function formatDisplayDate(value: string) {
  const parts = value.split("-");

  if (parts.length !== 3) {
    return value;
  }

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export default async function TeacherAttendancePage({
  params,
  searchParams,
}: PageProps) {
  const { id: classId } = await params;
  const { date: dateParam } = await searchParams;

  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: teacher } = await admin
    .from("profiles")
    .select("id, role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (
    !teacher ||
    teacher.role !== "teacher" ||
    teacher.is_active === false
  ) {
    redirect("/teacher");
  }

  const { data: classRow, error: classError } = await admin
    .from("classes")
    .select("id, name, code, teacher_id")
    .eq("id", classId)
    .eq("teacher_id", user.id)
    .maybeSingle();

  if (classError || !classRow) {
    notFound();
  }

  const selectedDate =
    dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
      ? dateParam
      : getVietnamToday();

  const { data: membersData, error: membersError } =
    await admin
      .from("class_members")
      .select("user_id, role")
      .eq("class_id", classId)
      .eq("role", "student");

  if (membersError) {
    throw new Error(membersError.message);
  }

  const members = (membersData ?? []) as Member[];
  const studentIds = members.map((item) => item.user_id);

  const [profilesResult, studentsResult, attendanceResult] =
    await Promise.all([
      studentIds.length
        ? admin
            .from("profiles")
            .select("id, full_name, avatar_url")
            .in("id", studentIds)
        : Promise.resolve({
            data: [] as Profile[],
            error: null,
          }),

      studentIds.length
        ? admin
            .from("students")
            .select("id, student_code")
            .in("id", studentIds)
        : Promise.resolve({
            data: [] as Student[],
            error: null,
          }),

      admin
        .from("attendance")
        .select(
          "id, student_id, class_id, status, joined_at, left_at, attendance_date"
        )
        .eq("class_id", classId)
        .eq("attendance_date", selectedDate)
        .order("joined_at", {
          ascending: true,
        }),
    ]);

  if (attendanceResult.error) {
    throw new Error(attendanceResult.error.message);
  }

  const profiles =
    (profilesResult.data ?? []) as Profile[];

  const students =
    (studentsResult.data ?? []) as Student[];

  const attendanceRows =
    (attendanceResult.data ?? []) as AttendanceRow[];

  const profileMap = new Map(
    profiles.map((profile) => [
      profile.id,
      profile,
    ])
  );

  const studentMap = new Map(
    students.map((student) => [
      student.id,
      student,
    ])
  );

  const attendanceMap = new Map(
    attendanceRows.map((row) => [
      row.student_id,
      row,
    ])
  );

  const presentCount = members.filter((member) =>
    attendanceMap.has(member.user_id)
  ).length;

  const lateCount = attendanceRows.filter(
    (row) => row.status === "late"
  ).length;

  const absentCount = Math.max(
    members.length - presentCount,
    0
  );

  const attendanceStudents = await Promise.all(
    members.map(async (member) => {
      const profile = profileMap.get(
        member.user_id
      );

      const student = studentMap.get(
        member.user_id
      );

      const attendance = attendanceMap.get(
        member.user_id
      );

      let email = "";

      const { data: authUser } =
        await admin.auth.admin.getUserById(
          member.user_id
        );

      email = authUser.user?.email || "";

      return {
        userId: member.user_id,
        fullName:
          profile?.full_name ||
          "Chưa cập nhật tên",
        avatarUrl:
          profile?.avatar_url || null,
        studentCode:
          student?.student_code || "—",
        email,
        attendance,
      };
    })
  );

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <Link
          href={`/teacher/classes/${classId}`}
          className="mb-5 inline-flex text-sm font-medium text-blue-600 hover:underline"
        >
          ← Quay lại lớp
        </Link>

        <section className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 text-sm font-semibold text-blue-600">
                QUẢN LÝ ĐIỂM DANH
              </div>

              <h1 className="text-2xl font-bold text-slate-900">
                {classRow.name}
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Mã lớp: {classRow.code}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-emerald-50 px-4 py-3 text-center">
                <div className="text-xs text-emerald-600">
                  Có mặt
                </div>

                <div className="mt-1 text-xl font-bold text-emerald-700">
                  {presentCount}
                </div>
              </div>

              <div className="rounded-xl bg-amber-50 px-4 py-3 text-center">
                <div className="text-xs text-amber-600">
                  Đi muộn
                </div>

                <div className="mt-1 text-xl font-bold text-amber-700">
                  {lateCount}
                </div>
              </div>

              <div className="rounded-xl bg-red-50 px-4 py-3 text-center">
                <div className="text-xs text-red-600">
                  Vắng
                </div>

                <div className="mt-1 text-xl font-bold text-red-700">
                  {absentCount}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-1 text-sm font-semibold text-blue-600">
                ĐIỂM DANH THEO NGÀY
              </div>

              <h2 className="text-xl font-bold text-slate-900">
                Ngày {formatDisplayDate(selectedDate)}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Dữ liệu được lấy trực tiếp từ hệ thống điểm
                danh của học sinh.
              </p>
            </div>

            <div className="flex flex-wrap items-end gap-2">
              <form
                method="get"
                action={`/teacher/classes/${classId}/attendance`}
                className="flex items-end gap-2"
              >
                <div>
                  <label
                    htmlFor="attendance-date"
                    className="mb-1 block text-xs font-semibold text-slate-500"
                  >
                    Chọn ngày
                  </label>

                  <input
                    id="attendance-date"
                    type="date"
                    name="date"
                    defaultValue={selectedDate}
                    className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </div>

                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Xem
                </button>
              </form>

              <AttendanceExportButton
                classId={classId}
              />
            </div>
          </div>

          {members.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-500">
              Lớp chưa có học sinh.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[900px] text-sm">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-200 text-left">
                    <th className="px-4 py-3 font-semibold text-slate-600">
                      Học sinh
                    </th>

                    <th className="px-4 py-3 font-semibold text-slate-600">
                      Email
                    </th>

                    <th className="px-4 py-3 font-semibold text-slate-600">
                      Mã học sinh
                    </th>

                    <th className="px-4 py-3 font-semibold text-slate-600">
                      Trạng thái
                    </th>

                    <th className="px-4 py-3 font-semibold text-slate-600">
                      Thời gian điểm danh
                    </th>

                    <th className="px-4 py-3 font-semibold text-slate-600">
                      Rời lớp
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {attendanceStudents.map((student) => {
                    const attendance =
                      student.attendance;

                    const present =
                      !!attendance;

                    const late =
                      attendance?.status ===
                      "late";

                    const statusLabel = late
                      ? "Đi muộn"
                      : present
                        ? "Đã điểm danh"
                        : "Vắng";

                    const statusClass = late
                      ? "bg-amber-50 text-amber-700"
                      : present
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-red-50 text-red-700";

                    return (
                      <tr
                        key={student.userId}
                        className="border-b border-slate-100 last:border-b-0"
                      >
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-slate-100 font-bold text-slate-600">
                              {student.avatarUrl ? (
                                <img
                                  src={
                                    student.avatarUrl
                                  }
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                student.fullName
                                  .charAt(0)
                                  .toUpperCase()
                              )}
                            </div>

                            <div>
                              <div className="font-semibold text-slate-900">
                                {student.fullName}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4 text-slate-500">
                          {student.email || "—"}
                        </td>

                        <td className="px-4 py-4 text-slate-500">
                          {student.studentCode}
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass}`}
                          >
                            {statusLabel}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-slate-500">
                          {attendance?.joined_at
                            ? formatVietnamDateTime(
                                attendance.joined_at
                              )
                            : "—"}
                        </td>

                        <td className="px-4 py-4 text-slate-500">
                          {attendance?.left_at
                            ? formatVietnamTime(
                                attendance.left_at
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
