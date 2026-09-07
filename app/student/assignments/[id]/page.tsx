import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AssignmentSubmitForm from "@/components/student/assignment-submit-form";

type PageProps = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";

export default async function StudentAssignmentDetail({
  params,
}: PageProps) {
  const { id } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: assignment } =
    await supabase
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
      .eq("id", id)
      .maybeSingle();

  if (!assignment) notFound();

  const { data: recipient } =
    await supabase
      .from("assignment_recipients")
      .select(
        "assignment_id, student_id"
      )
      .eq("assignment_id", id)
      .eq("student_id", user.id)
      .maybeSingle();

  if (!recipient) notFound();

  const { data: submission } =
    await supabase
      .from("submissions")
      .select(
        "id, status, submitted_at"
      )
      .eq("assignment_id", id)
      .eq("student_id", user.id)
      .maybeSingle();

  const { data: attachments } =
    await supabase
      .from("assignment_attachments")
      .select(`
        id,
        file_name,
        mime_type,
        file_size
      `)
      .eq(
        "assignment_id",
        id
      )
      .order("created_at", {
        ascending: true,
      });

  const grade = submission
    ? (
        await supabase
          .from("grades")
          .select(
            "id, score, feedback, graded_at"
          )
          .eq(
            "submission_id",
            submission.id
          )
          .maybeSingle()
      ).data
    : null;

  const isLate =
    !!assignment.due_at &&
    new Date(
      assignment.due_at
    ).getTime() < Date.now();

  const classInfo = Array.isArray(
    assignment.classes
  )
    ? assignment.classes[0]
    : assignment.classes;

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-5xl">
        <Link
          href={`/student/classes/${assignment.class_id}`}
          className="mb-5 inline-flex text-sm font-medium text-blue-600 hover:underline"
        >
          ← Quay lại lớp
        </Link>

        <section className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              Bài tập
            </span>

            {submission?.status && (
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                {submission.status}
              </span>
            )}

            {isLate &&
              !submission?.submitted_at && (
                <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                  Đã quá hạn
                </span>
              )}
          </div>

          <h1 className="text-2xl font-bold text-slate-900">
            {assignment.title}
          </h1>

          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500">
            <span>
              Lớp:{" "}
              {classInfo?.name ||
                "Lớp học"}
            </span>

            <span>
              Điểm tối đa:{" "}
              {assignment.points ?? 0}
            </span>

            {assignment.due_at && (
              <span>
                Hạn nộp:{" "}
                {new Date(
                  assignment.due_at
                ).toLocaleString(
                  "vi-VN",
                  {
                    timeZone:
                      "Asia/Ho_Chi_Minh",
                    hour12: false,
                  }
                )}
              </span>
            )}
          </div>
        </section>

        <section className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-lg font-bold text-slate-900">
            Đề bài
          </h2>

          <div className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
            {assignment.description ||
              "Giáo viên chưa thêm mô tả."}
          </div>
        </section>

        <section className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-slate-900">
            Tài liệu của giáo viên
          </h2>

          {!attachments?.length ? (
            <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
              Không có file đính kèm.
            </div>
          ) : (
            <div className="space-y-2">
              {attachments.map(
                (file) => (
                  <div
                    key={file.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4"
                  >
                    <div>
                      <div className="font-semibold text-slate-900">
                        {file.file_name}
                      </div>

                      <div className="mt-1 text-xs text-slate-500">
                        {(
                          Number(
                            file.file_size ||
                              0
                          ) /
                          1024 /
                          1024
                        ).toFixed(2)}
                        MB
                      </div>
                    </div>

                    <a
                      href={`/api/learning/file?kind=assignment&id=${id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700"
                    >
                      Xem / Tải xuống
                    </a>
                  </div>
                )
              )}
            </div>
          )}
        </section>

        {grade && (
          <section className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
            <h2 className="text-lg font-bold text-emerald-900">
              Kết quả
            </h2>

            <div className="mt-3 text-3xl font-bold text-emerald-800">
              {grade.score} /{" "}
              {assignment.points ?? 0}
            </div>

            {grade.feedback && (
              <div className="mt-4">
                <div className="text-sm font-semibold text-emerald-900">
                  Nhận xét của giáo viên
                </div>

                <div className="mt-1 whitespace-pre-wrap text-sm leading-7 text-emerald-800">
                  {grade.feedback}
                </div>
              </div>
            )}

            {grade.graded_at && (
              <div className="mt-3 text-xs text-emerald-700">
                Chấm lúc{" "}
                {new Date(
                  grade.graded_at
                ).toLocaleString(
                  "vi-VN",
                  {
                    timeZone:
                      "Asia/Ho_Chi_Minh",
                    hour12: false,
                  }
                )}
              </div>
            )}
          </section>
        )}

        <AssignmentSubmitForm
          assignmentId={assignment.id}
          existingSubmittedAt={
            submission?.submitted_at
          }
        />
      </div>
    </main>
  );
}
