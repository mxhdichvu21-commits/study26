"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type Props = {
  classId: string;
};

function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";

  for (let i = 0; i < 6; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }

  return result;
}

export default function CreateRoomModal({ classId }: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState(generateRoomCode());
  const [scheduledAt, setScheduledAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const openModal = () => {
    setName("");
    setCode(generateRoomCode());
    setScheduledAt("");
    setError("");
    setOpen(true);
  };

  const closeModal = () => {
    if (!loading) {
      setOpen(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Vui lòng nhập tên phòng học.");
      return;
    }

    if (!code.trim()) {
      setError("Vui lòng nhập mã phòng.");
      return;
    }

    setLoading(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("Bạn chưa đăng nhập hoặc phiên đăng nhập đã hết.");
      }

      const { error: insertError } = await supabase
        .from("rooms")
        .insert({
          class_id: classId,
          teacher_id: user.id,
          name: name.trim(),
          code: code.trim().toUpperCase(),
          status: "draft",
          scheduled_at: scheduledAt
            ? new Date(scheduledAt).toISOString()
            : null,
        });

      if (insertError) {
        throw new Error(insertError.message);
      }

      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Không thể tạo phòng học."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className="class-primary-button"
        onClick={openModal}
      >
        + Tạo phòng học
      </button>

      {open && (
        <div
          className="room-modal-overlay"
          onMouseDown={closeModal}
        >
          <div
            className="room-modal"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="room-modal-header">
              <div>
                <span className="section-kicker">LIVE CLASS</span>
                <h3>Tạo phòng học</h3>
                <p>
                  Tạo phòng học trực tuyến cho lớp này.
                </p>
              </div>

              <button
                type="button"
                className="room-modal-close"
                onClick={closeModal}
                disabled={loading}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="room-form-field">
                <label htmlFor="room-name">
                  Tên phòng <span>*</span>
                </label>

                <input
                  id="room-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ví dụ: Toán 12A1 - Buổi 1"
                  autoFocus
                />
              </div>

              <div className="room-form-grid">
                <div className="room-form-field">
                  <label htmlFor="room-code">
                    Mã phòng <span>*</span>
                  </label>

                  <div className="room-code-wrap">
                    <input
                      id="room-code"
                      type="text"
                      value={code}
                      onChange={(e) =>
                        setCode(e.target.value.toUpperCase())
                      }
                      maxLength={30}
                    />

                    <button
                      type="button"
                      className="room-generate"
                      onClick={() =>
                        setCode(generateRoomCode())
                      }
                      disabled={loading}
                    >
                      Tạo mã
                    </button>
                  </div>
                </div>

                <div className="room-form-field">
                  <label htmlFor="room-schedule">
                    Thời gian dự kiến
                  </label>

                  <input
                    id="room-schedule"
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) =>
                      setScheduledAt(e.target.value)
                    }
                  />
                </div>
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
                  onClick={closeModal}
                  disabled={loading}
                >
                  Hủy
                </button>

                <button
                  type="submit"
                  className="room-create-button"
                  disabled={loading}
                >
                  {loading ? "Đang tạo..." : "Tạo phòng"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
