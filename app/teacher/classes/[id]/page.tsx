import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
import CreateRoomModal from "@/components/teacher/create-room-modal";
import RoomActions from "@/components/teacher/room-actions";
import CreateLessonModal from "@/components/teacher/create-lesson-modal";
import CreateAssignmentModal from "@/components/teacher/create-assignment-modal";
import CreateScheduleModal from "@/components/teacher/create-schedule-modal";
import ContentActions from "@/components/teacher/content-actions";
import ManageClassStudents from "@/components/teacher/manage-class-students";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function TeacherClassDetailPage({ params }: PageProps) {
  const { id } = await params;
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

  if (!profile || profile.role !== "teacher" || !profile.is_active) {
    redirect("/");
  }

  const { data: classData } = await supabase
    .from("classes")
    .select(`
      id,
      name,
      code,
      description,
      teacher_id,
      subject_id,
      subjects (
        id,
        name,
        code
      )
    `)
    .eq("id", id)
    .eq("teacher_id", user.id)
    .single();

  if (!classData) redirect("/teacher/classes");

  const { data: members } = await supabase
    .from("class_members")
    .select(`
      user_id,
      joined_at,
      profiles (
        id,
        full_name,
        avatar_url
      )
    `)
    .eq("class_id", id)
    .order("joined_at", { ascending: true });

  const { data: lessons } = await supabase
    .from("lessons")
    .select("id, title, description, status, created_at")
    .eq("class_id", id);

  const { data: assignments } = await supabase
    .from("assignments")
    .select("id, title, description, points, due_at, status, created_at")
    .eq("class_id", id);

  const { data: schedules } = await supabase
    .from("schedules")
    .select("id, starts_at, ends_at, room_id")
    .eq("class_id", id)
    .order("starts_at", { ascending: true });

  const { data: rooms } = await supabase
    .from("rooms")
    .select("id, name, code, status, scheduled_at, started_at, ended_at")
    .eq("class_id", id)
    .order("created_at", { ascending: false });

  const subject = Array.isArray(classData.subjects)
    ? classData.subjects[0]
    : classData.subjects;

  const studentCount = members?.length ?? 0;
  const lessonCount = lessons?.length ?? 0;
  const assignmentCount = assignments?.length ?? 0;
  const scheduleCount = schedules?.length ?? 0;

  const upcomingSchedules =
    schedules?.filter((item) => new Date(item.starts_at) >= new Date()).slice(0, 3) ?? [];

  const recentMembers = members?.slice(-5).reverse() ?? [];
  const recentAssignments = assignments
    ?.slice()
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() -
        new Date(a.created_at).getTime()
    )
    .slice(0, 4) ?? [];

  return (
    <main className="class-workspace">
      <header className="class-topbar">
        <div className="class-topbar-left">
          <Link href="/teacher/classes" className="back-link">
            ← Lớp học
          </Link>

          <div className="class-heading">
            <div className="class-icon">
              {classData.name.charAt(0).toUpperCase()}
            </div>

            <div>
              <h1>{classData.name}</h1>
              <p>
                {subject?.name || "Chưa có môn học"}{" "}
                <span>•</span>{" "}
                Mã lớp: <strong>{classData.code}</strong>
              </p>
            </div>

              <a
                href={`/teacher/classes/${id}/attendance`}
                className="inline-flex items-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Điểm danh
              </a>
          </div>
        </div>

        <div className="class-topbar-actions">
          <Link href="/teacher/classes" className="class-secondary-button">
            Danh sách lớp
          </Link>

          <button className="class-settings-button">
            ⚙ Quản lý lớp
          </button>
        </div>
      </header>

      <nav className="class-tabs">
        <a href="#tong-quan" className="class-tab active">
          Tổng quan
        </a>
        <a href="#hoc-sinh" className="class-tab">
          Học sinh
        </a>
        <a href="#bai-hoc" className="class-tab">
          Bài học
        </a>
        <a href="#bai-tap" className="class-tab">
          Bài tập
        </a>
        <a href="#lich-hoc" className="class-tab">
          Lịch học
        </a>
        <a href="#phong-hoc" className="class-tab">
          Phòng học
        </a>
      </nav>

      <div className="class-content">
        <section id="tong-quan">
          <div className="class-intro">
            <div>
              <span className="section-kicker">TỔNG QUAN LỚP</span>
              <h2>{classData.name}</h2>
              <p>
                {classData.description ||
                  "Quản lý học sinh, nội dung giảng dạy, bài tập và lịch học của lớp."}
              </p>
            </div>
          </div>

          <div className="class-stat-grid">
            <div className="class-stat">
              <span>Học sinh</span>
              <strong>{studentCount}</strong>
              <small>đang tham gia</small>
            </div>

            <div className="class-stat">
              <span>Bài học</span>
              <strong>{lessonCount}</strong>
              <small>nội dung</small>
            </div>

            <div className="class-stat">
              <span>Bài tập</span>
              <strong>{assignmentCount}</strong>
              <small>đã giao</small>
            </div>

            <div className="class-stat">
              <span>Lịch học</span>
              <strong>{scheduleCount}</strong>
              <small>buổi học</small>
            </div>
          </div>

          <div className="class-overview-grid">
            <section className="class-card">
              <div className="class-card-header">
                <div>
                  <h3>Học sinh gần đây</h3>
                  <p>Những học sinh tham gia lớp gần nhất.</p>
                </div>

                <a href="#hoc-sinh">Xem tất cả →</a>
              </div>

              {recentMembers.length > 0 ? (
                <div className="class-person-list">
                  {recentMembers.map((member: any) => (
                    <div className="class-person-row" key={member.user_id}>
                      <div className="class-avatar">
                        {member.profiles?.full_name?.charAt(0)?.toUpperCase() ||
                          "?"}
                      </div>

                      <div className="class-person-info">
                        <strong>
                          {member.profiles?.full_name || "Học sinh"}
                        </strong>
                        <span>
                          Tham gia{" "}
                          {member.joined_at
                            ? new Date(member.joined_at).toLocaleDateString(
                                "vi-VN"
                              )
                            : "—"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="class-empty">
                  Chưa có học sinh trong lớp.
                </div>
              )}
            </section>

            <section className="class-card">
              <div className="class-card-header">
                <div>
                  <h3>Bài tập gần đây</h3>
                  <p>Các bài tập mới nhất của lớp.</p>
                </div>

                <a href="#bai-tap">Xem tất cả →</a>
              </div>

              {recentAssignments.length > 0 ? (
                <div className="class-assignment-list">
                  {recentAssignments.map((assignment) => (
                    <div className="class-assignment-row" key={assignment.id}>
                      <div>
                        <strong>{assignment.title}</strong>
                        <span>
                          {assignment.points ?? 0} điểm
                          {assignment.due_at
                            ? ` • Hạn ${new Date(
                                assignment.due_at
                              ).toLocaleDateString("vi-VN")}`
                            : ""}
                        </span>
                      </div>

                      <span className="class-status">
                        {assignment.status || "draft"}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="class-empty">
                  Chưa có bài tập nào.
                </div>
              )}
            </section>
          </div>
        </section>

        <section id="hoc-sinh" className="class-section">
          <div className="class-section-heading">
            <div>
              <span className="section-kicker">THÀNH VIÊN</span>
              <h2>Học sinh</h2>
              <p>{studentCount} học sinh đang tham gia lớp.</p>
            </div>

            <ManageClassStudents
              classId={classData.id}
              members={
                (members ?? []).map((member: any) => ({
                  user_id: member.user_id,
                  joined_at: member.joined_at,
                  profiles: member.profiles,
                }))
              }
            />
          </div>

          <div className="class-table-card">
            {members && members.length > 0 ? (
              <table className="class-table">
                <thead>
                  <tr>
                    <th>Học sinh</th>
                    <th>Ngày tham gia</th>
                    <th>Trạng thái</th>
                    <th></th>
                  </tr>
                </thead>

                <tbody>
                  {members.map((member: any) => (
                    <tr key={member.user_id}>
                      <td>
                        <div className="table-person">
                          <div className="class-avatar small">
                            {member.profiles?.full_name
                              ?.charAt(0)
                              ?.toUpperCase() || "?"}
                          </div>

                          <strong>
                            {member.profiles?.full_name || "Học sinh"}
                          </strong>
                        </div>
                      </td>

                      <td>
                        {member.joined_at
                          ? new Date(member.joined_at).toLocaleDateString(
                              "vi-VN"
                            )
                          : "—"}
                      </td>

                      <td>
                        <span className="online-status">Đang tham gia</span>
                      </td>

                      <td>
                        —
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="class-empty large">
                Chưa có học sinh trong lớp.
              </div>
            )}
          </div>
        </section>

        <section id="bai-hoc" className="class-section">
          <div className="class-section-header">
            <div>
              <span className="section-kicker">LESSONS</span>
              <h2>Bài học</h2>
              <p>
                Quản lý nội dung giảng dạy của lớp.
              </p>
            </div>

            <CreateLessonModal
              classId={classData.id}
            />
          </div>

          <div className="class-content-list">
            {lessons && lessons.length > 0 ? (
              lessons.map((lesson) => (
                <div
                  className="class-content-row"
                  key={lesson.id}
                >
                  <div className="content-row-number">
                    {lesson.title
                      .charAt(0)
                      .toUpperCase()}
                  </div>

                  <div className="content-row-main">
                    <strong>{lesson.title}</strong>
                    <span>
                      {lesson.description ||
                        "Chưa có mô tả bài học"}
                    </span>
                  </div>

                  <span className="class-status">
                    {lesson.status || "draft"}
                  </span>

                  <ContentActions
                    kind="lesson"
                    id={lesson.id}
                    classId={classData.id}
                    title={lesson.title}
                    description={lesson.description}
                  />
                </div>
              ))
            ) : (
              <div className="class-empty-state">
                Chưa có bài học nào.
              </div>
            )}
          </div>
        </section>

        <section id="bai-tap" className="class-section">
          <div className="class-section-header">
            <div>
              <span className="section-kicker">
                ASSIGNMENTS
              </span>
              <h2>Bài tập</h2>
              <p>
                Giao bài và theo dõi hạn nộp của học sinh.
              </p>
            </div>

            <CreateAssignmentModal
              classId={classData.id}
            />
          </div>

          <div className="class-content-list">
            {assignments &&
            assignments.length > 0 ? (
              assignments.map((assignment) => (
                <div
                  className="class-content-row"
                  key={assignment.id}
                >
                  <div className="content-row-number assignment">
                    {assignment.points ?? 0}
                  </div>

                  <div className="content-row-main">
                    <a
                      href={`/teacher/assignments/${assignment.id}`}
                      className="class-content-link"
                    >
                      <strong>
                        {assignment.title}
                      </strong>

                      <span>
                        {assignment.due_at
                          ? `Hạn nộp: ${new Date(
                              assignment.due_at
                            ).toLocaleString(
                              "vi-VN"
                            )}`
                          : "Chưa đặt hạn nộp"}
                      </span>
                    </a>
                  </div>

                  <span className="class-status">
                    {assignment.status || "draft"}
                  </span>

                  <ContentActions
                    kind="assignment"
                    id={assignment.id}
                    classId={classData.id}
                    title={assignment.title}
                    description={
                      assignment.description
                    }
                    points={assignment.points}
                    dueAt={assignment.due_at}
                  />
                </div>
              ))
            ) : (
              <div className="class-empty-state">
                Chưa có bài tập nào.
              </div>
            )}
          </div>
        </section>

        <section id="lich-hoc" className="class-section">
          <div className="class-section-header">
            <div>
              <span className="section-kicker">
                SCHEDULE
              </span>
              <h2>Lịch học</h2>
              <p>
                Những buổi học được lên lịch cho lớp.
              </p>
            </div>

            <CreateScheduleModal
              classId={classData.id}
              rooms={
                rooms?.map((room) => ({
                  id: room.id,
                  name: room.name,
                  code: room.code,
                  status: room.status,
                })) || []
              }
            />
          </div>

          <div className="class-content-list">
            {schedules &&
            schedules.length > 0 ? (
              schedules.map((schedule) => (
                <div
                  className="class-content-row"
                  key={schedule.id}
                >
                  <div className="schedule-date">
                    {new Date(
                      schedule.starts_at
                    ).toLocaleDateString(
                      "vi-VN",
                      {
                        day: "2-digit",
                        month: "2-digit",
                      }
                    )}
                  </div>

                  <div className="content-row-main">
                    <strong>
                      {new Date(
                        schedule.starts_at
                      ).toLocaleString(
                        "vi-VN"
                      )}
                    </strong>

                    <span>
                      Kết thúc{" "}
                      {new Date(
                        schedule.ends_at
                      ).toLocaleTimeString(
                        "vi-VN",
                        {
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}
                    </span>
                  </div>

                  <span className="class-status">
                    {schedule.room_id
                      ? "Có phòng"
                      : "Chưa có phòng"}
                  </span>

                  <ContentActions
                    kind="schedule"
                    id={schedule.id}
                    classId={classData.id}
                    startsAt={schedule.starts_at}
                    endsAt={schedule.ends_at}
                    roomId={schedule.room_id}
                  />
                </div>
              ))
            ) : (
              <div className="class-empty-state">
                Chưa có lịch học nào.
              </div>
            )}
          </div>
        </section>

        <section id="phong-hoc" className="class-section last">
          <div className="class-section-heading">
            <div>
              <span className="section-kicker">LIVE CLASS</span>
              <h2>Phòng học</h2>
              <p>Quản lý các phòng học trực tuyến của lớp.</p>
            </div>

            <CreateRoomModal classId={classData.id} />
          </div>

          <div className="class-list-card">
            {rooms && rooms.length > 0 ? (
              rooms.map((room) => (
                <div className="class-content-row" key={room.id}>
                  <div className="content-row-number room">
                    ●
                  </div>

                  <div className="content-row-main">
                    <strong>{room.name}</strong>
                    <span>Mã phòng: {room.code}</span>
                  </div>

                  <span
                    className={
                      room.status === "live"
                        ? "live-status"
                        : "class-status"
                    }
                  >
                    {room.status === "live"
                      ? "● Đang trực tuyến"
                      : room.status === "ended"
                        ? "Đã kết thúc"
                        : "Sẵn sàng"}
                  </span>

                  {room.status !== "ended" && (
                    <a
                      href={`/teacher/rooms/${room.id}`}
                      className="class-room-enter"
                    >
                      {room.status === "live" ? "Vào phòng" : "Bắt đầu"}
                    </a>
                  )}

                  <RoomActions
                    roomId={room.id}
                    roomName={room.name}
                    status={room.status}
                  />
                </div>
              ))
            ) : (
              <div className="class-empty large">
                Chưa có phòng học nào.
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
