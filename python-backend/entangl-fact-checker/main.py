from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from factcheck_engine.run_check import check_fact
import uvicorn

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://entangl-frontend.vercel.app",
        "https://entangl-bice.vercel.app",
        "*"  # Be more restrictive in production
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

# Simple home route
@app.get("/")
def home():
    return {"message": "FastAPI is working!"}

# Request body model
class ClaimRequest(BaseModel):
    claim: str

# Fact-checking endpoint
@app.post("/fact-check")
def fact_check(request: ClaimRequest):
    result = check_fact(request.claim)
    # Convert all keys to lowercase for a consistent API response
    return {k.lower(): v for k, v in result.items()}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=9000)