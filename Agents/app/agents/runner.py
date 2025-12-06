from app.agents.builder import get_agent
from app.core.models import ValidationResponse
from app.agents.config import RULESET
import json

async def run_validation(canvas: str) -> ValidationResponse:
    agent = get_agent()

    raw = await agent.ainvoke({"canvas": canvas, "ruleset": RULESET})

    # {
    #   "canvas": "<updated html + css>",
    #   "issues": [...]
    # }

    content = raw.content if isinstance(raw.content, str) else str(raw.content)
    data = json.loads(content)

    return ValidationResponse(**data)
