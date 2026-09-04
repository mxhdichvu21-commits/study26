"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  roomId: string;
  roomName: string;
  status: string;
};

export default function RoomActions({
  roomId,
  roomName,
  status,
}: Props) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canDelete = status !== "live";

  async function deleteRoom() {
    if (!canDelete || loading) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "/api/teacher/rooms/delete",
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            roomId,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Không thể xóa phòng."
        );
      }

      setConfirmOpen(false);
      setOpen(false);

      router.replace(window.location.href);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Không thể xóa phòng."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="room-actions">
        <button
          type="button"
          className="table-action room-more-button"
          onClick={() => setOpen((value) => !value)}
          aria-label={`Tùy chọn phòng ${roomName}`}
        >
          •••
        </button>

        {open && (
          <>
            <button
              type="button"
              className="room-menu-backdrop"
              aria-label="Đóng menu"
              onClick={() => setOpen(false)}
            />

            <div className="room-actions-menu">
              <button
                type="button"
                className="room-action-item"
                onClick={() => {
                  setOpen(false);
                  router.push(
                    `/teacher/rooms/${roomId}`
                  );
                }}
              >
                <span>↗</span>
                Mở phòng
              </button>

              {canDelete && (
                <button
                  type="button"
                  className="room-action-item danger"
                  onClick={() => {
                    setOpen(false);
                    setConfirmOpen(true);
                    setError("");
                  }}
                >
                  <span>🗑</span>
                  Xóa phòng
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {confirmOpen && (
        <div
          className="room-delete-overlay"
          onMouseDown={() => {
            if (!loading) setConfirmOpen(false);
          }}
        >
          <div
            className="room-delete-modal"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <div className="room-delete-icon">
              🗑
            </div>

            <h3>Xóa phòng học?</h3>

            <p>
              Bạn có chắc muốn xóa{" "}
              <strong>“{roomName}”</strong>?
              <br />
              Lịch sử buổi học, bảng trắng và dữ liệu
              liên quan đến phòng sẽ bị xóa.
            </p>

            {error && (
              <div className="room-delete-error">
                {error}
              </div>
            )}

            <div className="room-delete-actions">
              <button
                type="button"
                className="room-delete-cancel"
                onClick={() => setConfirmOpen(false)}
                disabled={loading}
              >
                Hủy
              </button>

              <button
                type="button"
                className="room-delete-confirm"
                onClick={deleteRoom}
                disabled={loading}
              >
                {loading
                  ? "Đang xóa..."
                  : "Xóa phòng"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
