# src/adaptive_canvas_ai/tools/gemini_vision.py
import os
import base64
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from adaptive_canvas_ai.schemas import ProductMetadata

# Load environment variables
load_dotenv()

def analyze_image(image_bytes: bytes) -> ProductMetadata:
    """
    Sends image to Gemini and extracts structured data.
    """
    print("   ... 🧠 Asking Gemini what this product is...")

    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise ValueError("❌ GOOGLE_API_KEY is missing from .env file!")

    # 1. Setup the Model
    llm = ChatGoogleGenerativeAI(
        model="gemini-2.0-flash-exp", # Use "gemini-1.5-flash" or "gemini-2.0-flash-exp"
        temperature=0,
        google_api_key=api_key
    )

    # 2. Prepare the Payload
    structured_llm = llm.with_structured_output(ProductMetadata)

    # 3. Encode Image
    b64_image = base64.b64encode(image_bytes).decode("utf-8")
    
    # 4. Invoke
    try:
        result = structured_llm.invoke([
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "Analyze this packshot. Extract brand, category, and detect alcohol."},
                    {"type": "image_url", "image_url": f"data:image/png;base64,{b64_image}"}
                ]
            }
        ])
        return result
    except Exception as e:
        print(f"❌ Gemini Error: {e}")
        raise e