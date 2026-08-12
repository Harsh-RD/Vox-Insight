import re
import uuid
from typing import List, Optional, Tuple
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.workspace import Workspace
from app.models.user_workspace import UserWorkspace


def generate_unique_slug(db: Session, base_name: str) -> str:
    """Generate a URL-friendly unique slug from workspace name."""
    slug_base = re.sub(r"[^a-z0-9]+", "-", base_name.lower()).strip("-")
    if not slug_base:
        slug_base = "workspace"

    slug = slug_base
    counter = 1
    while True:
        stmt = select(Workspace).where(Workspace.slug == slug)
        if not db.scalar(stmt):
            return slug
        slug = f"{slug_base}-{counter}"
        counter += 1


def create_workspace_for_user(
    db: Session, user_id: uuid.UUID, name: str, role: str = "owner"
) -> Workspace:
    """Create a new workspace and assign the user with the specified role."""
    slug = generate_unique_slug(db, name)
    workspace = Workspace(
        name=name.strip(),
        slug=slug,
        owner_id=user_id,
    )
    db.add(workspace)
    db.flush()

    user_workspace = UserWorkspace(
        user_id=user_id,
        workspace_id=workspace.id,
        role=role,
    )
    db.add(user_workspace)
    return workspace


def get_workspace_by_id(db: Session, workspace_id: uuid.UUID) -> Optional[Workspace]:
    """Retrieve workspace by ID."""
    stmt = select(Workspace).where(Workspace.id == workspace_id)
    return db.scalar(stmt)


def get_user_workspace_membership(
    db: Session, user_id: uuid.UUID, workspace_id: uuid.UUID
) -> Optional[UserWorkspace]:
    """Check membership of a user in a workspace."""
    stmt = select(UserWorkspace).where(
        UserWorkspace.user_id == user_id,
        UserWorkspace.workspace_id == workspace_id,
    )
    return db.scalar(stmt)


def get_user_workspaces_with_role(
    db: Session, user_id: uuid.UUID
) -> List[Tuple[Workspace, str]]:
    """Retrieve all workspaces for a user along with their role in each workspace."""
    stmt = (
        select(Workspace, UserWorkspace.role)
        .join(UserWorkspace, Workspace.id == UserWorkspace.workspace_id)
        .where(UserWorkspace.user_id == user_id)
    )
    results = db.execute(stmt).all()
    return [(row[0], row[1]) for row in results]
