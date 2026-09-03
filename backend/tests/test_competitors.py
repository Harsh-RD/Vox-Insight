import uuid
import pytest
from sqlalchemy.orm import Session
from starlette.testclient import TestClient

from app.core.exceptions import AppException, NotFoundException, PermissionDeniedException
from app.models.analysis_result import AnalysisResult
from app.models.competitor import Competitor
from app.models.dataset import Dataset
from app.models.feedback import Feedback
from app.models.user import User
from app.models.user_workspace import UserWorkspace
from app.models.workspace import Workspace
from app.schemas.competitor import CompetitorCreate, CompetitorUpdate
from app.services import competitor as competitor_service
from app.core.security import create_access_token


@pytest.fixture
def test_setup(db_session: Session):
    # Workspace 1 & User 1
    user1 = User(
        email="user1@example.com",
        name="User One",
        hashed_password="hashed_pw_1",
        is_active=True,
    )
    db_session.add(user1)
    db_session.flush()

    ws1 = Workspace(name="Workspace One", slug="ws-one", owner_id=user1.id)
    db_session.add(ws1)
    db_session.flush()

    uw1 = UserWorkspace(user_id=user1.id, workspace_id=ws1.id, role="owner")
    db_session.add(uw1)

    ds1 = Dataset(workspace_id=ws1.id, name="Dataset 1", created_by=user1.id)
    db_session.add(ds1)

    # Workspace 2 & User 2
    user2 = User(
        email="user2@example.com",
        name="User Two",
        hashed_password="hashed_pw_2",
        is_active=True,
    )
    db_session.add(user2)
    db_session.flush()

    ws2 = Workspace(name="Workspace Two", slug="ws-two", owner_id=user2.id)
    db_session.add(ws2)
    db_session.flush()

    uw2 = UserWorkspace(user_id=user2.id, workspace_id=ws2.id, role="owner")
    db_session.add(uw2)

    ds2 = Dataset(workspace_id=ws2.id, name="Dataset 2", created_by=user2.id)
    db_session.add(ds2)

    db_session.commit()
    return {
        "user1": user1,
        "ws1": ws1,
        "ds1": ds1,
        "user2": user2,
        "ws2": ws2,
        "ds2": ds2,
    }


def auth_headers(user: User) -> dict:
    token = create_access_token(str(user.id))
    return {"Authorization": f"Bearer {token}"}


# 1. Create competitor
def test_create_competitor(db_session: Session, test_setup: dict):
    user1 = test_setup["user1"]
    ws1 = test_setup["ws1"]

    payload = CompetitorCreate(
        workspace_id=ws1.id,
        name="Acme Corp",
        aliases=["acme", "acme inc"],
        description="Top competitor",
    )
    comp = competitor_service.create_competitor(db_session, user1.id, payload)
    assert comp.id is not None
    assert comp.name == "Acme Corp"
    assert comp.aliases == ["acme", "acme inc"]
    assert comp.active is True


# 2. List competitors
def test_list_competitors(db_session: Session, test_setup: dict):
    user1 = test_setup["user1"]
    ws1 = test_setup["ws1"]

    competitor_service.create_competitor(
        db_session, user1.id, CompetitorCreate(workspace_id=ws1.id, name="Comp A")
    )
    competitor_service.create_competitor(
        db_session, user1.id, CompetitorCreate(workspace_id=ws1.id, name="Comp B")
    )

    comps = competitor_service.list_competitors(db_session, user1.id, ws1.id)
    assert len(comps) == 2
    assert [c.name for c in comps] == ["Comp A", "Comp B"]


# 3. Update competitor
def test_update_competitor(db_session: Session, test_setup: dict):
    user1 = test_setup["user1"]
    ws1 = test_setup["ws1"]

    comp = competitor_service.create_competitor(
        db_session, user1.id, CompetitorCreate(workspace_id=ws1.id, name="Old Name")
    )
    updated = competitor_service.update_competitor(
        db_session,
        user1.id,
        comp.id,
        CompetitorUpdate(name="New Name", aliases=["alias1"]),
    )
    assert updated.name == "New Name"
    assert updated.aliases == ["alias1"]


# 4. Delete / Deactivate competitor
def test_delete_and_deactivate_competitor(db_session: Session, test_setup: dict):
    user1 = test_setup["user1"]
    ws1 = test_setup["ws1"]

    comp = competitor_service.create_competitor(
        db_session, user1.id, CompetitorCreate(workspace_id=ws1.id, name="To Deactivate")
    )
    deactivated = competitor_service.update_competitor(
        db_session, user1.id, comp.id, CompetitorUpdate(active=False)
    )
    assert deactivated.active is False

    competitor_service.delete_competitor(db_session, user1.id, comp.id)
    with pytest.raises(NotFoundException):
        competitor_service.get_competitor(db_session, user1.id, comp.id)


# 5. Duplicate competitor protection
def test_duplicate_competitor_protection(db_session: Session, test_setup: dict):
    user1 = test_setup["user1"]
    ws1 = test_setup["ws1"]

    competitor_service.create_competitor(
        db_session, user1.id, CompetitorCreate(workspace_id=ws1.id, name="UniqueComp")
    )
    with pytest.raises(AppException) as exc:
        competitor_service.create_competitor(
            db_session, user1.id, CompetitorCreate(workspace_id=ws1.id, name="uniquecomp")
        )
    assert exc.value.code == "DUPLICATE_COMPETITOR"


# 6. Alias matching is case-insensitive
def test_alias_matching_case_insensitive(db_session: Session, test_setup: dict):
    user1 = test_setup["user1"]
    ws1 = test_setup["ws1"]
    ds1 = test_setup["ds1"]

    comp = competitor_service.create_competitor(
        db_session,
        user1.id,
        CompetitorCreate(
            workspace_id=ws1.id,
            name="Alpha Corp",
            aliases=["alpha", "alpha corp"],
        ),
    )

    fb = Feedback(
        workspace_id=ws1.id,
        dataset_id=ds1.id,
        original_text="I really liked ALPHA product compared to others.",
    )
    db_session.add(fb)
    db_session.commit()

    res = competitor_service.analyze_dataset_competitors(db_session, ds1.id, user1.id)
    assert res["mentions_found"] == 1
    assert res["competitors_detected"] == 1

    analytics = competitor_service.get_competitor_analytics(db_session, user1.id, ws1.id)
    assert analytics[0]["total_mentions"] == 1


# 7. Multiple competitors can match one feedback item
def test_multiple_competitors_match_one_feedback(db_session: Session, test_setup: dict):
    user1 = test_setup["user1"]
    ws1 = test_setup["ws1"]
    ds1 = test_setup["ds1"]

    competitor_service.create_competitor(
        db_session,
        user1.id,
        CompetitorCreate(workspace_id=ws1.id, name="Comp A", aliases=["compa"]),
    )
    competitor_service.create_competitor(
        db_session,
        user1.id,
        CompetitorCreate(workspace_id=ws1.id, name="Comp B", aliases=["compb"]),
    )

    fb = Feedback(
        workspace_id=ws1.id,
        dataset_id=ds1.id,
        original_text="We switched from Comp A to Comp B last month.",
    )
    db_session.add(fb)
    db_session.commit()

    res = competitor_service.analyze_dataset_competitors(db_session, ds1.id, user1.id)
    assert res["scanned_feedback_count"] == 1
    assert res["mentions_found"] == 2
    assert res["competitors_detected"] == 2


# 8. Duplicate mentions are not created (idempotent re-analysis)
def test_idempotent_reanalysis_prevents_duplicate_mentions(
    db_session: Session, test_setup: dict
):
    user1 = test_setup["user1"]
    ws1 = test_setup["ws1"]
    ds1 = test_setup["ds1"]

    competitor_service.create_competitor(
        db_session, user1.id, CompetitorCreate(workspace_id=ws1.id, name="StableCo")
    )
    fb = Feedback(
        workspace_id=ws1.id,
        dataset_id=ds1.id,
        original_text="StableCo has great service.",
    )
    db_session.add(fb)
    db_session.commit()

    res1 = competitor_service.analyze_dataset_competitors(db_session, ds1.id, user1.id)
    assert res1["mentions_found"] == 1

    # Re-run analysis
    res2 = competitor_service.analyze_dataset_competitors(db_session, ds1.id, user1.id)
    assert res2["mentions_found"] == 0
    assert res2["competitors_detected"] == 1

    analytics = competitor_service.get_competitor_analytics(db_session, user1.id, ws1.id)
    assert analytics[0]["total_mentions"] == 1


# 9. Cross-workspace competitor access denied
def test_cross_workspace_competitor_access_denied(db_session: Session, test_setup: dict):
    user1 = test_setup["user1"]
    user2 = test_setup["user2"]
    ws1 = test_setup["ws1"]

    comp = competitor_service.create_competitor(
        db_session, user1.id, CompetitorCreate(workspace_id=ws1.id, name="SecretComp")
    )

    with pytest.raises(PermissionDeniedException):
        competitor_service.get_competitor(db_session, user2.id, comp.id)

    with pytest.raises(PermissionDeniedException):
        competitor_service.update_competitor(
            db_session, user2.id, comp.id, CompetitorUpdate(name="Hacked")
        )

    with pytest.raises(PermissionDeniedException):
        competitor_service.delete_competitor(db_session, user2.id, comp.id)


# 10. Cross-workspace dataset / competitor relationship denied
def test_cross_workspace_dataset_competitor_relationship_denied(
    db_session: Session, test_setup: dict
):
    user1 = test_setup["user1"]
    ws1 = test_setup["ws1"]
    ds2 = test_setup["ds2"]  # belongs to ws2

    competitor_service.create_competitor(
        db_session, user1.id, CompetitorCreate(workspace_id=ws1.id, name="Ws1Comp")
    )

    # user1 tries to analyze dataset 2 (which belongs to ws2)
    with pytest.raises(PermissionDeniedException):
        competitor_service.analyze_dataset_competitors(db_session, ds2.id, user1.id)


# 11 - 15. Analytics: mentions, unique feedback, sentiment counts, coverage, NULL exclusion
def test_competitor_analytics_metrics(db_session: Session, test_setup: dict):
    user1 = test_setup["user1"]
    ws1 = test_setup["ws1"]
    ds1 = test_setup["ds1"]

    comp = competitor_service.create_competitor(
        db_session, user1.id, CompetitorCreate(workspace_id=ws1.id, name="MetricsComp")
    )

    # Feedback 1: positive
    fb1 = Feedback(
        workspace_id=ws1.id,
        dataset_id=ds1.id,
        original_text="MetricsComp is awesome",
    )
    db_session.add(fb1)
    db_session.flush()
    db_session.add(
        AnalysisResult(
            feedback_id=fb1.id,
            workspace_id=ws1.id,
            sentiment_label="positive",
            status="completed",
        )
    )

    # Feedback 2: negative
    fb2 = Feedback(
        workspace_id=ws1.id,
        dataset_id=ds1.id,
        original_text="MetricsComp is terrible",
    )
    db_session.add(fb2)
    db_session.flush()
    db_session.add(
        AnalysisResult(
            feedback_id=fb2.id,
            workspace_id=ws1.id,
            sentiment_label="negative",
            status="completed",
        )
    )

    # Feedback 3: NULL sentiment
    fb3 = Feedback(
        workspace_id=ws1.id,
        dataset_id=ds1.id,
        original_text="MetricsComp is just another option",
    )
    db_session.add(fb3)
    db_session.flush()
    db_session.add(
        AnalysisResult(
            feedback_id=fb3.id,
            workspace_id=ws1.id,
            sentiment_label=None,
            status="completed",
        )
    )

    db_session.commit()

    competitor_service.analyze_dataset_competitors(db_session, ds1.id, user1.id)

    analytics = competitor_service.get_competitor_analytics(db_session, user1.id, ws1.id)
    assert len(analytics) == 1
    item = analytics[0]
    assert item["total_mentions"] == 3
    assert item["unique_feedback_count"] == 3
    assert item["positive_mentions"] == 1
    assert item["neutral_mentions"] == 0
    assert item["negative_mentions"] == 1
    # 2 out of 3 have sentiment: coverage = 2/3 * 100 = 66.67%
    assert item["sentiment_coverage"] == 66.67
    # Out of 2 with sentiment: 1 positive (50%), 1 negative (50%)
    assert item["positive_percentage"] == 50.0
    assert item["neutral_percentage"] == 0.0
    assert item["negative_percentage"] == 50.0


# 16. Dataset filtering works
def test_competitor_analytics_dataset_filtering(db_session: Session, test_setup: dict):
    user1 = test_setup["user1"]
    ws1 = test_setup["ws1"]
    ds1 = test_setup["ds1"]
    ds_extra = Dataset(workspace_id=ws1.id, name="Dataset Extra", created_by=user1.id)
    db_session.add(ds_extra)
    db_session.commit()

    competitor_service.create_competitor(
        db_session, user1.id, CompetitorCreate(workspace_id=ws1.id, name="FilterComp")
    )

    fb1 = Feedback(
        workspace_id=ws1.id, dataset_id=ds1.id, original_text="FilterComp mention 1"
    )
    fb2 = Feedback(
        workspace_id=ws1.id, dataset_id=ds_extra.id, original_text="FilterComp mention 2"
    )
    db_session.add_all([fb1, fb2])
    db_session.commit()

    competitor_service.analyze_dataset_competitors(db_session, ds1.id, user1.id)
    competitor_service.analyze_dataset_competitors(db_session, ds_extra.id, user1.id)

    # Filtered by ds1
    stats_ds1 = competitor_service.get_competitor_analytics(
        db_session, user1.id, ws1.id, dataset_id=ds1.id
    )
    assert stats_ds1[0]["total_mentions"] == 1

    # Workspace-wide
    stats_all = competitor_service.get_competitor_analytics(db_session, user1.id, ws1.id)
    assert stats_all[0]["total_mentions"] == 2


# 17. No mentions returns empty/zero results without errors
def test_no_mentions_returns_zero_results_safely(db_session: Session, test_setup: dict):
    user1 = test_setup["user1"]
    ws1 = test_setup["ws1"]

    competitor_service.create_competitor(
        db_session, user1.id, CompetitorCreate(workspace_id=ws1.id, name="ZeroMentionComp")
    )
    analytics = competitor_service.get_competitor_analytics(db_session, user1.id, ws1.id)
    assert len(analytics) == 1
    assert analytics[0]["total_mentions"] == 0
    assert analytics[0]["sentiment_coverage"] is None
    assert analytics[0]["positive_percentage"] is None


# Exact Numeric Test A
def test_exact_numeric_test_a(db_session: Session, test_setup: dict):
    """
    Competitor A:
    - 10 positive
    - 5 neutral
    - 5 negative
    Expected:
    - positive = 50%
    - neutral = 25%
    - negative = 25%
    """
    user1 = test_setup["user1"]
    ws1 = test_setup["ws1"]
    ds1 = test_setup["ds1"]

    comp = competitor_service.create_competitor(
        db_session, user1.id, CompetitorCreate(workspace_id=ws1.id, name="Competitor A")
    )

    feedbacks = []
    analyses = []
    labels = ["positive"] * 10 + ["neutral"] * 5 + ["negative"] * 5
    for idx, lbl in enumerate(labels):
        fb = Feedback(
            workspace_id=ws1.id,
            dataset_id=ds1.id,
            original_text=f"Review {idx}: We evaluated Competitor A here.",
        )
        feedbacks.append(fb)

    db_session.add_all(feedbacks)
    db_session.flush()

    for fb, lbl in zip(feedbacks, labels):
        analyses.append(
            AnalysisResult(
                feedback_id=fb.id,
                workspace_id=ws1.id,
                sentiment_label=lbl,
                status="completed",
            )
        )
    db_session.add_all(analyses)
    db_session.commit()

    competitor_service.analyze_dataset_competitors(db_session, ds1.id, user1.id)
    analytics = competitor_service.get_competitor_analytics(
        db_session, user1.id, ws1.id, competitor_id=comp.id
    )

    assert len(analytics) == 1
    item = analytics[0]
    assert item["total_mentions"] == 20
    assert item["positive_mentions"] == 10
    assert item["neutral_mentions"] == 5
    assert item["negative_mentions"] == 5
    assert item["sentiment_coverage"] == 100.0
    assert item["positive_percentage"] == 50.0
    assert item["neutral_percentage"] == 25.0
    assert item["negative_percentage"] == 25.0


# Exact Numeric Test B
def test_exact_numeric_test_b(db_session: Session, test_setup: dict):
    """
    10 positive
    5 negative
    5 NULL
    Expected:
    - positive = 66.666...% (66.67%)
    - negative = 33.333...% (33.33%)
    - sentiment coverage = 75%
    """
    user1 = test_setup["user1"]
    ws1 = test_setup["ws1"]
    ds1 = test_setup["ds1"]

    comp = competitor_service.create_competitor(
        db_session, user1.id, CompetitorCreate(workspace_id=ws1.id, name="Competitor B")
    )

    feedbacks = []
    labels = ["positive"] * 10 + ["negative"] * 5 + [None] * 5
    for idx in range(len(labels)):
        fb = Feedback(
            workspace_id=ws1.id,
            dataset_id=ds1.id,
            original_text=f"Review {idx}: Talking about Competitor B today.",
        )
        feedbacks.append(fb)

    db_session.add_all(feedbacks)
    db_session.flush()

    analyses = []
    for fb, lbl in zip(feedbacks, labels):
        analyses.append(
            AnalysisResult(
                feedback_id=fb.id,
                workspace_id=ws1.id,
                sentiment_label=lbl,
                status="completed",
            )
        )
    db_session.add_all(analyses)
    db_session.commit()

    competitor_service.analyze_dataset_competitors(db_session, ds1.id, user1.id)
    analytics = competitor_service.get_competitor_analytics(
        db_session, user1.id, ws1.id, competitor_id=comp.id
    )

    assert len(analytics) == 1
    item = analytics[0]
    assert item["total_mentions"] == 20
    assert item["positive_mentions"] == 10
    assert item["negative_mentions"] == 5
    assert item["sentiment_coverage"] == 75.0
    assert item["positive_percentage"] == pytest.approx(66.67, rel=1e-2)
    assert item["negative_percentage"] == pytest.approx(33.33, rel=1e-2)


# REST API endpoints test
def test_competitor_api_endpoints(client: TestClient, db_session: Session, test_setup: dict):
    user1 = test_setup["user1"]
    ws1 = test_setup["ws1"]
    ds1 = test_setup["ds1"]
    headers = auth_headers(user1)

    # 1. POST /competitors
    res = client.post(
        "/api/v1/competitors",
        json={
            "workspace_id": str(ws1.id),
            "name": "Beta API Corp",
            "aliases": ["beta api", "beta"],
        },
        headers=headers,
    )
    assert res.status_code == 201
    comp_id = res.json()["data"]["id"]

    # 2. GET /competitors
    res = client.get(f"/api/v1/competitors?workspace_id={ws1.id}", headers=headers)
    assert res.status_code == 200
    assert len(res.json()["data"]) >= 1

    # 3. GET /competitors/{id}
    res = client.get(f"/api/v1/competitors/{comp_id}", headers=headers)
    assert res.status_code == 200
    assert res.json()["data"]["name"] == "Beta API Corp"

    # 4. PATCH /competitors/{id}
    res = client.patch(
        f"/api/v1/competitors/{comp_id}",
        json={"name": "Beta API Updated"},
        headers=headers,
    )
    assert res.status_code == 200
    assert res.json()["data"]["name"] == "Beta API Updated"

    # 5. POST /datasets/{dataset_id}/competitors/analyze
    res = client.post(
        f"/api/v1/datasets/{ds1.id}/competitors/analyze",
        headers=headers,
    )
    assert res.status_code == 200
    assert "mentions_found" in res.json()["data"]

    # 6. GET /datasets/{dataset_id}/competitors
    res = client.get(
        f"/api/v1/datasets/{ds1.id}/competitors",
        headers=headers,
    )
    assert res.status_code == 200

    # 7. GET /competitors/analysis
    res = client.get(
        f"/api/v1/competitors/analysis?workspace_id={ws1.id}",
        headers=headers,
    )
    assert res.status_code == 200

    # 8. DELETE /competitors/{id}
    res = client.delete(f"/api/v1/competitors/{comp_id}", headers=headers)
    assert res.status_code == 200
