"""Response schemas for analytics API."""
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class OverviewResponse(BaseModel):
    """Overview metrics response."""
    total_feedback: int = Field(..., description="Total number of feedback records")
    analyzed_feedback: int = Field(..., description="Number of completed analyses")
    pending_feedback: int = Field(..., description="Number of pending feedback records")
    failed_feedback: int = Field(..., description="Number of failed feedback records")
    analysis_coverage_percentage: Optional[float] = Field(..., description="Percentage of analyzed feedback (0-100 or null)")
    average_rating: Optional[float] = Field(..., description="Average rating or null if no ratings")
    complaint_count: int = Field(..., description="Number of complaints (true)")
    complaint_rate: Optional[float] = Field(..., description="Complaint rate % or null if no known labels")
    positive_count: int = Field(..., description="Count of positive sentiments")
    neutral_count: int = Field(..., description="Count of neutral sentiments")
    negative_count: int = Field(..., description="Count of negative sentiments")


class SentimentAnalyticsResponse(BaseModel):
    """Sentiment analytics response."""
    sentiment_distribution: Dict[str, int] = Field(..., description="Counts by sentiment")
    sentiment_percentages: Dict[str, Optional[float]] = Field(..., description="Percentages by sentiment")
    average_sentiment_confidence: Dict[str, float] = Field(..., description="Average confidence scores")
    total_with_sentiment: int = Field(..., description="Total records with sentiment label")


class AspectItem(BaseModel):
    """Single aspect in analytics."""
    aspect_term: str = Field(..., description="The aspect term")
    mentions: int = Field(..., description="Number of mentions")
    average_confidence: Optional[float] = Field(..., description="Average confidence")
    sentiment_distribution: Dict[str, int] = Field(..., description="Sentiment distribution for this aspect")


class AspectAnalyticsResponse(BaseModel):
    """Aspect analytics response."""
    top_aspects: List[AspectItem] = Field(..., description="Top aspects by frequency")


class EmotionAnalyticsResponse(BaseModel):
    """Emotion analytics response."""
    emotion_distribution: Dict[str, int] = Field(..., description="Counts by emotion")
    emotion_percentages: Dict[str, float] = Field(..., description="Percentages by emotion")
    emotion_coverage_percentage: Optional[float] = Field(..., description="Coverage percentage (0-100)")
    total_with_emotion: int = Field(..., description="Total records with emotion label")
    total_analyses: int = Field(..., description="Total completed analyses")


class ComplaintAnalyticsResponse(BaseModel):
    """Complaint analytics response."""
    complaint_true: int = Field(..., description="Count of complaints")
    complaint_false: int = Field(..., description="Count of non-complaints")
    complaint_unknown: int = Field(..., description="Count of unknown labels")
    complaint_rate: Optional[float] = Field(..., description="Complaint rate % (known labels only)")
    complaint_coverage_percentage: Optional[float] = Field(..., description="Coverage percentage (0-100)")


class TrendPoint(BaseModel):
    """Single data point in trend."""
    date: str = Field(..., description="Date in ISO format")
    positive: int = Field(..., description="Positive count")
    neutral: int = Field(..., description="Neutral count")
    negative: int = Field(..., description="Negative count")
    unknown: int = Field(..., description="Unknown/null sentiment count")
    total: int = Field(..., description="Total feedback")


class TrendsResponse(BaseModel):
    """Trends response."""
    trends: List[TrendPoint] = Field(..., description="Trend data points")
    granularity: str = Field(..., description="Granularity (daily, weekly, monthly)")


class DatasetComparisonItem(BaseModel):
    """Single dataset in comparison."""
    dataset_id: str = Field(..., description="Dataset UUID")
    dataset_name: str = Field(..., description="Dataset name")
    total_feedback: int
    analyzed_feedback: int
    pending_feedback: int
    failed_feedback: int
    analysis_coverage_percentage: Optional[float]
    average_rating: Optional[float]
    complaint_count: int
    complaint_rate: Optional[float]
    positive_count: int
    neutral_count: int
    negative_count: int


class DatasetComparisonResponse(BaseModel):
    """Dataset comparison response."""
    datasets: List[DatasetComparisonItem] = Field(..., description="Dataset comparisons")


class SourceItem(BaseModel):
    """Single source in comparison."""
    source: str = Field(..., description="Source name")
    feedback_count: int = Field(..., description="Number of feedback records")
    sentiment_distribution: Dict[str, int] = Field(..., description="Sentiment distribution")
    complaint_rate: Optional[float] = Field(..., description="Complaint rate %")


class SourceComparisonResponse(BaseModel):
    """Source comparison response."""
    sources: List[SourceItem] = Field(..., description="Source comparisons")
