import uuid
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.user import User
from app.schemas.workspace import WorkspaceCreate, WorkspaceResponse
from app.services.workspace import (
    create_workspace_for_user,
    get_workspace_by_id,
    get_user_workspace_membership,
    get_user_workspaces_with_role,
)
from app.api.deps import get_current_user
from app.core.exceptions import NotFoundException, PermissionDeniedException

router = APIRouter(prefix="/workspaces", tags=["Workspaces"])


@router.get("")
def list_workspaces(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all workspaces associated with the currently authenticated user."""
    workspace_tuples = get_user_workspaces_with_role(db, current_user.id)
    workspaces_data = [
        WorkspaceResponse(
            id=ws.id,
            name=ws.name,
            slug=ws.slug,
            owner_id=ws.owner_id,
            role=role,
            created_at=ws.created_at,
        )
        for ws, role in workspace_tuples
    ]

    return {
        "success": True,
        "data": workspaces_data,
    }


@router.post("", status_code=status.HTTP_201_CREATED)
def create_workspace(
    payload: WorkspaceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new workspace with current user assigned as owner."""
    workspace = create_workspace_for_user(
        db, current_user.id, name=payload.name, role="owner"
    )
    db.commit()
    db.refresh(workspace)

    return {
        "success": True,
        "data": WorkspaceResponse(
            id=workspace.id,
            name=workspace.name,
            slug=workspace.slug,
            owner_id=workspace.owner_id,
            role="owner",
            created_at=workspace.created_at,
        ),
    }


@router.get("/{workspace_id}")
def get_workspace_details(
    workspace_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get workspace details. Requires active membership in the workspace."""
    workspace = get_workspace_by_id(db, workspace_id)
    if not workspace:
        raise NotFoundException(message="Workspace not found")

    membership = get_user_workspace_membership(db, current_user.id, workspace_id)
    if not membership:
        raise PermissionDeniedException(message="You are not a member of this workspace")

    return {
        "success": True,
        "data": WorkspaceResponse(
            id=workspace.id,
            name=workspace.name,
            slug=workspace.slug,
            owner_id=workspace.owner_id,
            role=membership.role,
            created_at=workspace.created_at,
        ),
    }
