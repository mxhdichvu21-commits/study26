"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
  }>;
};

export default function PwaRegister() {
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("/sw.js").catch((error) => {
          console.error("Study26 service worker error:", error);
        });
      });
    }

    const media = window.matchMedia(
      "(display-mode: standalone)"
    );

    const updateInstalled = () => {
      setInstalled(media.matches);
    };

    updateInstalled();
    media.addEventListener?.("change", updateInstalled);

    const handleBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(
        event as BeforeInstallPromptEvent
      );
    };

    const handleInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener(
      "beforeinstallprompt",
      handleBeforeInstall
    );

    window.addEventListener(
      "appinstalled",
      handleInstalled
    );

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstall
      );
      window.removeEventListener(
        "appinstalled",
        handleInstalled
      );
      media.removeEventListener?.(
        "change",
        updateInstalled
      );
    };
  }, []);

  async function installApp() {
    if (!installPrompt) return;

    await installPrompt.prompt();

    const result = await installPrompt.userChoice;

    if (result.outcome === "accepted") {
      setInstalled(true);
    }

    setInstallPrompt(null);
  }

  if (installed || !installPrompt) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={installApp}
      aria-label="Cài Study26"
      style={{
        position: "fixed",
        right: 18,
        bottom: 18,
        zIndex: 9999,
        border: 0,
        borderRadius: 999,
        padding: "12px 17px",
        background: "#2563eb",
        color: "#fff",
        fontSize: 14,
        fontWeight: 700,
        boxShadow: "0 12px 28px rgba(37,99,235,.28)",
        cursor: "pointer",
      }}
    >
      Cài Study26
    </button>
  );
}
