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
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from db.mongodb import get_user_by_email, create_user
from utils.auth import hash_password, verify_password, create_access_token
from models.schemas import UserCreate, UserLogin, UserResponse, Token, GoogleLogin

# ── Module-level logger ───────────────────────────────────────────────────────
logger = logging.getLogger("calibr.router.auth")

# ── Google Config ─────────────────────────────────────────────────────────────
GOOGLE_CLIENT_ID = "1015567038496-n9c6eh8vuq31icu3gtqhjabq9kvl4lhr.apps.googleusercontent.com"

# ── Router instance ───────────────────────────────────────────────────────────
router = APIRouter()

# ─────────────────────────────────────────────────────────────────────────────
#  POST /google
# ─────────────────────────────────────────────────────────────────────────────

@router.post(
    "/google",
    response_model=Token,
    summary="Authenticate with Google OAuth2",
    description="Verifies a Google ID Token and returns a JWT access token."
)
async def google_auth(data: GoogleLogin):
    """Verify Google token and login/signup user."""
    logger.info("POST /google — Attempting Google authentication")
    
    try:
        # 1. Verify the token with Google
        idinfo = id_token.verify_oauth2_token(
            data.token, 
            google_requests.Request(), 
            GOOGLE_CLIENT_ID
        )

        # 2. Extract user info
        email = idinfo['email']
        name = idinfo.get('name', 'Google User')
        
        logger.info(f"Google Token verified for email: {email}")

        # 3. Check if user exists in MongoDB
        user = get_user_by_email(email)
        
        if not user:
            logger.info(f"First time Google login for {email} — creating account")
            # Create a new user (no password for Google users)
            user_dict = {
                "full_name": name,
                "email": email,
                "hashed_password": None, # Indicates OAuth user
                "created_at": datetime.utcnow(),
                "auth_provider": "google"
            }
            user_id = create_user(user_dict)
            user = {
                "_id": user_id,
                "full_name": name,
                "email": email,
                "created_at": user_dict["created_at"]
            }
        else:
            logger.info(f"Existing user {email} logged in via Google")
            user_id = str(user["_id"])

        # 4. Generate Calibr JWT
        access_token = create_access_token(data={"sub": str(user_id), "email": email})
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": user
        }

    except ValueError as e:
        logger.error(f"Invalid Google token: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google authentication token."
        )
    except Exception as e:
        logger.error(f"Google auth failure: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Authentication server error."
        )


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
