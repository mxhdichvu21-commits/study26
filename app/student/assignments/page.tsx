import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function StudentAssignmentsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: memberships } = await supabase
    .from("class_members")
    .select("class_id")
    .eq("user_id", user.id);

  const classIds =
    memberships?.map((item) => item.class_id) ?? [];

  let assignments: any[] = [];

  if (classIds.length > 0) {
    const { data } = await supabase
      .from("assignments")
      .select(`
        id,
        class_id,
        title,
        description,
        points,
        due_at,
        status,
        created_at,
        classes (
          id,
          name,
          code
        )
      `)
      .in("class_id", classIds)
      .order("created_at", {
        ascending: false,
      });

    assignments = data ?? [];
  }

  const assignmentIds =
    assignments.map((item) => item.id);

  let submissions: any[] = [];

  if (assignmentIds.length > 0) {
    const { data } = await supabase
      .from("submissions")
      .select(
        "id, assignment_id, student_id, status, submitted_at"
      )
      .eq("student_id", user.id)
      .in("assignment_id", assignmentIds);

    submissions = data ?? [];
  }

  const submissionMap = new Map(
    submissions.map((item) => [
      item.assignment_id,
      item,
    ])
  );

  return (
    <main className="student-page-simple">
      <div className="student-page-header">
        <div>
          <span className="section-kicker">
            ASSIGNMENTS
          </span>

          <h1>Bài tập</h1>

          <p>
            Bài tập từ các lớp bạn đang tham gia.
          </p>
        </div>
      </div>

      <div className="student-assignment-page-list">
        {assignments.length === 0 ? (
          <div className="class-card student-empty-page">
            <h2>Chưa có bài tập</h2>
            <p>
              Khi giáo viên giao bài, bài tập sẽ xuất hiện ở đây.
            </p>
          </div>
        ) : (
          assignments.map((assignment) => {
            const classInfo = Array.isArray(
              assignment.classes
            )
              ? assignment.classes[0]
              : assignment.classes;

            const submission =
              submissionMap.get(
                assignment.id
              );

            const isOverdue =
              assignment.due_at &&
              new Date(assignment.due_at) <
                new Date();

            return (
              <Link
                href={`/student/assignments/${assignment.id}`}
                className="student-assignment-card"
                key={assignment.id}
              >
                <div className="student-assignment-main">
                  <span className="student-class-subject">
                    {classInfo?.name ||
                      "Lớp học"}
                  </span>

                  <h2>{assignment.title}</h2>

                  <p>
                    {assignment.description ||
                      "Không có mô tả."}
                  </p>
                </div>

                <div className="student-assignment-meta">
                  <strong>
                    {assignment.points ?? 0} điểm
                  </strong>

                  <span>
                    {assignment.due_at
                      ? `${isOverdue ? "Quá hạn" : "Hạn"}: ${new Date(
                          assignment.due_at
                        ).toLocaleString("vi-VN")}`
                      : "Không có hạn nộp"}
                  </span>

                  <span
                    className={
                      submission
                        ? "online-status"
                        : "class-status"
                    }
                  >
                    {submission
                      ? submission.status
                      : "Chưa nộp"}
                  </span>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </main>
  );
}
