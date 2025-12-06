import os
from langchain.chat_models import init_chat_model
from langchain_core.prompts import ChatPromptTemplate
from app.agents.config import RULESET, SYSTEM_PROMPT
from dotenv import load_dotenv

load_dotenv()

_agent = None

def init_agent():
    global _agent
    if _agent is not None:
        return

    llm = init_chat_model(model="google_genai:gemini-2.5-flash-lite")

    prompt = ChatPromptTemplate.from_messages([
        ("system", SYSTEM_PROMPT),
        ("human", "{canvas}")
    ])

    chain = prompt | llm

    _agent = chain


def get_agent():
    if _agent is None:
        raise RuntimeError("Agent not initialized")
    return _agent
