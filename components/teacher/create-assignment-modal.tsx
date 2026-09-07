"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Student = {
  id: string;
  full_name: string | null;
};

type Props = {
  classId: string;
};

const MAX_FILE_SIZE = 50 * 1024 * 1024;

const ACCEPT =
  ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.jpg,.jpeg,.png,.webp";

export default function CreateAssignmentModal({ classId }: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [points, setPoints] = useState("10");
  const [dueAt, setDueAt] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    (async () => {
      try {
        setError("");

        const res = await fetch(
          `/api/teacher/learning/students?classId=${encodeURIComponent(classId)}`
        );

        const data = await res.json();

        if (!res.ok) {
          throw new Error(
            data?.error || "Không thể tải học sinh."
          );
        }

        setStudents(data.students ?? []);
        setSelected(
          (data.students ?? []).map(
            (s: Student) => s.id
          )
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Không thể tải học sinh."
        );
      }
    })();
  }, [open, classId]);

  function reset() {
    setTitle("");
    setDescription("");
    setPoints("10");
    setDueAt("");
    setStudents([]);
    setSelected([]);
    setFiles([]);
    setError("");
  }

  function handleFiles(list: FileList | null) {
    const incoming = Array.from(list ?? []);

    for (const file of incoming) {
      if (file.size > MAX_FILE_SIZE) {
        setError(`"${file.name}" vượt quá 50MB.`);
        return;
      }
    }

    setFiles((current) => [...current, ...incoming]);
    setError("");
  }

  function toggleStudent(id: string) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((x) => x !== id)
        : [...current, id]
    );
  }

  async function uploadFile(
    assignmentId: string,
    file: File
  ) {
    const prepare = await fetch(
      "/api/learning/upload-url",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          kind: "assignment",
          entityId: assignmentId,
          fileName: file.name,
          fileSize: file.size,
        }),
      }
    );

    const prepared = await prepare.json();

    if (!prepare.ok) {
      throw new Error(
        prepared?.error ||
          "Không thể chuẩn bị upload."
      );
    }

    const { error: uploadError } =
      await supabase.storage
        .from(prepared.bucket)
        .uploadToSignedUrl(
          prepared.path,
          prepared.token,
          file
        );

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const metadata = await fetch(
      "/api/learning/attachments",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          kind: "assignment",
          entityId: assignmentId,
          storagePath: prepared.path,
          fileName: file.name,
          mimeType:
            file.type ||
            "application/octet-stream",
          fileSize: file.size,
        }),
      }
    );

    const metadataData = await metadata.json();

    if (!metadata.ok) {
      throw new Error(
        metadataData?.error ||
          "Không thể lưu metadata file."
      );
    }
  }

  async function submit(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (!title.trim()) {
      setError("Vui lòng nhập tên bài tập.");
      return;
    }

    if (!selected.length) {
      setError("Hãy chọn ít nhất một học sinh.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(
        "/api/teacher/assignments/create",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            classId,
            title,
            description,
            points: Number(points) || 0,
            dueAt,
            recipientIds: selected,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data?.error ||
            "Không thể tạo bài tập."
        );
      }

      for (const file of files) {
        await uploadFile(
          data.assignment.id,
          file
        );
      }

      setOpen(false);
      reset();
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Không thể tạo bài tập."
      );
    } finally {
      setLoading(false);
    }
  }

  const allSelected =
    students.length > 0 &&
    selected.length === students.length;

  return (
    <>
      <button
        type="button"
        className="class-primary-button"
        onClick={() => {
          reset();
          setOpen(true);
        }}
      >
        + Tạo bài tập
      </button>

      {open && (
        <div
          className="room-modal-overlay"
          onMouseDown={() => {
            if (!loading) setOpen(false);
          }}
        >
          <div
            className="room-modal"
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <div className="room-modal-header">
              <div>
                <span className="section-kicker">
                  ASSIGNMENT
                </span>
                <h3>Tạo bài tập</h3>
                <p>
                  Giao bài tập cho học sinh.
                </p>
              </div>

              <button
                type="button"
                className="room-modal-close"
                disabled={loading}
                onClick={() => setOpen(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={submit}>
              <div className="room-form-field">
                <label>Tên bài tập *</label>
                <input
                  value={title}
                  onChange={(e) =>
                    setTitle(e.target.value)
                  }
                  placeholder="Ví dụ: Bài tập chương 1"
                  autoFocus
                />
              </div>

              <div className="room-form-grid">
                <div className="room-form-field">
                  <label>Điểm tối đa</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={points}
                    onChange={(e) =>
                      setPoints(e.target.value)
                    }
                  />
                </div>

                <div className="room-form-field">
                  <label>Hạn nộp</label>
                  <input
                    type="datetime-local"
                    value={dueAt}
                    onChange={(e) =>
                      setDueAt(e.target.value)
                    }
                  />
                </div>
              </div>

              <div className="room-form-field">
                <label>Mô tả / yêu cầu</label>
                <textarea
                  value={description}
                  onChange={(e) =>
                    setDescription(e.target.value)
                  }
                  placeholder="Yêu cầu, hướng dẫn..."
                  className="study26-textarea"
                  rows={6}
                />
              </div>

              <div className="room-form-field">
                <label>Học sinh nhận bài</label>

                <label className="flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-sm font-semibold">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(e) =>
                      setSelected(
                        e.target.checked
                          ? students.map(
                              (s) => s.id
                            )
                          : []
                      )
                    }
                  />
                  Chọn tất cả
                </label>

                <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-slate-200 p-2">
                  {!students.length ? (
                    <div className="p-3 text-sm text-slate-500">
                      Lớp chưa có học sinh.
                    </div>
                  ) : (
                    students.map((student) => (
                      <label
                        key={student.id}
                        className="flex cursor-pointer items-center gap-3 rounded-lg p-2 hover:bg-slate-50"
                      >
                        <input
                          type="checkbox"
                          checked={selected.includes(
                            student.id
                          )}
                          onChange={() =>
                            toggleStudent(
                              student.id
                            )
                          }
                        />
                        <span className="text-sm font-medium">
                          {student.full_name ||
                            "Học sinh"}
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="room-form-field">
                <label>Đính kèm tài liệu</label>

                <input
                  type="file"
                  multiple
                  accept={ACCEPT}
                  disabled={loading}
                  onChange={(e) =>
                    handleFiles(e.target.files)
                  }
                />

                <p className="mt-2 text-xs text-slate-500">
                  Tối đa 50MB / file.
                </p>

                {files.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {files.map((file, index) => (
                      <div
                        key={`${file.name}-${index}`}
                        className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm"
                      >
                        <span className="truncate">
                          {file.name} ·{" "}
                          {(file.size / 1024 / 1024).toFixed(
                            2
                          )}
                          MB
                        </span>

                        <button
                          type="button"
                          disabled={loading}
                          className="ml-3 text-red-600"
                          onClick={() =>
                            setFiles((current) =>
                              current.filter(
                                (_, i) =>
                                  i !== index
                              )
                            )
                          }
                        >
                          Xóa
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {error && (
                <div className="room-form-error">
                  {error}
                </div>
              )}

              <div className="room-modal-footer">
                <button
                  type="button"
                  className="room-cancel-button"
                  disabled={loading}
                  onClick={() => setOpen(false)}
                >
                  Hủy
                </button>

                <button
                  type="submit"
                  className="room-create-button"
                  disabled={loading}
                >
                  {loading
                    ? "Đang giao..."
                    : "Giao bài tập"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
