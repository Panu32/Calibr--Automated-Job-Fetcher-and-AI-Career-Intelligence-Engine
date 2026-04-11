"""
utils/auth.py
─────────────────────────────────────────────────────────────────────────────
Calibr – Authentication & Security Utilities

Handles password hashing, JWT token generation, and the FastAPI dependency
used to protect routes.

Libraries:
    passlib (bcrypt) – for secure one-way password hashing
    PyJWT           – for creating and decoding signed JWT tokens
─────────────────────────────────────────────────────────────────────────────
"""

import os
from datetime import datetime, timedelta
from typing import Optional

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import ValidationError

# ── Password Hashing ─────────────────────────────────────────────────────────
# Using bcrypt for industry-standard secure hashing.

# ── JWT Configuration ────────────────────────────────────────────────────────
# These values should ideally come from .env
# If JWT_SECRET is missing, we use a fallback (FOR DEVELOPMENT ONLY).
SECRET_KEY = os.getenv("JWT_SECRET", "calibr_ultra_secret_key_change_in_prod_12345")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

# Tells FastAPI where to look for the token (the Signup/Login endpoint)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login")


# ── Password Helpers ─────────────────────────────────────────────────────────

def hash_password(password: str) -> str:
    """Return the hashed version of a plain-text password."""
    salt = bcrypt.gensalt()
    pwd_bytes = password.encode('utf-8')
    hashed_bytes = bcrypt.hashpw(pwd_bytes, salt)
    return hashed_bytes.decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Check if the provided plain-text password matches the stored hash."""
    pwd_bytes = plain_password.encode('utf-8')
    hashed_bytes = hashed_password.encode('utf-8')
    return bcrypt.checkpw(pwd_bytes, hashed_bytes)


# ── JWT Helpers ──────────────────────────────────────────────────────────────

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Generate a signed JWT token containing the provided data.
    Usually includes 'sub' (user_id) and 'email'.
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    
    # Sign the token using our secret key and selected algorithm
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


# ── Authentication Dependency ────────────────────────────────────────────────

async def get_current_user_id(token: str = Depends(oauth2_scheme)) -> str:
    """
    FastAPI Dependency: Extracts and validates the user_id from the JWT.
    
    Usage in a route:
        @router.get("/me")
        def read_me(user_id: str = Depends(get_current_user_id)):
            ...
    
    Raises 401 Unauthorized if the token is missing, expired, or invalid.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # Decode the token
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        
        if user_id is None:
            raise credentials_exception
            
        return user_id
        
    except (jwt.PyJWTError, ValidationError):
        raise credentials_exception
