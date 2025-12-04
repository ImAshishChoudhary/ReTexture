# src/adaptive_canvas_ai/graph.py
import base64
from typing import TypedDict
from langgraph.graph import StateGraph, START, END
from adaptive_canvas_ai.schemas import CreativeSpec, Layer, BoundingBox

# --- Tool Imports ---
from adaptive_canvas_ai.tools.image_prep import process_packshot
from adaptive_canvas_ai.tools.gemini_vision import analyze_image
from adaptive_canvas_ai.tools.copywriter import generate_copy
# NEW IMPORTS
from adaptive_canvas_ai.tools.bg_generator import generate_background
from adaptive_canvas_ai.tools.layout_engine import apply_dynamic_layout
from adaptive_canvas_ai.tools.compliance import check_compliance
from adaptive_canvas_ai.tools.renderer import generate_html

# --- 1. The State ---
class AgentState(TypedDict):
    spec: CreativeSpec
    raw_image_bytes: bytes
    # Temp storage
    generated_headline: str
    generated_subhead: str
    background_path: str  # <--- NEW: Stores the generated BG filename

# --- 2. The Worker Nodes ---

def ingest_node(state: AgentState):
    """Step 1: Clean the image (Rembg)"""
    print("\n--- 📥 NODE: Ingest & Clean ---")
    raw_bytes = state["raw_image_bytes"]
    
    result = process_packshot(raw_bytes)
    result["image"].save("temp_packshot.png")
    
    layer = Layer(
        id="packshot", type="image", 
        content="temp_packshot.png", 
        bbox=result["bbox"]
    )
    
    current_spec = state["spec"]
    current_spec.layers.append(layer)
    return {"spec": current_spec}

def vision_node(state: AgentState):
    """Step 2: Ask Gemini what it is"""
    print("--- 🧠 NODE: Vision Analysis ---")
    meta = analyze_image(state["raw_image_bytes"])
    
    current_spec = state["spec"]
    current_spec.product_metadata = meta
    return {"spec": current_spec}

def copywriter_node(state: AgentState):
    """Step 3: Write the text"""
    print("--- ✍️ NODE: Copywriter ---")
    meta = state["spec"].product_metadata
    copy = generate_copy(meta.brand_name, meta.category, meta.is_alcohol)
    
    return {
        "generated_headline": copy.headline,
        "generated_subhead": copy.subhead
    }

def bg_gen_node(state: AgentState):
    """Step 4: Generate Background (The Artist)"""
    print("--- 🎨 NODE: Background Artist ---")
    meta = state["spec"].product_metadata
    
    # Prompt Engineering
    prompt = (
        f"Professional studio photography background for {meta.category}. "
        f"Style: {meta.suggested_background_prompt}. "
        "Clean, high quality, soft lighting."
    )
    
    # We generate a 1080x1920 (9:16) background to match the canvas
    # This calls your new tool which creates 'generated_bg.png'
    bg_path = generate_background(prompt, 1080, 1920)
    
    return {"background_path": bg_path}

def layout_node(state: AgentState):
    """Step 5: Arrange the layers"""
    print("--- 📐 NODE: Layout Engine ---")
    current_spec = state["spec"]
    
    # We pass the generated assets to the Layout Engine
    updated_spec = apply_dynamic_layout(
        current_spec, 
        state["generated_headline"], 
        state["generated_subhead"],
        state.get("background_path") # Pass the new BG path
    )
    
    return {"spec": updated_spec}

def compliance_node(state: AgentState):
    """Step 6: The Sheriff (Check Rules)"""
    print("--- 👮 NODE: Compliance ---")
    current_spec = state["spec"]
    
    # Run the checks (Safe zones, Forbidden claims)
    checked_spec = check_compliance(current_spec)
    
    # Note: Even if it fails, we return the spec so the renderer can show
    # the 'Broken' ad. This helps debugging.
    return {"spec": checked_spec}

def render_node(state: AgentState):
    """Step 7: Generate HTML"""
    print("--- 🎨 NODE: Renderer ---")
    current_spec = state["spec"]
    
    html = generate_html(current_spec)
    
    with open("final_ad.html", "w", encoding="utf-8") as f:
        f.write(html)
        
    print("✅ Final Ad saved to 'final_ad.html'")
    return {"spec": current_spec}

# --- 3. Build Graph ---
def build_graph():
    workflow = StateGraph(AgentState)

    # Add Nodes
    workflow.add_node("ingest", ingest_node)
    workflow.add_node("vision", vision_node)
    workflow.add_node("copywriter", copywriter_node)
    workflow.add_node("bg_gen", bg_gen_node)       # NEW
    workflow.add_node("layout", layout_node)
    workflow.add_node("compliance", compliance_node) # NEW
    workflow.add_node("render", render_node)

    # Define Flow
    workflow.add_edge(START, "ingest")
    workflow.add_edge("ingest", "vision")
    workflow.add_edge("vision", "copywriter")
    workflow.add_edge("copywriter", "bg_gen")     # NEW EDGE
    workflow.add_edge("bg_gen", "layout")         # NEW EDGE
    workflow.add_edge("layout", "compliance")     # NEW EDGE
    workflow.add_edge("compliance", "render")     # NEW EDGE
    workflow.add_edge("render", END)

    return workflow.compile()