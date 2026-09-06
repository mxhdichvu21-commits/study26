"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  classId: string;
};

type CreatedRoom = {
  id: string;
  name: string;
  code: string;
  scheduled_at: string | null;
};

export default function CreateRoomModal({
  classId,
}: Props) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [createdRoom, setCreatedRoom] =
    useState<CreatedRoom | null>(null);

  function openModal() {
    setName("");
    setScheduledAt("");
    setError("");
    setCreatedRoom(null);
    setOpen(true);
  }

  function closeModal() {
    if (!loading) {
      setOpen(false);
      setCreatedRoom(null);
    }
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Vui lòng nhập tên phòng học.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        "/api/teacher/rooms/create",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            classId,
            name: name.trim(),
            scheduledAt: scheduledAt || null,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Không thể tạo phòng học."
        );
      }

      setCreatedRoom(data.room);
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
  }

  if (createdRoom) {
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
              onMouseDown={(event) =>
                event.stopPropagation()
              }
            >
              <div className="room-modal-header">
                <div>
                  <span className="section-kicker">
                    LIVE CLASS
                  </span>

                  <h3>Tạo phòng thành công</h3>

                  <p>
                    Mã phòng đã được hệ thống tạo tự động.
                  </p>
                </div>

                <button
                  type="button"
                  className="room-modal-close"
                  onClick={closeModal}
                >
                  ×
                </button>
              </div>

              <div className="student-picker-body">
                <div
                  style={{
                    padding: "24px",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      fontSize: "14px",
                      opacity: 0.7,
                      marginBottom: "8px",
                    }}
                  >
                    MÃ PHÒNG
                  </div>

                  <div
                    style={{
                      fontSize: "38px",
                      fontWeight: 800,
                      letterSpacing: "6px",
                    }}
                  >
                    {createdRoom.code}
                  </div>

                  <div
                    style={{
                      marginTop: "12px",
                      fontWeight: 600,
                    }}
                  >
                    {createdRoom.name}
                  </div>
                </div>
              </div>

              <div className="room-modal-footer">
                <button
                  type="button"
                  className="room-create-button"
                  onClick={closeModal}
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

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
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <div className="room-modal-header">
              <div>
                <span className="section-kicker">
                  LIVE CLASS
                </span>

                <h3>Tạo phòng học</h3>

                <p>
                  Mã phòng sẽ được hệ thống tạo tự động.
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
                  onChange={(event) =>
                    setName(event.target.value)
                  }
                  placeholder="Ví dụ: Toán 12A1 - Buổi 1"
                  autoFocus
                  disabled={loading}
                />
              </div>

              <div className="room-form-field">
                <label htmlFor="room-schedule">
                  Thời gian dự kiến
                </label>

                <input
                  id="room-schedule"
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(event) =>
                    setScheduledAt(event.target.value)
                  }
                  disabled={loading}
                />
              </div>

              <div
                style={{
                  marginTop: "12px",
                  padding: "12px 14px",
                  borderRadius: "12px",
                  background: "rgba(59,130,246,.08)",
                  fontSize: "14px",
                }}
              >
                Mã phòng 6 ký tự sẽ được tạo tự động trên
                máy chủ để tránh trùng mã.
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
                  {loading
                    ? "Đang tạo..."
                    : "Tạo phòng"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
