/**
 * StickerLibrary - Sidebar Panel for Sticker Management
 *
 * Features:
 * - Browse stickers by category
 * - One-click insertion with smart positioning
 * - Visual preview
 * - Compliance indicators
 */
import { useState } from "react";
import { Card, Tabs, Button, Space, Tag, Tooltip, message, Empty } from "antd";
import {
  PlusOutlined,
  CheckCircleOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import {
  STICKERS,
  STICKER_CATEGORIES,
  getStickersByCategory,
  getRequiredStickers,
} from "../config/stickerConfig";
import { useEditorStore } from "../store/useEditorStore";
import Sticker from "./Sticker";

const { TabPane } = Tabs;

export default function StickerLibrary({ setPagesWithHistory }) {
  const [activeStickers, setActiveStickers] = useState(new Set());
  const [activeCategory, setActiveCategory] = useState(STICKER_CATEGORIES.TAGS);

  const canvasSize = useEditorStore((state) => state.canvasSize);
  const editorPages = useEditorStore((state) => state.editorPages);
  const activeIndex = useEditorStore((state) => state.activeIndex);

  /**
   * Check if sticker is already on canvas
   */
  const isStickerOnCanvas = (stickerId) => {
    const page = editorPages[activeIndex];
    if (!page || !page.children) return false;

    return page.children.some(
      (child) => child.type === "sticker" && child.stickerId === stickerId
    );
  };

  /**
   * Insert sticker onto canvas
   */
  const handleInsertSticker = (stickerId) => {
    console.log("=".repeat(80));
    console.log("[STICKER_LIBRARY] 🎯 Insert button clicked");
    console.log(`[STICKER_LIBRARY] Sticker ID: ${stickerId}`);
    console.log(`[STICKER_LIBRARY] Active page index: ${activeIndex}`);
    console.log(`[STICKER_LIBRARY] Canvas size:`, canvasSize);
    console.log(`[STICKER_LIBRARY] Current page:`, editorPages[activeIndex]);

    if (isStickerOnCanvas(stickerId)) {
      console.log(
        `[STICKER_LIBRARY] ⚠️ Sticker ${stickerId} already on canvas`
      );
      message.warning("This sticker is already on the canvas");
      return;
    }

    console.log(
      `[STICKER_LIBRARY] ✅ Adding sticker ${stickerId} to activeStickers set`
    );
    setActiveStickers((prev) => {
      const updated = new Set(prev).add(stickerId);
      console.log(
        `[STICKER_LIBRARY] Active stickers now:`,
        Array.from(updated)
      );
      return updated;
    });
    message.success("Sticker added! You can drag it to reposition.");
  };

  /**
   * Remove sticker from canvas
   */
  const handleRemoveSticker = (stickerId) => {
    console.log("=".repeat(80));
    console.log("[STICKER_LIBRARY] 🗑️ Remove button clicked");
    console.log(`[STICKER_LIBRARY] Removing sticker: ${stickerId}`);

    setPagesWithHistory((prev) => {
      const copy = JSON.parse(JSON.stringify(prev));
      if (copy[activeIndex] && copy[activeIndex].children) {
        const beforeCount = copy[activeIndex].children.length;
        copy[activeIndex].children = copy[activeIndex].children.filter(
          (child) =>
            !(child.type === "sticker" && child.stickerId === stickerId)
        );
        const afterCount = copy[activeIndex].children.length;
        console.log(
          `[STICKER_LIBRARY] Removed ${
            beforeCount - afterCount
          } sticker element(s)`
        );
      }
      return copy;
    });

    setActiveStickers((prev) => {
      const updated = new Set(prev);
      updated.delete(stickerId);
      console.log(
        `[STICKER_LIBRARY] Active stickers now:`,
        Array.from(updated)
      );
      return updated;
    });

    message.info("Sticker removed");
  };

  /**
   * Render individual sticker card
   */
  const renderStickerCard = (sticker) => {
    const isOnCanvas = isStickerOnCanvas(sticker.id);
    const isRequired = sticker.compliance.required;

    return (
      <Card
        key={sticker.id}
        size="small"
        style={{
          marginBottom: 12,
          border: isOnCanvas ? "2px solid #52c41a" : "1px solid #d9d9d9",
        }}
        bodyStyle={{ padding: 12 }}
      >
        <Space direction="vertical" style={{ width: "100%" }} size="small">
          {/* Preview Image */}
          <div
            style={{
              width: "100%",
              height: 80,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#f5f5f5",
              borderRadius: 4,
              overflow: "hidden",
            }}
          >
            <img
              src={sticker.src}
              alt={sticker.name}
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
                objectFit: "contain",
              }}
            />
          </div>

          {/* Name and Tags */}
          <div>
            <div
              style={{
                fontWeight: 600,
                fontSize: 13,
                marginBottom: 4,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              {sticker.name}
              {isRequired && (
                <Tooltip title="Required for compliance">
                  <WarningOutlined style={{ color: "#faad14", fontSize: 12 }} />
                </Tooltip>
              )}
            </div>
            <div style={{ fontSize: 11, color: "#666", marginBottom: 6 }}>
              {sticker.description}
            </div>

            {/* Compliance Tag */}
            {sticker.compliance.satisfiesRule && (
              <Tag
                icon={<CheckCircleOutlined />}
                color="success"
                style={{ fontSize: 10, padding: "2px 6px" }}
              >
                {sticker.compliance.satisfiesRule}
              </Tag>
            )}
          </div>

          {/* Action Button */}
          {isOnCanvas ? (
            <Button
              danger
              size="small"
              block
              onClick={() => handleRemoveSticker(sticker.id)}
            >
              Remove
            </Button>
          ) : (
            <Button
              type="primary"
              size="small"
              block
              icon={<PlusOutlined />}
              onClick={() => handleInsertSticker(sticker.id)}
              style={{ background: "#1890ff" }}
            >
              Add to Canvas
            </Button>
          )}
        </Space>
      </Card>
    );
  };

  /**
   * Render category tab content
   */
  const renderCategoryContent = (category) => {
    const stickers = getStickersByCategory(category);

    if (stickers.length === 0) {
      return (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="No stickers in this category"
          style={{ marginTop: 40 }}
        />
      );
    }

    return (
      <div style={{ padding: "8px 0" }}>
        {stickers.map((sticker) => renderStickerCard(sticker))}
      </div>
    );
  };

  return (
    <>
      <Card
        title="🎨 Sticker Library"
        size="small"
        style={{ marginBottom: 16 }}
        bodyStyle={{ padding: "12px 16px" }}
      >
        <Tabs
          activeKey={activeCategory}
          onChange={setActiveCategory}
          size="small"
          tabPosition="top"
        >
          <TabPane tab="🏷️ Tags" key={STICKER_CATEGORIES.TAGS}>
            {renderCategoryContent(STICKER_CATEGORIES.TAGS)}
          </TabPane>
          <TabPane tab="⚖️ Legal" key={STICKER_CATEGORIES.LEGAL}>
            {renderCategoryContent(STICKER_CATEGORIES.LEGAL)}
          </TabPane>
          <TabPane tab="💳 Clubcard" key={STICKER_CATEGORIES.CLUBCARD}>
            {renderCategoryContent(STICKER_CATEGORIES.CLUBCARD)}
          </TabPane>
          <TabPane tab="🎯 Promos" key={STICKER_CATEGORIES.PROMOS}>
            {renderCategoryContent(STICKER_CATEGORIES.PROMOS)}
          </TabPane>
        </Tabs>

        {/* Helper Text */}
        <div
          style={{
            marginTop: 12,
            padding: 8,
            background: "#f0f2f5",
            borderRadius: 4,
            fontSize: 11,
            color: "#666",
          }}
        >
          💡 <strong>Tip:</strong> Stickers are auto-positioned in safe zones.
          Drag to adjust placement after insertion.
        </div>
      </Card>

      {/* Render active sticker components (hidden, logic only) */}
      {Array.from(activeStickers).map((stickerId) => (
        <div key={stickerId} style={{ display: "none" }}>
          <Sticker
            stickerId={stickerId}
            setPagesWithHistory={setPagesWithHistory}
          />
        </div>
      ))}
    </>
  );
}
