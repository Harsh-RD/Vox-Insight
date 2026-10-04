from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Optional

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.core.security import verify_password, hash_password

router = APIRouter(prefix="/users", tags=["Users"])

class UserUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    current_password: Optional[str] = Field(None, min_length=8)
    new_password: Optional[str] = Field(None, min_length=8)

@router.patch("/me")
def update_current_user(
    update_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update the current user's profile information and/or password.
    """
    # If trying to update password, must provide current password
    if update_data.new_password:
        if not update_data.current_password:
            raise HTTPException(status_code=400, detail="Current password required to set a new password.")
        
        if not verify_password(update_data.current_password, current_user.hashed_password):
            raise HTTPException(status_code=400, detail="Incorrect current password.")
            
        current_user.hashed_password = hash_password(update_data.new_password)
        
    if update_data.name is not None:
        current_user.name = update_data.name
        
    db.commit()
    db.refresh(current_user)
    
    return {
        "id": current_user.id,
        "email": current_user.email,
        "name": current_user.name,
        "is_active": current_user.is_active,
        "created_at": current_user.created_at
    }
