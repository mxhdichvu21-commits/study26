import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function StudentClassDetailPage({
  params,
}: PageProps) {
  const { id } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (
    !profile ||
    profile.role !== "student" ||
    profile.is_active === false
  ) {
    redirect("/student");
  }

  const { data: member } = await supabase
    .from("class_members")
    .select("class_id, user_id, role")
    .eq("class_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!member || member.role !== "student") {
    notFound();
  }

  const { data: classData, error: classError } = await supabase
    .from("classes")
    .select(`
      id,
      name,
      code,
      description,
      subjects (
        id,
        name,
        code
      )
    `)
    .eq("id", id)
    .maybeSingle();

  if (classError || !classData) {
    notFound();
  }

  const subject = Array.isArray(classData.subjects)
    ? classData.subjects[0]
    : classData.subjects;

  const { data: assignments } = await supabase
    .from("assignments")
    .select(`
      id,
      class_id,
      title,
      description,
      points,
      due_at,
      status,
      created_at
    `)
    .eq("class_id", id)
    .order("created_at", { ascending: false });

  const { data: lessons } = await supabase
    .from("lessons")
    .select(`
      id,
      class_id,
      title,
      description,
      status,
      created_at
    `)
    .eq("class_id", id)
    .order("created_at", { ascending: false });

  const { data: schedules } = await supabase
    .from("schedules")
    .select(`
      id,
      class_id,
      starts_at,
      ends_at,
      room_id
    `)
    .eq("class_id", id)
    .order("starts_at", { ascending: true });

  return (
    <main className="student-page-simple">
      <div className="student-page-header">
        <div>
          <Link
            href="/student/classes"
            className="mb-3 inline-flex text-sm font-medium text-blue-600 hover:underline"
          >
            ← Lớp học
          </Link>

          <span className="section-kicker">CLASSROOM</span>

          <h1>{classData.name}</h1>

          <p>
            {subject?.name || "Chưa có môn học"} · Mã lớp:{" "}
            <strong>{classData.code}</strong>
          </p>

          {classData.description && (
            <p className="mt-2">{classData.description}</p>
          )}
        </div>
      </div>

      <div className="grid gap-6">
        <section className="class-card" id="lessons">
          <div className="class-card-header">
            <div>
              <span className="section-kicker">LESSONS</span>
              <h2>Bài học</h2>
              <p>
                Các bài học được giáo viên giao cho lớp này.
              </p>
            </div>
          </div>

          {!lessons?.length ? (
            <div className="class-empty">
              Chưa có bài học nào.
            </div>
          ) : (
            <div className="space-y-3">
              {lessons.map((lesson) => (
                <Link
                  key={lesson.id}
                  href={`/student/lessons/${lesson.id}`}
                  className="block rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-blue-300 hover:bg-blue-50"
                >
                  <h3 className="font-semibold text-slate-900">
                    {lesson.title}
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    {lesson.description || "Không có mô tả."}
                  </p>

                  <div className="mt-2 text-xs text-slate-400">
                    {new Date(lesson.created_at).toLocaleString("vi-VN", {
                      timeZone: "Asia/Ho_Chi_Minh",
                      hour12: false,
                    })}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="class-card" id="assignments">
          <div className="class-card-header">
            <div>
              <span className="section-kicker">ASSIGNMENTS</span>
              <h2>Bài tập</h2>
              <p>
                Các bài tập của lớp.
              </p>
            </div>
          </div>

          {!assignments?.length ? (
            <div className="class-empty">
              Chưa có bài tập nào.
            </div>
          ) : (
            <div className="space-y-3">
              {assignments.map((assignment) => (
                <Link
                  key={assignment.id}
                  href={`/student/assignments/${assignment.id}`}
                  className="block rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-blue-300 hover:bg-blue-50"
                >
                  <h3 className="font-semibold text-slate-900">
                    {assignment.title}
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    {assignment.description || "Không có mô tả."}
                  </p>

                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-400">
                    <span>
                      {assignment.points ?? 0} điểm
                    </span>

                    <span>
                      {assignment.due_at
                        ? `Hạn: ${new Date(
                            assignment.due_at
                          ).toLocaleString("vi-VN", {
                            timeZone: "Asia/Ho_Chi_Minh",
                            hour12: false,
                          })}`
                        : "Không có hạn nộp"}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="class-card" id="schedule">
          <div className="class-card-header">
            <div>
              <span className="section-kicker">SCHEDULE</span>
              <h2>Lịch học</h2>
            </div>
          </div>

          {!schedules?.length ? (
            <div className="class-empty">
              Chưa có lịch học nào.
            </div>
          ) : (
            <div className="space-y-3">
              {schedules.map((schedule) => (
                <div
                  key={schedule.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4"
                >
                  <div className="font-semibold text-slate-900">
                    {new Date(schedule.starts_at).toLocaleDateString(
                      "vi-VN",
                      {
                        timeZone: "Asia/Ho_Chi_Minh",
                      }
                    )}
                  </div>

                  <div className="mt-1 text-sm text-slate-500">
                    {new Date(schedule.starts_at).toLocaleTimeString(
                      "vi-VN",
                      {
                        timeZone: "Asia/Ho_Chi_Minh",
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    )}{" "}
                    -{" "}
                    {new Date(schedule.ends_at).toLocaleTimeString(
                      "vi-VN",
                      {
                        timeZone: "Asia/Ho_Chi_Minh",
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
