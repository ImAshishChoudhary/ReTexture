import os
from langchain.chat_models import init_chat_model
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from pydantic import BaseModel, Field
from typing import List, Dict, Any
from app.agents.config import RULESET, SYSTEM_PROMPT
from dotenv import load_dotenv

load_dotenv()

_agent = None

class ValidationOutput(BaseModel):
    canvas: str = Field(description="Updated HTML + CSS after validation")
    issues: List[Dict[str, Any]] = Field(description="List of validation issues found")

def init_agent():
    global _agent
    if _agent is not None:
        return

    parser = JsonOutputParser(pydantic_object=ValidationOutput)
    format_instructions = parser.get_format_instructions()

    safe_instructions = format_instructions.replace("{", "{{").replace("}", "}}")

    llm = init_chat_model(model="google_genai:gemini-2.5-flash-lite")

    prompt = ChatPromptTemplate.from_messages([
        (
            "system",
            SYSTEM_PROMPT
            + "\n\nFollow these output instructions:\n"
            + safe_instructions
        ),
        ("human", "{canvas}")
    ])

    chain = prompt | llm | parser

    _agent = chain



def get_agent():
    if _agent is None:
        raise RuntimeError("Agent not initialized")
    return _agent
