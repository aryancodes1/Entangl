import os
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Default model switched from PRO → FLASH
GEMINI_MODEL_NAME = "models/gemini-2.0-flash"

# Evidence limit
MAX_EVIDENCE_SNIPPETS = 5
