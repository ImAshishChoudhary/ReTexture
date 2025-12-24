import os
from langchain_google_genai import ChatGoogleGenerativeAI
from dotenv import load_dotenv
import base64

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


llm = get_llm("google_gemini")
image_path = "C:\\Users\\Pratham\\Downloads\\mait.jpeg"
with open(image_path, "rb") as img_file:
    img_b64 = base64.b64encode(img_file.read()).decode("utf-8")
message = {
    "role": "user",
    "content": [
        {"type": "text", "text": "Describe the content of this image."},
        {
            "type": "image",
            "base64": img_b64,
            "mime_type": "image/jpeg",
        },
    ],
}

print(llm.invoke([message]))
