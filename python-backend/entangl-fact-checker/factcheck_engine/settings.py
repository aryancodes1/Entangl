import os
from dotenv import load_dotenv

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# Default model switched from PRO → FLASH
GROQ_MODEL_NAME = "llama-3.3-70b-versatile"

# Evidence limit
MAX_EVIDENCE_SNIPPETS = 5
