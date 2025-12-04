import streamlit as st
import os
import streamlit.components.v1 as components

# --- BACKEND IMPORTS ---
# Ensure all your tools are created as per previous steps
from adaptive_canvas_ai.graph import build_graph
from adaptive_canvas_ai.schemas import CreativeSpec
from adaptive_canvas_ai.tools.compliance import check_compliance
from adaptive_canvas_ai.tools.renderer import generate_html
from adaptive_canvas_ai.tools.bg_generator import generate_background
from adaptive_canvas_ai.tools.layout_engine import apply_dynamic_layout
from adaptive_canvas_ai.tools.exporter import export_to_jpg

# --- CONFIG ---
st.set_page_config(
    page_title="Tesco Studio AI", 
    page_icon="🎨", 
    layout="wide",
    initial_sidebar_state="expanded"
)

# --- STATE MANAGEMENT ---
# We use session_state to remember data between clicks
if "spec" not in st.session_state:
    st.session_state.spec = None
if "stage" not in st.session_state:
    st.session_state.stage = "upload" # 'upload' -> 'editor'
if "raw_image" not in st.session_state:
    st.session_state.raw_image = None
if "bg_path" not in st.session_state:
    st.session_state.bg_path = None
if "gen_headline" not in st.session_state:
    st.session_state.gen_headline = ""
if "gen_subhead" not in st.session_state:
    st.session_state.gen_subhead = ""

# --- SIDEBAR: GLOBAL CONTROLS ---
with st.sidebar:
    st.title("Tesco Studio 🎨")
    
    # 1. Format Selection (The "Stretch Goal" Feature)
    st.subheader("📢 Format")
    format_label = st.selectbox(
        "Target Media", 
        ["9:16 (Instagram Story)", "1:1 (Instagram Feed)"], 
        index=0
    )
    # Convert label to internal code
    target_format = "9:16" if "9:16" in format_label else "1:1"

    # AUTO-REFLOW LOGIC:
    # If the user switches format while editing, we force the Layout Engine to run again.
    # This snaps the packshot and text to the new aspect ratio immediately.
    if st.session_state.spec:
        if st.session_state.spec.format != target_format:
            st.session_state.spec.format = target_format
            
            # Re-run Layout Engine to snap elements to new grid
            st.session_state.spec = apply_dynamic_layout(
                st.session_state.spec,
                st.session_state.gen_headline,
                st.session_state.gen_subhead,
                st.session_state.bg_path
            )
            st.rerun()

    st.divider()
    
    # 2. Navigation
    if st.session_state.stage == "editor":
        if st.button("⬅️ Start New Campaign", use_container_width=True):
            # Reset State completely
            for key in list(st.session_state.keys()):
                del st.session_state[key]
            st.rerun()

# =========================================================
#  SCREEN 1: UPLOAD & ORCHESTRATE
# =========================================================
if st.session_state.stage == "upload":
    st.header("1. Upload Product Asset")
    st.markdown("Drop your raw packshot. Our AI will build a compliant Tesco campaign.")
    
    uploaded_file = st.file_uploader("Upload Image (JPG/PNG)", type=["jpg", "png"])
    
    if uploaded_file and st.button("✨ Auto-Design Campaign", type="primary"):
        with st.status("🤖 Orchestrating Creative Agents...", expanded=True):
            
            st.write("🧠 Vision Agent: Analyzing product & alcohol checks...")
            image_bytes = uploaded_file.getvalue()
            
            # Initialize Graph State
            initial_state = {
                "spec": CreativeSpec(request_id="web-session-1", format=target_format),
                "raw_image_bytes": image_bytes,
                "generated_headline": "", 
                "generated_subhead": "", 
                "background_path": ""
            }
            
            # Run the LangGraph Pipeline
            # This runs Ingest -> Vision -> Copy -> BG -> Layout -> Compliance -> Render
            app = build_graph()
            final_state = app.invoke(initial_state)
            
            # Persist Data to Session
            st.session_state.spec = final_state["spec"]
            st.session_state.raw_image = image_bytes
            st.session_state.bg_path = final_state["background_path"]
            st.session_state.gen_headline = final_state["generated_headline"]
            st.session_state.gen_subhead = final_state["generated_subhead"]
            
            st.session_state.stage = "editor"
            st.rerun()

# =========================================================
#  SCREEN 2: THE STUDIO EDITOR
# =========================================================
elif st.session_state.stage == "editor":
    spec = st.session_state.spec
    meta = spec.product_metadata

    # --- TOP BAR: STATUS & EXPORT ---
    # Run Compliance Check Live on every render
    checked_spec = check_compliance(spec)
    is_compliant = checked_spec.compliance.status == "pass"
    
    col_header, col_badges, col_export = st.columns([2, 2, 1])
    
    with col_header:
        st.subheader(f"Campaign: {meta.brand_name}")
        
    with col_badges:
        # Compliance Badge
        if is_compliant:
            st.success("✅ Tesco Compliant", icon="🛡️")
        else:
            st.error(f"{len(checked_spec.compliance.violations)} Rule Violations", icon="⚠️")
            
    with col_export:
        # EXPORT BUTTON (The "Real Deal")
        if st.button("💾 Export JPG", type="primary", use_container_width=True):
            with st.spinner("Rendering High-Res Composite (<500KB)..."):
                # Call the Exporter Tool (Pillow)
                file_path = export_to_jpg(spec)
                
                # Create Download Link
                with open(file_path, "rb") as f:
                    st.download_button(
                        label="⬇️ Download Now",
                        data=f,
                        file_name=f"tesco_{meta.brand_name}_campaign.jpg",
                        mime="image/jpeg"
                    )
            st.toast("Export Complete!", icon="🎉")

    st.divider()

    # --- MAIN WORKSPACE ---
    col_tools, col_preview = st.columns([1, 1.5])
    
    # ---------------- LEFT PANEL: TOOLS ----------------
    with col_tools:
        st.info(f"Layout Mode: **{target_format}**")
        
        tab_layout, tab_copy, tab_bg = st.tabs(["📐 Layout", "✍️ Copy", "🎨 Scene"])
        
        # TAB 1: LAYOUT CONTROLS
        with tab_layout:
            st.caption("Packshot Positioning")
            # Find the packshot layer
            packshot = next((l for l in spec.layers if l.id == "packshot"), None)
            
            if packshot:
                # Vertical Slider
                packshot.bbox.y = st.slider(
                    "Vertical Position (Y)", 
                    0, spec.creative_size[1], packshot.bbox.y
                )
                # Horizontal Slider
                packshot.bbox.x = st.slider(
                    "Horizontal Position (X)", 
                    0, spec.creative_size[0], packshot.bbox.x
                )
                
                # Live Helper: Check for Safe Zone Violations
                if packshot.bbox.y < 200:
                    st.warning("⚠️ Entering Top Safe Zone")

            st.caption("Branding")
            logo = next((l for l in spec.layers if l.id == "logo"), None)
            if logo:
                # Simple presets for logo placement
                logo_pos = st.radio("Logo Anchor", ["Top Right", "Top Left"], horizontal=True)
                if logo_pos == "Top Right":
                    logo.bbox.x = spec.creative_size[0] - 250
                    logo.bbox.y = 50
                else:
                    logo.bbox.x = 50
                    logo.bbox.y = 50

        # TAB 2: COPYWRITING
        with tab_copy:
            headline = next((l for l in spec.layers if l.id == "headline"), None)
            subhead = next((l for l in spec.layers if l.id == "subhead"), None)
            
            if headline:
                headline.content = st.text_area("Headline", headline.content)
                headline.color = st.color_picker("Headline Color", headline.color)
            
            if subhead:
                subhead.content = st.text_area("Subhead", subhead.content)
                subhead.color = st.color_picker("Subhead Color", subhead.color)

            if not is_compliant:
                st.markdown("""
                **Compliance Tips:**
                - No price mentions (e.g. £5, 50% off)
                - No 'Green' claims (Sustainable, Eco)
                """)

        # TAB 3: BACKGROUND ARTIST
        with tab_bg:
            st.markdown(f"**Current Prompt:** *{meta.suggested_background_prompt}*")
            
            new_prompt = st.text_input("Refine Scene", value=f"Luxury {meta.category} setting")
            
            if st.button("🎨 Regenerate Background"):
                with st.spinner("Painting new scene..."):
                    # Call Generator Tool directly
                    new_bg_path = generate_background(
                        new_prompt, 
                        spec.creative_size[0], 
                        spec.creative_size[1]
                    )
                    # Update State
                    st.session_state.bg_path = new_bg_path
                    # Update Spec Layer
                    bg_layer = next(l for l in spec.layers if l.id == "bg")
                    bg_layer.content = new_bg_path
                    st.rerun()

    # ---------------- RIGHT PANEL: LIVE PREVIEW ----------------
    with col_preview:
        st.caption("Live HTML Preview (Sandbox)")
        
        # Generate HTML from current Spec
        html_content = generate_html(spec)
        
        # Calculate render height based on format ratio for better UX
        preview_height = 800 if target_format == "9:16" else 600
        
        # Display the Ad
        components.html(html_content, height=preview_height, scrolling=True)
        
        # Violations List (Below Preview)
        if not is_compliant:
            with st.expander("🚨 Compliance Issues Found", expanded=True):
                for v in checked_spec.compliance.violations:
                    st.error(v)