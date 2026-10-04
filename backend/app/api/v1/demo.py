from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Dict, Any

from app.nlp.pipeline import analyze

router = APIRouter(prefix="/demo", tags=["Demo"])

class DemoAnalyzeRequest(BaseModel):
    text: str

@router.post("/analyze", response_model=Dict[str, Any])
def analyze_demo_text(request: DemoAnalyzeRequest):
    """
    Public unauthenticated endpoint for the landing page demo.
    Runs the NLP pipeline without saving to the database.
    """
    if not request.text or len(request.text.strip()) == 0:
        raise HTTPException(status_code=400, detail="Text cannot be empty.")
    
    if len(request.text) > 1000:
        raise HTTPException(status_code=400, detail="Text too long for demo.")

    # Run the pipeline
    try:
        result = analyze(request.text.strip())
        return {
            "text": request.text,
            "language": result.get("language"),
            "sentiment": result.get("sentiment_label"),
            "sentiment_scores": {"score": result.get("sentiment_score")},
            "emotion": result.get("emotion_label"),
            "emotion_scores": {"score": result.get("emotion_confidence")},
            "is_complaint": result.get("complaint_label") == "complaint",
            "aspects": [{"aspect": a.get("aspect_term"), "sentiment": a.get("sentiment_label")} for a in result.get("aspects", [])]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")
