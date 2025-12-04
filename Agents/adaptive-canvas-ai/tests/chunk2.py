# tests/test_chunk2.py
from adaptive_canvas_ai.schemas import CreativeSpec
from adaptive_canvas_ai.graph import build_graph

def test_skeleton_graph():
    """
    Verifies the graph runs from start to finish.
    """
    # 1. Setup Input
    dummy_spec = CreativeSpec(request_id="run-001")
    initial_state = {"spec": dummy_spec}
    
    # 2. Build App
    app = build_graph()
    
    # 3. Run (Invoke)
    print("\n🚀 STARTING GRAPH RUN")
    final_state = app.invoke(initial_state)
    
    # 4. Check Results
    result = final_state["spec"]
    
    assert result.request_id == "run-001"
    assert result.compliance.status == "pass"
    print("✅ GRAPH TEST PASSED: State transitioned correctly.")

if __name__ == "__main__":
    test_skeleton_graph()