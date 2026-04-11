"""
routers/auth.py
─────────────────────────────────────────────────────────────────────────────
Calibr – Authentication Router

Handles:
  POST /api/v1/auth/signup – Register a brand new account
  POST /api/v1/auth/login  – Log in with credentials to receive a JWT
─────────────────────────────────────────────────────────────────────────────
"""

import logging
from datetime import datetime

from fastapi import APIRouter, HTTPException, status
from models.schemas import UserCreate, UserLogin, UserResponse, Token
from db.mongodb import get_user_by_email, create_user
from utils.auth import hash_password, verify_password, create_access_token

# ── Module-level logger ───────────────────────────────────────────────────────
logger = logging.getLogger("calibr.router.auth")

# ── Router instance ───────────────────────────────────────────────────────────
router = APIRouter()


# ─────────────────────────────────────────────────────────────────────────────
#  POST /signup
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/signup",
    status_code=status.HTTP_201_CREATED,
    response_model=Token,
    summary="Register a new user account",
    description=(
        "Requires a full name, unique email, and a secure password. "
        "Returns a JWT token and user profile on success."
    ),
)
async def signup(user_in: UserCreate):
    """Register a new user in MongoDB and auto-login them."""
    logger.info(f"POST /signup — Attempting registration for '{user_in.email}'")

    # 1. Check if email is already taken
    existing_user = get_user_by_email(user_in.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists."
        )

    # 2. Hash the password before saving
    hashed_pwd = hash_password(user_in.password)

    # 3. Save to MongoDB
    user_dict = {
        "full_name": user_in.full_name,
        "email": user_in.email,
        "hashed_password": hashed_pwd,
        "created_at": datetime.utcnow()
    }
    
    user_id = create_user(user_dict)
    
    # 4. Success — generate token and return
    access_token = create_access_token(data={"sub": user_id, "email": user_in.email})
    
    user_response = {
        "_id": user_id,
        "full_name": user_in.full_name,
        "email": user_in.email,
        "created_at": user_dict["created_at"]
    }

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_response
    }


# ─────────────────────────────────────────────────────────────────────────────
#  POST /login
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/login",
    response_model=Token,
    summary="Log in to an existing account",
    description="Validates email and password, returning a JWT access token."
)
async def login(credentials: UserLogin):
    """Authenticate a user and return a JWT token."""
    logger.info(f"POST /login — Attempting login for '{credentials.email}'")

    # 1. Look up user by email
    user = get_user_by_email(credentials.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 2. Verify hashed password
    if not verify_password(credentials.password, user.get("hashed_password")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 3. Success — generate token and return
    access_token = create_access_token(data={"sub": str(user["_id"]), "email": user["email"]})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }
