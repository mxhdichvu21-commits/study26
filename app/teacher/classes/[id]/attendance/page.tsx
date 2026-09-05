import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import AttendanceExportButton from "@/components/teacher/attendance-export-button";
import AttendanceRealtime from "@/components/teacher/attendance-realtime";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    session?: string;
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

type SessionRow = {
  id: string;
  room_id: string;
  started_by: string;
  started_at: string | null;
  ended_at: string | null;
};

type RoomRow = {
  id: string;
  class_id: string;
};

type AttendanceRow = {
  id: string;
  session_id: string;
  student_id: string;
  status: string;
  joined_at: string | null;
  left_at: string | null;
};

export default async function TeacherAttendancePage({
  params,
  searchParams,
}: PageProps) {
  const { id: classId } = await params;
  const { session: sessionParam } = await searchParams;

  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (
    profileError ||
    !profile ||
    profile.role !== "teacher" ||
    profile.is_active === false
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

  const { data: membersData, error: membersError } = await admin
    .from("class_members")
    .select("user_id, role")
    .eq("class_id", classId)
    .eq("role", "student");

  if (membersError) {
    throw new Error(membersError.message);
  }

  const members = (membersData ?? []) as Member[];
  const studentIds = members.map((item) => item.user_id);

  const [profilesResult, studentsResult] = await Promise.all([
    studentIds.length
      ? admin
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", studentIds)
      : Promise.resolve({ data: [] as Profile[] }),

    studentIds.length
      ? admin
          .from("students")
          .select("id, student_code")
          .in("id", studentIds)
      : Promise.resolve({ data: [] as Student[] }),
  ]);

  const profiles = (profilesResult.data ?? []) as Profile[];
  const students = (studentsResult.data ?? []) as Student[];

  const profileMap = new Map(
    profiles.map((item) => [item.id, item])
  );

  const studentMap = new Map(
    students.map((item) => [item.id, item])
  );

  /*
   * Lấy tất cả session, sau đó lọc theo room thuộc lớp hiện tại.
   */
  const { data: allSessionsData, error: sessionsError } = await admin
    .from("sessions")
    .select(
      "id, room_id, started_by, started_at, ended_at"
    )
    .order("started_at", {
      ascending: false,
      nullsFirst: false,
    });

  if (sessionsError) {
    throw new Error(sessionsError.message);
  }

  const allSessions = (allSessionsData ?? []) as SessionRow[];

  const roomIds = [
    ...new Set(
      allSessions
        .map((item) => item.room_id)
        .filter(Boolean)
    ),
  ];

  let roomMap = new Map<string, RoomRow>();

  if (roomIds.length > 0) {
    const { data: roomsData, error: roomsError } = await admin
      .from("rooms")
      .select("id, class_id")
      .in("id", roomIds);

    if (roomsError) {
      throw new Error(roomsError.message);
    }

    const rooms = (roomsData ?? []) as RoomRow[];

    roomMap = new Map(
      rooms.map((room) => [room.id, room])
    );
  }

  const sessions = allSessions.filter(
    (session) =>
      roomMap.get(session.room_id)?.class_id === classId
  );

  const selectedSession =
    sessions.find(
      (session) => session.id === sessionParam
    ) ??
    sessions[0] ??
    null;

  let attendanceRows: AttendanceRow[] = [];

  if (selectedSession) {
    const { data: attendanceData, error: attendanceError } =
      await admin
        .from("attendance")
        .select(
          "id, session_id, student_id, status, joined_at, left_at"
        )
        .eq("session_id", selectedSession.id);

    if (attendanceError) {
      throw new Error(attendanceError.message);
    }

    attendanceRows = (attendanceData ?? []) as AttendanceRow[];
  }

  const attendanceMap = new Map(
    attendanceRows.map((item) => [
      item.student_id,
      item,
    ])
  );

  const presentCount = members.filter((member) =>
    attendanceMap.has(member.user_id)
  ).length;

  const lateCount = attendanceRows.filter(
    (item) => item.status === "late"
  ).length;

  const absentCount = Math.max(
    members.length - presentCount,
    0
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

        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <aside className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-bold text-slate-900">
              Lịch sử buổi học
            </h2>

            {sessions.length === 0 ? (
              <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                Chưa có buổi học nào của lớp.
              </div>
            ) : (
              <div className="space-y-2">
                {sessions.map((session, index) => {
                  const selected =
                    selectedSession?.id === session.id;

                  return (
                    <Link
                      key={session.id}
                      href={`/teacher/classes/${classId}/attendance?session=${session.id}`}
                      className={
                        selected
                          ? "block rounded-xl border border-blue-200 bg-blue-50 p-4"
                          : "block rounded-xl border border-slate-200 p-4 hover:bg-slate-50"
                      }
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold text-slate-900">
                            Buổi học #{sessions.length - index}
                          </div>

                          <div className="mt-1 text-xs text-slate-500">
                            {session.started_at
                              ? new Date(
                                  session.started_at
                                ).toLocaleString("vi-VN")
                              : "Không rõ thời gian"}
                          </div>
                        </div>

                        <span
                          className={
                            session.ended_at
                              ? "rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600"
                              : "rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700"
                          }
                        >
                          {session.ended_at
                            ? "Đã kết thúc"
                            : "Đang học"}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </aside>

          <section className="rounded-2xl bg-white p-5 shadow-sm">
            {!selectedSession ? (
              <div className="flex min-h-[400px] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                <div>
                  <div className="text-lg font-semibold text-slate-700">
                    Chưa có dữ liệu điểm danh
                  </div>

                  <p className="mt-2 text-sm text-slate-500">
                    Khi lớp có buổi học trực tuyến, dữ liệu điểm danh sẽ xuất hiện tại đây.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      Danh sách điểm danh
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      {selectedSession.started_at
                        ? new Date(
                            selectedSession.started_at
                          ).toLocaleString("vi-VN")
                        : "Không rõ thời gian"}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <AttendanceExportButton
                      classId={classId}
                    />

                    <div className="rounded-xl bg-slate-50 px-4 py-2 text-sm text-slate-600">
                      Tổng học sinh:{" "}
                      <strong>{members.length}</strong>
                    </div>
                  </div>

                  <AttendanceRealtime
                    sessionId={selectedSession.id}
                  />
                </div>

                {members.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-500">
                    Lớp chưa có học sinh.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full min-w-[760px] text-sm">
                      <thead className="bg-slate-50">
                        <tr className="border-b border-slate-200 text-left">
                          <th className="px-4 py-3 font-semibold text-slate-600">
                            Học sinh
                          </th>

                          <th className="px-4 py-3 font-semibold text-slate-600">
                            Mã học sinh
                          </th>

                          <th className="px-4 py-3 font-semibold text-slate-600">
                            Trạng thái
                          </th>

                          <th className="px-4 py-3 font-semibold text-slate-600">
                            Vào lớp
                          </th>

                          <th className="px-4 py-3 font-semibold text-slate-600">
                            Rời lớp
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {members.map((member) => {
                          const attendance =
                            attendanceMap.get(
                              member.user_id
                            );

                          const student =
                            studentMap.get(
                              member.user_id
                            );

                          const studentProfile =
                            profileMap.get(
                              member.user_id
                            );

                          const status =
                            attendance?.status ?? "absent";

                          const statusLabel =
                            status === "late"
                              ? "Đi muộn"
                              : attendance
                              ? "Có mặt"
                              : "Vắng";

                          const statusClass =
                            status === "late"
                              ? "bg-amber-50 text-amber-700"
                              : attendance
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-red-50 text-red-700";

                          return (
                            <tr
                              key={member.user_id}
                              className="border-b border-slate-100 last:border-b-0"
                            >
                              <td className="px-4 py-4">
                                <div className="font-semibold text-slate-900">
                                  {studentProfile?.full_name ||
                                    "Chưa cập nhật tên"}
                                </div>
                              </td>

                              <td className="px-4 py-4 text-slate-500">
                                {student?.student_code ||
                                  "—"}
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
                                  ? new Date(
                                      attendance.joined_at
                                    ).toLocaleTimeString(
                                      "vi-VN"
                                    )
                                  : "—"}
                              </td>

                              <td className="px-4 py-4 text-slate-500">
                                {attendance?.left_at
                                  ? new Date(
                                      attendance.left_at
                                    ).toLocaleTimeString(
                                      "vi-VN"
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
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
