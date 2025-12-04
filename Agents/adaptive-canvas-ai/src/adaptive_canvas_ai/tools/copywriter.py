# src/adaptive_canvas_ai/tools/copywriter.py
import os
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from pydantic import BaseModel, Field

load_dotenv()

# Define what we want back from the LLM
class AdCopy(BaseModel):
    headline: str = Field(description="Catchy main title, max 7 words. Tesco tone: helpful, friendly.")
    subhead: str = Field(description="Supporting detail, max 10 words.")
    cta: str = Field(description="Call to action, e.g., 'Shop now'.")

def generate_copy(brand: str, category: str, is_alcohol: bool) -> AdCopy:
    """
    Asks Gemini to write ad copy for the product.
    """
    print(f"   ... ✍️  Writing copy for {brand}...")

    api_key = os.getenv("GOOGLE_API_KEY")
    llm = ChatGoogleGenerativeAI(
        model="gemini-2.0-flash-exp", # Fast and creative
        temperature=0.7, # Little bit of creativity allowed here
        google_api_key=api_key
    )
    
    # Enforce structure
    structured_llm = llm.with_structured_output(AdCopy)
    
    # Safety prompts
    constraints = "Do NOT mention specific prices. Do NOT make medical claims."
    if is_alcohol:
        constraints += " Include responsible drinking tone."

    prompt = (
        f"Write display ad copy for a {category} brand named '{brand}'. "
        f"Constraints: {constraints}"
    )
    
    return structured_llm.invoke(prompt)