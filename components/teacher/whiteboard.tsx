"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  roomId: string;
  canEdit: boolean;
  visible: boolean;
  onClose: () => void;
};

type Tool = "pen" | "eraser";

type Point = {
  x: number;
  y: number;
};

function getStorageKey(roomId: string) {
  return `study26-whiteboard-${roomId}`;
}

export default function Whiteboard({
  roomId,
  canEdit,
  visible,
  onClose,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const drawingRef = useRef(false);
  const lastPointRef = useRef<Point | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState("#2563eb");
  const [brushSize, setBrushSize] = useState(4);
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState(false);

  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showSaved = useCallback(() => {
    setSaved(true);

    if (savedTimerRef.current) {
      clearTimeout(savedTimerRef.current);
    }

    savedTimerRef.current = setTimeout(() => {
      setSaved(false);
    }, 1200);
  }, []);

  const getContext = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    return canvas.getContext("2d");
  }, []);

  const getCanvasPoint = useCallback(
    (event: PointerEvent): Point | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      const rect = canvas.getBoundingClientRect();

      if (!rect.width || !rect.height) {
        return null;
      }

      return {
        x: (event.clientX - rect.left) * (canvas.width / rect.width),
        y: (event.clientY - rect.top) * (canvas.height / rect.height),
      };
    },
    []
  );

  const saveBoard = useCallback(() => {
    if (!canEdit) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const image = canvas.toDataURL("image/png");

      localStorage.setItem(
        getStorageKey(roomId),
        image
      );

      showSaved();
    } catch (error) {
      console.error("WHITEBOARD SAVE ERROR:", error);
    }
  }, [canEdit, roomId, showSaved]);

  const resizeCanvas = useCallback(
    (preserve = true) => {
      const canvas = canvasRef.current;
      const wrap = wrapRef.current;

      if (!canvas || !wrap) return;

      const oldImage =
        preserve && canvas.width > 0 && canvas.height > 0
          ? canvas.toDataURL("image/png")
          : null;

      const width = Math.max(320, wrap.clientWidth);
      const height = Math.max(320, wrap.clientHeight);

      const dpr = Math.max(
        1,
        Math.min(window.devicePixelRatio || 1, 2)
      );

      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);

      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const ctx = canvas.getContext("2d");

      if (!ctx) return;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);

      if (oldImage) {
        const img = new Image();

        img.onload = () => {
          const currentCanvas = canvasRef.current;

          if (!currentCanvas) return;

          const currentCtx =
            currentCanvas.getContext("2d");

          if (!currentCtx) return;

          currentCtx.setTransform(
            dpr,
            0,
            0,
            dpr,
            0,
            0
          );

          currentCtx.drawImage(
            img,
            0,
            0,
            width,
            height
          );
        };

        img.src = oldImage;
      }
    },
    []
  );

  const restoreBoard = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const savedImage = localStorage.getItem(
      getStorageKey(roomId)
    );

    if (!savedImage) {
      return;
    }

    const img = new Image();

    img.onload = () => {
      const currentCanvas = canvasRef.current;
      if (!currentCanvas) return;

      const ctx = currentCanvas.getContext("2d");
      if (!ctx) return;

      const rect =
        currentCanvas.getBoundingClientRect();

      const dpr = Math.max(
        1,
        Math.min(window.devicePixelRatio || 1, 2)
      );

      const width = rect.width;
      const height = rect.height;

      ctx.setTransform(
        dpr,
        0,
        0,
        dpr,
        0,
        0
      );

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(
        0,
        0,
        width,
        height
      );

      ctx.drawImage(
        img,
        0,
        0,
        width,
        height
      );
    };

    img.src = savedImage;
  }, [roomId]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    const canvas = canvasRef.current;
    const wrap = wrapRef.current;

    if (!canvas || !wrap) {
      return;
    }

    resizeCanvas(false);

    const savedImage = localStorage.getItem(
      getStorageKey(roomId)
    );

    if (savedImage) {
      const img = new Image();

      img.onload = () => {
        const currentCanvas = canvasRef.current;
        if (!currentCanvas) return;

        const ctx = currentCanvas.getContext("2d");
        if (!ctx) return;

        const rect =
          currentCanvas.getBoundingClientRect();

        const dpr = Math.max(
          1,
          Math.min(window.devicePixelRatio || 1, 2)
        );

        ctx.setTransform(
          dpr,
          0,
          0,
          dpr,
          0,
          0
        );

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(
          0,
          0,
          rect.width,
          rect.height
        );

        ctx.drawImage(
          img,
          0,
          0,
          rect.width,
          rect.height
        );

        setReady(true);
      };

      img.onerror = () => {
        setReady(true);
      };

      img.src = savedImage;
    } else {
      setReady(true);
    }

    const observer = new ResizeObserver(() => {
      resizeCanvas(true);
    });

    observer.observe(wrap);
    resizeObserverRef.current = observer;

    return () => {
      observer.disconnect();

      if (resizeObserverRef.current === observer) {
        resizeObserverRef.current = null;
      }

      drawingRef.current = false;
      lastPointRef.current = null;
    };
  }, [visible, roomId, resizeCanvas]);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas || !visible || !canEdit || !ready) {
      return;
    }

    const ctx = getContext();

    if (!ctx) {
      return;
    }

    const getStyle = () => {
      if (tool === "eraser") {
        return {
          color: "#ffffff",
          size: Math.max(brushSize * 3, 16),
        };
      }

      return {
        color,
        size: brushSize,
      };
    };

    const startDrawing = (event: PointerEvent) => {
      if (event.button !== 0) {
        return;
      }

      const point = getCanvasPoint(event);

      if (!point) {
        return;
      }

      drawingRef.current = true;
      lastPointRef.current = point;

      canvas.setPointerCapture?.(event.pointerId);

      event.preventDefault();
    };

    const draw = (event: PointerEvent) => {
      if (!drawingRef.current) {
        return;
      }

      const current = getCanvasPoint(event);
      const previous = lastPointRef.current;

      if (!current || !previous) {
        return;
      }

      const style = getStyle();

      const rect =
        canvas.getBoundingClientRect();

      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      const x1 = previous.x / scaleX;
      const y1 = previous.y / scaleY;
      const x2 = current.x / scaleX;
      const y2 = current.y / scaleY;

      ctx.save();

      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = style.size;
      ctx.strokeStyle = style.color;

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      ctx.restore();

      lastPointRef.current = current;

      event.preventDefault();
    };

    const stopDrawing = () => {
      if (!drawingRef.current) {
        return;
      }

      drawingRef.current = false;
      lastPointRef.current = null;

      saveBoard();
    };

    canvas.addEventListener(
      "pointerdown",
      startDrawing
    );

    canvas.addEventListener(
      "pointermove",
      draw
    );

    canvas.addEventListener(
      "pointerup",
      stopDrawing
    );

    canvas.addEventListener(
      "pointercancel",
      stopDrawing
    );

    canvas.addEventListener(
      "pointerleave",
      stopDrawing
    );

    return () => {
      canvas.removeEventListener(
        "pointerdown",
        startDrawing
      );

      canvas.removeEventListener(
        "pointermove",
        draw
      );

      canvas.removeEventListener(
        "pointerup",
        stopDrawing
      );

      canvas.removeEventListener(
        "pointercancel",
        stopDrawing
      );

      canvas.removeEventListener(
        "pointerleave",
        stopDrawing
      );
    };
  }, [
    visible,
    canEdit,
    ready,
    tool,
    color,
    brushSize,
    getCanvasPoint,
    getContext,
    saveBoard,
  ]);

  function clearBoard() {
    const canvas = canvasRef.current;

    if (!canvas || !canEdit) {
      return;
    }

    const ctx = canvas.getContext("2d");

    if (!ctx) {
      return;
    }

    const rect =
      canvas.getBoundingClientRect();

    const dpr = Math.max(
      1,
      Math.min(window.devicePixelRatio || 1, 2)
    );

    ctx.setTransform(
      dpr,
      0,
      0,
      dpr,
      0,
      0
    );

    ctx.fillStyle = "#ffffff";

    ctx.fillRect(
      0,
      0,
      rect.width,
      rect.height
    );

    localStorage.removeItem(
      getStorageKey(roomId)
    );

    showSaved();
  }

  function selectPen() {
    if (!canEdit) return;

    setTool("pen");
  }

  function selectEraser() {
    if (!canEdit) return;

    setTool("eraser");
  }

  if (!visible) {
    return null;
  }

  return (
    <div className="whiteboard-panel">
      <div className="whiteboard-header">
        <div>
          <span className="section-kicker">
            STUDY26 WHITEBOARD
          </span>

          <h2>Bảng trắng</h2>
        </div>

        <div className="whiteboard-header-right">
          {saved && (
            <span className="whiteboard-saving">
              ✓ Đã lưu
            </span>
          )}

          <button
            type="button"
            className="whiteboard-close"
            onClick={onClose}
          >
            ×
          </button>
        </div>
      </div>

      {canEdit && (
        <div className="whiteboard-toolbar">
          <button
            type="button"
            className={
              tool === "pen" ? "active" : ""
            }
            onClick={selectPen}
          >
            ✎ Bút
          </button>

          <button
            type="button"
            className={
              tool === "eraser" ? "active" : ""
            }
            onClick={selectEraser}
          >
            🧽 Tẩy
          </button>

          <label className="whiteboard-color">
            <input
              type="color"
              value={color}
              onChange={(event) => {
                setColor(event.target.value);
                setTool("pen");
              }}
            />

            Màu
          </label>

          <label className="whiteboard-size">
            Nét

            <input
              type="range"
              min="1"
              max="20"
              value={brushSize}
              onChange={(event) => {
                setBrushSize(
                  Number(event.target.value)
                );
              }}
            />

            {brushSize}px
          </label>

          <span className="whiteboard-separator" />

          <button
            type="button"
            className="danger"
            onClick={clearBoard}
          >
            🗑 Xóa bảng
          </button>
        </div>
      )}

      <div
        ref={wrapRef}
        className="whiteboard-canvas-wrap"
      >
        {!ready && (
          <div className="whiteboard-loading">
            Đang tải bảng trắng...
          </div>
        )}

        <canvas
          ref={canvasRef}
          className="whiteboard-canvas"
          style={{
            width: "100%",
            height: "100%",
            display: "block",
            touchAction: canEdit ? "none" : "auto",
            cursor: canEdit
              ? tool === "pen"
                ? "crosshair"
                : "cell"
              : "default",
          }}
        />
      </div>
    </div>
  );
}
