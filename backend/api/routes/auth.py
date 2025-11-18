"""
Authentication routes for Google OAuth and user management.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Response
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel, EmailStr

from backend.core.database import get_db
import os
from backend.core.auth import (
    create_access_token,
    get_current_user,
    get_current_user_optional,
    get_google_authorization_url,
    exchange_google_code_for_token,
    get_google_user_info,
    validate_oauth_config,
    hash_password,
    verify_password,
)
from backend.api.models.db_models import User
from backend.utils.helpers import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/api/auth", tags=["auth"])

# Handle OPTIONS requests explicitly for CORS preflight
@router.options("/{path:path}")
async def options_handler(request: Request, path: str):
    """Handle CORS preflight OPTIONS requests."""
    return JSONResponse(
        content={},
        headers={
            "Access-Control-Allow-Origin": request.headers.get("origin", "*"),
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Max-Age": "3600",
        }
    )

# Store OAuth state temporarily (in production, use Redis or similar)
oauth_states = {}


# Pydantic models for request/response
class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    name: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


@router.post("/signup")
async def signup(
    request: SignupRequest,
    response: Response,
    db: Session = Depends(get_db)
):
    """
    Register a new user with email and password.
    """
    try:
        # Validate password length (bcrypt limit is 72 bytes)
        if len(request.password.encode('utf-8')) > 72:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password is too long. Maximum length is 72 bytes."
            )
        
        # Validate password minimum length
        if len(request.password) < 8:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password must be at least 8 characters long"
            )
        
        # Check if user already exists
        existing_user = db.query(User).filter(User.email == request.email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Hash password (ensure it's a string, not bytes)
        password_str = str(request.password).strip()
        
        # Debug: Log password length (but not the password itself)
        password_bytes_len = len(password_str.encode('utf-8'))
        logger.info(f"Signup attempt for {request.email}, password length: {len(password_str)} chars, {password_bytes_len} bytes")
        
        if password_bytes_len > 72:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Password is too long. Maximum length is 72 bytes, got {password_bytes_len} bytes."
            )
        
        password_hash = hash_password(password_str)
        
        # Create new user
        user = User(
            email=request.email,
            name=request.name or request.email.split("@")[0],
            password_hash=password_hash,
            theme="dark"
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Create JWT token
        token = create_access_token(data={"sub": user.id})
        
        # Get frontend URL from environment
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
        
        # Get cookie security settings
        environment = os.getenv("ENVIRONMENT", "development")
        cookie_secure = os.getenv("COOKIE_SECURE", "false").lower() == "true"
        cookie_samesite = os.getenv("COOKIE_SAMESITE", "lax")
        
        if environment == "production":
            cookie_secure = True
            cookie_samesite = "lax"
        
        # Set HTTP-only cookie with token
        response.set_cookie(
            key="token",
            value=token,
            httponly=True,
            secure=cookie_secure,
            samesite=cookie_samesite,
            max_age=7 * 24 * 60 * 60,  # 7 days
            path="/",
        )
        
        return {
            "message": "User created successfully",
            "user": {
                "id": user.id,
                "email": user.email,
                "name": user.name,
            },
            "token": token
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Signup error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create user: {str(e)}"
        )


@router.post("/login")
async def login(
    request: LoginRequest,
    response: Response,
    db: Session = Depends(get_db)
):
    """
    Login user with email and password.
    """
    try:
        # Find user by email
        user = db.query(User).filter(User.email == request.email).first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # Check if user has password (not just Google OAuth)
        if not user.password_hash:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Account was created with Google. Please use Google login."
            )
        
        # Verify password (ensure it's a string)
        password_str = str(request.password)
        if len(password_str.encode('utf-8')) > 72:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password is too long. Maximum length is 72 bytes."
            )
        
        if not verify_password(password_str, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # Create JWT token
        token = create_access_token(data={"sub": user.id})
        
        # Get frontend URL from environment
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
        
        # Get cookie security settings
        environment = os.getenv("ENVIRONMENT", "development")
        cookie_secure = os.getenv("COOKIE_SECURE", "false").lower() == "true"
        cookie_samesite = os.getenv("COOKIE_SAMESITE", "lax")
        
        if environment == "production":
            cookie_secure = True
            cookie_samesite = "lax"
        
        # Set HTTP-only cookie with token
        response.set_cookie(
            key="token",
            value=token,
            httponly=True,
            secure=cookie_secure,
            samesite=cookie_samesite,
            max_age=7 * 24 * 60 * 60,  # 7 days
            path="/",
        )
        
        return {
            "message": "Login successful",
            "user": {
                "id": user.id,
                "email": user.email,
                "name": user.name,
            },
            "token": token
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login failed: {str(e)}"
        )


@router.get("/google/login")
async def google_login():
    """
    Initiate Google OAuth login flow.
    Redirects to Google authorization page.
    """
    # Validate OAuth configuration
    is_valid, error_msg = validate_oauth_config()
    if not is_valid:
        logger.error(f"Google OAuth not configured: {error_msg}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google OAuth is not configured. Please contact the administrator or check GOOGLE_OAUTH_SETUP.md for setup instructions."
        )
    
    try:
        result = get_google_authorization_url()
        if isinstance(result, tuple):
            authorization_url, state = result
        else:
            authorization_url = result
            state = None
        
        # Store state for validation (in production, use Redis with expiration)
        if state:
            oauth_states[state] = True
        
        return RedirectResponse(url=authorization_url)
    except ValueError as e:
        # Re-raise validation errors as HTTP exceptions
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to initiate OAuth flow: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to initiate OAuth flow: {str(e)}"
        )


@router.get("/google/callback")
async def google_callback(
    code: str,
    state: Optional[str] = None,
    db: Session = Depends(get_db),
    response: Response = None
):
    """
    Handle Google OAuth callback.
    Creates or updates user, generates JWT token, and sets cookie.
    """
    try:
        # Exchange code for token
        token_data = await exchange_google_code_for_token(code)
        access_token = token_data.get("access_token")
        
        if not access_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to get access token"
            )
        
        # Get user info from Google
        user_info = await get_google_user_info(access_token)
        google_id = user_info.get("id")
        email = user_info.get("email")
        name = user_info.get("name", "")
        
        if not email or not google_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to get user info from Google"
            )
        
        # Find or create user
        user = db.query(User).filter(User.google_id == google_id).first()
        
        if not user:
            # Check if user with this email exists (legacy account)
            user = db.query(User).filter(User.email == email).first()
            if user:
                # Link Google account to existing user
                user.google_id = google_id
                if not user.name:
                    user.name = name
            else:
                # Create new user
                user = User(
                    email=email,
                    name=name,
                    google_id=google_id,
                    theme="light"
                )
                db.add(user)
        else:
            # Update user info
            user.email = email
            if not user.name:
                user.name = name
        
        db.commit()
        db.refresh(user)
        
        # Create JWT token
        token = create_access_token(data={"sub": user.id})
        
        # Get frontend URL from environment
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
        redirect_response = RedirectResponse(url=f"{frontend_url}/?token={token}")
        
        # Get cookie security settings from environment
        environment = os.getenv("ENVIRONMENT", "development")
        cookie_secure = os.getenv("COOKIE_SECURE", "false").lower() == "true"
        cookie_samesite = os.getenv("COOKIE_SAMESITE", "lax")
        
        # In production, cookies should be secure
        if environment == "production" and not cookie_secure:
            cookie_secure = True
        
        # For cross-site redirects (OAuth flow), use SameSite=None with Secure
        # This allows the cookie to be sent when redirecting from Google back to our site
        if cookie_secure:
            # If secure is True (HTTPS), we can use SameSite=None for cross-site cookies
            cookie_samesite = "none"
        elif environment == "production":
            # Production should always use secure cookies
            cookie_secure = True
            cookie_samesite = "none"
        
        # Set HTTP-only cookie with token
        redirect_response.set_cookie(
            key="token",
            value=token,
            httponly=True,
            secure=cookie_secure,
            samesite=cookie_samesite,
            max_age=7 * 24 * 60 * 60,  # 7 days
            path="/",
            domain=None  # Let browser set domain automatically
        )
        
        return redirect_response
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Authentication failed: {str(e)}"
        )


@router.post("/logout")
async def logout(response: Response):
    """
    Logout user by clearing the authentication cookie.
    """
    response.delete_cookie(key="token", path="/")
    return {"message": "Logged out successfully"}


@router.get("/me")
async def get_me(current_user: Optional[User] = Depends(get_current_user_optional)):
    """
    Get current user information.
    Returns None if not authenticated (guest mode).
    """
    if current_user is None:
        return {"authenticated": False}
    
    return {
        "authenticated": True,
        "user": {
            "id": current_user.id,
            "email": current_user.email,
            "name": current_user.name,
            "theme": current_user.theme,
            "created_at": current_user.created_at.isoformat() if current_user.created_at else None,
        }
    }


@router.post("/theme")
async def update_theme(
    theme: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update user theme preference (light/dark).
    """
    if theme not in ["light", "dark"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Theme must be 'light' or 'dark'"
        )
    
    current_user.theme = theme
    db.commit()
    
    return {"message": "Theme updated", "theme": theme}

