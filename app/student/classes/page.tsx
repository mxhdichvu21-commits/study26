import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function StudentClassesPage() {
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

  if (
    !profile ||
    profile.role !== "student" ||
    !profile.is_active
  ) {
    redirect("/");
  }

  const { data: memberships } = await supabase
    .from("class_members")
    .select("class_id, joined_at")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: false });

  const classIds =
    memberships?.map((item) => item.class_id) ?? [];

  let classes: any[] = [];

  if (classIds.length > 0) {
    const { data } = await supabase
      .from("classes")
      .select(`
        id,
        name,
        code,
        description,
        subject_id,
        teacher_id,
        subjects (
          name,
          code
        ),
        profiles:teacher_id (
          full_name
        )
      `)
      .in("id", classIds);

    classes = data ?? [];
  }

  return (
    <main className="student-page-simple">
      <div className="student-page-header">
        <div>
          <span className="section-kicker">
            MY CLASSES
          </span>

          <h1>Lớp học của tôi</h1>

          <p>
            Các lớp bạn đã tham gia trên Study26.
          </p>
        </div>

        <Link
          href="/student/join-class"
          className="class-primary-button"
        >
          + Tham gia lớp
        </Link>
      </div>

      {classes.length === 0 ? (
        <div className="class-card student-empty-page">
          <h2>Bạn chưa tham gia lớp nào</h2>
          <p>
            Nhập mã lớp giáo viên cung cấp để tham gia.
          </p>

          <Link
            href="/student/join-class"
            className="class-primary-button"
          >
            Nhập mã lớp
          </Link>
        </div>
      ) : (
        <div className="student-class-grid">
          {classes.map((item) => {
            const subject = Array.isArray(item.subjects)
              ? item.subjects[0]
              : item.subjects;

            const teacher = Array.isArray(item.profiles)
              ? item.profiles[0]
              : item.profiles;

            return (
              <Link
                href={`/student/classes/${item.id}`}
                className="student-class-card"
                key={item.id}
              >
                <div className="student-class-icon">
                  {item.name
                    ?.charAt(0)
                    ?.toUpperCase() || "S"}
                </div>

                <div>
                  <span className="student-class-subject">
                    {subject?.name ||
                      "Chưa có môn học"}
                  </span>

                  <h2>{item.name}</h2>

                  <p>
                    {item.code}
                    {" • "}
                    {teacher?.full_name ||
                      "Giáo viên"}
                  </p>
                </div>

                <span className="student-class-arrow">
                  →
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
