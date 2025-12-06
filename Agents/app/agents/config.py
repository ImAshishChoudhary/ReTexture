from pathlib import Path
import os

BASE_DIR = Path(__file__).resolve().parent.parent
RULESET_PATH = BASE_DIR / "resources" / "ruleset.txt"
SYSTEM_PROMPT_PATH = BASE_DIR / "resources" / "system_prompt.py"

RULESET = RULESET_PATH.read_text()

if SYSTEM_PROMPT_PATH.exists():
    import importlib.util
    spec = importlib.util.spec_from_file_location("system_prompt_module", SYSTEM_PROMPT_PATH)
    if spec and spec.loader:
        system_prompt_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(system_prompt_module)
        SYSTEM_PROMPT = system_prompt_module.SYSTEM_PROMPT
    else:
        SYSTEM_PROMPT = "You are a validation engine."
else:
    SYSTEM_PROMPT = "You are a validation engine."
