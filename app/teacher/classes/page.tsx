import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BookOpen,
  Plus,
  Users,
  ArrowLeft,
} from "lucide-react";

import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function TeacherClassesPage() {
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

  const { data: classes } = await supabase
    .from("classes")
    .select(`
      id,
      name,
      code,
      description,
      subject_id,
      created_at
    `)
    .eq("teacher_id", auth.profile.id)
    .order("created_at", {
      ascending: false,
    });

  const classList = classes ?? [];
  const classIds = classList.map((item) => item.id);

  let members: {
    class_id: string;
    user_id: string;
  }[] = [];

  if (classIds.length > 0) {
    const { data } = await supabase
      .from("class_members")
      .select("class_id, user_id")
      .in("class_id", classIds);

    members = data ?? [];
  }

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
          <a href="/teacher">
            <span>Trang chủ</span>
          </a>

          <a className="active" href="/teacher/classes">
            <span>Lớp học</span>
          </a>

          <a href="#">
            <span>Học sinh</span>
          </a>

          <a href="#">
            <span>Bài học</span>
          </a>

          <a href="#">
            <span>Bài tập</span>
          </a>

          <a href="#">
            <span>Lịch dạy</span>
          </a>

          <a href="#">
            <span>Phòng học</span>
          </a>

          <a href="#">
            <span>Thông báo</span>
          </a>
        </nav>

        <a
          className="side-nav logout"
          href="/login"
        >
          <span>Đăng xuất</span>
        </a>
      </aside>

      <main className="main">
        <div className="topbar">
          <div>
            <Link
              className="link"
              href="/teacher"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                marginBottom: 10,
              }}
            >
              <ArrowLeft size={16} />
              Dashboard
            </Link>

            <h1>Quản lý lớp học</h1>

            <p>
              Tạo và quản lý các lớp học bạn đang giảng dạy.
            </p>
          </div>

          <Link
            href="/teacher/classes/new"
            className="btn primary"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Plus size={18} />
            Tạo lớp mới
          </Link>
        </div>

        {classList.length === 0 ? (
          <section className="card">
            <div
              style={{
                textAlign: "center",
                padding: "70px 20px",
              }}
            >
              <div
                className="feature-icon"
                style={{
                  margin: "0 auto 18px",
                }}
              >
                <BookOpen size={25} />
              </div>

              <h3>
                Chưa có lớp học
              </h3>

              <p
                style={{
                  color: "#7c8799",
                  marginBottom: 22,
                }}
              >
                Hãy tạo lớp học đầu tiên của bạn.
              </p>

              <Link
                href="/teacher/classes/new"
                className="btn primary"
              >
                <Plus size={17} />
                Tạo lớp mới
              </Link>
            </div>
          </section>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fill,minmax(300px,1fr))",
              gap: 16,
            }}
          >
            {classList.map((item) => {
              const studentCount =
                members.filter(
                  (member) =>
                    member.class_id === item.id
                ).length;

              return (
                <Link
                  href={`/teacher/classes/${item.id}`}
                  className="card"
                  key={item.id}
                  style={{
                    display: "block",
                    transition: "transform .15s ease",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 12,
                    }}
                  >
                    <div className="feature-icon">
                      <BookOpen size={21} />
                    </div>

                    <span className="pill">
                      {item.code}
                    </span>
                  </div>

                  <h3
                    style={{
                      marginTop: 18,
                    }}
                  >
                    {item.name}
                  </h3>

                  <p
                    style={{
                      color: "#7c8799",
                      lineHeight: 1.55,
                      minHeight: 44,
                    }}
                  >
                    {item.description ||
                      "Chưa có mô tả lớp học."}
                  </p>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                      color: "#6c7890",
                      fontSize: 14,
                    }}
                  >
                    <Users size={17} />
                    {studentCount} học sinh
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
