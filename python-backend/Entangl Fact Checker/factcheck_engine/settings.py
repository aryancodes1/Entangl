import os
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# How many evidence snippets to collect in total (wiki + news)
MAX_EVIDENCE_SNIPPETS = 5

