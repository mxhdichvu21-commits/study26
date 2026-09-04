import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import AssignmentSubmitForm from "@/components/student/assignment-submit-form";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function StudentAssignmentDetail({
  params,
}: PageProps) {
  const { id } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, full_name, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (
    !profile ||
    profile.role !== "student" ||
    profile.is_active === false
  ) {
    redirect("/student");
  }

  const { data: assignment, error } = await supabase
    .from("assignments")
    .select(
      `
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
      `
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !assignment) {
    notFound();
  }

  const { data: member } = await supabase
    .from("class_members")
    .select("class_id, user_id, role")
    .eq("class_id", assignment.class_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!member || member.role !== "student") {
    redirect("/student/assignments");
  }

  const { data: submission } = await supabase
    .from("submissions")
    .select(
      "id, status, submitted_at, attachment_path"
    )
    .eq("assignment_id", id)
    .eq("student_id", user.id)
    .maybeSingle();

  const isLate =
    Boolean(assignment.due_at) &&
    new Date(assignment.due_at as string).getTime() <
      Date.now();

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/student/assignments"
          className="mb-5 inline-flex text-sm font-medium text-blue-600 hover:underline"
        >
          ← Quay lại bài tập
        </Link>

        <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              Bài tập
            </span>

            {submission?.status && (
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                Đã nộp
              </span>
            )}

            {isLate && !submission?.submitted_at && (
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
              {Array.isArray(assignment.classes)
                ? (assignment.classes[0] as { name?: string } | undefined)?.name
                : (assignment.classes as { name?: string } | null)?.name}
            </span>

            <span>
              Điểm tối đa: {assignment.points ?? 0}
            </span>

            {assignment.due_at && (
              <span>
                Hạn nộp:{" "}
                {new Date(
                  assignment.due_at
                ).toLocaleString("vi-VN")}
              </span>
            )}
          </div>
        </div>

        <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-lg font-bold text-slate-900">
            Đề bài
          </h2>

          <div className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
            {assignment.description ||
              "Giáo viên chưa thêm mô tả cho bài tập này."}
          </div>
        </div>

        <AssignmentSubmitForm
          assignmentId={assignment.id}
          existingAttachment={submission?.attachment_path}
          existingSubmittedAt={submission?.submitted_at}
        />
      </div>
    </main>
  );
}
