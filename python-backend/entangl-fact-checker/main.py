from fastapi import FastAPI
from pydantic import BaseModel
from factcheck_engine.run_check import check_fact

app = FastAPI()

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
    return result
