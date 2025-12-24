import os
from langchain_google_genai import ChatGoogleGenerativeAI
from dotenv import load_dotenv

load_dotenv(override=True)


def get_google_gemini_llm(model="gemini-2.5-flash"):
    API_KEY = os.getenv("GOOGLE_API_KEY")
    PROJECT_ID = os.getenv("GOOGLE_CLOUD_PROJECT")
    if not API_KEY:
        raise ValueError("GOOGLE_API_KEY environment variable not set")
    if not PROJECT_ID:
        raise ValueError("GOOGLE_CLOUD_PROJECT environment variable not set")
    client = ChatGoogleGenerativeAI(
        model=model, api_key=API_KEY, project=PROJECT_ID, vertexai=False
    )
    return client


def get_llm(name: str = "google_gemini"):
    if name == "google_gemini":
        return get_google_gemini_llm("gemini-2.5-flash")
    else:
        raise ValueError(f"Unsupported LLM: {name}")
