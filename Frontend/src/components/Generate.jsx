import { useState, useCallback, useEffect } from "react";
import { Button, message, Input, Divider, Flex, Image, Skeleton, Collapse } from "antd";
import { useEditorStore } from "../store/useEditorStore";
import HeadlineGenerator from "./HeadlineGenerator";

import { CiCirclePlus } from "react-icons/ci";
import { MdAutoAwesome } from "react-icons/md";
import { BulbOutlined } from "@ant-design/icons";

// Simple unique ID generator (no external dependency)
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;


// Direct Agent API (on port 8001)
const AGENT_URL = "http://localhost:8001";

export default function Generate({ setPagesWithHistory }) {
  const { 
    activeIndex, 
    canvasSize, 
    editorPages,
    selectedUniqueId 
  } = useEditorStore();
  
  const [processing, setProcessing] = useState(false);
  const [generatingVariations, setGeneratingVariations] = useState(false);
  const [userprompt, setUserprompt] = useState("");
  const [variations, setVariations] = useState([]);
  const [loadingStyles, setLoadingStyles] = useState([]); // Track which styles are loading
  const [canvasImageBase64, setCanvasImageBase64] = useState(null);

  // Get selected element from current page - MUST be defined BEFORE callbacks that use it
  const activePage = editorPages?.[activeIndex] || { children: [] };
  const selectedEl = activePage?.children?.find((el) => el?.id === selectedUniqueId);

  // Find first image on canvas
  const firstImageOnCanvas = activePage?.children?.find(el => el.type === 'image');

  // Detect logo position for smart placement
  const detectedLogoPosition = (() => {
    const logo = activePage?.children?.find(el => el.id && el.id.startsWith('logo-'));
    if (!logo) return 'bottom-right'; // Default to "riskiest" spot if unknown

    const cx = logo.x + (logo.width / 2);
    const cy = logo.y + (logo.height / 2);
    const midX = (canvasSize?.w || 800) / 2;
    const midY = (canvasSize?.h || 600) / 2;

    if (cy < midY) {
      return cx < midX ? 'top-left' : 'top-right';
    } else {
      return cx < midX ? 'bottom-left' : 'bottom-right';
    }
  })();

  // Calculate image bounds for TescoLogo-style placement
  const imageBounds = (() => {
    const mainImage = activePage?.children?.find(el => 
      el.type === 'image' && !el.id?.startsWith('logo-')
    );
    if (mainImage) {
      console.log('📐 [GENERATE] Main Image Found:');
      console.log('   ├─ ID:', mainImage.id);
      console.log('   ├─ x:', mainImage.x);
      console.log('   ├─ y:', mainImage.y);
      console.log('   ├─ width:', mainImage.width);
      console.log('   ├─ height:', mainImage.height);
      console.log('   └─ scaleX/Y:', mainImage.scaleX, mainImage.scaleY);
      
      // Use actual rendered dimensions (accounting for scale)
      const scaleX = mainImage.scaleX || 1;
      const scaleY = mainImage.scaleY || 1;
      const width = (mainImage.width || canvasSize?.w || 800) * scaleX;
      const height = (mainImage.height || canvasSize?.h || 600) * scaleY;
      
      const bounds = {
        x: mainImage.x || 0,
        y: mainImage.y || 0,
        width: width,
        height: height
      };
      console.log('📐 [GENERATE] Calculated Bounds:', bounds);
      return bounds;
    }
    console.warn('⚠️ [GENERATE] No main image found, will use canvas bounds');
    return null; // Will use canvas bounds as fallback
  })();

  // Auto-detect and capture canvas image when it changes
  useEffect(() => {
    const loadCanvasImage = async () => {
      if (firstImageOnCanvas?.src && !canvasImageBase64) {
        console.log('🔄 [GENERATE] Auto-loading canvas image...');
        try {
          const response = await fetch(firstImageOnCanvas.src);
          const blob = await response.blob();
          const reader = new FileReader();
          reader.onloadend = () => {
            console.log('✅ [GENERATE] Canvas image loaded automatically');
            setCanvasImageBase64(reader.result);
          };
          reader.readAsDataURL(blob);
        } catch (e) {
          console.error('Failed to auto-load canvas image:', e);
        }
      }
    };
    loadCanvasImage();
  }, [firstImageOnCanvas?.src]);

  // Convert blob/http URL to base64 (defined early for use in callbacks)
  const urlToBase64 = async (url) => {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Helper function to get canvas image as base64
  const getCanvasImage = useCallback(async () => {
    // Find the first image element on canvas
    const imageElement = activePage?.children?.find(el => el.type === 'image');
    if (imageElement?.src) {
      try {
        const base64 = await urlToBase64(imageElement.src);
        setCanvasImageBase64(base64);
        return base64;
      } catch (e) {
        console.error('Failed to convert image to base64:', e);
      }
    }
    return null;
  }, [activePage]);
  // Debug: Log active page content changes
  useEffect(() => {
    if (activePage?.children) {
      console.log('🖼️ [GENERATE] Active page updated. Item count:', activePage.children.length);
      const lastItem = activePage.children[activePage.children.length - 1];
      if (lastItem) {
        console.log('🖼️ [GENERATE] Last item added:', lastItem.type, lastItem.text || lastItem.id);
      }
    }
  }, [activePage]);

  // Add headline to canvas (replaces existing headline)
  const handleAddHeadline = useCallback((text, position) => {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('➕ [GENERATE] Adding headline to canvas:', text);
    console.log('➕ [GENERATE] Position received:', position);
    console.log('═══════════════════════════════════════════════════════════════');
    
    // Use bold property (SelectableText uses bold/italic booleans, not fontStyle)
    const isBold = position?.fontWeight >= 600 || position?.fontWeight === 'bold' || position?.fontWeight === 700;
    
    const newTextElement = {
      id: `headline-${generateId()}`,
      type: 'text',
      text: text,
      x: position?.x || 50, // Simple left padding as default
      y: position?.y || 80,
      fontSize: position?.fontSize || 42,
      fill: position?.color || '#FFFFFF',
      fontFamily: position?.fontFamily || 'Inter, Arial, sans-serif',
      bold: isBold, // SelectableText uses bold: true/false, not fontStyle
      italic: false,
      align: position?.align || 'center',
      width: position?.width || (canvasSize?.w ? canvasSize.w * 0.8 : 600), // 80% of canvas
      wrap: 'word', // Important: enable word wrapping
      draggable: true,
      // Smart Styling
      shadowEnabled: position?.shadowEnabled !== false,
      shadowColor: position?.shadowColor || 'rgba(0,0,0,0.5)',
      shadowBlur: position?.shadowBlur || 4,
      shadowOffsetX: 2,
      shadowOffsetY: 2
    };
    
    console.log('➕ [GENERATE] Text Element Created:');
    console.log('   ├─ X:', newTextElement.x);
    console.log('   ├─ Y:', newTextElement.y);
    console.log('   ├─ WIDTH:', newTextElement.width);
    console.log('   ├─ Font Size:', newTextElement.fontSize);
    console.log('   ├─ Font Family:', newTextElement.fontFamily);
    console.log('   ├─ Align:', newTextElement.align);
    console.log('   └─ Fill:', newTextElement.fill);
    
    setPagesWithHistory(prev => {
      // Deep copy to break references
      const cp = JSON.parse(JSON.stringify(prev));
      const pageIndex = activeIndex >= 0 && activeIndex < cp.length ? activeIndex : 0;
      
      if (!cp[pageIndex]) {
        console.error('❌ [GENERATE] Active page index invalid:', activeIndex);
        return prev;
      }

      // REMOVE existing headlines first (replace behavior)
      const existingHeadlines = cp[pageIndex].children.filter(el => el.id?.startsWith('headline-'));
      if (existingHeadlines.length > 0) {
        console.log('🗑️ [GENERATE] Removing', existingHeadlines.length, 'existing headline(s)');
        cp[pageIndex].children = cp[pageIndex].children.filter(el => !el.id?.startsWith('headline-'));
      }

      cp[pageIndex].children.push(newTextElement);
      console.log(`✅ [GENERATE] Added headline "${text.substring(0,10)}..." to page ${pageIndex}`);
      return cp;
    });
    
    message.success('Headline added to canvas!');
  }, [canvasSize, setPagesWithHistory, activeIndex]);

  // Add subheading to canvas (replaces existing subheading)
  const handleAddSubheading = useCallback((text, position) => {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('➕ [GENERATE] Adding subheading to canvas:', text);
    console.log('➕ [GENERATE] Position received:', position);
    console.log('═══════════════════════════════════════════════════════════════');
    
    // Use bold property (SelectableText uses bold/italic booleans, not fontStyle)
    const isBold = position?.fontWeight >= 600 || position?.fontWeight === 'bold';
    
    const newTextElement = {
      id: `subheading-${generateId()}`,
      type: 'text',
      text: text,
      x: position?.x || 50, // Simple left padding as default
      y: position?.y || 140,
      fontSize: position?.fontSize || 24,
      fill: position?.color || '#FFFFFF',
      fontFamily: position?.fontFamily || 'Open Sans, Arial, sans-serif',
      bold: isBold, // SelectableText uses bold: true/false, not fontStyle
      italic: false,
      align: position?.align || 'center',
      width: position?.width || (canvasSize?.w ? canvasSize.w * 0.8 : 600), // 80% of canvas
      wrap: 'word', // Important: enable word wrapping
      draggable: true,
      // Smart Styling
      shadowEnabled: position?.shadowEnabled !== false,
      shadowColor: position?.shadowColor || 'rgba(0,0,0,0.5)',
      shadowBlur: position?.shadowBlur || 3,
      shadowOffsetX: 1,
      shadowOffsetY: 1
    };
    
    console.log('➕ [GENERATE] Subheading Element Created:');
    console.log('   ├─ X:', newTextElement.x);
    console.log('   ├─ Y:', newTextElement.y);
    console.log('   ├─ WIDTH:', newTextElement.width);
    console.log('   ├─ Font Size:', newTextElement.fontSize);
    console.log('   ├─ Font Style:', newTextElement.fontStyle);
    console.log('   ├─ Align:', newTextElement.align);
    console.log('   └─ Fill:', newTextElement.fill);
    
    setPagesWithHistory(prev => {
      const cp = JSON.parse(JSON.stringify(prev));
      const pageIndex = activeIndex >= 0 && activeIndex < cp.length ? activeIndex : 0;
      
      // REMOVE existing subheadings first (replace behavior)
      const existingSubheadings = cp[pageIndex].children.filter(el => el.id?.startsWith('subheading-'));
      if (existingSubheadings.length > 0) {
        console.log('🗑️ [GENERATE] Removing', existingSubheadings.length, 'existing subheading(s)');
        cp[pageIndex].children = cp[pageIndex].children.filter(el => !el.id?.startsWith('subheading-'));
      }
      
      cp[pageIndex].children.push(newTextElement);
      console.log(`✅ [GENERATE] Added subheading "${text.substring(0,10)}..." to page ${pageIndex}`);
      return cp;
    });
    
    message.success('Subheading added to canvas!');
  }, [canvasSize, setPagesWithHistory, activeIndex]);




  // Get base64 data without prefix
  const getBase64Data = (dataUrl) => {
    return dataUrl.split(",")[1];
  };

  // Replace selected image on canvas
  const replaceSelectedImage = (src) => {
    const originalId = selectedEl.id;
    setPagesWithHistory((prev) => {
      const cp = JSON.parse(JSON.stringify(prev));
      const page = cp[activeIndex];
      if (page?.children) {
        const idx = page.children.findIndex((el) => el.id === originalId);
        if (idx !== -1) {
          page.children[idx] = { ...page.children[idx], src };
        }
      }
      return cp;
    });
  };

  // Handle remove background (direct Agent API)
  const handleRemoveBackground = async () => {
    console.log("=".repeat(60));
    console.log("[FRONTEND DEBUG] handleRemoveBackground called");
    console.log("=".repeat(60));
    
    console.log("[FRONTEND DEBUG] Selected element:", selectedEl);
    console.log("[FRONTEND DEBUG] Selected element type:", selectedEl?.type);
    console.log("[FRONTEND DEBUG] Selected element src exists:", !!selectedEl?.src);
    
    if (!selectedEl?.src || selectedEl?.type !== "image") {
      console.log("[FRONTEND DEBUG] No valid image selected - aborting");
      message.warning("Please select an image first");
      return;
    }

    setProcessing(true);
    message.loading({ content: "🔄 Removing background...", key: "gen", duration: 0 });

    try {
      let imageSrc = selectedEl.src;
      console.log("[FRONTEND DEBUG] Original image src type:", imageSrc.substring(0, 30) + "...");
      
      // Convert to base64 if needed
      if (imageSrc.startsWith("blob:") || imageSrc.startsWith("http")) {
        console.log("[FRONTEND DEBUG] Converting blob/http URL to base64...");
        imageSrc = await urlToBase64(imageSrc);
        console.log("[FRONTEND DEBUG] Conversion complete, new src type:", imageSrc.substring(0, 30) + "...");
      }
      
      if (!imageSrc.startsWith("data:")) {
        console.log("[FRONTEND DEBUG] ERROR: Invalid image format after conversion");
        throw new Error("Invalid image format");
      }

      // Extract base64 data
      const base64Data = getBase64Data(imageSrc);
      console.log("[FRONTEND DEBUG] Base64 data length:", base64Data.length);

      // Call Agent's /remove-bg with file_path (actually base64 in JSON)
      // Agent accepts file upload, so we need to use FormData
      console.log("[FRONTEND DEBUG] Creating blob from data URL...");
      const blob = await fetch(imageSrc).then(r => r.blob());
      console.log("[FRONTEND DEBUG] Blob created, size:", blob.size, "type:", blob.type);
      
      const formData = new FormData();
      formData.append("file", blob, "image.png");
      console.log("[FRONTEND DEBUG] FormData created with file");

      console.log("[FRONTEND DEBUG] Calling Agent API:", `${AGENT_URL}/remove-bg`);
      console.log("[FRONTEND DEBUG] Sending POST request...");
      
      const response = await fetch(`${AGENT_URL}/remove-bg`, {
        method: "POST",
        body: formData,
      });

      console.log("[FRONTEND DEBUG] Response received:");
      console.log("[FRONTEND DEBUG] - Status:", response.status);
      console.log("[FRONTEND DEBUG] - StatusText:", response.statusText);
      console.log("[FRONTEND DEBUG] - OK:", response.ok);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.log("[FRONTEND DEBUG] ERROR response body:", errorData);
        throw new Error(errorData.detail || `API Error: ${response.status}`);
      }

      console.log("[FRONTEND DEBUG] Parsing JSON response...");
      const result = await response.json();
      console.log("[FRONTEND DEBUG] Response parsed:");
      console.log("[FRONTEND DEBUG] - success:", result.success);
      console.log("[FRONTEND DEBUG] - has image_data:", !!result.image_data);
      console.log("[FRONTEND DEBUG] - image_data length:", result.image_data?.length || 0);
      console.log("[FRONTEND DEBUG] - format:", result.format);
      
            if (!result.success || !result.image_data) {
        console.log("[FRONTEND DEBUG] ERROR: No valid image data in response");
        console.log("[FRONTEND DEBUG] - result success:", result.success);
        console.log("[FRONTEND DEBUG] - result image_data length:", result.image_data?.length);
        throw new Error("No image data returned from Agent");
      }

      // Agent returns base64, convert to data URL
      const dataUrl = `data:image/png;base64,${result.image_data}`;
      console.log("[FRONTEND DEBUG] Created data URL, length:", dataUrl.length);
      
      console.log("[FRONTEND DEBUG] Replacing selected image on canvas...");
      replaceSelectedImage(dataUrl);
      
      console.log("=".repeat(60));
      console.log("[FRONTEND DEBUG] Background removal SUCCESS!");
      console.log("=".repeat(60));
      message.success({ content: "✅ Background removed!", key: "gen", duration: 2 });

    } catch (error) {
      console.log("=".repeat(60));
      console.log("[FRONTEND DEBUG] ERROR in handleRemoveBackground:");
      console.log("[FRONTEND DEBUG] - Error type:", error.name);
      console.log("[FRONTEND DEBUG] - Error message:", error.message);
      console.log("[FRONTEND DEBUG] - Full error:", error);
      console.log("=".repeat(60));
      console.error("Remove BG error:", error);
      message.error({ content: error.message || "Failed", key: "gen", duration: 4 });
    } finally {
      console.log("[FRONTEND DEBUG] handleRemoveBackground finished, setting processing=false");
      setProcessing(false);
    }
  };

  // Handle generate variations (STREAMING - displays each image as it's generated)
  const handleGenerateVariations = async () => {
    console.log("=".repeat(60));
    console.log("[FRONTEND] 🚀 handleGenerateVariations STREAMING started");
    console.log("=".repeat(60));
    
    if (!selectedEl?.src || selectedEl?.type !== "image") {
      console.log("[FRONTEND] ❌ No image selected");
      message.warning("Please select an image first");
      return;
    }

    console.log("[FRONTEND] Setting state: generatingVariations=true, variations=[]");
    setGeneratingVariations(true);
    setVariations([]); // Clear previous variations
    setLoadingStyles(["Studio", "Lifestyle", "Creative"]); // Show all 3 loading placeholders
    message.loading({ content: "🎨 Starting AI generation...", key: "var", duration: 0 });

    try {
      let imageSrc = selectedEl.src;
      console.log("[FRONTEND] Image src type:", imageSrc.substring(0, 30));
      
      // Convert to base64 if needed
      if (imageSrc.startsWith("blob:") || imageSrc.startsWith("http")) {
        console.log("[FRONTEND] Converting blob/http to base64...");
        imageSrc = await urlToBase64(imageSrc);
        console.log("[FRONTEND] Conversion done");
      }
      
      if (!imageSrc.startsWith("data:")) {
        throw new Error("Invalid image format");
      }

      // First remove background
      console.log("[FRONTEND] Step 1: Calling /remove-bg...");
      const blob = await fetch(imageSrc).then(r => r.blob());
      console.log("[FRONTEND] Blob size:", blob.size);
      const formData = new FormData();
      formData.append("file", blob, "image.png");

      const bgResponse = await fetch(`${AGENT_URL}/remove-bg`, {
        method: "POST",
        body: formData,
      });
      console.log("[FRONTEND] /remove-bg response status:", bgResponse.status);

      if (!bgResponse.ok) {
        const errorData = await bgResponse.json().catch(() => ({}));
        throw new Error(errorData.detail || "Background removal failed");
      }

            const bgResult = await bgResponse.json();
      console.log("[FRONTEND] Background removed! image_data length:", bgResult.image_data?.length);
      console.log("[FRONTEND] - Format:", bgResult.format);
      console.log("[FRONTEND] - Success:", bgResult.success);
      
      // Now use streaming endpoint
      console.log("=".repeat(60));
      console.log("[FRONTEND] Step 2: Calling /generate/variations/stream...");
      console.log("[FRONTEND] Concept:", userprompt || "product photography");
      message.loading({ content: "🎨 Generating variations (streaming)...", key: "var", duration: 0 });

      const response = await fetch(`${AGENT_URL}/generate/variations/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_data: bgResult.image_data,
          concept: userprompt || "product photography"
        }),
      });
      console.log("[FRONTEND] Stream response status:", response.status);
      console.log("[FRONTEND] Stream response ok:", response.ok);

            if (!response.ok) {
        console.log("[FRONTEND] ❌ Stream request failed!");
        const errText = await response.text();
        console.log("[FRONTEND] - Error body:", errText);
        throw new Error(`Stream failed: ${response.status}`);
      }

      // Read SSE stream with BUFFERING to handle large chunked data
      console.log("[FRONTEND] 📡 Starting to read SSE stream with buffering...");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      const styleNames = ["Studio", "Lifestyle", "Creative"];
      let buffer = ""; // Buffer for incomplete events
      let chunkCount = 0;

      while (true) {
        const { done, value } = await reader.read();
        chunkCount++;
        console.log(`[FRONTEND] 📦 Chunk ${chunkCount}: done=${done}, bytes=${value?.length || 0}`);
        
        if (done) {
          console.log("[FRONTEND] ✅ Stream ended");
          break;
        }

        // Append new data to buffer
        buffer += decoder.decode(value, { stream: true });
        
        // Process complete SSE events (they end with \n\n)
        const events = buffer.split("\n\n");
        // Keep the last incomplete event in the buffer
        buffer = events.pop() || "";
        
        console.log(`[FRONTEND] Processing ${events.length} complete events, buffer remaining: ${buffer.length} chars`);

        for (const event of events) {
          if (!event.trim()) continue;
          
          const lines = event.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const jsonStr = line.slice(6);
              console.log(`[FRONTEND] 📨 Parsing SSE data (${jsonStr.length} chars)`);
              
              try {
                const data = JSON.parse(jsonStr);
                console.log("[FRONTEND] 📨 Event type:", data.type, "index:", data.index);

                if (data.type === 'progress') {
                  console.log(`[FRONTEND] 🔄 Generating ${styleNames[data.index]} style...`);
                  message.loading({ 
                    content: `🎨 Generating ${styleNames[data.index]} style...`, 
                    key: "var", 
                    duration: 0 
                  });
                }

                if (data.type === 'variation' && data.data) {
                  console.log(`[FRONTEND] ✅ VARIATION ${data.index + 1} RECEIVED! Data: ${data.data.length} chars`);
                  const newVariation = {
                    id: `var${Date.now()}_${data.index}`,
                    url: `data:image/png;base64,${data.data}`,
                    name: styleNames[data.index] || `Variation ${data.index + 1}`
                  };
                  
                  // Remove from loading styles
                  setLoadingStyles(prev => prev.filter(s => s !== styleNames[data.index]));
                  
                  // Add to variations immediately (streaming!)
                  setVariations(prev => {
                    console.log(`[FRONTEND] 📊 Adding variation ${data.index + 1}, prev count: ${prev.length}`);
                    return [...prev, newVariation];
                  });
                  
                  message.success({ 
                    content: `✅ ${styleNames[data.index]} ready!`, 
                    key: `var-${data.index}`, 
                    duration: 2 
                  });
                }

                if (data.type === 'error') {
                  console.log(`[FRONTEND] ❌ Error for variation ${data.index}:`, data.message);
                  // Remove failed style from loading
                  if (data.index !== undefined) {
                    setLoadingStyles(prev => prev.filter(s => s !== styleNames[data.index]));
                  }
                }

                if (data.type === 'complete') {
                  console.log("[FRONTEND] 🎉 All variations complete!");
                  setLoadingStyles([]); // Clear any remaining loading states
                  message.success({ content: "✨ All variations generated!", key: "var", duration: 3 });
                }
              } catch (e) {
                console.log("[FRONTEND] ⚠️ JSON parse error:", e.message, "- Data length:", jsonStr.length);
              }
            }
          }
        }
      }

    } catch (error) {
      console.error("[FRONTEND] ❌ Error:", error);
      message.error({ content: error.message || "Failed to generate", key: "var", duration: 4 });
    } finally {
      console.log("[FRONTEND] 🏁 Generation complete, setting generatingVariations=false");
      setGeneratingVariations(false);
      setLoadingStyles([]); // Clear any remaining loading states
    }
  };

  const isImageSelected = selectedEl?.type === "image";

  return (
    <>
      <p style={{ fontSize: 12, color: "#666", margin: "0 0 10px 0" }}>
        Select an image on canvas to use AI features:
      </p>

      {/* Remove Background */}
      <Button
        type="primary"
        block
        size="large"
        loading={processing}
        disabled={!isImageSelected || generatingVariations}
        onClick={handleRemoveBackground}
        icon={<CiCirclePlus size={20} />}
        style={{
          height: 44,
          fontWeight: 600,
          fontSize: 14,
          background: isImageSelected ? "linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)" : "#d9d9d9",
          border: "none",
          borderRadius: 8,
          marginBottom: 8,
        }}
      >
        {processing ? "Processing..." : "🎯 Remove Background"}
      </Button>

      <Divider style={{ margin: "12px 0", borderColor: "#eee" }}>Generate Variations</Divider>

      {/* Theme input (optional) */}
      <Input
        placeholder="Theme (e.g., summer beach, luxury, minimal) - optional"
        value={userprompt}
        onChange={(e) => setUserprompt(e.target.value)}
        style={{ marginBottom: 8, borderRadius: 8 }}
        disabled={!isImageSelected}
      />

      {/* Generate Variations Button */}
      <Button
        type="primary"
        block
        size="large"
        loading={generatingVariations}
        disabled={!isImageSelected || processing}
        onClick={handleGenerateVariations}
        icon={<MdAutoAwesome size={18} />}
        style={{
          height: 44,
          fontWeight: 600,
          fontSize: 14,
          background: isImageSelected ? "linear-gradient(135deg, #f97316 0%, #fb923c 100%)" : "#d9d9d9",
          border: "none",
          borderRadius: 8,
          marginBottom: 12,
        }}
      >
        {generatingVariations ? "Generating..." : "✨ Generate Variations"}
      </Button>

      {/* Variations Gallery */}
      <div style={{ 
        height: "30vh", 
        overflow: "auto", 
        background: "#f9f9f9", 
        borderRadius: 8, 
        padding: 8 
      }}>
        {variations.length === 0 && loadingStyles.length === 0 ? (
          <div style={{ textAlign: "center", padding: 16, color: "#999" }}>
            <p style={{ margin: 0, fontSize: 13 }}>No variations yet</p>
            <p style={{ fontSize: 11, marginTop: 4 }}>
              Select image → Enter theme (optional) → Click Generate
            </p>
          </div>
        ) : (
          <Flex wrap="wrap" justify="center" gap={8}>
            {/* Show generated variations */}
            {variations.map((v) => (
              <div 
                key={v.id} 
                style={{ 
                  cursor: "pointer", 
                  textAlign: "center",
                  border: "2px solid transparent",
                  borderRadius: 8,
                  padding: 4,
                  transition: "all 0.3s ease",
                  animation: "fadeIn 0.5s ease-out",
                }}
                onClick={() => {
                  replaceSelectedImage(v.url);
                  message.success("Image replaced on canvas!");
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = "#7c3aed"}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = "transparent"}
              >
                <Image
                  preview={false}
                  alt={v.name}
                  src={v.url}
                  width={100}
                  height={100}
                  style={{ objectFit: "cover", borderRadius: 6 }}
                />
                <p style={{ fontSize: 10, margin: "4px 0 0", color: "#666" }}>{v.name}</p>
              </div>
            ))}
            
            {/* Show loading skeletons for pending styles */}
            {loadingStyles.map((styleName) => (
              <div 
                key={`loading-${styleName}`}
                style={{ 
                  textAlign: "center",
                  padding: 4,
                  position: "relative",
                }}
              >
                <div style={{
                  width: 100,
                  height: 100,
                  borderRadius: 6,
                  background: "linear-gradient(90deg, #e8e8e8 25%, #f5f5f5 50%, #e8e8e8 75%)",
                  backgroundSize: "200% 100%",
                  animation: "shimmer 1.5s infinite",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                  <span style={{ 
                    fontSize: 20, 
                    animation: "pulse 1s infinite",
                  }}>🎨</span>
                </div>
                <p style={{ 
                  fontSize: 10, 
                  margin: "4px 0 0", 
                  color: "#f97316",
                  fontWeight: 600,
                }}>
                  {styleName}...
                </p>
              </div>
            ))}
          </Flex>
        )}
        
        {/* CSS Animations */}
        <style>{`
          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
          @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.5; transform: scale(1.1); }
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: scale(0.9); }
            to { opacity: 1; transform: scale(1); }
          }
        `}</style>
      </div>

      {/* Headline Generator Section */}
      <Divider style={{ margin: "12px 0", borderColor: "#eee" }}>
        <BulbOutlined style={{ marginRight: 4, color: "#faad14" }} />
        AI Headline Generator
      </Divider>
      
      <HeadlineGenerator
        canvasImageBase64={canvasImageBase64}
        canvasSize={canvasSize}
        logoPosition={detectedLogoPosition}
        imageBounds={imageBounds}
        onAddHeadline={handleAddHeadline}
        onAddSubheading={handleAddSubheading}
        designId={selectedUniqueId || 'default'}
      />
      
      {/* Refresh canvas image button */}
      <Button
        size="small"
        block
        onClick={getCanvasImage}
        style={{ marginTop: 8, fontSize: 12 }}
      >
        🔄 Refresh Canvas Image
      </Button>
    </>
  );
}
