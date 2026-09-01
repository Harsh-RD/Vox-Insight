"""Tests for analytics service and API."""
import uuid
from datetime import datetime, timezone, timedelta

import pytest
from sqlalchemy.orm import Session

from app.core.exceptions import PermissionDeniedException, NotFoundException
from app.models.user import User
from app.models.workspace import Workspace
from app.models.user_workspace import UserWorkspace
from app.models.dataset import Dataset
from app.models.feedback import Feedback
from app.models.analysis_result import AnalysisResult
from app.models.aspect_analysis import AspectAnalysis
from app.services import analytics


@pytest.fixture
def db(db_session: Session) -> Session:
    """Provide database session fixture."""
    return db_session


@pytest.fixture
def user_with_workspace(db: Session) -> tuple[User, Workspace]:
    """Create a user and workspace."""
    user = User(
        email="analytics@example.com",
        name="Analytics User",
        hashed_password="dummy",
    )
    db.add(user)
    db.flush()
    
    workspace = Workspace(
        name="Analytics Workspace",
        slug="analytics-workspace",
        owner_id=user.id,
    )
    db.add(workspace)
    db.flush()
    
    membership = UserWorkspace(
        user_id=user.id,
        workspace_id=workspace.id,
        role="admin",
    )
    db.add(membership)
    db.commit()
    
    return user, workspace


@pytest.fixture
def dataset(db: Session, user_with_workspace: tuple) -> Dataset:
    """Create a dataset."""
    user, workspace = user_with_workspace
    ds = Dataset(
        workspace_id=workspace.id,
        name="Test Dataset",
        description="Test dataset for analytics",
        source="test",
        created_by=user.id,
        row_count=0,
    )
    db.add(ds)
    db.commit()
    return ds


def create_feedback_with_analysis(
    db: Session,
    dataset: Dataset,
    workspace_id: uuid.UUID,
    text: str,
    sentiment: str = "positive",
    emotion: str = "joy",
    complaint: bool = False,
    rating: float = 5.0,
    source: str = "web",
    timestamp: datetime = None,
    aspects: list = None,
) -> tuple[Feedback, AnalysisResult]:
    """Helper to create feedback and analysis."""
    if timestamp is None:
        timestamp = datetime.now(timezone.utc)
    
    feedback = Feedback(
        dataset_id=dataset.id,
        workspace_id=workspace_id,
        original_text=text,
        rating=rating,
        source=source,
        feedback_timestamp=timestamp,
        language="en",
        processing_status="completed",
    )
    db.add(feedback)
    db.flush()
    
    analysis = AnalysisResult(
        feedback_id=feedback.id,
        workspace_id=workspace_id,
        normalized_text=text,
        language="en",
        language_confidence=0.99,
        script="Latin",
        is_code_mixed=False,
        sentiment_label=sentiment,
        sentiment_score=0.9 if sentiment == "positive" else 0.1,
        sentiment_source="model",
        emotion_label=emotion,
        emotion_confidence=0.8,
        emotion_source="model",
        complaint_label=complaint,
        complaint_confidence=0.9,
        complaint_source="model",
        status="completed",
    )
    db.add(analysis)
    db.flush()
    
    if aspects:
        for aspect_term, sentiment_label in aspects:
            aspect = AspectAnalysis(
                analysis_result_id=analysis.id,
                aspect_term=aspect_term,
                normalized_aspect=aspect_term.lower(),
                sentiment_label=sentiment_label,
                sentiment_score=0.8,
                confidence=0.7,
                source="heuristic",
            )
            db.add(aspect)
    
    db.commit()
    return feedback, analysis


class TestOverviewMetrics:
    """Test overview metrics calculation."""
    
    def test_overview_empty_workspace(self, db: Session, user_with_workspace: tuple):
        """Test overview with no feedback."""
        user, workspace = user_with_workspace
        
        result = analytics.get_overview(db, user.id, workspace.id)
        
        assert result["total_feedback"] == 0
        assert result["analyzed_feedback"] == 0
        assert result["pending_feedback"] == 0
        assert result["failed_feedback"] == 0
        assert result["analysis_coverage_percentage"] is None
        assert result["average_rating"] is None
        assert result["complaint_count"] == 0
        assert result["complaint_rate"] is None
        assert result["positive_count"] == 0
        assert result["neutral_count"] == 0
        assert result["negative_count"] == 0
    
    def test_overview_with_feedback(self, db: Session, dataset: Dataset, user_with_workspace: tuple):
        """Test overview with analyzed feedback."""
        user, workspace = user_with_workspace
        
        # Create feedback: 5 positive, 3 neutral, 2 negative
        for i in range(5):
            create_feedback_with_analysis(
                db, dataset, workspace.id, f"Great product {i}",
                sentiment="positive", rating=5.0
            )
        for i in range(3):
            create_feedback_with_analysis(
                db, dataset, workspace.id, f"Neutral feedback {i}",
                sentiment="neutral", rating=3.0
            )
        for i in range(2):
            create_feedback_with_analysis(
                db, dataset, workspace.id, f"Bad product {i}",
                sentiment="negative", rating=1.0
            )
        
        result = analytics.get_overview(db, user.id, workspace.id)
        
        assert result["total_feedback"] == 10
        assert result["analyzed_feedback"] == 10
        assert result["analysis_coverage_percentage"] == 100.0
        assert result["average_rating"] == 3.6  # (5*5 + 3*3 + 2*1) / 10 = 36 / 10 = 3.6
        assert result["positive_count"] == 5
        assert result["neutral_count"] == 3
        assert result["negative_count"] == 2
    
    def test_overview_dataset_scoped(self, db: Session, user_with_workspace: tuple):
        """Test overview scoped to single dataset."""
        user, workspace = user_with_workspace
        
        # Create two datasets
        ds1 = Dataset(
            workspace_id=workspace.id,
            name="Dataset 1",
            created_by=user.id,
        )
        db.add(ds1)
        db.flush()
        
        ds2 = Dataset(
            workspace_id=workspace.id,
            name="Dataset 2",
            created_by=user.id,
        )
        db.add(ds2)
        db.flush()
        
        # Add feedback to ds1
        create_feedback_with_analysis(
            db, ds1, workspace.id, "Good",
            sentiment="positive", rating=5.0
        )
        
        # Add feedback to ds2
        create_feedback_with_analysis(
            db, ds2, workspace.id, "Bad",
            sentiment="negative", rating=1.0
        )
        
        # Get overview for ds1 only
        result = analytics.get_overview(db, user.id, workspace.id, dataset_id=ds1.id)
        
        assert result["total_feedback"] == 1
        assert result["positive_count"] == 1
        assert result["negative_count"] == 0
    
    def test_overview_pending_failed(self, db: Session, dataset: Dataset, user_with_workspace: tuple):
        """Test pending and failed feedback counts."""
        user, workspace = user_with_workspace
        
        # Completed
        create_feedback_with_analysis(db, dataset, workspace.id, "Done", sentiment="positive")
        
        # Pending (no analysis)
        pending = Feedback(
            dataset_id=dataset.id,
            workspace_id=workspace.id,
            original_text="Pending",
            processing_status="pending",
        )
        db.add(pending)
        
        # Failed
        failed = Feedback(
            dataset_id=dataset.id,
            workspace_id=workspace.id,
            original_text="Failed",
            processing_status="failed",
        )
        db.add(failed)
        db.commit()
        
        result = analytics.get_overview(db, user.id, workspace.id)
        
        assert result["total_feedback"] == 3
        assert result["analyzed_feedback"] == 1
        assert result["pending_feedback"] == 1
        assert result["failed_feedback"] == 1
        assert result["analysis_coverage_percentage"] == pytest.approx(33.33, 0.01)
    
    def test_overview_no_ratings(self, db: Session, dataset: Dataset, user_with_workspace: tuple):
        """Test overview with missing ratings."""
        user, workspace = user_with_workspace
        
        # Create feedback without ratings
        create_feedback_with_analysis(
            db, dataset, workspace.id, "No rating",
            sentiment="positive", rating=None
        )
        
        result = analytics.get_overview(db, user.id, workspace.id)
        
        assert result["average_rating"] is None
    
    def test_overview_complaint_metrics(self, db: Session, dataset: Dataset, user_with_workspace: tuple):
        """Test complaint rate calculations."""
        user, workspace = user_with_workspace
        
        # 5 complaints
        for i in range(5):
            create_feedback_with_analysis(
                db, dataset, workspace.id, f"Complaint {i}",
                complaint=True
            )
        
        # 3 non-complaints
        for i in range(3):
            create_feedback_with_analysis(
                db, dataset, workspace.id, f"No complaint {i}",
                complaint=False
            )
        
        # 2 unknown (NULL complaint_label) - shouldn't affect rate
        for i in range(2):
            fb, analysis = create_feedback_with_analysis(
                db, dataset, workspace.id, f"Unknown {i}",
                complaint=False
            )
            analysis.complaint_label = None
            db.commit()
        
        result = analytics.get_overview(db, user.id, workspace.id)
        
        assert result["complaint_count"] == 5
        assert result["complaint_rate"] == pytest.approx(62.5)  # 5 / (5 + 3) = 62.5%
    
    def test_overview_unknown_sentiment_excluded(self, db: Session, dataset: Dataset, user_with_workspace: tuple):
        """Test that unknown sentiments are excluded from percentages."""
        user, workspace = user_with_workspace
        
        # Known sentiments
        create_feedback_with_analysis(
            db, dataset, workspace.id, "Good",
            sentiment="positive"
        )
        create_feedback_with_analysis(
            db, dataset, workspace.id, "Neutral",
            sentiment="neutral"
        )
        
        # Unknown sentiment (NULL)
        fb, analysis = create_feedback_with_analysis(
            db, dataset, workspace.id, "Unknown",
            sentiment="positive"
        )
        analysis.sentiment_label = None
        db.commit()
        
        result = analytics.get_overview(db, user.id, workspace.id)
        
        # Only 2 known sentiments
        assert result["positive_count"] == 1
        assert result["neutral_count"] == 1
        assert result["negative_count"] == 0


class TestSentimentAnalytics:
    """Test sentiment analytics."""
    
    def test_sentiment_distribution(self, db: Session, dataset: Dataset, user_with_workspace: tuple):
        """Test sentiment distribution."""
        user, workspace = user_with_workspace
        
        for i in range(5):
            create_feedback_with_analysis(db, dataset, workspace.id, f"Good {i}", sentiment="positive")
        for i in range(3):
            create_feedback_with_analysis(db, dataset, workspace.id, f"OK {i}", sentiment="neutral")
        for i in range(2):
            create_feedback_with_analysis(db, dataset, workspace.id, f"Bad {i}", sentiment="negative")
        
        result = analytics.get_sentiment_analytics(db, user.id, workspace.id)
        
        assert result["sentiment_distribution"]["positive"] == 5
        assert result["sentiment_distribution"]["neutral"] == 3
        assert result["sentiment_distribution"]["negative"] == 2
        assert result["total_with_sentiment"] == 10
    
    def test_sentiment_percentages(self, db: Session, dataset: Dataset, user_with_workspace: tuple):
        """Test sentiment percentages."""
        user, workspace = user_with_workspace
        
        # 5 positive, 3 neutral, 2 negative
        for i in range(5):
            create_feedback_with_analysis(db, dataset, workspace.id, f"Good {i}", sentiment="positive")
        for i in range(3):
            create_feedback_with_analysis(db, dataset, workspace.id, f"OK {i}", sentiment="neutral")
        for i in range(2):
            create_feedback_with_analysis(db, dataset, workspace.id, f"Bad {i}", sentiment="negative")
        
        result = analytics.get_sentiment_analytics(db, user.id, workspace.id)
        
        assert result["sentiment_percentages"]["positive"] == 50.0
        assert result["sentiment_percentages"]["neutral"] == 30.0
        assert result["sentiment_percentages"]["negative"] == 20.0
    
    def test_sentiment_with_date_filtering(self, db: Session, dataset: Dataset, user_with_workspace: tuple):
        """Test sentiment filtering by date."""
        user, workspace = user_with_workspace
        
        now = datetime.now(timezone.utc)
        past = now - timedelta(days=10)
        
        # Past feedback (positive)
        create_feedback_with_analysis(
            db, dataset, workspace.id, "Old positive",
            sentiment="positive", timestamp=past
        )
        
        # Recent feedback (negative)
        create_feedback_with_analysis(
            db, dataset, workspace.id, "New negative",
            sentiment="negative", timestamp=now
        )
        
        # Filter for only recent (last 5 days)
        result = analytics.get_sentiment_analytics(
            db, user.id, workspace.id,
            start_date=now - timedelta(days=5)
        )
        
        assert result["sentiment_distribution"]["positive"] == 0
        assert result["sentiment_distribution"]["negative"] == 1


class TestAspectAnalytics:
    """Test aspect analytics."""
    
    def test_top_aspects_by_frequency(self, db: Session, dataset: Dataset, user_with_workspace: tuple):
        """Test top aspects by frequency."""
        user, workspace = user_with_workspace
        
        # Create feedback with various aspects
        for i in range(10):
            create_feedback_with_analysis(
                db, dataset, workspace.id, f"Delivery feedback {i}",
                sentiment="negative",
                aspects=[("Delivery", "negative"), ("Speed", "negative")]
            )
        for i in range(5):
            create_feedback_with_analysis(
                db, dataset, workspace.id, f"Product quality {i}",
                sentiment="positive",
                aspects=[("Quality", "positive"), ("Design", "positive")]
            )
        
        result = analytics.get_aspect_analytics(db, user.id, workspace.id)
        
        # Should have top aspects
        top_aspects = result["top_aspects"]
        assert len(top_aspects) > 0
        
        # Find specific aspects
        aspect_terms = [a["aspect_term"] for a in top_aspects]
        assert "Delivery" in aspect_terms
        assert "Speed" in aspect_terms
    
    def test_aspect_sentiment_distribution(self, db: Session, dataset: Dataset, user_with_workspace: tuple):
        """Test aspect sentiment distribution."""
        user, workspace = user_with_workspace
        
        # Delivery: 8 negative, 2 positive
        for i in range(8):
            create_feedback_with_analysis(
                db, dataset, workspace.id, f"Bad delivery {i}",
                sentiment="negative",
                aspects=[("Delivery", "negative")]
            )
        for i in range(2):
            create_feedback_with_analysis(
                db, dataset, workspace.id, f"Good delivery {i}",
                sentiment="positive",
                aspects=[("Delivery", "positive")]
            )
        
        result = analytics.get_aspect_analytics(db, user.id, workspace.id)
        
        # Find delivery aspect
        delivery = next((a for a in result["top_aspects"] if a["aspect_term"] == "Delivery"), None)
        assert delivery is not None
        assert delivery["mentions"] == 10
        assert delivery["sentiment_distribution"]["negative"] == 8
        assert delivery["sentiment_distribution"]["positive"] == 2


class TestEmotionAnalytics:
    """Test emotion analytics."""
    
    def test_emotion_distribution(self, db: Session, dataset: Dataset, user_with_workspace: tuple):
        """Test emotion distribution."""
        user, workspace = user_with_workspace
        
        emotions = ["joy", "joy", "joy", "sadness", "sadness", "anger"]
        for emotion in emotions:
            create_feedback_with_analysis(
                db, dataset, workspace.id, f"Feedback with {emotion}",
                emotion=emotion
            )
        
        result = analytics.get_emotion_analytics(db, user.id, workspace.id)
        
        assert result["emotion_distribution"]["joy"] == 3
        assert result["emotion_distribution"]["sadness"] == 2
        assert result["emotion_distribution"]["anger"] == 1
    
    def test_emotion_coverage(self, db: Session, dataset: Dataset, user_with_workspace: tuple):
        """Test emotion coverage percentage."""
        user, workspace = user_with_workspace
        
        # 8 with emotions
        for i in range(8):
            create_feedback_with_analysis(
                db, dataset, workspace.id, f"Feedback {i}",
                emotion="joy"
            )
        
        # 2 without emotions (NULL)
        for i in range(2):
            fb, analysis = create_feedback_with_analysis(
                db, dataset, workspace.id, f"Unknown emotion {i}",
                emotion="joy"
            )
            analysis.emotion_label = None
            db.commit()
        
        result = analytics.get_emotion_analytics(db, user.id, workspace.id)
        
        assert result["total_analyses"] == 10
        assert result["total_with_emotion"] == 8
        assert result["emotion_coverage_percentage"] == 80.0


class TestComplaintAnalytics:
    """Test complaint analytics."""
    
    def test_complaint_rate_calculation(self, db: Session, dataset: Dataset, user_with_workspace: tuple):
        """Test complaint rate calculation."""
        user, workspace = user_with_workspace
        
        # 5 complaints, 3 non-complaints
        for i in range(5):
            create_feedback_with_analysis(
                db, dataset, workspace.id, f"Complaint {i}",
                complaint=True
            )
        for i in range(3):
            create_feedback_with_analysis(
                db, dataset, workspace.id, f"Non-complaint {i}",
                complaint=False
            )
        
        result = analytics.get_complaint_analytics(db, user.id, workspace.id)
        
        assert result["complaint_true"] == 5
        assert result["complaint_false"] == 3
        assert result["complaint_unknown"] == 0
        assert result["complaint_rate"] == pytest.approx(62.5)  # 5 / (5 + 3)
    
    def test_complaint_coverage_with_unknowns(self, db: Session, dataset: Dataset, user_with_workspace: tuple):
        """Test complaint coverage excludes unknowns from rate."""
        user, workspace = user_with_workspace
        
        # 5 known complaints
        for i in range(5):
            create_feedback_with_analysis(
                db, dataset, workspace.id, f"Known complaint {i}",
                complaint=True
            )
        
        # 5 unknown (NULL complaint_label)
        for i in range(5):
            fb, analysis = create_feedback_with_analysis(
                db, dataset, workspace.id, f"Unknown {i}",
                complaint=False
            )
            analysis.complaint_label = None
            db.commit()
        
        result = analytics.get_complaint_analytics(db, user.id, workspace.id)
        
        assert result["complaint_true"] == 5
        assert result["complaint_unknown"] == 5
        assert result["complaint_rate"] == 100.0  # Only known labels: 5 / 5
        assert result["complaint_coverage_percentage"] == 50.0  # 5 known / 10 total


class TestTrends:
    """Test trend analytics."""
    
    def test_sentiment_trends_daily(self, db: Session, dataset: Dataset, user_with_workspace: tuple):
        """Test daily sentiment trends."""
        user, workspace = user_with_workspace
        
        now = datetime.now(timezone.utc)
        yesterday = now - timedelta(days=1)
        
        # Yesterday: 2 positive, 1 negative
        create_feedback_with_analysis(
            db, dataset, workspace.id, "Good", sentiment="positive", timestamp=yesterday
        )
        create_feedback_with_analysis(
            db, dataset, workspace.id, "Good 2", sentiment="positive", timestamp=yesterday
        )
        create_feedback_with_analysis(
            db, dataset, workspace.id, "Bad", sentiment="negative", timestamp=yesterday
        )
        
        # Today: 1 positive, 2 negative
        create_feedback_with_analysis(
            db, dataset, workspace.id, "Good today", sentiment="positive", timestamp=now
        )
        create_feedback_with_analysis(
            db, dataset, workspace.id, "Bad today", sentiment="negative", timestamp=now
        )
        create_feedback_with_analysis(
            db, dataset, workspace.id, "Bad today 2", sentiment="negative", timestamp=now
        )
        
        result = analytics.get_trends(db, user.id, workspace.id, granularity="daily")
        
        # Should have 2 data points (one per day)
        assert len(result["trends"]) == 2


class TestDatasetComparison:
    """Test dataset comparison."""
    
    def test_dataset_comparison(self, db: Session, user_with_workspace: tuple):
        """Test comparing metrics across datasets."""
        user, workspace = user_with_workspace
        
        # Create two datasets
        ds1 = Dataset(
            workspace_id=workspace.id,
            name="Dataset 1",
            created_by=user.id,
        )
        db.add(ds1)
        db.flush()
        
        ds2 = Dataset(
            workspace_id=workspace.id,
            name="Dataset 2",
            created_by=user.id,
        )
        db.add(ds2)
        db.flush()
        
        # Dataset 1: 8 positive
        for i in range(8):
            create_feedback_with_analysis(
                db, ds1, workspace.id, f"Good {i}",
                sentiment="positive"
            )
        
        # Dataset 2: 2 positive, 8 negative
        for i in range(2):
            create_feedback_with_analysis(
                db, ds2, workspace.id, f"Good {i}",
                sentiment="positive"
            )
        for i in range(8):
            create_feedback_with_analysis(
                db, ds2, workspace.id, f"Bad {i}",
                sentiment="negative"
            )
        
        result = analytics.get_dataset_comparison(db, user.id, workspace.id)
        
        assert len(result["datasets"]) == 2
        
        # Find datasets
        ds1_comp = next((d for d in result["datasets"] if d["dataset_id"] == str(ds1.id)), None)
        ds2_comp = next((d for d in result["datasets"] if d["dataset_id"] == str(ds2.id)), None)
        
        assert ds1_comp["positive_count"] == 8
        assert ds2_comp["positive_count"] == 2
        assert ds2_comp["negative_count"] == 8


class TestWorkspaceIsolation:
    """Test workspace isolation."""
    
    def test_unauthorized_workspace_access(self, db: Session, user_with_workspace: tuple):
        """Test that users cannot access other workspaces."""
        user1, workspace1 = user_with_workspace
        
        # Create another user without access to workspace1
        user2 = User(
            email="unauthorized@example.com",
            name="Unauthorized User",
            hashed_password="dummy",
        )
        db.add(user2)
        db.commit()
        
        # Try to access workspace1 without authorization
        with pytest.raises(PermissionDeniedException):
            analytics.get_overview(db, user2.id, workspace1.id)
    
    def test_cross_workspace_dataset_access(self, db: Session, user_with_workspace: tuple):
        """Test that users cannot access datasets from other workspaces."""
        user1, workspace1 = user_with_workspace
        
        # Create another user and workspace
        user2 = User(
            email="user2@example.com",
            name="User 2",
            hashed_password="dummy",
        )
        db.add(user2)
        db.flush()
        
        workspace2 = Workspace(
            name="Workspace 2",
            slug="workspace-2",
            owner_id=user2.id,
        )
        db.add(workspace2)
        db.flush()
        
        UserWorkspace(
            user_id=user2.id,
            workspace_id=workspace2.id,
            role="admin",
        )
        
        ds2 = Dataset(
            workspace_id=workspace2.id,
            name="Dataset 2",
            created_by=user2.id,
        )
        db.add(ds2)
        db.commit()
        
        # Try to access dataset from workspace2 with user1 credentials
        with pytest.raises(PermissionDeniedException):
            analytics.get_overview(db, user1.id, workspace1.id, dataset_id=ds2.id)


class TestEdgeCases:
    """Test edge cases and error handling."""
    
    def test_empty_dataset(self, db: Session, dataset: Dataset, user_with_workspace: tuple):
        """Test analytics on empty dataset."""
        user, workspace = user_with_workspace
        
        result = analytics.get_overview(db, user.id, workspace.id, dataset_id=dataset.id)
        
        assert result["total_feedback"] == 0
        assert result["analysis_coverage_percentage"] is None
    
    def test_all_null_ratings(self, db: Session, dataset: Dataset, user_with_workspace: tuple):
        """Test average rating with all NULL ratings."""
        user, workspace = user_with_workspace
        
        # All feedback with NULL ratings
        for i in range(3):
            create_feedback_with_analysis(
                db, dataset, workspace.id, f"No rating {i}",
                sentiment="positive", rating=None
            )
        
        result = analytics.get_overview(db, user.id, workspace.id)
        
        assert result["average_rating"] is None
    
    def test_no_aspect_data(self, db: Session, dataset: Dataset, user_with_workspace: tuple):
        """Test aspect analytics with no aspects."""
        user, workspace = user_with_workspace
        
        # Create feedback without aspects
        create_feedback_with_analysis(
            db, dataset, workspace.id, "No aspects",
            sentiment="positive", aspects=None
        )
        
        result = analytics.get_aspect_analytics(db, user.id, workspace.id)
        
        assert len(result["top_aspects"]) == 0
    
    def test_division_by_zero_handling(self, db: Session, dataset: Dataset, user_with_workspace: tuple):
        """Test that division by zero is handled gracefully."""
        user, workspace = user_with_workspace
        
        # Empty workspace should return NULL for rates, not 0/0
        result = analytics.get_overview(db, user.id, workspace.id, dataset_id=dataset.id)
        
        assert result["complaint_rate"] is None
        assert result["analysis_coverage_percentage"] is None
