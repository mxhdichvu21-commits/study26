import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LessonViewButton from "@/components/student/lesson-view-button";

type PageProps = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";

export default async function StudentLessonPage({
  params,
}: PageProps) {
  const { id } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: lesson } =
    await supabase
      .from("lessons")
      .select(`
        id,
        class_id,
        title,
        description,
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

  if (!lesson) notFound();

  const { data: recipient } =
    await supabase
      .from("lesson_recipients")
      .select(
        "lesson_id, student_id"
      )
      .eq("lesson_id", id)
      .eq("student_id", user.id)
      .maybeSingle();

  if (!recipient) notFound();

  const { data: attachments } =
    await supabase
      .from("lesson_attachments")
      .select(`
        id,
        file_name,
        mime_type,
        file_size,
        created_at
      `)
      .eq("lesson_id", id)
      .order("created_at", {
        ascending: true,
      });

  const { data: view } =
    await supabase
      .from("lesson_views")
      .select(
        "lesson_id, student_id, viewed_at"
      )
      .eq("lesson_id", id)
      .eq("student_id", user.id)
      .maybeSingle();

  const classInfo = Array.isArray(
    lesson.classes
  )
    ? lesson.classes[0]
    : lesson.classes;

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-5xl">
        <Link
          href={`/student/classes/${lesson.class_id}`}
          className="mb-5 inline-flex text-sm font-medium text-blue-600 hover:underline"
        >
          ← Quay lại lớp
        </Link>

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <span className="section-kicker">
            LESSON
          </span>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            {lesson.title}
          </h1>

          <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-500">
            <span>
              Lớp:{" "}
              {classInfo?.name ||
                "Lớp học"}
            </span>

            <span>
              Đăng lúc:{" "}
              {new Date(
                lesson.created_at
              ).toLocaleString(
                "vi-VN",
                {
                  timeZone:
                    "Asia/Ho_Chi_Minh",
                  hour12: false,
                }
              )}
            </span>
          </div>

          <div className="mt-6">
            <h2 className="text-lg font-bold text-slate-900">
              Nội dung
            </h2>

            <div className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-700">
              {lesson.description ||
                "Giáo viên chưa thêm nội dung."}
            </div>
          </div>

          <div className="mt-8">
            <h2 className="text-lg font-bold text-slate-900">
              File đính kèm
            </h2>

            {!attachments?.length ? (
              <div className="mt-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                Không có file đính kèm.
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                {attachments.map(
                  (file) => (
                    <div
                      key={file.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4"
                    >
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-slate-900">
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
                        href={`/api/learning/file?kind=lesson&id=${id}`}
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
          </div>

          <LessonViewButton
            lessonId={lesson.id}
            viewedAt={
              view?.viewed_at ??
              null
            }
          />
        </section>
      </div>
    </main>
  );
}
