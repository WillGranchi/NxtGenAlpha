"""
OAuth and JWT authentication utilities.
"""

import os
from datetime import datetime, timedelta
from typing import Optional, Dict
from jose import JWTError, jwt
from fastapi import HTTPException, status, Cookie, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
import httpx
from authlib.integrations.httpx_client import AsyncOAuth2Client

from backend.core.database import get_db
from backend.api.models.db_models import User
from passlib.context import CryptContext
import bcrypt

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT Configuration
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "change-me-in-production")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRATION_HOURS = 24 * 7  # 7 days

# Google OAuth Configuration
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")
GOOGLE_REDIRECT_URI = os.getenv(
    "GOOGLE_REDIRECT_URI", 
    f"{BACKEND_URL}/api/auth/google/callback"
)

# Validation helper
def validate_oauth_config() -> tuple[bool, str]:
    """
    Validate that Google OAuth credentials are configured.
    
    Returns:
        tuple: (is_valid, error_message)
    """
    if not GOOGLE_CLIENT_ID:
        return False, "GOOGLE_CLIENT_ID is not set. Please configure it in your environment variables."
    if not GOOGLE_CLIENT_SECRET:
        return False, "GOOGLE_CLIENT_SECRET is not set. Please configure it in your environment variables."
    return True, ""

# Security
security = HTTPBearer(auto_error=False)


def create_access_token(data: Dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT access token.
    
    Args:
        data: Data to encode in the token
        expires_delta: Optional expiration time delta
        
    Returns:
        Encoded JWT token string
    """
    to_encode = data.copy()
    # JWT 'sub' claim must be a string (per JWT spec)
    if "sub" in to_encode and not isinstance(to_encode["sub"], str):
        to_encode["sub"] = str(to_encode["sub"])
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return encoded_jwt


def verify_token(token: str) -> Dict:
    """
    Verify and decode a JWT token.
    
    Args:
        token: JWT token string
        
    Returns:
        Decoded token payload
        
    Raises:
        HTTPException: If token is invalid
    """
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_current_user_optional(
    token: Optional[str] = Cookie(None),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """
    Get current user from JWT token (optional - returns None if not authenticated).
    Used for guest mode support.
    
    Args:
        token: JWT token from cookie
        credentials: HTTP Bearer token
        db: Database session
        
    Returns:
        User object or None if not authenticated
    """
    # Try cookie first, then authorization header
    jwt_token = token
    if not jwt_token and credentials:
        jwt_token = credentials.credentials
    
    if not jwt_token:
        return None
    
    try:
        payload = verify_token(jwt_token)
        user_id_str = payload.get("sub")
        if user_id_str is None:
            return None
        # Convert string back to int (JWT 'sub' must be string per spec)
        user_id: int = int(user_id_str)
    except (HTTPException, ValueError, TypeError):
        return None
    except Exception:
        # Catch any other token verification errors
        return None
    
    user = db.query(User).filter(User.id == user_id).first()
    return user


def get_current_user(
    token: Optional[str] = Cookie(None),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Get current user from JWT token (required).
    
    Args:
        token: JWT token from cookie
        credentials: HTTP Bearer token
        db: Database session
        
    Returns:
        User object
        
    Raises:
        HTTPException: If not authenticated
    """
    user = get_current_user_optional(token, credentials, db)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


async def get_google_user_info(access_token: str) -> Dict:
    """
    Get user info from Google using access token.
    
    Args:
        access_token: Google OAuth access token
        
    Returns:
        User info dictionary from Google
    """
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        response.raise_for_status()
        return response.json()


def get_google_oauth_client() -> AsyncOAuth2Client:
    """
    Create and return a Google OAuth2 client.
    
    Returns:
        AsyncOAuth2Client configured for Google
    """
    return AsyncOAuth2Client(
        client_id=GOOGLE_CLIENT_ID,
        client_secret=GOOGLE_CLIENT_SECRET,
    )


def get_google_authorization_url():
    """
    Get Google OAuth authorization URL.
    
    Returns:
        Tuple of (authorization_url, state)
    """
    client = get_google_oauth_client()
    authorization_url, state = client.create_authorization_url(
        "https://accounts.google.com/o/oauth2/v2/auth",
        redirect_uri=GOOGLE_REDIRECT_URI,
        scope=["openid", "https://www.googleapis.com/auth/userinfo.email", "https://www.googleapis.com/auth/userinfo.profile"],
    )
    return authorization_url, state


async def exchange_google_code_for_token(code: str) -> Dict:
    """
    Exchange Google authorization code for access token.
    
    Args:
        code: Authorization code from Google
        
    Returns:
        Token response dictionary
    """
    client = get_google_oauth_client()
    token = await client.fetch_token(
        "https://oauth2.googleapis.com/token",
        code=code,
        redirect_uri=GOOGLE_REDIRECT_URI,
    )
    return token


def hash_password(password: str) -> str:
    """
    Hash a password using bcrypt.
    
    Args:
        password: Plain text password (will be truncated to 72 bytes if longer)
        
    Returns:
        Hashed password string
    """
    # Ensure password is a string
    password_str = str(password).strip()
    
    # Convert to bytes for bcrypt
    password_bytes = password_str.encode('utf-8')
    
    # Bcrypt has a strict 72-byte limit - truncate if necessary
    if len(password_bytes) > 72:
        password_bytes = password_bytes[:72]
    
    # Hash using bcrypt directly (more reliable than passlib for edge cases)
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password_bytes, salt)
    
    # Return as string (passlib format)
    return hashed.decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a password against its hash.
    
    Args:
        plain_password: Plain text password
        hashed_password: Hashed password from database
        
    Returns:
        True if password matches, False otherwise
    """
    # Convert to bytes
    plain_bytes = str(plain_password).strip().encode('utf-8')
    hashed_bytes = hashed_password.encode('utf-8')
    
    # Truncate plain password to 72 bytes if necessary
    if len(plain_bytes) > 72:
        plain_bytes = plain_bytes[:72]
    
    # Verify using bcrypt directly
    try:
        return bcrypt.checkpw(plain_bytes, hashed_bytes)
    except Exception:
        # Fallback to passlib if bcrypt fails
        return pwd_context.verify(plain_password, hashed_password)

