from app.agents.builder import get_agent
from app.core.models import ValidationResponse
from app.agents.config import RULESET

async def run_validation(canvas: str) -> ValidationResponse:
    agent = get_agent()

    result = await agent.ainvoke({"canvas": canvas, "ruleset": RULESET})

    return ValidationResponse(**result)
