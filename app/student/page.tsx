import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Bell,
  BookOpen,
  CalendarDays,
  Clock3,
  Flame,
  LogOut,
  Target,
  Trophy,
  Video,
} from "lucide-react";

import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function StudentDashboard() {
  const auth = await getCurrentProfile();

  if (!auth) {
    redirect("/login");
  }

  if (auth.profile.role !== "student") {
    if (auth.profile.role === "teacher") {
      redirect("/teacher");
    }

    if (auth.profile.role === "admin") {
      redirect("/admin");
    }

    redirect("/login");
  }

  const supabase = await createClient();
  const studentId = auth.profile.id;

  // --------------------------------------------
  // LỚP HỌC CỦA HỌC SINH
  // --------------------------------------------
  const { data: memberships } = await supabase
    .from("class_members")
    .select("class_id, joined_at")
    .eq("user_id", studentId);

  const classIds = (memberships ?? []).map((item) => item.class_id);

  let classes: any[] = [];

  if (classIds.length > 0) {
    const { data } = await supabase
      .from("classes")
      .select(`
        id,
        name,
        code,
        description,
        subject_id
      `)
      .in("id", classIds)
      .order("name");

    classes = data ?? [];
  }

  // --------------------------------------------
  // BÀI TẬP
  // --------------------------------------------
  let assignments: any[] = [];

  if (classIds.length > 0) {
    const { data } = await supabase
      .from("assignments")
      .select(`
        id,
        class_id,
        title,
        points,
        due_at,
        status
      `)
      .in("class_id", classIds)
      .order("due_at", { ascending: true })
      .limit(10);

    assignments = data ?? [];
  }

  // --------------------------------------------
  // SUBMISSIONS CỦA HỌC SINH
  // --------------------------------------------
  const { data: submissions } = await supabase
    .from("submissions")
    .select(`
      id,
      assignment_id,
      status,
      submitted_at,
      grades (
        score
      )
    `)
    .eq("student_id", studentId);

  const submittedAssignmentIds = new Set(
    (submissions ?? []).map((item) => item.assignment_id)
  );

  const pendingAssignments = assignments.filter(
    (assignment) => !submittedAssignmentIds.has(assignment.id)
  );

  // --------------------------------------------
  // ĐIỂM TRUNG BÌNH
  // --------------------------------------------
  const scores: number[] = [];

  for (const submission of submissions ?? []) {
    const grade = Array.isArray(submission.grades)
      ? submission.grades[0]
      : submission.grades;

    if (grade?.score !== null && grade?.score !== undefined) {
      scores.push(Number(grade.score));
    }
  }

  const averageScore =
    scores.length > 0
      ? (scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(1)
      : "0.0";

  // --------------------------------------------
  // TIẾN ĐỘ HỌC
  // --------------------------------------------
  const { data: studyProgress } = await supabase
    .from("study_progress")
    .select(`
      lesson_id,
      completed_at,
      last_slide_position
    `)
    .eq("student_id", studentId);

  const completedLessons =
    studyProgress?.filter((item) => item.completed_at !== null).length ?? 0;

  const activeLessons = studyProgress?.length ?? 0;

  // --------------------------------------------
  // CHUỖI HỌC TẬP
  // --------------------------------------------
  const { data: streak } = await supabase
    .from("streaks")
    .select(`
      current_streak,
      longest_streak
    `)
    .eq("student_id", studentId)
    .maybeSingle();

  // --------------------------------------------
  // LỊCH HỌC
  // --------------------------------------------
  let schedules: any[] = [];

  if (classIds.length > 0) {
    const { data } = await supabase
      .from("schedules")
      .select(`
        id,
        class_id,
        starts_at,
        ends_at,
        room_id
      `)
      .in("class_id", classIds)
      .gte(
        "starts_at",
        new Date(new Date().setHours(0, 0, 0, 0)).toISOString()
      )
      .lt(
        "starts_at",
        new Date(new Date().setHours(23, 59, 59, 999)).toISOString()
      )
      .order("starts_at", { ascending: true })
      .limit(6);

    schedules = data ?? [];
  }

  // --------------------------------------------
  // DEADLINES
  // --------------------------------------------
  const { data: deadlines } = await supabase
    .from("deadlines")
    .select(`
      id,
      assignment_id,
      due_at,
      reminder_at
    `)
    .eq("user_id", studentId)
    .order("due_at", { ascending: true })
    .limit(6);

  // --------------------------------------------
  // THÔNG BÁO
  // --------------------------------------------
  const { data: notifications } = await supabase
    .from("notifications")
    .select(`
      id,
      title,
      body,
      type,
      is_read,
      created_at
    `)
    .eq("user_id", studentId)
    .order("created_at", { ascending: false })
    .limit(5);

  const classNameById = new Map(
    classes.map((item) => [item.id, item.name])
  );

  const formatTime = (date: string) =>
    new Date(date).toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
    });

  const progressPercent =
    activeLessons > 0
      ? Math.round((completedLessons / activeLessons) * 100)
      : 0;

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <Link className="logo" href="/" aria-label="Study26">
            <img
              src="/images/study26-logo.png"
              alt="Study26"
              className="brand-logo"
            />
          </Link>
          <div className="brand-sub">Học sinh</div>
        </div>

        <nav className="side-nav">
          <a className="active" href="/student">
            <span>Trang chủ</span>
          </a>
          <a href="#classes">
            <span>Lớp học</span>
          </a>
          <a href="#schedule">
            <span>Lịch học</span>
          </a>
          <a href="#lessons">
            <span>Bài học</span>
          </a>
          <a href="#assignments">
            <span>Bài tập</span>
          </a>
          <a href="#notifications">
            <span>Thông báo</span>
          </a>
          <a href="#achievements">
            <span>Thành tích</span>
          </a>
        </nav>

        <a className="side-nav logout" href="/login">
          <LogOut size={18} />
          <span>Đăng xuất</span>
        </a>
      </aside>

      <main className="main">
        <div className="topbar">
          <div>
            <h1>
              Xin chào, {auth.profile.full_name || "Học sinh"} 👋
            </h1>
            <p>
              Chúc bạn có một ngày học tập thật hiệu quả!
            </p>
          </div>

          <div className="user">
            <div className="avatar">
              {(auth.profile.full_name || "H")[0].toUpperCase()}
            </div>

            <div>
              <b>{auth.profile.full_name || "Học sinh"}</b>
              <div className="brand-sub">Học sinh</div>
            </div>

            <Bell size={18} />
          </div>
        </div>

        <section className="stats">
          <div className="stat">
            <div className="stat-icon">
              <BookOpen />
            </div>
            <div>
              <label>Lớp học của bạn</label>
              <strong>{classes.length}</strong>
            </div>
          </div>

          <div className="stat">
            <div className="stat-icon">
              <Target />
            </div>
            <div>
              <label>Bài tập cần làm</label>
              <strong>{pendingAssignments.length}</strong>
            </div>
          </div>

          <div className="stat">
            <div className="stat-icon">
              <Trophy />
            </div>
            <div>
              <label>Điểm trung bình</label>
              <strong>{averageScore}</strong>
            </div>
          </div>

          <div className="stat">
            <div className="stat-icon">
              <Flame />
            </div>
            <div>
              <label>Chuỗi học tập</label>
              <strong>{streak?.current_streak ?? 0}</strong>
            </div>
          </div>
        </section>

        <div className="grid2" id="classes">
          <section className="card">
            <div className="section-title">
              <h3>Lớp học đang tham gia</h3>
              <a className="link" href="#classes">
                Xem tất cả
              </a>
            </div>

            {classes.length === 0 ? (
              <div style={{ color: "#7c8799", padding: "25px 0" }}>
                Bạn chưa tham gia lớp học nào.
              </div>
            ) : (
              <div className="list">
                {classes.slice(0, 5).map((item) => (
                  <div className="list-item" key={item.id}>
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
                        </div>
                      </div>
                    </div>

                    <span className="pill">Đang học</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="card" id="schedule">
            <div className="section-title">
              <h3>Lịch học hôm nay</h3>
              <a className="link" href="#schedule">
                Xem lịch
              </a>
            </div>

            {schedules.length === 0 ? (
              <div style={{ color: "#7c8799", padding: "25px 0" }}>
                Hôm nay chưa có lịch học.
              </div>
            ) : (
              <div className="list">
                {schedules.map((item) => (
                  <div className="list-item" key={item.id}>
                    <div className="list-main">
                      <div className="mini-icon">
                        <CalendarDays size={19} />
                      </div>

                      <div>
                        <b>
                          {formatTime(item.starts_at)} -{" "}
                          {formatTime(item.ends_at)}
                        </b>

                        <div
                          style={{
                            fontSize: 13,
                            color: "#7c8799",
                            marginTop: 4,
                          }}
                        >
                          {classNameById.get(item.class_id) ||
                            "Lớp học"}
                        </div>
                      </div>
                    </div>

                    {item.room_id && (
                      <a className="pill" href="#live">
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

        <div className="grid2">
          <section className="card" id="assignments">
            <div className="section-title">
              <h3>Bài tập cần làm</h3>
              <span className="pill">
                {pendingAssignments.length} bài
              </span>
            </div>

            {pendingAssignments.length === 0 ? (
              <div style={{ color: "#7c8799", padding: "25px 0" }}>
                Tuyệt vời! Bạn không còn bài tập chưa làm.
              </div>
            ) : (
              <div className="list">
                {pendingAssignments.slice(0, 5).map((item) => (
                  <div className="list-item" key={item.id}>
                    <div className="list-main">
                      <div className="mini-icon">
                        <Target size={19} />
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
                          {classNameById.get(item.class_id) ||
                            "Lớp học"}
                          {" • "}
                          Hạn: {formatDate(item.due_at)}
                        </div>
                      </div>
                    </div>

                    <span className="pill">Chưa làm</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="card" id="lessons">
            <div className="section-title">
              <h3>Tiến độ học tập</h3>
              <span className="pill">{progressPercent}%</span>
            </div>

            <div style={{ marginBottom: 12 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 8,
                  fontSize: 14,
                }}
              >
                <span>Hoàn thành bài học</span>
                <b>{progressPercent}%</b>
              </div>

              <div className="progress">
                <span
                  style={{
                    width: `${progressPercent}%`,
                  }}
                />
              </div>
            </div>

            <div className="list">
              <div className="list-item">
                <div className="list-main">
                  <div className="mini-icon">
                    <BookOpen size={18} />
                  </div>
                  <div>
                    <b>Bài học đã hoàn thành</b>
                    <div
                      style={{
                        fontSize: 13,
                        color: "#7c8799",
                        marginTop: 4,
                      }}
                    >
                      Tổng số bài đã hoàn thành
                    </div>
                  </div>
                </div>
                <strong>{completedLessons}</strong>
              </div>

              <div className="list-item">
                <div className="list-main">
                  <div className="mini-icon">
                    <Clock3 size={18} />
                  </div>
                  <div>
                    <b>Bài học đang theo dõi</b>
                    <div
                      style={{
                        fontSize: 13,
                        color: "#7c8799",
                        marginTop: 4,
                      }}
                    >
                      Bài đã bắt đầu học
                    </div>
                  </div>
                </div>
                <strong>{activeLessons}</strong>
              </div>
            </div>
          </section>
        </div>

        <div className="grid2" id="notifications">
          <section className="card">
            <div className="section-title">
              <h3>Deadline</h3>
              <a className="link" href="#assignments">
                Xem bài tập
              </a>
            </div>

            {deadlines?.length ? (
              <div className="list">
                {deadlines.map((item) => (
                  <div className="list-item" key={item.id}>
                    <div className="list-main">
                      <div className="mini-icon">
                        <Clock3 size={18} />
                      </div>
                      <div>
                        <b>Hạn nộp bài tập</b>
                        <div
                          style={{
                            fontSize: 13,
                            color: "#7c8799",
                            marginTop: 4,
                          }}
                        >
                          {formatDate(item.due_at)} •{" "}
                          {formatTime(item.due_at)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: "#7c8799", padding: "20px 0" }}>
                Không có deadline sắp tới.
              </div>
            )}
          </section>

          <section className="card">
            <div className="section-title">
              <h3>Thông báo mới</h3>
              <a className="link" href="#notifications">
                Xem tất cả
              </a>
            </div>

            {notifications?.length ? (
              <div className="list">
                {notifications.map((item) => (
                  <div className="list-item" key={item.id}>
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
                      <span className="pill">Mới</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: "#7c8799", padding: "20px 0" }}>
                Chưa có thông báo mới.
              </div>
            )}
          </section>
        </div>

        <section className="card" id="achievements" style={{ marginTop: 16 }}>
          <div className="section-title">
            <h3>Thành tích học tập</h3>
            <span className="pill">
              Kỷ lục: {streak?.longest_streak ?? 0} ngày
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 15,
            }}
          >
            <div className="feature">
              <div className="feature-icon">
                <Flame size={21} />
              </div>
              <h3>{streak?.current_streak ?? 0} ngày</h3>
              <p>Chuỗi học tập hiện tại</p>
            </div>

            <div className="feature">
              <div className="feature-icon">
                <BookOpen size={21} />
              </div>
              <h3>{completedLessons}</h3>
              <p>Bài học đã hoàn thành</p>
            </div>

            <div className="feature">
              <div className="feature-icon">
                <Trophy size={21} />
              </div>
              <h3>{averageScore}</h3>
              <p>Điểm trung bình</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
