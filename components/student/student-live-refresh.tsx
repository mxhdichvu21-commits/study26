"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function StudentLiveRefresh() {
  const router = useRouter();

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    }, 10000);

    return () => {
      window.clearInterval(timer);
    };
  }, [router]);

  return null;
}
