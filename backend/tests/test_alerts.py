import uuid
import pytest
from sqlalchemy.orm import Session
from starlette.testclient import TestClient

from app.core.exceptions import NotFoundException, PermissionDeniedException
from app.models.alert import Alert
from app.models.analysis_result import AnalysisResult
from app.models.competitor import Competitor
from app.models.competitor_mention import CompetitorMention
from app.models.dataset import Dataset
from app.models.feedback import Feedback
from app.models.user import User
from app.models.user_workspace import UserWorkspace
from app.models.workspace import Workspace
from app.schemas.alert import AlertCreate, AlertMetric, AlertOperator, AlertUpdate
from app.services import alert as alert_service
from app.core.security import create_access_token


@pytest.fixture
def alert_setup(db_session: Session):
    user1 = User(
        email="alert_user1@example.com",
        name="Alert User 1",
        hashed_password="pw1",
        is_active=True,
    )
    db_session.add(user1)
    db_session.flush()

    ws1 = Workspace(name="Alert WS 1", slug="alert-ws-1", owner_id=user1.id)
    db_session.add(ws1)
    db_session.flush()

    uw1 = UserWorkspace(user_id=user1.id, workspace_id=ws1.id, role="owner")
    db_session.add(uw1)

    ds1 = Dataset(workspace_id=ws1.id, name="Dataset 1", created_by=user1.id)
    db_session.add(ds1)
    db_session.flush()

    comp1 = Competitor(
        workspace_id=ws1.id, name="AlertComp", aliases=["alertcomp"], active=True
    )
    db_session.add(comp1)

    # Workspace 2 & User 2
    user2 = User(
        email="alert_user2@example.com",
        name="Alert User 2",
        hashed_password="pw2",
        is_active=True,
    )
    db_session.add(user2)
    db_session.flush()

    ws2 = Workspace(name="Alert WS 2", slug="alert-ws-2", owner_id=user2.id)
    db_session.add(ws2)
    db_session.flush()

    uw2 = UserWorkspace(user_id=user2.id, workspace_id=ws2.id, role="owner")
    db_session.add(uw2)

    ds2 = Dataset(workspace_id=ws2.id, name="Dataset 2", created_by=user2.id)
    db_session.add(ds2)
    db_session.flush()

    comp2 = Competitor(
        workspace_id=ws2.id, name="OtherComp", aliases=["othercomp"], active=True
    )
    db_session.add(comp2)

    db_session.commit()
    return {
        "user1": user1,
        "ws1": ws1,
        "ds1": ds1,
        "comp1": comp1,
        "user2": user2,
        "ws2": ws2,
        "ds2": ds2,
        "comp2": comp2,
    }


def auth_headers(user: User) -> dict:
    token = create_access_token(str(user.id))
    return {"Authorization": f"Bearer {token}"}


# 18. Create alert
def test_create_alert(db_session: Session, alert_setup: dict):
    user1 = alert_setup["user1"]
    ws1 = alert_setup["ws1"]

    payload = AlertCreate(
        workspace_id=ws1.id,
        name="High Negativity",
        metric=AlertMetric.NEGATIVE_SENTIMENT_PERCENTAGE,
        operator=AlertOperator.GTE,
        threshold=50.0,
    )
    alert = alert_service.create_alert(db_session, user1.id, payload)
    assert alert.id is not None
    assert alert.name == "High Negativity"
    assert alert.threshold == 50.0
    assert alert.enabled is True


# 19. List alerts
def test_list_alerts(db_session: Session, alert_setup: dict):
    user1 = alert_setup["user1"]
    ws1 = alert_setup["ws1"]

    alert_service.create_alert(
        db_session,
        user1.id,
        AlertCreate(
            workspace_id=ws1.id,
            name="A1",
            metric=AlertMetric.COMPLAINT_RATE,
            operator=AlertOperator.GT,
            threshold=25.0,
        ),
    )
    alerts = alert_service.list_alerts(db_session, user1.id, ws1.id)
    assert len(alerts) == 1
    assert alerts[0].name == "A1"


# 20. Update alert
def test_update_alert(db_session: Session, alert_setup: dict):
    user1 = alert_setup["user1"]
    ws1 = alert_setup["ws1"]

    alert = alert_service.create_alert(
        db_session,
        user1.id,
        AlertCreate(
            workspace_id=ws1.id,
            name="Old Alert",
            metric=AlertMetric.COMPLAINT_RATE,
            operator=AlertOperator.GT,
            threshold=10.0,
        ),
    )
    updated = alert_service.update_alert(
        db_session,
        user1.id,
        alert.id,
        AlertUpdate(name="New Alert", threshold=15.0, enabled=False),
    )
    assert updated.name == "New Alert"
    assert updated.threshold == 15.0
    assert updated.enabled is False


# 21. Delete alert
def test_delete_alert(db_session: Session, alert_setup: dict):
    user1 = alert_setup["user1"]
    ws1 = alert_setup["ws1"]

    alert = alert_service.create_alert(
        db_session,
        user1.id,
        AlertCreate(
            workspace_id=ws1.id,
            name="To Delete",
            metric=AlertMetric.COMPLAINT_RATE,
            operator=AlertOperator.GT,
            threshold=10.0,
        ),
    )
    alert_service.delete_alert(db_session, user1.id, alert.id)
    with pytest.raises(NotFoundException):
        alert_service.get_alert(db_session, user1.id, alert.id)


# 22. Disabled alert is not evaluated
def test_disabled_alert_not_evaluated(db_session: Session, alert_setup: dict):
    user1 = alert_setup["user1"]
    ws1 = alert_setup["ws1"]

    alert_service.create_alert(
        db_session,
        user1.id,
        AlertCreate(
            workspace_id=ws1.id,
            name="Disabled Alert",
            metric=AlertMetric.NEGATIVE_SENTIMENT_PERCENTAGE,
            operator=AlertOperator.GTE,
            threshold=10.0,
            enabled=False,
        ),
    )
    results = alert_service.evaluate_workspace_alerts(db_session, user1.id, ws1.id)
    assert len(results) == 0


# 23. gt / gte / lt / lte operators
def test_operator_evaluations(db_session: Session, alert_setup: dict):
    assert alert_service._evaluate_condition(50.0, "gt", 40.0) is True
    assert alert_service._evaluate_condition(50.0, "gt", 50.0) is False
    assert alert_service._evaluate_condition(50.0, "gte", 50.0) is True
    assert alert_service._evaluate_condition(50.0, "lt", 60.0) is True
    assert alert_service._evaluate_condition(50.0, "lt", 50.0) is False
    assert alert_service._evaluate_condition(50.0, "lte", 50.0) is True


# 24. Negative sentiment alert triggers correctly
def test_negative_sentiment_alert_triggers(db_session: Session, alert_setup: dict):
    user1 = alert_setup["user1"]
    ws1 = alert_setup["ws1"]
    ds1 = alert_setup["ds1"]

    # Add 6 negative, 4 positive => 60% negative
    feedbacks = [
        Feedback(workspace_id=ws1.id, dataset_id=ds1.id, original_text=f"txt {i}")
        for i in range(10)
    ]
    db_session.add_all(feedbacks)
    db_session.flush()

    for idx, fb in enumerate(feedbacks):
        sentiment = "negative" if idx < 6 else "positive"
        db_session.add(
            AnalysisResult(
                feedback_id=fb.id,
                workspace_id=ws1.id,
                sentiment_label=sentiment,
                status="completed",
            )
        )
    db_session.commit()

    alert_service.create_alert(
        db_session,
        user1.id,
        AlertCreate(
            workspace_id=ws1.id,
            name="Neg Sent Alert",
            metric=AlertMetric.NEGATIVE_SENTIMENT_PERCENTAGE,
            operator=AlertOperator.GTE,
            threshold=50.0,
        ),
    )

    results = alert_service.evaluate_workspace_alerts(db_session, user1.id, ws1.id)
    assert len(results) == 1
    assert results[0]["current_value"] == 60.0
    assert results[0]["triggered"] is True


# 25. Complaint rate alert triggers correctly
def test_complaint_rate_alert_triggers(db_session: Session, alert_setup: dict):
    user1 = alert_setup["user1"]
    ws1 = alert_setup["ws1"]
    ds1 = alert_setup["ds1"]

    # 4 complaints, 6 non-complaints => 40% complaint rate
    feedbacks = [
        Feedback(workspace_id=ws1.id, dataset_id=ds1.id, original_text=f"complaint test {i}")
        for i in range(10)
    ]
    db_session.add_all(feedbacks)
    db_session.flush()

    for idx, fb in enumerate(feedbacks):
        is_complaint = idx < 4
        db_session.add(
            AnalysisResult(
                feedback_id=fb.id,
                workspace_id=ws1.id,
                complaint_label=is_complaint,
                status="completed",
            )
        )
    db_session.commit()

    alert_service.create_alert(
        db_session,
        user1.id,
        AlertCreate(
            workspace_id=ws1.id,
            name="High Complaints",
            metric=AlertMetric.COMPLAINT_RATE,
            operator=AlertOperator.GT,
            threshold=30.0,
        ),
    )

    results = alert_service.evaluate_workspace_alerts(db_session, user1.id, ws1.id)
    assert len(results) == 1
    assert results[0]["current_value"] == 40.0
    assert results[0]["triggered"] is True


# 26. Competitor negative percentage alert triggers correctly
def test_competitor_negative_percentage_alert(db_session: Session, alert_setup: dict):
    user1 = alert_setup["user1"]
    ws1 = alert_setup["ws1"]
    ds1 = alert_setup["ds1"]
    comp1 = alert_setup["comp1"]

    feedbacks = [
        Feedback(workspace_id=ws1.id, dataset_id=ds1.id, original_text=f"Mention {i}")
        for i in range(5)
    ]
    db_session.add_all(feedbacks)
    db_session.flush()

    for idx, fb in enumerate(feedbacks):
        # 3 negative, 2 positive
        sentiment = "negative" if idx < 3 else "positive"
        db_session.add(
            AnalysisResult(
                feedback_id=fb.id,
                workspace_id=ws1.id,
                sentiment_label=sentiment,
                status="completed",
            )
        )
        db_session.add(
            CompetitorMention(
                workspace_id=ws1.id,
                competitor_id=comp1.id,
                feedback_id=fb.id,
                matched_alias="alertcomp",
            )
        )
    db_session.commit()

    alert_service.create_alert(
        db_session,
        user1.id,
        AlertCreate(
            workspace_id=ws1.id,
            name="Comp Negative Alert",
            metric=AlertMetric.COMPETITOR_NEGATIVE_PERCENTAGE,
            operator=AlertOperator.GTE,
            threshold=60.0,
            competitor_id=comp1.id,
        ),
    )

    results = alert_service.evaluate_workspace_alerts(db_session, user1.id, ws1.id)
    assert len(results) == 1
    # 3 / 5 = 60.0%
    assert results[0]["current_value"] == 60.0
    assert results[0]["triggered"] is True


# 27. Competitor mentions threshold works
def test_competitor_mentions_alert(db_session: Session, alert_setup: dict):
    user1 = alert_setup["user1"]
    ws1 = alert_setup["ws1"]
    ds1 = alert_setup["ds1"]
    comp1 = alert_setup["comp1"]

    feedbacks = [
        Feedback(workspace_id=ws1.id, dataset_id=ds1.id, original_text=f"M {i}")
        for i in range(15)
    ]
    db_session.add_all(feedbacks)
    db_session.flush()

    for fb in feedbacks:
        db_session.add(
            CompetitorMention(
                workspace_id=ws1.id,
                competitor_id=comp1.id,
                feedback_id=fb.id,
                matched_alias="alertcomp",
            )
        )
    db_session.commit()

    alert_service.create_alert(
        db_session,
        user1.id,
        AlertCreate(
            workspace_id=ws1.id,
            name="Comp Mentions Spike",
            metric=AlertMetric.COMPETITOR_MENTIONS,
            operator=AlertOperator.GTE,
            threshold=10.0,
            competitor_id=comp1.id,
        ),
    )

    results = alert_service.evaluate_workspace_alerts(db_session, user1.id, ws1.id)
    assert len(results) == 1
    assert results[0]["current_value"] == 15.0
    assert results[0]["triggered"] is True


# 28. NULL metric does not trigger
def test_null_metric_does_not_trigger(db_session: Session, alert_setup: dict):
    user1 = alert_setup["user1"]
    ws1 = alert_setup["ws1"]

    # Empty workspace - no feedback, no sentiment
    alert_service.create_alert(
        db_session,
        user1.id,
        AlertCreate(
            workspace_id=ws1.id,
            name="Null metric alert",
            metric=AlertMetric.NEGATIVE_SENTIMENT_PERCENTAGE,
            operator=AlertOperator.LTE,  # Even with <= 100, NULL must NOT trigger!
            threshold=100.0,
        ),
    )

    results = alert_service.evaluate_workspace_alerts(db_session, user1.id, ws1.id)
    assert len(results) == 1
    assert results[0]["current_value"] is None
    assert results[0]["triggered"] is False


# 29. Cross-workspace alert access denied
def test_cross_workspace_alert_access_denied(db_session: Session, alert_setup: dict):
    user1 = alert_setup["user1"]
    user2 = alert_setup["user2"]
    ws1 = alert_setup["ws1"]

    alert = alert_service.create_alert(
        db_session,
        user1.id,
        AlertCreate(
            workspace_id=ws1.id,
            name="WS1 Alert",
            metric=AlertMetric.COMPLAINT_RATE,
            operator=AlertOperator.GT,
            threshold=20.0,
        ),
    )

    with pytest.raises(PermissionDeniedException):
        alert_service.get_alert(db_session, user2.id, alert.id)

    with pytest.raises(PermissionDeniedException):
        alert_service.update_alert(
            db_session, user2.id, alert.id, AlertUpdate(name="Tampered")
        )

    with pytest.raises(PermissionDeniedException):
        alert_service.delete_alert(db_session, user2.id, alert.id)


# 30. Cross-workspace dataset / competitor references denied
def test_cross_workspace_references_denied(db_session: Session, alert_setup: dict):
    user1 = alert_setup["user1"]
    ws1 = alert_setup["ws1"]
    ds2 = alert_setup["ds2"]  # belongs to WS2
    comp2 = alert_setup["comp2"]  # belongs to WS2

    # Reject dataset belonging to WS2
    with pytest.raises(PermissionDeniedException):
        alert_service.create_alert(
            db_session,
            user1.id,
            AlertCreate(
                workspace_id=ws1.id,
                name="Illegal Dataset Alert",
                metric=AlertMetric.COMPLAINT_RATE,
                operator=AlertOperator.GT,
                threshold=10.0,
                dataset_id=ds2.id,
            ),
        )

    # Reject competitor belonging to WS2
    with pytest.raises(PermissionDeniedException):
        alert_service.create_alert(
            db_session,
            user1.id,
            AlertCreate(
                workspace_id=ws1.id,
                name="Illegal Competitor Alert",
                metric=AlertMetric.COMPETITOR_MENTIONS,
                operator=AlertOperator.GT,
                threshold=10.0,
                competitor_id=comp2.id,
            ),
        )


# Exact Numeric Tests C, D, E
def test_exact_numeric_tests_c_d_e(db_session: Session, alert_setup: dict):
    """
    C. Alert:
    negative sentiment = 60%
    threshold = 50
    operator = gte
    Expected: triggered = true

    D. Boundary:
    negative sentiment = 50%
    threshold = 50
    operator = gte
    Expected: triggered = true

    E. Boundary:
    negative sentiment = 50%
    threshold = 50
    operator = gt
    Expected: triggered = false
    """
    # Test C
    assert alert_service._evaluate_condition(60.0, "gte", 50.0) is True

    # Test D
    assert alert_service._evaluate_condition(50.0, "gte", 50.0) is True

    # Test E
    assert alert_service._evaluate_condition(50.0, "gt", 50.0) is False


# REST API endpoints test
def test_alert_api_endpoints(client: TestClient, db_session: Session, alert_setup: dict):
    user1 = alert_setup["user1"]
    ws1 = alert_setup["ws1"]
    headers = auth_headers(user1)

    # 1. POST /alerts
    res = client.post(
        "/api/v1/alerts",
        json={
            "workspace_id": str(ws1.id),
            "name": "API Alert",
            "metric": "complaint_rate",
            "operator": "gt",
            "threshold": 25.0,
        },
        headers=headers,
    )
    assert res.status_code == 201
    alert_id = res.json()["data"]["id"]

    # 2. GET /alerts
    res = client.get(f"/api/v1/alerts?workspace_id={ws1.id}", headers=headers)
    assert res.status_code == 200
    assert len(res.json()["data"]) >= 1

    # 3. GET /alerts/{id}
    res = client.get(f"/api/v1/alerts/{alert_id}", headers=headers)
    assert res.status_code == 200
    assert res.json()["data"]["name"] == "API Alert"

    # 4. PATCH /alerts/{id}
    res = client.patch(
        f"/api/v1/alerts/{alert_id}",
        json={"name": "API Alert Updated", "threshold": 30.0},
        headers=headers,
    )
    assert res.status_code == 200
    assert res.json()["data"]["threshold"] == 30.0

    # 5. POST /alerts/evaluate
    res = client.post(
        f"/api/v1/alerts/evaluate?workspace_id={ws1.id}",
        headers=headers,
    )
    assert res.status_code == 200
    assert "alerts" in res.json()["data"]

    # 6. DELETE /alerts/{id}
    res = client.delete(f"/api/v1/alerts/{alert_id}", headers=headers)
    assert res.status_code == 200
