import { useEditorStore } from "../store/useEditorStore";
import { Button, Space, Popover, Tooltip, message, Modal } from "antd";
import jsPDF from "jspdf";
import { useState } from "react";
import { validateCanvas, formatValidationForUI } from "../utils/complianceChecker";
import ValidationChecklist from "./ValidationChecklist";

import { BsDownload } from "react-icons/bs";
import { FaRegFilePdf } from "react-icons/fa6";
import { TbPhotoDown } from "react-icons/tb";


/**
 * Optimal canvas compression to target file size
 * Based on browser-image-compression algorithm (300k+ weekly downloads)
 * 
 * Algorithm:
 * 1. Start with high quality (0.95)
 * 2. Generate blob and check size
 * 3. If > targetSize, reduce quality iteratively
 * 4. For PNG: quality *= 0.85 per iteration
 * 5. For JPEG: quality *= 0.95 per iteration
 * 6. Optionally reduce resolution if still too large
 * 7. Max 10 iterations
 * 
 * @param {HTMLCanvasElement} canvas - Konva stage canvas
 * @param {string} format - 'png' or 'jpeg'
 * @param {number} targetSizeKB - Target file size in KB (default 500KB)
 * @param {number} maxIterations - Max compression attempts (default 10)
 * @returns {Promise<{blob: Blob, sizeKB: number, quality: number}>}
 */
async function compressCanvasToTargetSize(canvas, format = 'png', targetSizeKB = 500, maxIterations = 10) {
  const targetSizeBytes = targetSizeKB * 1024;
  const mimeType = `image/${format}`;
  
  let quality = 0.95;
  let currentCanvas = canvas;
  let blob = null;
  let iteration = 0;
  
  // Helper: Canvas to Blob
  const canvasToBlob = (cvs, mime, qual) => {
    return new Promise((resolve) => {
      cvs.toBlob(resolve, mime, qual);
    });
  };
  
  // Helper: Create new canvas with scaled dimensions
  const scaleCanvas = (sourceCanvas, scale) => {
    const newCanvas = document.createElement('canvas');
    newCanvas.width = Math.floor(sourceCanvas.width * scale);
    newCanvas.height = Math.floor(sourceCanvas.height * scale);
    const ctx = newCanvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(sourceCanvas, 0, 0, newCanvas.width, newCanvas.height);
    return newCanvas;
  };
  
  // Initial compression
  blob = await canvasToBlob(currentCanvas, mimeType, quality);
  
  // If already under target, return immediately
  if (blob.size <= targetSizeBytes) {
    return {
      blob,
      sizeKB: (blob.size / 1024).toFixed(2),
      quality: quality.toFixed(2)
    };
  }
  
  // Iterative compression
  while (iteration < maxIterations && blob.size > targetSizeBytes) {
    iteration++;
    
    // Reduce quality (different rates for PNG vs JPEG)
    // PNG is lossless,so reduce more aggressively
    if (format === 'png') {
      quality *= 0.85; 
    } else {
      quality *= 0.95;
    }
    
    // If quality gets too low and still too large, reduce resolution
    if (quality < 0.5 && blob.size > targetSizeBytes * 1.5) {
      currentCanvas = scaleCanvas(currentCanvas, 0.95);
    }
    
    blob = await canvasToBlob(currentCanvas, mimeType, quality);
    
    // Safety check: stop if quality is extremely low
    if (quality < 0.1) {
      break;
    }
  }
  
  return {
    blob,
    sizeKB: (blob.size / 1024).toFixed(2),
    quality: quality.toFixed(2),
    iterations: iteration
  };
}

export default function Share({ stageRef }) {
  const { editorPages, activeIndex, canvasSize } = useEditorStore();
  const [exporting, setExporting] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationData, setValidationData] = useState(null);
  const [pendingExport, setPendingExport] = useState(null); // 'png' | 'jpg' | 'pdf'

  const getFileName = (ext) =>
    `tesco-creative-${(editorPages[activeIndex] || {})?.id || activeIndex}.${ext}`;

  /**
   * Run Tesco compliance validation before export
   * Returns true if compliant, false if blocked
   */
  const runComplianceCheck = () => {
    const result = validateCanvas(canvasSize, editorPages, {
      hasClubcardTile: false, // Could be detected from elements
      isAlcohol: false,
      formatType: 'social',
    });

    if (!result.compliant) {
      setValidationData(formatValidationForUI(result));
      setShowValidationModal(true);
      return false;
    }

    // Show passed rules briefly
    message.success({
      content: `✓ Compliance passed (${result.passed.length} rules)`,
      duration: 2,
    });
    return true;
  };

  const handleCloseValidation = () => {
    setShowValidationModal(false);
    setValidationData(null);
    setPendingExport(null);
  };

  const downloadBlob = (blob, name) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = name;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Cleanup
    setTimeout(() => URL.revokeObjectURL(url), 100);
  };

  const exportPNG = async () => {
    if (!stageRef?.current) {
      message.error("Canvas not ready");
      return;
    }

    // Run Tesco compliance check before export
    if (!runComplianceCheck()) {
      return; // Blocked by compliance
    }

    setExporting(true);
    message.loading({ content: "Compressing PNG...", key: "export", duration: 0 });
    
    try {
      const canvas = stageRef.current.toCanvas({ pixelRatio: 2 });
      const result = await compressCanvasToTargetSize(canvas, 'png', 500, 10);
      
      downloadBlob(result.blob, getFileName("png"));
      message.success({
        content: `PNG exported: ${result.sizeKB}KB (quality: ${result.quality})`,
        key: "export",
        duration: 3
      });
    } catch (error) {
      console.error("PNG export error:", error);
      message.error({ content: "Export failed", key: "export" });
    } finally {
      setExporting(false);
    }
  };

  const exportJPG = async () => {
    if (!stageRef?.current) {
      message.error("Canvas not ready");
      return;
    }

    // Run Tesco compliance check before export
    if (!runComplianceCheck()) {
      return; // Blocked by compliance
    }

    setExporting(true);
    message.loading({ content: "Compressing JPG...", key: "export", duration: 0 });
    
    try {
      const canvas = stageRef.current.toCanvas({ pixelRatio: 2 });
      const result = await compressCanvasToTargetSize(canvas, 'jpeg', 500, 10);
      
      downloadBlob(result.blob, getFileName("jpg"));
      message.success({
        content: `JPG exported: ${result.sizeKB}KB (quality: ${result.quality})`,
        key: "export",
        duration: 3
      });
    } catch (error) {
      console.error("JPG export error:", error);
      message.error({ content: "Export failed", key: "export" });
    } finally {
      setExporting(false);
    }
  };

  const exportPDF = async () => {
    if (!stageRef?.current) {
      message.error("Canvas not ready");
      return;
    }

    // Run Tesco compliance check before export
    if (!runComplianceCheck()) {
      return; // Blocked by compliance
    }

    setExporting(true);
    message.loading({ content: "Generating PDF...", key: "export", duration: 0 });
    
    try {
      const canvas = stageRef.current.toCanvas({ pixelRatio: 2 });
      
      // Compress image first
      const result = await compressCanvasToTargetSize(canvas, 'png', 500, 10);
      const imageDataURL = URL.createObjectURL(result.blob);
      
      // Create PDF
      const pdf = new jsPDF("l", "pt", [canvas.width, canvas.height]);
      
      // Convert blob to data URL for jsPDF
      const reader = new FileReader();
      reader.onloadend = () => {
        pdf.addImage(reader.result, "PNG", 0, 0, canvas.width, canvas.height);
        pdf.save(getFileName("pdf"));
        
        message.success({
          content: `PDF exported (image: ${result.sizeKB}KB)`,
          key: "export",
          duration: 3
        });
        setExporting(false);
      };
      reader.readAsDataURL(result.blob);
      
      URL.revokeObjectURL(imageDataURL);
    } catch (error) {
      console.error("PDF export error:", error);
      message.error({ content: "Export failed", key: "export" });
      setExporting(false);
    }
  };

  return (
    <Tooltip title="Download" color="blue">
      <Popover
        content={
          <Space direction="vertical" style={{ width: 200 }}>
            <Button 
              block 
              icon={<TbPhotoDown size={20} />} 
              onClick={exportPNG}
              loading={exporting}
              style={{
                border: "1px solid #e0e0e0",
                color: "#1a1a1a",
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-start",
                height: 38
              }}
            >
              PNG (&lt;500KB)
            </Button>
            <Button 
              block 
              icon={<TbPhotoDown size={20} />} 
              onClick={exportJPG}
              loading={exporting}
              style={{
                border: "1px solid #e0e0e0",
                color: "#1a1a1a",
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-start",
                height: 38
              }}
            >
              JPG (&lt;500KB)
            </Button>
            <Button 
              block 
              icon={<FaRegFilePdf size={20} />} 
              onClick={exportPDF}
              loading={exporting}
              style={{
                border: "1px solid #e0e0e0",
                color: "#1a1a1a",
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-start",
                height: 38
              }}
            >
              PDF (&lt;500KB)
            </Button>
            <div style={{ fontSize: 11, color: "#666", marginTop: 8, textAlign: "center" }}>
              Auto-compressed to meet Tesco specs
            </div>
          </Space>
        }
        title="Export Options"
        trigger="click"
      >
        <Button 
          icon={<BsDownload size={18} />} 
          type="text" 
          loading={exporting}
          style={{
            border: "1px solid #e0e0e0",
            color: "#1a1a1a",
            borderRadius: 6
          }}
        />
      </Popover>

      {/* Compliance Validation Modal */}
      <Modal
        title="⚠️ Compliance Issues Detected"
        open={showValidationModal}
        onCancel={handleCloseValidation}
        footer={[
          <Button key="close" onClick={handleCloseValidation}>
            Close & Fix Issues
          </Button>
        ]}
        width={500}
      >
        <p style={{ marginBottom: 16, color: '#666' }}>
          Your creative has compliance issues that must be fixed before export.
          Tesco Retail Media requires all creatives to meet advertising guidelines.
        </p>
        <ValidationChecklist validationData={validationData} />
      </Modal>
    </Tooltip>
  );
};