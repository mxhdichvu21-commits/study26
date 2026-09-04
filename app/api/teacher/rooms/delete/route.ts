import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function requireTeacher() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Bạn chưa đăng nhập.");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, role, is_active")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    throw new Error("Không tìm thấy hồ sơ tài khoản.");
  }

  if (
    profile.role !== "teacher" ||
    !profile.is_active
  ) {
    throw new Error("Bạn không có quyền xóa phòng.");
  }

  return { supabase, user };
}

export async function DELETE(request: Request) {
  try {
    const { supabase, user } = await requireTeacher();

    const body = await request.json();

    const roomId =
      typeof body.roomId === "string"
        ? body.roomId.trim()
        : "";

    if (!roomId) {
      return NextResponse.json(
        { error: "Thiếu roomId." },
        { status: 400 }
      );
    }

    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select(
        "id, class_id, teacher_id, name, status"
      )
      .eq("id", roomId)
      .single();

    if (roomError || !room) {
      return NextResponse.json(
        { error: "Không tìm thấy phòng học." },
        { status: 404 }
      );
    }

    if (room.teacher_id !== user.id) {
      return NextResponse.json(
        { error: "Bạn không phải giáo viên của phòng này." },
        { status: 403 }
      );
    }

    if (room.status === "live") {
      return NextResponse.json(
        {
          error:
            "Không thể xóa phòng đang diễn ra. Hãy kết thúc buổi học trước.",
        },
        { status: 409 }
      );
    }

    const admin = createAdminClient();

    // --------------------------------------------------
    // 1. Lấy session
    // --------------------------------------------------
    const { data: sessions, error: sessionsReadError } =
      await admin
        .from("sessions")
        .select("id")
        .eq("room_id", roomId);

    if (sessionsReadError) {
      throw new Error(
        "Không thể đọc sessions: " +
          sessionsReadError.message
      );
    }

    const sessionIds =
      (sessions ?? []).map((item) => item.id);

    // --------------------------------------------------
    // 2. Attendance
    // --------------------------------------------------
    if (sessionIds.length > 0) {
      const { error } = await admin
        .from("attendance")
        .delete()
        .in("session_id", sessionIds);

      if (error) {
        throw new Error(
          "Không thể xóa attendance: " +
            error.message
        );
      }
    }

    // --------------------------------------------------
    // 3. Schedules -> bỏ liên kết phòng
    // --------------------------------------------------
    {
      const { error } = await admin
        .from("schedules")
        .update({ room_id: null })
        .eq("room_id", roomId);

      if (error) {
        throw new Error(
          "Không thể cập nhật lịch học: " +
            error.message
        );
      }
    }

    // --------------------------------------------------
    // 4. Room members
    // --------------------------------------------------
    {
      const { error } = await admin
        .from("room_members")
        .delete()
        .eq("room_id", roomId);

      if (error) {
        throw new Error(
          "Không thể xóa thành viên phòng: " +
            error.message
        );
      }
    }

    // --------------------------------------------------
    // 5. Hand raises
    // --------------------------------------------------
    {
      const { error } = await admin
        .from("hand_raises")
        .delete()
        .eq("room_id", roomId);

      if (error) {
        throw new Error(
          "Không thể xóa hand_raises: " +
            error.message
        );
      }
    }

    // --------------------------------------------------
    // 6. Messages
    // --------------------------------------------------
    {
      const { error } = await admin
        .from("messages")
        .delete()
        .eq("room_id", roomId);

      if (error) {
        throw new Error(
          "Không thể xóa messages: " +
            error.message
        );
      }
    }

    // --------------------------------------------------
    // 7. Polls + votes + options
    // --------------------------------------------------
    const { data: polls, error: pollsReadError } =
      await admin
        .from("polls")
        .select("id")
        .eq("room_id", roomId);

    if (pollsReadError) {
      throw new Error(
        "Không thể đọc polls: " +
          pollsReadError.message
      );
    }

    const pollIds = (polls ?? []).map(
      (poll) => poll.id
    );

    if (pollIds.length > 0) {
      const { error: votesError } = await admin
        .from("poll_votes")
        .delete()
        .in("poll_id", pollIds);

      if (votesError) {
        throw new Error(
          "Không thể xóa poll_votes: " +
            votesError.message
        );
      }

      const { error: optionsError } = await admin
        .from("poll_options")
        .delete()
        .in("poll_id", pollIds);

      if (optionsError) {
        throw new Error(
          "Không thể xóa poll_options: " +
            optionsError.message
        );
      }

      const { error: pollsError } = await admin
        .from("polls")
        .delete()
        .in("id", pollIds);

      if (pollsError) {
        throw new Error(
          "Không thể xóa polls: " +
            pollsError.message
        );
      }
    }

    // --------------------------------------------------
    // 8. Whiteboard
    // --------------------------------------------------
    {
      const { error } = await admin
        .from("whiteboards")
        .delete()
        .eq("room_id", roomId);

      if (error) {
        throw new Error(
          "Không thể xóa whiteboard: " +
            error.message
        );
      }
    }

    // --------------------------------------------------
    // 9. Sessions
    // --------------------------------------------------
    {
      const { error } = await admin
        .from("sessions")
        .delete()
        .eq("room_id", roomId);

      if (error) {
        throw new Error(
          "Không thể xóa sessions: " +
            error.message
        );
      }
    }

    // --------------------------------------------------
    // 10. Xóa file ảnh bảng trắng trong Storage
    // --------------------------------------------------
    try {
      const { data: files } = await admin.storage
        .from("whiteboard-images")
        .list(roomId, {
          limit: 1000,
        });

      if (files && files.length > 0) {
        const paths = files.map(
          (file) => `${roomId}/${file.name}`
        );

        await admin.storage
          .from("whiteboard-images")
          .remove(paths);
      }
    } catch (storageError) {
      console.warn(
        "WHITEBOARD STORAGE CLEANUP WARNING:",
        storageError
      );
    }

    // --------------------------------------------------
    // 11. Cuối cùng mới xóa room
    // --------------------------------------------------
    const { error: deleteError } = await admin
      .from("rooms")
      .delete()
      .eq("id", roomId);

    if (deleteError) {
      throw new Error(
        "Không thể xóa rooms: " +
          deleteError.message
      );
    }

    const { data: stillExists, error: verifyError } = await admin
      .from("rooms")
      .select("id")
      .eq("id", roomId)
      .maybeSingle();

    if (verifyError) {
      throw new Error(
        "Không thể xác minh sau khi xóa phòng: " +
          verifyError.message
      );
    }

    if (stillExists) {
      throw new Error(
        "Lệnh xóa đã chạy nhưng phòng vẫn còn trong database."
      );
    }

    console.log(
      `ROOM DELETED SUCCESSFULLY: ${roomId} - ${room.name}`
    );

    return NextResponse.json({
      success: true,
      deleted: true,
      message: `Đã xóa phòng "${room.name}".`,
    });
  } catch (error) {
    console.error("DELETE ROOM ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Không thể xóa phòng.",
      },
      { status: 500 }
    );
  }
}
