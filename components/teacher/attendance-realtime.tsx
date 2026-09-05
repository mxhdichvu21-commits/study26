"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = {
  sessionId: string;
};

export default function AttendanceRealtime({
  sessionId,
}: Props) {
  const router = useRouter();

  useEffect(() => {
    const supabase =
      createClient();

    const channel =
      supabase
        .channel(
          `attendance-${sessionId}`
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "attendance",
            filter: `session_id=eq.${sessionId}`,
          },
          () => {
            router.refresh();
          }
        )
        .subscribe();

    return () => {
      supabase.removeChannel(
        channel
      );
    };
  }, [
    router,
    sessionId,
  ]);

  return null;
}
