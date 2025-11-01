from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Dict, Any, List
import json

from contextlib import asynccontextmanager
import asyncio
from dotenv import load_dotenv
import os
import tempfile
import shutil
from pathlib import Path
import joblib
import torch

# Load environment variables from .env file
load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# Import your prediction modules
from predictimg import (
    predict_video_consistent,
    get_facenet_feature_extractor,
    create_tfq_model_layers,
    TFQ_AVAILABLE,
    device,
    predict_image_deepfake_single
)

# Global variables for models
scaler = None
embedder_model = None
tfq_model = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load models on startup and cleanup on shutdown"""
    global scaler, embedder_model, tfq_model
    
    # Startup
    try:
        # Load scaler
        scaler = joblib.load("/Users/arunkaul/Desktop/MyFiles/Entangl/python-backend/scaler.joblib")
        print("✓ Scaler loaded successfully")
        
        # Load FaceNet embedder
        embedder_model = get_facenet_feature_extractor().to(device)
        print("✓ FaceNet embedder loaded successfully")
        
        # Load TFQ model if available
        if TFQ_AVAILABLE:
            tfq_model = create_tfq_model_layers(n_qubits=8, n_layers=12, learning_rate=1e-3)
            tfq_model.load_weights("/Users/arunkaul/Desktop/MyFiles/Entangl/python-backend/tfq_face_layers_weights.h5")
            print("✓ TFQ model loaded successfully")
        else:
            print("⚠ TensorFlow Quantum not available - quantum features disabled")
        
        print(f"✓ All models loaded. Using device: {device}")
        
    except Exception as e:
        print(f"❌ Error loading models: {e}")
        raise e
    
    yield
    
    # Shutdown (cleanup if needed)
    print("🔄 Shutting down...")

# Create a FastAPI app instance with lifespan
app = FastAPI(
    title="Fake News and Image Detector API",
    lifespan=lifespan
)

# --- CORS Middleware ---

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],  # Add your frontend URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Deepfake Detection API ---

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "device": device
    }

@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "models_loaded": {
            "scaler": scaler is not None,
            "embedder": embedder_model is not None,
            "tfq_model": tfq_model is not None
        },
        "tfq_available": TFQ_AVAILABLE,
        "device": device
    }

@app.post("/predict")
async def predict_deepfake(
    file: UploadFile = File(...),
    max_faces: int = 20,
    seconds_range: int = 6
) -> Dict[str, Any]:
    """
    Analyze uploaded video for deepfake detection
    
    Args:
        file: MP4 video file
        max_faces: Maximum number of faces to analyze per video (default: 20)
        seconds_range: Seconds from end of video to analyze (default: 6)
    
    Returns:
        JSON response with prediction results
    """
    
    # Validate file type
    if not file.filename.lower().endswith(('.mp4', '.avi', '.mov', '.mkv')):
        raise HTTPException(
            status_code=400, 
            detail="Invalid file type. Please upload a video file (mp4, avi, mov, mkv)."
        )
    
    # Check if models are loaded
    if not all([scaler, embedder_model]):
        raise HTTPException(
            status_code=503,
            detail="Models not loaded. Please try again later."
        )
    
    if not TFQ_AVAILABLE or tfq_model is None:
        raise HTTPException(
            status_code=503,
            detail="TensorFlow Quantum not available. Quantum prediction disabled."
        )
    
    # Create temporary file
    temp_dir = tempfile.mkdtemp()
    temp_file_path = None
    
    try:
        # Save uploaded file temporarily
        temp_file_path = os.path.join(temp_dir, f"temp_video_{file.filename}")
        
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Run prediction
        prob, label = predict_video_consistent(
            video_path=temp_file_path,
            model=tfq_model,
            scaler=scaler,
            embedder_model=embedder_model,
            n_qubits=8,
            max_faces_per_video=max_faces,
            seconds_range=seconds_range,
            device=device
        )
        
        # Prepare response
        response = {
            "filename": file.filename,
            "prediction": {
                "label": label,
                "is_deepfake": label == "fake",
                "deepfake_probability": round(prob, 4) if label == "real" else round(1 - prob, 4)
            },
            "analysis_parameters": {
                "max_faces_analyzed": max_faces,
                "seconds_analyzed": seconds_range,
                "quantum_enhanced": True,
                "device_used": device
            },
            "status": "success"
        }
        
        return JSONResponse(content=response)
        
    except Exception as e:
        print(f"Error during prediction: {e}")
        
        # Handle specific error cases
        if str(e) == "no_face_detected":
            return JSONResponse(
                status_code=422,
                content={
                    "error": "No faces detected in the video",
                    "filename": file.filename,
                    "status": "error"
                }
            )
        elif str(e) == "tfq_unavailable":
            return JSONResponse(
                status_code=503,
                content={
                    "error": "TensorFlow Quantum unavailable",
                    "filename": file.filename,
                    "status": "error"
                }
            )
        else:
            raise HTTPException(
                status_code=500,
                detail=f"Internal server error during prediction: {str(e)}"
            )
    
    finally:
        # Cleanup temporary files
        try:
            if temp_file_path and os.path.exists(temp_file_path):
                os.remove(temp_file_path)
            if os.path.exists(temp_dir):
                os.rmdir(temp_dir)
        except Exception as cleanup_error:
            print(f"Warning: Failed to cleanup temporary files: {cleanup_error}")

@app.post("/predict-batch")
async def predict_batch(files: List[UploadFile] = File(...)):
    """
    Analyze multiple videos for deepfake detection
    """
    if len(files) > 10:  # Limit batch size
        raise HTTPException(
            status_code=400,
            detail="Too many files. Maximum 10 files per batch."
        )
    
    results = []
    
    for file in files:
        try:
            # Call single prediction for each file
            result = await predict_deepfake(file)
            results.append(result)
        except Exception as e:
            results.append({
                "filename": file.filename,
                "error": str(e),
                "status": "error"
            })
    
    return {
        "batch_results": results,
        "total_files": len(files),
        "successful_predictions": len([r for r in results if r.get("status") == "success"])
    }

# Pydantic models for request/response
class TextPredictionRequest(BaseModel):
    content: str

@app.post("/predict/text")
async def predict_text_authenticity(request: TextPredictionRequest) -> Dict[str, Any]:
    """
    Analyze text content for fact-checking and authenticity
    
    Args:
        request: TextPredictionRequest with content to analyze
    
    Returns:
        JSON response with prediction results
    """
    
    if not request.content or not request.content.strip():
        raise HTTPException(
            status_code=400,
            detail="Content cannot be empty"
        )
    
    try:
        # Simple keyword-based analysis for now
        response = simple_text_analysis(request.content)
        return JSONResponse(content=response)
            
    except Exception as e:
        print(f"Error during text prediction: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error during text analysis: {str(e)}"
        )

def simple_text_analysis(content: str) -> Dict[str, Any]:
    """
    Simple keyword-based text analysis
    """
    content_lower = content.lower()
    
    # Simple heuristics for detecting potentially misleading content
    misleading_keywords = [
        'breaking', 'urgent', 'shocking', 'secret', 'they don\'t want you to know',
        'miracle cure', 'doctors hate', 'banned', 'censored', 'wake up'
    ]
    
    reliable_indicators = [
        'according to', 'study shows', 'research indicates', 'data suggests',
        'peer-reviewed', 'published in', 'scientists say'
    ]
    
    misleading_score = sum(1 for keyword in misleading_keywords if keyword in content_lower)
    reliable_score = sum(1 for indicator in reliable_indicators if indicator in content_lower)
    
    # Calculate prediction based on scores
    if reliable_score > misleading_score and reliable_score > 0:
        prediction = "reliable"
        confidence = min(0.8, 0.5 + (reliable_score * 0.1))
    elif misleading_score > reliable_score and misleading_score > 0:
        prediction = "misleading"
        confidence = min(0.8, 0.5 + (misleading_score * 0.1))
    else:
        prediction = "questionable"
        confidence = 0.5
    
    return {
        "prediction": prediction,
        "confidence": confidence,
        "explanation": f"Analysis based on content indicators. Found {reliable_score} reliability indicators and {misleading_score} potential red flags.",
        "facts_found": [],
        "inaccuracies": [],
        "missing_context": "More context and source verification recommended for accurate assessment.",
        "sources": []
    }

@app.post("/predict/image")
async def predict_image_deepfake(
    file: UploadFile = File(...),
    max_faces: int = 5
) -> Dict[str, Any]:
    """
    Analyze uploaded image for deepfake detection
    
    Args:
        file: Image file (jpg, png, etc.)
        max_faces: Maximum number of faces to analyze (default: 5)
    
    Returns:
        JSON response with prediction results
    """
    
    # Validate file type
    if not file.filename.lower().endswith(('.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.webp')):
        raise HTTPException(
            status_code=400, 
            detail="Invalid file type. Please upload an image file (jpg, png, etc.)."
        )
    
    # Check if models are loaded
    if not all([scaler, embedder_model]):
        raise HTTPException(
            status_code=503,
            detail="Models not loaded. Please try again later."
        )
    
    if not TFQ_AVAILABLE or tfq_model is None:
        raise HTTPException(
            status_code=503,
            detail="TensorFlow Quantum not available. Quantum prediction disabled."
        )
    
    # Create temporary file
    temp_dir = tempfile.mkdtemp()
    temp_file_path = None
    
    try:
        # Save uploaded file temporarily
        temp_file_path = os.path.join(temp_dir, f"temp_image_{file.filename}")
        
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Run prediction
        prob, label, faces_found = predict_image_deepfake_single(
            image_path=temp_file_path,
            model=tfq_model,
            scaler=scaler,
            embedder_model=embedder_model,
            n_qubits=8,
            max_faces=max_faces,
            device=device
        )
        
        # Prepare response
        response = {
            "filename": file.filename,
            "prediction": {
                "label": label,
                "is_deepfake": label == "fake",
                "deepfake_probability": round(prob, 4) if label == "real" else round(1 - prob, 4)
            },
            "analysis_parameters": {
                "faces_found": faces_found,
                "max_faces_analyzed": max_faces,
                "quantum_enhanced": True,
                "device_used": device
            },
            "status": "success"
        }
        
        return JSONResponse(content=response)
        
    except Exception as e:
        print(f"Error during image prediction: {e}")
        
        # Handle specific error cases
        if str(e) == "no_face_detected":
            return JSONResponse(
                status_code=422,
                content={
                    "error": "No faces detected in the image",
                    "filename": file.filename,
                    "status": "error"
                }
            )
        elif str(e) == "tfq_unavailable":
            return JSONResponse(
                status_code=503,
                content={
                    "error": "TensorFlow Quantum unavailable",
                    "filename": file.filename,
                    "status": "error"
                }
            )
        else:
            raise HTTPException(
                status_code=500,
                detail=f"Internal server error during prediction: {str(e)}"
            )
    
    finally:
        # Cleanup temporary files
        try:
            if temp_file_path and os.path.exists(temp_file_path):
                os.remove(temp_file_path)
            if os.path.exists(temp_dir):
                os.rmdir(temp_dir)
        except Exception as cleanup_error:
            print(f"Warning: Failed to cleanup temporary files: {cleanup_error}")

@app.post("/predict/image-batch")
async def predict_image_batch(files: List[UploadFile] = File(...)):
    """
    Analyze multiple images for deepfake detection
    """
    if len(files) > 10:  # Limit batch size
        raise HTTPException(
            status_code=400,
            detail="Too many files. Maximum 10 files per batch."
        )
    
    results = []
    
    for file in files:
        try:
            # Call single prediction for each file
            result = await predict_image_deepfake(file)
            results.append(result)
        except Exception as e:
            results.append({
                "filename": file.filename,
                "error": str(e),
                "status": "error"
            })
    
    return {
        "batch_results": results,
        "total_files": len(files),
        "successful_predictions": len([r for r in results if r.get("status") == "success"])
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app", 
        host="0.0.0.0", 
        port=8000, 
        reload=True,
        log_level="info"
    )
