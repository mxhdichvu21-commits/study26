import Link from "next/link";
import { redirect, notFound } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import GradeSubmission from "@/components/teacher/grade-submission";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

type SubmissionRow = {
  id: string;
  assignment_id: string;
  student_id: string;
  status: string;
  submitted_at: string | null;
};

type GradeRow = {
  id: string;
  submission_id: string;
  score: number | null;
  feedback: string | null;
  graded_at: string | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
};

type AttachmentRow = {
  id: string;
  submission_id: string;
  storage_path: string;
  file_name: string;
  mime_type: string | null;
  file_size: number | null;
  created_at: string;
};

type AttachmentView = AttachmentRow & {
  signed_url: string | null;
};

const BUCKET = "materials";
const SIGNED_URL_EXPIRES = 60 * 10;

function formatFileSize(size: number | null) {
  if (!size || size <= 0) return "";

  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  if (size < 1024 * 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export default async function TeacherAssignmentPage({
  params,
}: PageProps) {
  const { id } = await params;

  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("id, role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (
    !profile ||
    profile.role !== "teacher" ||
    profile.is_active === false
  ) {
    redirect("/teacher");
  }

  const { data: assignment, error: assignmentError } =
    await admin
      .from("assignments")
      .select(
        "id, class_id, title, description, points, due_at, status, created_at"
      )
      .eq("id", id)
      .maybeSingle();

  if (assignmentError || !assignment) {
    notFound();
  }

  const { data: classRow, error: classError } = await admin
    .from("classes")
    .select("id, name, code, teacher_id, subject_id")
    .eq("id", assignment.class_id)
    .eq("teacher_id", user.id)
    .maybeSingle();

  if (classError || !classRow) {
    redirect("/teacher/classes");
  }

  const { data: submissionsData, error: submissionsError } =
    await admin
      .from("submissions")
      .select(
        "id, assignment_id, student_id, status, submitted_at"
      )
      .eq("assignment_id", id)
      .order("submitted_at", {
        ascending: false,
        nullsFirst: false,
      });

  if (submissionsError) {
    throw new Error(submissionsError.message);
  }

  const submissions =
    (submissionsData || []) as SubmissionRow[];

  const studentIds = [
    ...new Set(
      submissions
        .map((item) => item.student_id)
        .filter(Boolean)
    ),
  ];

  const { data: profilesData } = studentIds.length
    ? await admin
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", studentIds)
    : { data: [] as ProfileRow[] };

  const profiles =
    (profilesData || []) as ProfileRow[];

  const profileMap = new Map(
    profiles.map((item) => [item.id, item])
  );

  const submissionIds = submissions.map(
    (item) => item.id
  );

  const { data: gradesData } = submissionIds.length
    ? await admin
        .from("grades")
        .select(
          "id, submission_id, score, feedback, graded_at"
        )
        .in("submission_id", submissionIds)
    : { data: [] as GradeRow[] };

  const grades =
    (gradesData || []) as GradeRow[];

  const gradeMap = new Map(
    grades.map((item) => [
      item.submission_id,
      item,
    ])
  );

  /*
   * LẤY FILE BÀI LÀM TỪ submission_attachments
   * thay vì submissions.attachment_path
   */
  const { data: attachmentsData, error: attachmentsError } =
    submissionIds.length
      ? await admin
          .from("submission_attachments")
          .select(
            "id, submission_id, storage_path, file_name, mime_type, file_size, created_at"
          )
          .in("submission_id", submissionIds)
          .order("created_at", {
            ascending: true,
          })
      : {
          data: [] as AttachmentRow[],
          error: null,
        };

  if (attachmentsError) {
    throw new Error(attachmentsError.message);
  }

  const attachments =
    (attachmentsData || []) as AttachmentRow[];

  /*
   * TẠO SIGNED URL CHO TỪNG FILE
   */
  const attachmentViews: AttachmentView[] =
    await Promise.all(
      attachments.map(async (attachment) => {
        const { data: signed, error } =
          await admin.storage
            .from(BUCKET)
            .createSignedUrl(
              attachment.storage_path,
              SIGNED_URL_EXPIRES,
              {
                download: attachment.file_name,
              }
            );

        if (error) {
          console.error(
            "CREATE SUBMISSION SIGNED URL ERROR:",
            error
          );
        }

        return {
          ...attachment,
          signed_url: signed?.signedUrl ?? null,
        };
      })
    );

  const attachmentMap = new Map<
    string,
    AttachmentView[]
  >();

  for (const attachment of attachmentViews) {
    const current =
      attachmentMap.get(
        attachment.submission_id
      ) || [];

    current.push(attachment);

    attachmentMap.set(
      attachment.submission_id,
      current
    );
  }

  const submittedCount = submissions.length;

  const gradedCount = submissions.filter(
    (submission) =>
      submission.status === "graded" ||
      gradeMap.has(submission.id)
  ).length;

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <Link
          href={`/teacher/classes/${classRow.id}`}
          className="mb-5 inline-flex text-sm font-medium text-blue-600 hover:underline"
        >
          ← Quay lại lớp
        </Link>

        <section className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              Bài tập
            </span>

            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {classRow.name}
            </span>
          </div>

          <h1 className="text-2xl font-bold text-slate-900">
            {assignment.title}
          </h1>

          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-600">
            {assignment.description ||
              "Không có mô tả cho bài tập này."}
          </p>

          <div className="mt-5 flex flex-wrap gap-3 text-sm">
            <div className="rounded-xl bg-slate-50 px-4 py-2">
              Điểm tối đa:{" "}
              <strong>
                {assignment.points ?? 0}
              </strong>
            </div>

            <div className="rounded-xl bg-slate-50 px-4 py-2">
              Đã nộp:{" "}
              <strong>{submittedCount}</strong>
            </div>

            <div className="rounded-xl bg-slate-50 px-4 py-2">
              Đã chấm:{" "}
              <strong>{gradedCount}</strong>
            </div>

            {assignment.due_at && (
              <div className="rounded-xl bg-slate-50 px-4 py-2">
                Hạn:{" "}
                <strong>
                  {new Date(
                    assignment.due_at
                  ).toLocaleString("vi-VN")}
                </strong>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-slate-900">
              Bài nộp của học sinh
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Xem file bài làm, thời gian nộp và chấm điểm trực tiếp tại đây.
            </p>
          </div>

          {submissions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
              <div className="text-lg font-semibold text-slate-700">
                Chưa có bài nộp
              </div>

              <p className="mt-1 text-sm text-slate-500">
                Khi học sinh nộp bài, dữ liệu sẽ xuất hiện ở đây.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {submissions.map((submission) => {
                const student =
                  profileMap.get(
                    submission.student_id
                  );

                const grade =
                  gradeMap.get(
                    submission.id
                  );

                const studentAttachments =
                  attachmentMap.get(
                    submission.id
                  ) || [];

                const submittedAt =
                  submission.submitted_at
                    ? new Date(
                        submission.submitted_at
                      ).toLocaleString("vi-VN")
                    : "Chưa có thời gian";

                const isGraded =
                  submission.status ===
                    "graded" ||
                  Boolean(grade);

                return (
                  <article
                    key={submission.id}
                    className="rounded-2xl border border-slate-200 p-5"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-bold text-slate-900">
                            {student?.full_name ||
                              "Học sinh"}
                          </h3>

                          <span
                            className={
                              isGraded
                                ? "rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"
                                : "rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700"
                            }
                          >
                            {isGraded
                              ? "Đã chấm"
                              : "Chờ chấm"}
                          </span>
                        </div>

                        <div className="mt-1 text-xs text-slate-500">
                          Nộp lúc: {submittedAt}
                        </div>
                      </div>

                      {grade && (
                        <div className="rounded-xl bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
                          {grade.score} /{" "}
                          {assignment.points ?? 0}
                        </div>
                      )}
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div className="rounded-xl bg-slate-50 p-4">
                        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                          File bài làm
                        </div>

                        {studentAttachments.length === 0 ? (
                          <div className="text-sm text-slate-500">
                            Học sinh không đính kèm file.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {studentAttachments.map(
                              (file) => (
                                <div
                                  key={file.id}
                                  className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
                                >
                                  <div className="min-w-0">
                                    <div className="truncate text-sm font-semibold text-slate-800">
                                      {file.file_name}
                                    </div>

                                    <div className="mt-1 text-xs text-slate-400">
                                      {file.mime_type ||
                                        "Không rõ định dạng"}

                                      {file.file_size
                                        ? ` • ${formatFileSize(
                                            file.file_size
                                          )}`
                                        : ""}
                                    </div>
                                  </div>

                                  {file.signed_url ? (
                                    <a
                                      href={
                                        file.signed_url
                                      }
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex shrink-0 items-center justify-center rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                                    >
                                      Mở / Tải xuống
                                    </a>
                                  ) : (
                                    <span className="shrink-0 text-xs font-medium text-red-500">
                                      Không tạo được link
                                    </span>
                                  )}
                                </div>
                              )
                            )}
                          </div>
                        )}
                      </div>

                      <div className="rounded-xl bg-slate-50 p-4">
                        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Trạng thái
                        </div>

                        <div className="text-sm font-medium text-slate-700">
                          {submission.status}
                        </div>

                        <div className="mt-3 text-xs text-slate-500">
                          {studentAttachments.length} file đã nộp
                        </div>
                      </div>
                    </div>

                    <GradeSubmission
                      submissionId={submission.id}
                      maxPoints={Number(
                        assignment.points ?? 0
                      )}
                      currentScore={
                        grade?.score ?? null
                      }
                      currentFeedback={
                        grade?.feedback ?? null
                      }
                    />
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
