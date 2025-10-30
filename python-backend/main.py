from fastapi import FastAPI
from pydantic import BaseModel
from typing import Dict
from checker import FactCheckerSystem
import asyncio
from dotenv import load_dotenv
import os

# Load environment variables from .env file
load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
# Create a FastAPI app instance
app = FastAPI(title="Fake News and Image Detector API")

# Initialize fact checker system

fact_checker = FactCheckerSystem(api_key=GROQ_API_KEY)

# Define Pydantic models for request bodies
class NewsContent(BaseModel):
    content: str

class ImageURL(BaseModel):
    image_url: str

# Create a POST route for text content analysis
@app.post("/predict/text", response_model=Dict)
async def predict_text(payload: NewsContent):
    """
    Analyzes a piece of text content to determine if it's real or fake news using fact-checking.
    """
    try:
        result = await fact_checker.verify_statement(payload.content)
        
        # Map the fact checker result to our API response format
        if result["is_correct"] is True:
            prediction = "real"
        elif result["is_correct"] is False:
            prediction = "fake"
        else:
            prediction = "unknown"
        
        # Map confidence levels to numeric values
        confidence_mapping = {
            "high": "0.90",
            "medium": "0.70", 
            "low": "0.40",
            "none": "0.00"
        }
        confidence = confidence_mapping.get(result["confidence"], "0.00")
        
        return {
            "prediction": prediction,
            "confidence": confidence,
            "explanation": result["explanation"],
            "facts_found": result["facts_found"],
            "inaccuracies": result["inaccuracies"],
            "missing_context": result["missing_context"],
            "sources": result["sources"],
            "token_usage": result.get("token_usage", {})
        }
        
    except Exception as e:
        return {
            "prediction": "error",
            "confidence": "0.00",
            "explanation": f"Error during fact checking: {str(e)}",
            "facts_found": [],
            "inaccuracies": [],
            "missing_context": "Could not complete fact check",
            "sources": [],
            "token_usage": {}
        }

# Create a POST route for image URL analysis
@app.post("/predict/image", response_model=Dict[str, str])
async def predict_image(payload: ImageURL):
    """
    Analyzes an image from a URL to determine if it's fake.
    (Currently a placeholder)
    """
    # TODO: Implement actual image analysis logic here.
    is_fake = "real" # Dummy prediction
    confidence = "0.88" # Dummy confidence score

    return {"prediction": is_fake, "confidence": confidence}

# Optional: Add a root endpoint for basic API health check
@app.get("/")
def read_root():
    return {"message": "Welcome to the Fake News and Image Detector API"}

# Add CORS middleware to allow frontend requests
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],  # Add your frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
