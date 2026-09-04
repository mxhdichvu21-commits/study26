"use client";

import { useEffect, useRef, useState } from "react";
import {
  Canvas,
  PencilBrush,
} from "fabric";

type Props = {
  roomId: string;
  canEdit: boolean;
  visible: boolean;
  onClose: () => void;
};

type Tool = "pen" | "eraser";

function getStorageKey(roomId: string) {
  return `study26-whiteboard-${roomId}`;
}

export default function Whiteboard({
  roomId,
  canEdit,
  visible,
  onClose,
}: Props) {
  const canvasElementRef =
    useRef<HTMLCanvasElement | null>(null);

  const canvasRef = useRef<Canvas | null>(null);

  const saveTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  const [tool, setTool] =
    useState<Tool>("pen");

  const [color, setColor] =
    useState("#2563eb");

  const [brushSize, setBrushSize] =
    useState(4);

  const [ready, setReady] =
    useState(false);

  const [saved, setSaved] =
    useState(false);

  useEffect(() => {
    if (!visible || !canvasElementRef.current) {
      return;
    }

    if (canvasRef.current) {
      return;
    }

    let active = true;

    const element =
      canvasElementRef.current;

    const canvas = new Canvas(element, {
      backgroundColor: "#ffffff",
      selection: false,
      preserveObjectStacking: true,
    });

    canvasRef.current = canvas;

    const brush = new PencilBrush(canvas);
    brush.width = 4;
    brush.color = "#2563eb";

    canvas.freeDrawingBrush = brush;

    const resize = () => {
      if (!active) return;

      const parent =
        element.parentElement;

      if (!parent) return;

      const width = Math.max(
        320,
        parent.clientWidth - 2
      );

      const height = Math.max(
        420,
        parent.clientHeight - 2
      );

      canvas.setDimensions({
        width,
        height,
      });

      canvas.renderAll();
    };

    function saveBoard() {
      if (!active || !canEdit) {
        return;
      }

      try {
        const json = canvas.toJSON();

        localStorage.setItem(
          getStorageKey(roomId),
          JSON.stringify(json)
        );

        setSaved(true);

        window.setTimeout(() => {
          if (active) {
            setSaved(false);
          }
        }, 1200);
      } catch (error) {
        console.error(
          "WHITEBOARD LOCAL SAVE ERROR:",
          error
        );
      }
    }

    function scheduleSave() {
      if (!active || !canEdit) {
        return;
      }

      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }

      saveTimerRef.current =
        setTimeout(() => {
          saveBoard();
        }, 300);
    }

    const changed = () => {
      scheduleSave();
    };

    async function loadBoard() {
      try {
        resize();

        const savedData =
          localStorage.getItem(
            getStorageKey(roomId)
          );

        if (
          savedData &&
          active
        ) {
          try {
            const parsed =
              JSON.parse(savedData);

            await canvas.loadFromJSON(
              parsed
            );

            if (active) {
              canvas.renderAll();
            }
          } catch (error) {
            console.warn(
              "Không thể khôi phục bảng trắng:",
              error
            );
          }
        }

        if (!active) return;

        canvas.on(
          "object:added",
          changed
        );

        canvas.on(
          "object:modified",
          changed
        );

        canvas.on(
          "object:removed",
          changed
        );

        window.addEventListener(
          "resize",
          resize
        );

        setReady(true);
      } catch (error) {
        console.error(
          "WHITEBOARD LOAD ERROR:",
          error
        );

        if (active) {
          setReady(true);
        }
      }
    }

    void loadBoard();

    return () => {
      active = false;

      window.removeEventListener(
        "resize",
        resize
      );

      canvas.off(
        "object:added",
        changed
      );

      canvas.off(
        "object:modified",
        changed
      );

      canvas.off(
        "object:removed",
        changed
      );

      if (saveTimerRef.current) {
        clearTimeout(
          saveTimerRef.current
        );

        saveTimerRef.current = null;
      }

      // Lưu lần cuối trước khi đóng.
      if (canEdit) {
        try {
          localStorage.setItem(
            getStorageKey(roomId),
            JSON.stringify(
              canvas.toJSON()
            )
          );
        } catch {}
      }

      if (
        canvasRef.current === canvas
      ) {
        canvasRef.current = null;
      }

      try {
        canvas.dispose();
      } catch {}

      setReady(false);
    };
  }, [visible, roomId, canEdit]);

  useEffect(() => {
    const canvas =
      canvasRef.current;

    if (!canvas || !canEdit) {
      return;
    }

    if (!canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush =
        new PencilBrush(canvas);
    }

    canvas.freeDrawingBrush.width =
      brushSize;

    canvas.freeDrawingBrush.color =
      color;

    canvas.isDrawingMode =
      tool === "pen";

    canvas.defaultCursor =
      tool === "pen"
        ? "crosshair"
        : "default";
  }, [
    tool,
    brushSize,
    color,
    canEdit,
    ready,
  ]);

  function selectPen() {
    const canvas =
      canvasRef.current;

    if (!canvas || !canEdit) {
      return;
    }

    setTool("pen");

    if (!canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush =
        new PencilBrush(canvas);
    }

    canvas.freeDrawingBrush.width =
      brushSize;

    canvas.freeDrawingBrush.color =
      color;

    canvas.isDrawingMode = true;
  }

  function eraseSelected() {
    const canvas =
      canvasRef.current;

    if (!canvas || !canEdit) {
      return;
    }

    const selected =
      canvas.getActiveObjects();

    if (selected.length > 0) {
      selected.forEach((object) => {
        canvas.remove(object);
      });

      canvas.discardActiveObject();
      canvas.renderAll();

      return;
    }

    if (!canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush =
        new PencilBrush(canvas);
    }

    canvas.freeDrawingBrush.width =
      Math.max(
        brushSize * 3,
        15
      );

    canvas.freeDrawingBrush.color =
      "#ffffff";

    canvas.isDrawingMode = true;
    canvas.defaultCursor =
      "crosshair";
  }

  function clearBoard() {
    const canvas =
      canvasRef.current;

    if (!canvas || !canEdit) {
      return;
    }

    canvas.clear();

    canvas.backgroundColor =
      "#ffffff";

    canvas.renderAll();

    try {
      localStorage.setItem(
        getStorageKey(roomId),
        JSON.stringify(
          canvas.toJSON()
        )
      );

      setSaved(true);

      window.setTimeout(() => {
        setSaved(false);
      }, 1200);
    } catch {}
  }

  function selectEraser() {
    if (!canEdit) return;

    setTool("eraser");
    eraseSelected();
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
              tool === "pen"
                ? "active"
                : ""
            }
            onClick={selectPen}
          >
            ✎ Bút
          </button>

          <button
            type="button"
            className={
              tool === "eraser"
                ? "active"
                : ""
            }
            onClick={selectEraser}
          >
            🧽 Tẩy
          </button>

          <label className="whiteboard-color">
            <input
              type="color"
              value={color}
              onChange={(e) => {
                const nextColor =
                  e.target.value;

                setColor(nextColor);
                setTool("pen");

                const canvas =
                  canvasRef.current;

                if (
                  canvas?.freeDrawingBrush
                ) {
                  canvas.freeDrawingBrush.color =
                    nextColor;
                }
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
              onChange={(e) => {
                const nextSize =
                  Number(
                    e.target.value
                  );

                setBrushSize(
                  nextSize
                );

                const canvas =
                  canvasRef.current;

                if (
                  canvas?.freeDrawingBrush
                ) {
                  canvas.freeDrawingBrush.width =
                    nextSize;
                }
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

      <div className="whiteboard-canvas-wrap">
        {!ready && (
          <div className="whiteboard-loading">
            Đang tải bảng trắng...
          </div>
        )}

        <canvas
          ref={canvasElementRef}
          className="whiteboard-canvas"
        />
      </div>
    </div>
  );
}
