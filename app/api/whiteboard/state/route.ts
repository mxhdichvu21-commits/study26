import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function getAuth() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabase, user };
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const roomId = url.searchParams.get("roomId");

    if (!roomId) {
      return NextResponse.json(
        { error: "Thiếu roomId." },
        { status: 400 }
      );
    }

    const { supabase, user } = await getAuth();

    if (!user) {
      return NextResponse.json(
        { error: "Chưa đăng nhập." },
        { status: 401 }
      );
    }

    // Lấy phòng bằng user session để xác thực quyền.
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("id, class_id, teacher_id")
      .eq("id", roomId)
      .single();

    if (roomError || !room) {
      console.error("WHITEBOARD ROOM ERROR:", roomError);

      return NextResponse.json(
        { error: "Không tìm thấy phòng học." },
        { status: 404 }
      );
    }

    const isTeacher = room.teacher_id === user.id;

    let isStudent = false;

    if (!isTeacher) {
      const { data: member, error: memberError } =
        await supabase
          .from("class_members")
          .select("user_id")
          .eq("class_id", room.class_id)
          .eq("user_id", user.id)
          .maybeSingle();

      if (memberError) {
        console.error(
          "WHITEBOARD MEMBER ERROR:",
          memberError
        );
      }

      isStudent = !!member;
    }

    if (!isTeacher && !isStudent) {
      return NextResponse.json(
        { error: "Bạn không có quyền xem bảng trắng." },
        { status: 403 }
      );
    }

    // Sau khi đã xác thực quyền, dùng admin client cho whiteboards.
    const admin = createAdminClient();

    const { data: whiteboard, error: whiteboardError } =
      await admin
        .from("whiteboards")
        .select(
          "id, room_id, state, locked, updated_by, updated_at"
        )
        .eq("room_id", roomId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (whiteboardError) {
      console.error(
        "WHITEBOARD DATABASE ERROR:",
        whiteboardError
      );

      return NextResponse.json(
        {
          error:
            "Không thể đọc bảng trắng: " +
            whiteboardError.message,
        },
        { status: 500 }
      );
    }

    // Chưa có bảng thì giáo viên được phép tạo.
    if (!whiteboard && isTeacher) {
      const { data: created, error: createError } =
        await admin
          .from("whiteboards")
          .insert({
            room_id: roomId,
            state: { objects: [] },
            locked: false,
            updated_by: user.id,
          })
          .select(
            "id, room_id, state, locked, updated_by, updated_at"
          )
          .single();

      if (createError) {
        console.error(
          "WHITEBOARD CREATE ERROR:",
          createError
        );

        return NextResponse.json(
          {
            error:
              "Không thể tạo bảng trắng: " +
              createError.message,
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        whiteboard: created,
      });
    }

    return NextResponse.json({
      whiteboard:
        whiteboard ?? {
          id: null,
          room_id: roomId,
          state: { objects: [] },
          locked: false,
          updated_by: null,
          updated_at: null,
        },
    });
  } catch (error) {
    console.error("WHITEBOARD GET ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Không thể tải bảng trắng.",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();

    const roomId =
      typeof body.roomId === "string"
        ? body.roomId
        : "";

    const state =
      body.state &&
      typeof body.state === "object"
        ? body.state
        : null;

    const locked =
      typeof body.locked === "boolean"
        ? body.locked
        : undefined;

    if (!roomId || !state) {
      return NextResponse.json(
        { error: "Dữ liệu bảng trắng không hợp lệ." },
        { status: 400 }
      );
    }

    const { supabase, user } = await getAuth();

    if (!user) {
      return NextResponse.json(
        { error: "Chưa đăng nhập." },
        { status: 401 }
      );
    }

    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("id, class_id, teacher_id")
      .eq("id", roomId)
      .single();

    if (roomError || !room) {
      return NextResponse.json(
        { error: "Không tìm thấy phòng." },
        { status: 404 }
      );
    }

    // Chỉ giáo viên của phòng được lưu bảng.
    if (room.teacher_id !== user.id) {
      return NextResponse.json(
        {
          error:
            "Chỉ giáo viên mới được chỉnh sửa bảng trắng.",
        },
        { status: 403 }
      );
    }

    const admin = createAdminClient();

    const { data: current, error: currentError } =
      await admin
        .from("whiteboards")
        .select("id")
        .eq("room_id", roomId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (currentError) {
      throw currentError;
    }

    if (current) {
      const { data, error } = await admin
        .from("whiteboards")
        .update({
          state,
          ...(locked !== undefined ? { locked } : {}),
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", current.id)
        .select(
          "id, room_id, state, locked, updated_by, updated_at"
        )
        .single();

      if (error) {
        throw error;
      }

      return NextResponse.json({
        success: true,
        whiteboard: data,
      });
    }

    const { data, error } = await admin
      .from("whiteboards")
      .insert({
        room_id: roomId,
        state,
        locked: locked ?? false,
        updated_by: user.id,
      })
      .select(
        "id, room_id, state, locked, updated_by, updated_at"
      )
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      whiteboard: data,
    });
  } catch (error) {
    console.error("WHITEBOARD PUT ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Không thể lưu bảng trắng.",
      },
      { status: 500 }
    );
  }
}
