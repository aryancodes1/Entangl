"""
Load configuration: GEMINI API key and some tuned defaults.
Uses python-dotenv to read a .env file if present.
"""

import os
from dotenv import load_dotenv

load_dotenv()  # loads .env into environment if present

# Required: put your Gemini API key into the environment variable below
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", None)

# Model to use; default to a cost-effective fast Gemini (change as needed)
DEFAULT_MODEL = os.getenv("FACTCHECK_MODEL", "gemini-1.5-flash")

# How many top evidence snippets to include when calling the LLM
MAX_EVIDENCE_SNIPPETS = int(os.getenv("MAX_EVIDENCE_SNIPPETS", "3"))

# Minimum evidence length (characters) to be considered "usable"
MIN_EVIDENCE_CHARS = int(os.getenv("MIN_EVIDENCE_CHARS", "50"))

# LLM response timeout (seconds) for network calls (you can adjust)
LLM_TIMEOUT_SECONDS = int(os.getenv("LLM_TIMEOUT_SECONDS", "20"))
