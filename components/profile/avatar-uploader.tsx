"use client";

import { useRef, useState } from "react";

type Props = {
  currentAvatarUrl?: string | null;
  name?: string | null;
  roleLabel?: string;
};

export default function AvatarUploader({
  currentAvatarUrl,
  name,
  roleLabel,
}: Props) {
  const inputRef =
    useRef<HTMLInputElement | null>(null);

  const [avatarUrl, setAvatarUrl] =
    useState(currentAvatarUrl || "");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const initial =
    (name || "H").trim().charAt(0).toUpperCase() ||
    "H";

  async function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    setError("");
    setSuccess("");

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      setError(
        "Định dạng ảnh không được hỗ trợ. Chỉ nhận JPG, PNG hoặc WEBP."
      );
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Ảnh phải nhỏ hơn 5MB.");
      event.target.value = "";
      return;
    }

    const localPreview =
      URL.createObjectURL(file);

    setAvatarUrl(localPreview);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        "/api/profile/avatar",
        {
          method: "POST",
          body: formData,
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Không thể tải ảnh lên."
        );
      }

      const nextAvatarUrl =
        data?.avatarUrl || "";

      setAvatarUrl(nextAvatarUrl);
      setSuccess(
        "Đã cập nhật ảnh đại diện."
      );

      window.dispatchEvent(
        new CustomEvent(
          "study26-avatar-updated",
          {
            detail: {
              avatarUrl: nextAvatarUrl,
            },
          }
        )
      );
    } catch (err) {
      setAvatarUrl(
        currentAvatarUrl || ""
      );

      setError(
        err instanceof Error
          ? err.message
          : "Không thể tải ảnh lên."
      );
    } finally {
      setLoading(false);
      event.target.value = "";
    }
  }

  function openPicker() {
    if (!loading) {
      inputRef.current?.click();
    }
  }

  return (
    <div className="study26-profile-avatar-box">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={handleFileChange}
      />

      <button
        type="button"
        className="study26-profile-avatar-button"
        onClick={openPicker}
        disabled={loading}
        title="Đổi ảnh đại diện"
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt="Ảnh đại diện"
            onError={() =>
              setAvatarUrl("")
            }
          />
        ) : (
          <span>{initial}</span>
        )}

        <span className="study26-profile-avatar-overlay">
          {loading
            ? "Đang tải..."
            : "Đổi ảnh"}
        </span>
      </button>

      <strong>
        {name || "Tài khoản"}
      </strong>

      {roleLabel && (
        <span className="study26-profile-role">
          {roleLabel}
        </span>
      )}

      <small>
        JPG, PNG, WEBP · tối đa 5MB
      </small>

      {error && (
        <div className="study26-profile-error">
          {error}
        </div>
      )}

      {success && (
        <div className="study26-profile-success">
          {success}
        </div>
      )}
    </div>
  );
}
