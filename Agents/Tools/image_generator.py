import base64
import os
from langchain_google_vertexai import VertexAI, VertexAIImageGeneratorChat
from langchain_core.messages import HumanMessage, AIMessage
from langchain_core.prompts import PromptTemplate
from PIL import Image
import io

prompt_expander = VertexAI(model_name="gemini-pro")

image_generator = VertexAIImageGeneratorChat(model_name="imagegeneration@006")

def generate_professional_ad_image(user_idea: str):
    print(f"1. User Idea: {user_idea}")

    refinement_template = """
    You are an expert AI Art Director. Convert the following simple idea into a 
    highly detailed, photorealistic image prompt suitable for an ad campaign.
    Include details about lighting, camera angle, background, and mood.
    
    Simple Idea: {idea}
    
    Detailed Prompt:
    """
    prompt_template = PromptTemplate(template=refinement_template, input_variables=["idea"])
    chain = prompt_template | prompt_expander
    
    refined_prompt = chain.invoke({"idea": user_idea})
    print(f"2. Refined Prompt: {refined_prompt}")

    print("3. Generating Image (this may take a few seconds)...")
    messages = [HumanMessage(content=refined_prompt)]
    response = image_generator.invoke(messages)

    try:
        img_base64 = response.content[0]["image_url"]["url"].split(",")[-1] 
        
        image_data = base64.b64decode(img_base64)
        image = Image.open(io.BytesIO(image_data))
        
        output_path = "static/processed/generated_ad_background.png"
        image.save(output_path)
        print(f"4. Success! Image saved to {output_path}")
        return output_path
        
    except Exception as e:
        print(f"Error parsing image response: {e}")
        return None

if __name__ == "__main__":
    os.makedirs("static/processed", exist_ok=True)
    
    generate_professional_ad_image("Luxury coffee beans on a wooden table, morning sunlight")