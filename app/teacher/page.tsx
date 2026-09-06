import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Bell,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  LogOut,
  Users,
  Video,
} from "lucide-react";

import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type ClassRow = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  subject_id: string | null;
  created_at: string;
};

type AssignmentRow = {
  id: string;
  class_id: string;
  title: string;
  points: number | string;
  due_at: string;
  status: string;
};

type SubmissionRow = {
  id: string;
  assignment_id: string | null;
  student_id: string | null;
  status: string;
  submitted_at: string | null;
};

type ScheduleRow = {
  id: string;
  class_id: string | null;
  room_id: string | null;
  starts_at: string;
  ends_at: string;
};

type RoomRow = {
  id: string;
  class_id: string;
  name: string;
  code: string;
  status: string;
  scheduled_at: string | null;
};

type NotificationRow = {
  id: string;
  title: string;
  body: string;
  type: string;
  is_read: boolean;
  created_at: string;
};

export default async function TeacherDashboard() {
  const auth = await getCurrentProfile();

  if (!auth) {
    redirect("/login");
  }

  if (auth.profile.role !== "teacher") {
    if (auth.profile.role === "admin") {
      redirect("/admin");
    }

    redirect("/student");
  }

  if (!auth.profile.is_active) {
    redirect("/login");
  }

  const supabase = await createClient();
  const teacherId = auth.profile.id;

  // =====================================================
  // LỚP GIÁO VIÊN ĐANG PHỤ TRÁCH
  // =====================================================

  const { data: classData } = await supabase
    .from("classes")
    .select(
      "id, name, code, description, subject_id, created_at"
    )
    .eq("teacher_id", teacherId)
    .order("created_at", { ascending: false });

  const classes = (classData ?? []) as ClassRow[];
  const classIds = classes.map((item) => item.id);

  // =====================================================
  // HỌC SINH
  // =====================================================

  let memberRows: Array<{
    class_id: string;
    user_id: string;
  }> = [];

  if (classIds.length > 0) {
    const { data } = await supabase
      .from("class_members")
      .select("class_id, user_id")
      .in("class_id", classIds);

    memberRows = (data ?? []) as Array<{
      class_id: string;
      user_id: string;
    }>;
  }

  const uniqueStudents = new Set(
    memberRows.map((item) => item.user_id)
  );

  // =====================================================
  // BÀI TẬP GIÁO VIÊN TẠO
  // =====================================================

  const { data: assignmentData } = await supabase
    .from("assignments")
    .select(
      "id, class_id, title, points, due_at, status"
    )
    .eq("created_by", teacherId)
    .order("due_at", { ascending: true })
    .limit(20);

  const assignments =
    (assignmentData ?? []) as AssignmentRow[];

  // =====================================================
  // BÀI HỌC
  // =====================================================

  let lessonCount = 0;

  if (classIds.length > 0) {
    const { count } = await supabase
      .from("lessons")
      .select("id", { count: "exact", head: true })
      .in("class_id", classIds);

    lessonCount = count ?? 0;
  }

  // =====================================================
  // BÀI ĐÃ NỘP / CẦN CHẤM
  // =====================================================

  const assignmentIds = assignments.map((item) => item.id);

  let submissions: SubmissionRow[] = [];

  if (assignmentIds.length > 0) {
    const { data } = await supabase
      .from("submissions")
      .select(
        "id, assignment_id, student_id, status, submitted_at"
      )
      .in("assignment_id", assignmentIds)
      .order("submitted_at", { ascending: false });

    submissions = (data ?? []) as SubmissionRow[];
  }

  const gradedStatuses = new Set([
    "graded",
    "GRaded",
    "GRADED",
  ]);

  const pendingGrading = submissions.filter(
    (item) => !gradedStatuses.has(item.status)
  );

  // =====================================================
  // LỊCH DẠY HÔM NAY
  // =====================================================

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  let schedules: ScheduleRow[] = [];

  const { data: scheduleData } = await supabase
    .from("schedules")
    .select(
      "id, class_id, room_id, starts_at, ends_at"
    )
    .eq("teacher_id", teacherId)
    .gte("starts_at", startOfDay.toISOString())
    .lte("starts_at", endOfDay.toISOString())
    .order("starts_at", { ascending: true })
    .limit(10);

  schedules = (scheduleData ?? []) as ScheduleRow[];

  // =====================================================
  // PHÒNG HỌC
  // =====================================================

  const { data: roomData } = await supabase
    .from("rooms")
    .select(
      "id, class_id, name, code, status, scheduled_at"
    )
    .eq("teacher_id", teacherId)
    .order("created_at", { ascending: false })
    .limit(10);

  const rooms = (roomData ?? []) as RoomRow[];

  // =====================================================
  // THÔNG BÁO
  // =====================================================

  const { data: notificationData } = await supabase
    .from("notifications")
    .select(
      "id, title, body, type, is_read, created_at"
    )
    .eq("user_id", teacherId)
    .order("created_at", { ascending: false })
    .limit(5);

  const notifications =
    (notificationData ?? []) as NotificationRow[];

  // =====================================================
  // MAP
  // =====================================================

  const classNameById = new Map(
    classes.map((item) => [item.id, item.name])
  );

  const formatTime = (value: string) =>
    new Date(value).toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
    });

  const teacherName =
    auth.profile.full_name || "Giáo viên";

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <Link
            className="logo"
            href="/"
            aria-label="Study26"
          >
            <img
              src="/images/study26-logo.png"
              alt="Study26"
              className="brand-logo"
            />
          </Link>

          <div className="brand-sub">
            Giáo viên
          </div>
        </div>

        <nav className="side-nav">
          <a className="active" href="/teacher">
            <span>Trang chủ</span>
          </a>

          <a href="/teacher/classes">
            <span>Lớp học</span>
          </a>

          <a href="#students">
            <span>Học sinh</span>
          </a>

          <a href="#lessons">
            <span>Bài học</span>
          </a>

          <a href="#assignments">
            <span>Bài tập</span>
          </a>

          <a href="#schedule">
            <span>Lịch dạy</span>
          </a>

          <a href="#rooms">
            <span>Phòng học</span>
          </a>

          <a href="#notifications">
            <span>Thông báo</span>
          </a>
        </nav>

        <a className="side-nav logout" href="/login">
          <LogOut size={18} />
          <span>Đăng xuất</span>
        </a>
      </aside>

      <main className="main">
        {/* HEADER */}
        <div className="topbar">
          <div>
            <h1>
              Xin chào, {teacherName} 👋
            </h1>

            <p>
              Quản lý lớp học và theo dõi học sinh của bạn.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Link
              href="/teacher/classes/new"
              className="btn primary"
            >
              + Tạo lớp mới
            </Link>

            <a
              href="/profile"
              className="user"
              style={{
                cursor: "pointer",
                textDecoration: "none",
              }}
            >
              <div className="avatar" style={{ overflow: "hidden" }}>
                {auth.profile.avatar_url ? (
                  <img
                    src={auth.profile.avatar_url}
                    alt="Ảnh đại diện"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      borderRadius: "50%",
                    }}
                  />
                ) : (
                  teacherName[0].toUpperCase()
                )}
              </div>

              <div>
                <b>{teacherName}</b>
                <div className="brand-sub">Giáo viên</div>
              </div>

              <span
                style={{
                  marginLeft: 4,
                  fontSize: 12,
                  color: "#64748b",
                }}
              >
                ▾
              </span>
            </a>
          </div>
        </div>

        <section className="stats">
          <div className="stat">
            <div className="stat-icon">
              <BookOpen />
            </div>

            <div>
              <label>Tổng số lớp</label>
              <strong>{classes.length}</strong>
            </div>
          </div>

          <div className="stat">
            <div className="stat-icon">
              <Users />
            </div>

            <div>
              <label>Tổng học sinh</label>
              <strong>{uniqueStudents.size}</strong>
            </div>
          </div>

          <div className="stat">
            <div className="stat-icon">
              <CalendarDays />
            </div>

            <div>
              <label>Lịch học hôm nay</label>
              <strong>{schedules.length}</strong>
            </div>
          </div>

          <div className="stat">
            <div className="stat-icon">
              <FileText />
            </div>

            <div>
              <label>Bài cần chấm</label>
              <strong>{pendingGrading.length}</strong>
            </div>
          </div>
        </section>

        {/* CLASSES + SCHEDULE */}
        <div className="grid2">
          <section className="card" id="classes">
            <div className="section-title">
              <h3>Lớp học đang quản lý</h3>

              <a className="link" href="#classes">
                Xem tất cả
              </a>
            </div>

            {classes.length === 0 ? (
              <div
                style={{
                  color: "#7c8799",
                  padding: "25px 0",
                }}
              >
                Bạn chưa được phân công lớp học nào.
              </div>
            ) : (
              <div className="list">
                {classes.slice(0, 6).map((item) => {
                  const studentsInClass =
                    memberRows.filter(
                      (member) =>
                        member.class_id === item.id
                    ).length;

                  return (
                    <div
                      className="list-item"
                      key={item.id}
                    >
                      <div className="list-main">
                        <div className="mini-icon">
                          <BookOpen size={19} />
                        </div>

                        <div>
                          <b>{item.name}</b>

                          <div
                            style={{
                              fontSize: 13,
                              color: "#7c8799",
                              marginTop: 4,
                            }}
                          >
                            Mã lớp: {item.code}
                            {" • "}
                            {studentsInClass} học sinh
                          </div>
                        </div>
                      </div>

                      <span className="pill">
                        Đang hoạt động
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section
            className="card"
            id="schedule"
          >
            <div className="section-title">
              <h3>Lịch dạy hôm nay</h3>

              <a className="link" href="#schedule">
                Xem lịch
              </a>
            </div>

            {schedules.length === 0 ? (
              <div
                style={{
                  color: "#7c8799",
                  padding: "25px 0",
                }}
              >
                Hôm nay chưa có lịch dạy.
              </div>
            ) : (
              <div className="list">
                {schedules.map((item) => (
                  <div
                    className="list-item"
                    key={item.id}
                  >
                    <div className="list-main">
                      <div className="mini-icon">
                        <CalendarDays size={19} />
                      </div>

                      <div>
                        <b>
                          {formatTime(
                            item.starts_at
                          )}{" "}
                          -{" "}
                          {formatTime(item.ends_at)}
                        </b>

                        <div
                          style={{
                            fontSize: 13,
                            color: "#7c8799",
                            marginTop: 4,
                          }}
                        >
                          {item.class_id
                            ? classNameById.get(
                                item.class_id
                              ) || "Lớp học"
                            : "Lớp học"}
                        </div>
                      </div>
                    </div>

                    {item.room_id && (
                      <a
                        className="pill"
                        href="#rooms"
                      >
                        <Video size={14} />
                        Vào phòng
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* STUDENTS + ASSIGNMENTS */}
        <div className="grid2">
          <section
            className="card"
            id="students"
          >
            <div className="section-title">
              <h3>Học sinh</h3>

              <span className="pill">
                {uniqueStudents.size} học sinh
              </span>
            </div>

            {classes.length === 0 ? (
              <div
                style={{
                  color: "#7c8799",
                  padding: "20px 0",
                }}
              >
                Chưa có dữ liệu học sinh.
              </div>
            ) : (
              <div className="list">
                {classes.slice(0, 5).map((item) => {
                  const count =
                    memberRows.filter(
                      (member) =>
                        member.class_id === item.id
                    ).length;

                  return (
                    <div
                      className="list-item"
                      key={item.id}
                    >
                      <div className="list-main">
                        <div className="mini-icon">
                          <Users size={18} />
                        </div>

                        <div>
                          <b>{item.name}</b>

                          <div
                            style={{
                              fontSize: 13,
                              color: "#7c8799",
                              marginTop: 4,
                            }}
                          >
                            {count} học sinh
                          </div>
                        </div>
                      </div>

                      <strong>{count}</strong>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section
            className="card"
            id="assignments"
          >
            <div className="section-title">
              <h3>Bài tập cần chấm</h3>

              <span className="pill">
                {pendingGrading.length} bài nộp
              </span>
            </div>

            {pendingGrading.length === 0 ? (
              <div
                style={{
                  color: "#7c8799",
                  padding: "20px 0",
                }}
              >
                Hiện không có bài cần chấm.
              </div>
            ) : (
              <div className="list">
                {pendingGrading
                  .slice(0, 6)
                  .map((submission) => {
                    const assignment =
                      assignments.find(
                        (item) =>
                          item.id ===
                          submission.assignment_id
                      );

                    return (
                      <div
                        className="list-item"
                        key={submission.id}
                      >
                        <div className="list-main">
                          <div className="mini-icon">
                            <FileText size={18} />
                          </div>

                          <div>
                            <b>
                              {assignment?.title ||
                                "Bài tập"}
                            </b>

                            <div
                              style={{
                                fontSize: 13,
                                color: "#7c8799",
                                marginTop: 4,
                              }}
                            >
                              {assignment?.class_id
                                ? classNameById.get(
                                    assignment.class_id
                                  ) || "Lớp học"
                                : "Lớp học"}
                              {" • "}
                              {submission.submitted_at
                                ? formatDate(
                                    submission.submitted_at
                                  )
                                : "Chưa rõ ngày nộp"}
                            </div>
                          </div>
                        </div>

                        <span
                          className="pill"
                          style={{
                            background: "#fff7e6",
                            color: "#b7791f",
                          }}
                        >
                          Chờ chấm
                        </span>
                      </div>
                    );
                  })}
              </div>
            )}
          </section>
        </div>

        {/* CONTENT + ROOMS */}
        <div className="grid2">
          <section
            className="card"
            id="lessons"
          >
            <div className="section-title">
              <h3>Nội dung giảng dạy</h3>

              <span className="pill">
                {lessonCount} bài học
              </span>
            </div>

            <div className="list">
              <div className="list-item">
                <div className="list-main">
                  <div className="mini-icon">
                    <BookOpen size={18} />
                  </div>

                  <div>
                    <b>Tổng bài học</b>

                    <div
                      style={{
                        fontSize: 13,
                        color: "#7c8799",
                        marginTop: 4,
                      }}
                    >
                      Tổng số bài học trong các lớp
                      của bạn
                    </div>
                  </div>
                </div>

                <strong>{lessonCount}</strong>
              </div>

              <div className="list-item">
                <div className="list-main">
                  <div className="mini-icon">
                    <CheckCircle2 size={18} />
                  </div>

                  <div>
                    <b>Bài tập đã giao</b>

                    <div
                      style={{
                        fontSize: 13,
                        color: "#7c8799",
                        marginTop: 4,
                      }}
                    >
                      Tổng số bài tập bạn đã tạo
                    </div>
                  </div>
                </div>

                <strong>{assignments.length}</strong>
              </div>
            </div>
          </section>

          <section
            className="card"
            id="rooms"
          >
            <div className="section-title">
              <h3>Phòng học trực tuyến</h3>

              <a className="link" href="#rooms">
                Quản lý phòng
              </a>
            </div>

            {rooms.length === 0 ? (
              <div
                style={{
                  color: "#7c8799",
                  padding: "20px 0",
                }}
              >
                Bạn chưa có phòng học nào.
              </div>
            ) : (
              <div className="list">
                {rooms.slice(0, 5).map((room) => (
                  <div
                    className="list-item"
                    key={room.id}
                  >
                    <div className="list-main">
                      <div className="mini-icon">
                        <Video size={18} />
                      </div>

                      <div>
                        <b>{room.name}</b>

                        <div
                          style={{
                            fontSize: 13,
                            color: "#7c8799",
                            marginTop: 4,
                          }}
                        >
                          {classNameById.get(
                            room.class_id
                          ) || "Lớp học"}
                          {" • "}
                          Mã: {room.code}
                        </div>
                      </div>
                    </div>

                    <span className="pill">
                      {room.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* NOTIFICATIONS */}
        <section
          className="card"
          id="notifications"
          style={{ marginTop: 16 }}
        >
          <div className="section-title">
            <h3>Thông báo mới</h3>

            <Bell size={20} />
          </div>

          {notifications.length === 0 ? (
            <div
              style={{
                color: "#7c8799",
                padding: "20px 0",
              }}
            >
              Chưa có thông báo mới.
            </div>
          ) : (
            <div className="list">
              {notifications.map((item) => (
                <div
                  className="list-item"
                  key={item.id}
                >
                  <div className="list-main">
                    <div className="mini-icon">
                      <Bell size={18} />
                    </div>

                    <div>
                      <b>{item.title}</b>

                      <div
                        style={{
                          fontSize: 13,
                          color: "#7c8799",
                          marginTop: 4,
                        }}
                      >
                        {item.body}
                      </div>
                    </div>
                  </div>

                  {!item.is_read && (
                    <span className="pill">
                      Mới
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
