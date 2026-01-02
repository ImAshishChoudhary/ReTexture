import { useCallback, useEffect, useRef, useState } from "react";
import { Stage, Layer, Line } from "react-konva";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PageContainer, ProLayout } from "@ant-design/pro-components";
import {
  Button,
  ColorPicker,
  Dropdown,
  Flex,
  Tooltip,
  Tour,
  Typography,
  Modal,
  Card,
  List,
  Spin,
  message,
} from "antd";

import { useEditorStore } from "../store/useEditorStore";

import { IoDuplicateOutline, IoSaveOutline } from "react-icons/io5";
import { HiOutlinePencil } from "react-icons/hi2";
import { RiDeleteBin5Line } from "react-icons/ri";
import { SlReload } from "react-icons/sl";
import { GoZoomIn, GoZoomOut } from "react-icons/go";

import EditorLayer from "../components/EditorLayer";
import Sidebar from "../components/Sidebar";
import Share from "../components/Share";
import UndoRedo from "../components/UndoRedo";
import AddPage from "../components/AddPage";
import EditorColorPicker from "../components/EditorColorPicker";
import { serializeToHTML, logToConsole } from "../utils/serializeToHTML";
import { validateCanvas } from "../compliance/checker";
import { applyAutoFixes } from "../compliance/corrector";

export default function Editor() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tplId = searchParams.get("id");

  // Zustand store
  const {
    path,
    collapsed,
    zoom,
    activeIndex,
    selectedUniqueId,
    editorPages,
    popup,
    canvasSize,
    savedTemplates,
    setCollapsed,
    setEditorPages,
    setPopUp,
    setSaveTemplate,
    setSelectedUniqueId,
    setZoom,
  } = useEditorStore();

  const stageRef = useRef(null);
  const undoRedoRef = useRef(null);
  const undoRedoFunctionsRef = useRef(null);
  const colorPickerRef = useRef(null);
  const shareRef = useRef(null);
  const duplicateRef = useRef(null);
  const deleteRef = useRef(null);
  const addPageRef = useRef(null);
  const canvasRef = useRef(null);
  const sidebarRef = useRef(null);
  const containerRef = useRef(null);

  const [pushHistory, setPushHistory] = useState(editorPages);

  const [openTour, setOpenTour] = useState(false);

  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });

  const activePage = editorPages[activeIndex] || {
    children: [],
    background: "#ffffff",
  };
  const selectedEl = (activePage?.children || [])?.find(
    (e) => e?.id === selectedUniqueId
  );

  const [isPenTool, setIsPenTool] = useState(false);
  const [lines, setLines] = useState([]);
  const isDrawing = useRef(false);

  const [penColor, setPenColor] = useState("#000000");
  const [penSize, setPenSize] = useState(3);
  const [penOpacity, setPenOpacity] = useState(1);
  const [lineCap, setLineCap] = useState("round"); // "round" | "square"
  const [showProtectionZone, setShowProtectionZone] = useState(true); // Product protection overlay toggle

  const steps = [
    {
      title: "Undo & Redo",
      description: "Quickly reverse or reapply your last action.",
      target: () => undoRedoRef?.current,
    },
    {
      title: "Background Color",
      description: "Pick a background color to customize your canvas.",
      target: () => colorPickerRef?.current,
    },
    {
      title: "Share & Export",
      description: "Download or share your design with others.",
      target: () => shareRef?.current,
    },
    {
      title: "Duplicate Element",
      description: "Clone the selected element instantly.",
      target: () => duplicateRef?.current,
    },
    {
      title: "Delete Element",
      description: "Remove the selected element from your design.",
      target: () => deleteRef?.current,
    },
    {
      title: "Templates & Assets",
      description:
        "Browse creative templates and design elements / double click on Text edit",
      target: () => sidebarRef?.current,
    },
    {
      title: "Add New Page",
      description: "Insert an extra page to expand your design.",
      target: () => addPageRef?.current,
    },
    {
      title: "Canvas Workspace",
      description: "Your main editing area. Drag, drop, and edit freely.",
      target: () => canvasRef?.current,
    },
  ];

  const showbtn = path === "menubar" ? { collapsedButtonRender: false } : {};

  useEffect(() => {
    if (tplId) {
      const tpl = savedTemplates?.find((t) => String(t?.id) === tplId);
      if (tpl) setEditorPages(tpl?.pages);
    }
  }, [tplId, savedTemplates]);

  useEffect(() => {
    if (stageRef?.current) {
      stageRef?.current?.width(canvasSize?.w);
      stageRef?.current?.height(canvasSize?.h);
      stageRef?.current?.batchDraw();
    }
  }, [canvasSize]);

  useEffect(() => {
    if (!containerRef?.current) return;

    const resizeObserver = new ResizeObserver(() => {
      setContainerSize({
        w: containerRef?.current?.offsetWidth,
        h: containerRef?.current?.offsetHeight,
      });
    });

    resizeObserver?.observe(containerRef?.current);
    return () => resizeObserver?.disconnect();
  }, []);

  useEffect(() => {
    if (
      !canvasSize?.w ||
      !canvasSize?.h ||
      !containerSize?.w ||
      !containerSize?.h
    )
      return;

    const scaleX = containerSize?.w / canvasSize?.w;
    const scaleY = containerSize?.h / canvasSize?.h;

    const newZoom = Math.min(scaleX, scaleY) * 0.9; // keep 10% padding
    setZoom(newZoom);
  }, [canvasSize, containerSize]);

  useEffect(() => {
    if (!editorPages || editorPages.length === 0) return;

    const serialized = serializeToHTML(editorPages, activeIndex, canvasSize);
    logToConsole(serialized);
  }, [editorPages, activeIndex, canvasSize]);

  const [validationResult, setValidationResult] = useState(null);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationLoading, setValidationLoading] = useState(false);
  const [rawViolations, setRawViolations] = useState([]);

  // Generate image-based preview with violation overlay
  const generateImagePreview = (dataURL, canvasSize, violations, summary) => {
    const { w, h } = canvasSize;
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
            background: #f5f5f5;
            padding: 20px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 16px;
          }
          .stats {
            width: 100%;
            max-width: ${w}px;
            padding: 12px 16px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            display: flex;
            justify-content: space-around;
            flex-wrap: wrap;
            gap: 12px;
          }
          .stat-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
          }
          .stat-value {
            font-size: 24px;
            font-weight: bold;
            color: #1890ff;
          }
          .stat-label {
            font-size: 12px;
            color: #666;
            text-transform: uppercase;
          }
          .canvas-wrapper {
            position: relative;
            max-width: 100%;
            box-shadow: 0 4px 16px rgba(0,0,0,0.12);
            border-radius: 8px;
            overflow: hidden;
          }
          .canvas-image {
            display: block;
            width: 100%;
            height: auto;
            max-width: ${w}px;
          }
          .legend {
            width: 100%;
            max-width: ${w}px;
            padding: 12px 16px;
            border-radius: 8px;
            font-size: 14px;
            text-align: center;
            ${
              violations.length > 0
                ? "background: #fff3cd; border: 1px solid #ffc107; color: #856404;"
                : "background: #d4edda; border: 1px solid #c3e6cb; color: #155724;"
            }
          }
        </style>
      </head>
      <body>
        <div class="stats">
          <div class="stat-item">
            <div class="stat-value">${w}×${h}</div>
            <div class="stat-label">Canvas Size</div>
          </div>
          <div class="stat-item">
            <div class="stat-value" style="color: ${
              violations.length > 0 ? "#ff4d4f" : "#52c41a"
            }">${violations.length}</div>
            <div class="stat-label">Violations</div>
          </div>
          <div class="stat-item">
            <div class="stat-value" style="color: #faad14">${
              summary?.warnings || 0
            }</div>
            <div class="stat-label">Warnings</div>
          </div>
          <div class="stat-item">
            <div class="stat-value" style="color: #52c41a">${
              summary?.autoFixable || 0
            }</div>
            <div class="stat-label">Auto-fixable</div>
          </div>
        </div>
        
        <div class="canvas-wrapper">
          <img src="${dataURL}" alt="Canvas Preview" class="canvas-image" />
        </div>
        
        <div class="legend">
          ${
            violations.length > 0
              ? "<strong>⚠️ Compliance Issues Detected</strong><br/>See details above for specific violations"
              : "<strong>✅ Canvas is Compliant</strong><br/>All checks passed successfully"
          }
        </div>
      </body>
      </html>
    `;
  };

  const handleValidateCanvas = async () => {
    console.log("🚀 [EDITOR] Validate button clicked");
    console.log("📦 Editor Pages:", editorPages);
    console.log("📐 Canvas Size:", canvasSize);

    setValidationLoading(true);

    try {
      // Use our new client-side compliance checker (now async for face detection)
      console.log("🔍 [EDITOR] Starting client-side validation");
      const result = await validateCanvas(editorPages, canvasSize, {
        formatType: "social",
        isAlcohol: false,
        enableFaceDetection: true,
      });

      console.log("✅ [EDITOR] Validation complete:", result);

      // Store raw violations for auto-fix
      setRawViolations(result.violations);

      // Capture canvas preview
      let canvasPreview = result.canvas;
      if (stageRef?.current) {
        try {
          const dataURL = stageRef.current.toDataURL({ pixelRatio: 1.5 });
          canvasPreview = generateImagePreview(
            dataURL,
            canvasSize,
            result.violations,
            result.summary
          );
        } catch (err) {
          console.warn("Could not capture stage image:", err);
        }
      }

      // Transform result to match the expected format for the modal
      const formattedResult = {
        compliant: result.compliant,
        score: result.score,
        issues: result.violations.map((v) => ({
          type: v.rule,
          message: v.message,
          fix: v.autoFixable
            ? "✅ Auto-fix available"
            : v.suggestion || "⚠️ Manual fix required",
          severity: v.severity,
          autoFixable: v.autoFixable,
        })),
        warnings: result.warnings.map((w) => w.message),
        summary: result.summary,
        canvas: canvasPreview,
      };

      setValidationResult(formattedResult);
      setShowValidationModal(true);

      if (result.compliant) {
        message.success(`✓ Design is compliant! Score: ${result.score}/100`);
      } else {
        message.warning(
          `Found ${result.violations.length} compliance issues. Score: ${result.score}/100`
        );
      }
    } catch (error) {
      console.error("❌ [EDITOR] Validation failed:", error);
      message.error("Validation failed: " + error.message);
    } finally {
      setValidationLoading(false);
    }
  };

  const handleAutoFix = () => {
    console.log("🔧 [EDITOR] Auto-fix triggered");
    setValidationLoading(true);

    try {
      console.log(
        `📋 [EDITOR] Applying fixes for ${rawViolations.length} violations`
      );

      const { correctedPages, fixesApplied, remainingIssues } = applyAutoFixes(
        editorPages,
        canvasSize,
        rawViolations
      );

      console.log(
        `✅ [EDITOR] Auto-fix complete: ${fixesApplied} fixes applied, ${remainingIssues.length} remaining`
      );

      // Update the canvas with corrected pages
      setEditorPages(correctedPages);
      setPushHistory(correctedPages);

      message.success(`Applied ${fixesApplied} compliance fixes!`);

      // Close modal if fully compliant
      if (remainingIssues.length === 0) {
        console.log("🎉 [EDITOR] All issues resolved, closing modal");
        setShowValidationModal(false);
        message.success("Design is now compliant!");
      } else {
        console.log("⚠️ [EDITOR] Some issues remain, re-validating");
        // Re-run validation to update the modal
        handleValidateCanvas();
      }
    } catch (error) {
      console.error("❌ [EDITOR] Auto-fix error:", error);
      message.error("Failed to apply fixes: " + error.message);
    } finally {
      setValidationLoading(false);
    }
  };

  const handleMouseDown = useCallback(
    (e) => {
      if (!isPenTool) return;
      isDrawing.current = true;
      const pos = e.target.getStage().getRelativePointerPosition();
      setLines((prev) => [
        ...prev,
        {
          points: [pos?.x, pos?.y],
          color: penColor,
          size: penSize,
          opacity: penOpacity,
          cap: lineCap,
        },
      ]);
    },
    [isPenTool, penColor, penSize, penOpacity, lineCap]
  );

  const handleMouseMove = useCallback(
    (e) => {
      if (!isDrawing.current || !isPenTool) return;
      const stage = e?.target.getStage();
      const point = stage.getRelativePointerPosition();
      setLines((prev) => {
        const lastLine = prev[prev?.length - 1];
        const newLines = prev?.slice();
        lastLine.points = lastLine?.points?.concat([point?.x, point?.y]);
        newLines.splice(prev.length - 1, 1, lastLine);
        return newLines;
      });
    },
    [isPenTool]
  );

  const handleMouseUp = useCallback(() => {
    if (!isPenTool) return;
    isDrawing.current = false;
  }, [isPenTool]);

  const clearAnnotations = () => setLines([]);

  const setPagesWithHistory = (updaterOrPages) => {
    const next =
      typeof updaterOrPages === "function"
        ? updaterOrPages(editorPages)
        : updaterOrPages;
    setTimeout(() => setPushHistory(next), 0);
    setEditorPages(next);
  };

  const setElement = (id, updater) => {
    setPagesWithHistory((prev) => {
      const cp = JSON.parse(JSON.stringify(prev));
      const els = (cp[activeIndex]?.children || [])?.map((el) =>
        el && el?.id === id ? updater(el) : el
      );
      cp[activeIndex] = { ...cp[activeIndex], children: els };
      return cp;
    });
  };

  const openMiniFor = (id) => {
    setSelectedUniqueId(id);
    const el = (activePage?.children || [])?.find((e) => e?.id === id);
    if (el?.type === "text") setPopUp(true);
    else setPopUp(false);
  };

  const deleteSelected = () => {
    if (!selectedUniqueId) return;
    setPagesWithHistory((prev) => {
      const cp = JSON.parse(JSON.stringify(prev));
      const page = cp[activeIndex] || { children: [] };
      page.children = (page?.children || [])?.filter(
        (el) => el?.id !== selectedUniqueId
      );
      cp[activeIndex] = page;
      return cp;
    });
    setSelectedUniqueId(null);
    setPopUp(false);
  };

  const duplicateSelected = () => {
    if (!selectedUniqueId) return;
    const el = (activePage?.children || [])?.find(
      (e) => e?.id === selectedUniqueId
    );
    if (!el) return;
    const id = `${el?.id}-copy-${Date.now()}`;
    const copy = { ...el, id, x: (el?.x || 0) + 20, y: (el?.y || 0) + 20 };
    setPagesWithHistory((prev) => {
      const cp = JSON.parse(JSON.stringify(prev));
      const page = cp[activeIndex] || { children: [] };
      page.children = page?.children || [];
      page?.children?.push(copy);
      cp[activeIndex] = page;
      return cp;
    });
    openMiniFor(id);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      const target = e.target;
      const isInputField =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      if (isInputField) return;

      const isTextEditing =
        selectedEl?.type === "text" &&
        (e.key === "Delete" ||
          e.key === "Backspace" ||
          e.key === "ArrowLeft" ||
          e.key === "ArrowRight" ||
          e.key === "ArrowUp" ||
          e.key === "ArrowDown" ||
          e.key === "Home" ||
          e.key === "End" ||
          e.key === "Enter" ||
          (e.key.length === 1 && !e.ctrlKey && !e.metaKey));

      if (isTextEditing) return;

      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        if (selectedUniqueId) {
          deleteSelected();
        }
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        if (undoRedoFunctionsRef.current?.canUndo) {
          undoRedoFunctionsRef.current.undo();
        }
      }

      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === "y" || (e.shiftKey && e.key === "z"))
      ) {
        e.preventDefault();
        if (undoRedoFunctionsRef.current?.canRedo) {
          undoRedoFunctionsRef.current.redo();
        }
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "c") {
        e.preventDefault();
        if (selectedEl) {
          navigator.clipboard.writeText(JSON.stringify(selectedEl));
        }
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "x") {
        e.preventDefault();
        if (selectedEl) {
          navigator.clipboard.writeText(JSON.stringify(selectedEl));
          deleteSelected();
        }
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "v") {
        e.preventDefault();
        navigator.clipboard.readText().then((text) => {
          try {
            const copiedElement = JSON.parse(text);
            if (copiedElement && copiedElement.type) {
              const newElement = {
                ...copiedElement,
                id: Date.now(),
                x: (copiedElement.x || 0) + 20,
                y: (copiedElement.y || 0) + 20,
              };
              setPagesWithHistory((prev) => {
                const cp = prev.map((page, idx) => {
                  if (idx === activeIndex) {
                    return {
                      ...page,
                      children: [...(page.children || []), newElement],
                    };
                  }
                  return page;
                });
                setTimeout(() => setSelectedUniqueId(newElement.id), 0);
                return cp;
              });
            }
          } catch (err) {
            console.log("Clipboard content is not a valid element");
          }
        });
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "d") {
        e.preventDefault();
        if (selectedUniqueId) {
          duplicateSelected();
        }
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "a") {
        e.preventDefault();
        if (activePage?.children?.length > 0) {
          const lastChild = activePage.children[activePage.children.length - 1];
          setSelectedUniqueId(lastChild.id);
        }
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (stageRef.current) {
          const preview = stageRef.current.toDataURL({ pixelRatio: 0.3 });
          setSaveTemplate({
            id: Date.now(),
            pages: editorPages,
            preview,
          });
        }
      }

      if (e.key === "Escape" && selectedEl?.type !== "text") {
        setSelectedUniqueId(null);
        setPopUp(false);
      }

      if (
        selectedUniqueId &&
        !e.ctrlKey &&
        !e.metaKey &&
        selectedEl?.type !== "text"
      ) {
        const moveDistance = e.shiftKey ? 10 : 1;
        let moved = false;

        if (e.key === "ArrowLeft") {
          e.preventDefault();
          setElement(selectedUniqueId, (el) => ({
            ...el,
            x: (el.x || 0) - moveDistance,
          }));
          moved = true;
        }
        if (e.key === "ArrowRight") {
          e.preventDefault();
          setElement(selectedUniqueId, (el) => ({
            ...el,
            x: (el.x || 0) + moveDistance,
          }));
          moved = true;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setElement(selectedUniqueId, (el) => ({
            ...el,
            y: (el.y || 0) - moveDistance,
          }));
          moved = true;
        }
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setElement(selectedUniqueId, (el) => ({
            ...el,
            y: (el.y || 0) + moveDistance,
          }));
          moved = true;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    selectedUniqueId,
    selectedEl,
    deleteSelected,
    duplicateSelected,
    setPagesWithHistory,
    activeIndex,
    activePage,
    setElement,
    editorPages,
    stageRef,
    setSelectedUniqueId,
    setPopUp,
    setSaveTemplate,
  ]);

  return (
    <>
      <ProLayout
        {...showbtn}
        fixSiderbar={false}
        collapsed={path === "menubar" ? true : collapsed?.child}
        onCollapse={(val) => setCollapsed({ parent: true, child: val })}
        menu={{ hideMenuWhenCollapsed: true }}
        menuHeaderRender={false}
        menuContentRender={() => (
          <div
            ref={sidebarRef}
            style={{ width: "100%", height: "82vh", overflow: "auto" }}
          >
            <Sidebar
              selectedEl={selectedEl}
              setElement={setElement}
              activePage={activePage}
              setPagesWithHistory={setPagesWithHistory}
              openMiniFor={openMiniFor}
              stageRef={stageRef}
            />
          </div>
        )}
      >
        <PageContainer
          content={
            <>
              <Flex
                align="center"
                justify="start"
                gap={12}
                wrap
                style={{
                  background: "white",
                  padding: "12px 20px",
                  borderRadius: 8,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                  border: "1px solid #f0f0f0",
                }}
              >
                <div ref={undoRedoRef}>
                  <UndoRedo
                    pushHistory={pushHistory}
                    undoRedoRef={undoRedoFunctionsRef}
                  />
                </div>
                <div style={{ width: 1, height: 24, background: "#e0e0e0" }} />
                <div ref={colorPickerRef}>
                  <EditorColorPicker
                    setPagesWithHistory={setPagesWithHistory}
                  />
                </div>
                <div style={{ width: 1, height: 24, background: "#e0e0e0" }} />
                <div ref={shareRef}>
                  <Share stageRef={stageRef} />
                </div>
                <div style={{ width: 1, height: 24, background: "#e0e0e0" }} />
                <Tooltip title="Duplicate">
                  <Button
                    ref={duplicateRef}
                    type="text"
                    icon={<IoDuplicateOutline size={18} />}
                    onClick={duplicateSelected}
                    style={{
                      fontSize: 18,
                      color: "#1a1a1a",
                      border: "1px solid #e0e0e0",
                      borderRadius: 6,
                    }}
                  />
                </Tooltip>

                <Tooltip title="Delete">
                  <Button
                    ref={deleteRef}
                    type="text"
                    icon={<RiDeleteBin5Line size={18} />}
                    onClick={deleteSelected}
                    style={{
                      fontSize: 18,
                      color: "#ff4d4f",
                      border: "1px solid #ffccc7",
                      borderRadius: 6,
                    }}
                  />
                </Tooltip>

                <div style={{ width: 1, height: 24, background: "#e0e0e0" }} />

                <Tooltip title="Zoom Out">
                  <Button
                    shape="circle"
                    icon={<GoZoomOut size={16} />}
                    onClick={() => setZoom(Math.max(0.2, zoom - 0.1))}
                    style={{
                      border: "1px solid #e0e0e0",
                      color: "#1a1a1a",
                    }}
                  />
                </Tooltip>

                <Typography
                  style={{
                    textAlign: "center",
                    minWidth: 50,
                    fontWeight: 600,
                    color: "#1a1a1a",
                    fontSize: 14,
                  }}
                >
                  {Math.round(zoom * 100)}%
                </Typography>

                <Tooltip title="Zoom In">
                  <Button
                    shape="circle"
                    icon={<GoZoomIn size={16} />}
                    onClick={() => setZoom(Math.min(3, zoom + 0.1))}
                    style={{
                      border: "1px solid #e0e0e0",
                      color: "#1a1a1a",
                    }}
                  />
                </Tooltip>

                <Tooltip title="Reset Zoom">
                  <Button
                    shape="circle"
                    icon={<SlReload size={16} />}
                    onClick={() => setZoom(1)}
                    style={{
                      border: "1px solid #e0e0e0",
                      color: "#1a1a1a",
                    }}
                  />
                </Tooltip>

                <div style={{ width: 1, height: 24, background: "#e0e0e0" }} />

                <Dropdown
                  placement="top"
                  trigger={["click"]}
                  popupRender={() => (
                    <Flex
                      style={{
                        padding: 12,
                        background: "white",
                        border: "1px solid #e0e0e0",
                        borderRadius: 8,
                        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                      }}
                      gap={10}
                    >
                      <Tooltip title={`Line Color`}>
                        <ColorPicker
                          value={penColor}
                          onChange={(value) => setPenColor(value.toRgbString())}
                        />
                      </Tooltip>

                      <Tooltip title={`Size ${penSize}`}>
                        <input
                          type="range"
                          min={1}
                          max={20}
                          value={penSize}
                          onChange={(e) => setPenSize(Number(e.target.value))}
                        />
                      </Tooltip>

                      <Tooltip title={`Opacity ${penOpacity}`}>
                        <input
                          type="range"
                          min={0.1}
                          max={1}
                          step={0.1}
                          value={penOpacity}
                          onChange={(e) =>
                            setPenOpacity(Number(e.target.value))
                          }
                        />
                      </Tooltip>
                      <Button
                        size="small"
                        type={lineCap === "round" ? "primary" : "default"}
                        onClick={() => setLineCap("round")}
                      >
                        Round
                      </Button>
                      <Button
                        size="small"
                        type={lineCap === "square" ? "primary" : "default"}
                        onClick={() => setLineCap("square")}
                      >
                        Square
                      </Button>
                      <Button size="small" danger onClick={clearAnnotations}>
                        Clear Annotations
                      </Button>
                    </Flex>
                  )}
                >
                  <Button
                    icon={<HiOutlinePencil size={16} />}
                    type={isPenTool ? "primary" : "default"}
                    shape="circle"
                    onClick={() => setIsPenTool((p) => !p)}
                    style={{
                      background: isPenTool ? "#FF6B35" : "white",
                      borderColor: isPenTool ? "#FF6B35" : "#e0e0e0",
                      color: isPenTool ? "white" : "#1a1a1a",
                    }}
                  />
                </Dropdown>

                <Tooltip title="Validate Canvas">
                  <Button
                    type="primary"
                    onClick={handleValidateCanvas}
                    loading={validationLoading}
                    disabled={validationLoading}
                    style={{
                      background: "#52c41a",
                      borderColor: "#52c41a",
                      fontWeight: 600,
                      height: 36,
                      borderRadius: 6,
                    }}
                  >
                    {validationLoading ? "Validating..." : "Validate"}
                  </Button>
                </Tooltip>

                <Tooltip title="Save Template">
                  <Button
                    type="primary"
                    icon={<IoSaveOutline size={16} />}
                    onClick={() => {
                      if (stageRef.current) {
                        const preview = stageRef.current.toDataURL({
                          pixelRatio: 0.3,
                        });
                        setSaveTemplate({
                          id: Date.now(),
                          pages: editorPages,
                          preview,
                        });
                      }
                      navigate("/");
                    }}
                    style={{
                      background: "#FF6B35",
                      borderColor: "#FF6B35",
                      fontWeight: 600,
                      height: 36,
                      borderRadius: 6,
                    }}
                  >
                    Save
                  </Button>
                </Tooltip>

                <Button
                  onClick={() => setOpenTour(true)}
                  style={{
                    border: "1px solid #e0e0e0",
                    color: "#1a1a1a",
                    fontWeight: 500,
                    height: 36,
                    borderRadius: 6,
                  }}
                >
                  Start Tour
                </Button>
              </Flex>
            </>
          }
          footer={
            <div ref={addPageRef}>
              <AddPage setPagesWithHistory={setPagesWithHistory} />
            </div>
          }
          footerToolBarProps={{
            style: {
              width: "100%",
              display: "grid",
              justifyContent: "center",
              padding: "10px",
            },
          }}
          style={{ width: "100%", height: "80vh" }}
        >
          <>
            <div
              ref={canvasRef}
              style={{ width: "100%", height: "68vh", overflow: "auto" }}
            >
              <div ref={containerRef}>
                <Stage
                  ref={stageRef}
                  key={`${canvasSize?.w}x${canvasSize?.h}`}
                  width={canvasSize?.w}
                  height={canvasSize?.h}
                  // scaleX={zoom}
                  // scaleY={zoom}
                  scale={{ x: zoom, y: zoom }}
                  x={(containerSize?.w - canvasSize?.w * zoom) / 2}
                  y={(containerSize?.h - canvasSize?.h * zoom) / 2}
                  style={{
                    // width: canvasSize?.w,
                    background: activePage?.background,
                  }}
                  onMouseDown={(e) => {
                    if (e.target === e.target.getStage()) {
                      setSelectedUniqueId(null);
                      setPopUp(false);
                    }
                    handleMouseDown(e);
                  }}
                  onMousemove={handleMouseMove}
                  onMouseup={handleMouseUp}
                >
                  <Layer>
                    {(activePage?.children || []).map((el) => {
                      let element = { ...el };

                      if (isPenTool) {
                        element["locked"] = true;
                      } else {
                        element["locked"] = el?.locked || false;
                      }

                      return (
                        <EditorLayer
                          el={element}
                          setElement={setElement}
                          stageRef={stageRef}
                        />
                      );
                    })}
                    {lines?.map((line, i) => (
                      <Line
                        key={i}
                        points={line?.points}
                        stroke={line?.color}
                        strokeWidth={line?.size}
                        opacity={line?.opacity}
                        tension={0.5}
                        lineCap={line?.cap}
                        lineJoin="round"
                      />
                    ))}
                  </Layer>
                </Stage>
              </div>
            </div>
          </>
        </PageContainer>
      </ProLayout>

      <Tour open={openTour} onClose={() => setOpenTour(false)} steps={steps} />

      <Modal
        title="Validation Results"
        open={showValidationModal}
        onCancel={() => {
          console.log("🚪 [EDITOR MODAL] Closing validation modal");
          setShowValidationModal(false);
        }}
        width={1000}
        footer={(() => {
          console.log("🔍 [EDITOR MODAL] Rendering footer...");
          console.log("  ↳ validationResult exists?", !!validationResult);
          console.log("  ↳ validationResult:", validationResult);

          if (validationResult) {
            console.log("  ↳ compliant?", validationResult.compliant);
            console.log("  ↳ issues:", validationResult.issues);
            console.log("  ↳ issues.length:", validationResult.issues?.length);

            const hasAutoFixable = validationResult.issues?.some(
              (i) => i.autoFixable
            );
            console.log("  ↳ hasAutoFixable?", hasAutoFixable);

            const showButton =
              validationResult && !validationResult.compliant && hasAutoFixable;
            console.log("  ↳ SHOW AUTO-FIX BUTTON?", showButton);

            if (showButton) {
              console.log("✅ [EDITOR MODAL] AUTO-FIX BUTTON WILL RENDER");
            } else {
              console.log("❌ [EDITOR MODAL] AUTO-FIX BUTTON WILL NOT RENDER");
              console.log(
                "  ↳ Reason: compliant=" +
                  validationResult.compliant +
                  ", hasAutoFixable=" +
                  hasAutoFixable
              );
            }
          } else {
            console.log(
              "❌ [EDITOR MODAL] No validationResult - button will not render"
            );
          }

          return [
            validationResult &&
              !validationResult.compliant &&
              validationResult.issues.some((i) => i.autoFixable) && (
                <Button
                  key="autofix"
                  type="primary"
                  onClick={() => {
                    console.log("🔧 [EDITOR MODAL] Auto-Fix button clicked!");
                    handleAutoFix();
                  }}
                  loading={validationLoading}
                  style={{ background: "#52c41a", borderColor: "#52c41a" }}
                >
                  Auto-Fix Compliance
                </Button>
              ),
            <Button
              key="close"
              onClick={() => {
                console.log("🚪 [EDITOR MODAL] Close button clicked");
                setShowValidationModal(false);
              }}
            >
              Close
            </Button>,
          ];
        })()}
      >
        {validationResult && (
          <Flex vertical gap={16}>
            <Card title="Issues Found" size="small">
              <List
                size="small"
                dataSource={validationResult.issues || []}
                renderItem={(issue) => (
                  <List.Item>
                    <List.Item.Meta
                      title={
                        <span style={{ color: "#ff4d4f" }}>{issue.type}</span>
                      }
                      description={
                        <>
                          <p>
                            <strong>Issue:</strong> {issue.message}
                          </p>
                          <p>
                            <strong>Fix:</strong> {issue.fix}
                          </p>
                        </>
                      }
                    />
                  </List.Item>
                )}
              />
            </Card>

            {validationResult.warnings &&
              validationResult.warnings.length > 0 && (
                <Card
                  title="⚠️ Warnings (Non-Blocking)"
                  size="small"
                  style={{ borderColor: "#faad14" }}
                >
                  <List
                    size="small"
                    dataSource={validationResult.warnings || []}
                    renderItem={(warning, idx) => (
                      <List.Item>
                        <List.Item.Meta
                          title={
                            <span style={{ color: "#faad14" }}>
                              PEOPLE_DETECTED
                            </span>
                          }
                          description={
                            <>
                              <p>
                                <strong>Warning:</strong>{" "}
                                {typeof warning === "string"
                                  ? warning
                                  : warning.message || JSON.stringify(warning)}
                              </p>
                              <p>
                                <em>
                                  This is a warning only and does not block
                                  export.
                                </em>
                              </p>
                            </>
                          }
                        />
                      </List.Item>
                    )}
                  />
                </Card>
              )}

            <Card title="Validated HTML Preview" size="small">
              <div
                style={{
                  border: "1px solid #d9d9d9",
                  borderRadius: 4,
                  padding: 16,
                  maxHeight: 400,
                  overflow: "auto",
                }}
              >
                <iframe
                  srcDoc={validationResult.canvas}
                  style={{
                    width: "100%",
                    height: "400px",
                    border: "none",
                  }}
                  title="Validated HTML Preview"
                />
              </div>
            </Card>
          </Flex>
        )}
      </Modal>
    </>
  );
}
