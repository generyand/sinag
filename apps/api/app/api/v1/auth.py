# 🔐 Authentication API Routes
# Endpoints for user authentication and authorization

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_active_user, get_client_ip
from app.core.security import (
    verify_password,
    create_access_token,
    get_password_hash,
    verify_token,
    blacklist_token,
    is_account_locked,
    record_failed_login,
    clear_failed_logins,
    MAX_FAILED_ATTEMPTS,
)
from app.db.models.user import User
from app.schemas.token import LoginRequest, AuthToken, ChangePasswordRequest
from app.schemas.system import ApiResponse
from app.services.audit_service import audit_service

logger = logging.getLogger(__name__)
router = APIRouter()
security = HTTPBearer()


@router.post("/login", response_model=AuthToken, tags=["auth"])
async def login(
    login_data: LoginRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Login endpoint - authenticate user and return JWT token.

    Security features:
    1. Account lockout after 5 failed attempts (15 minute window)
    2. Failed login attempt tracking
    3. Audit logging for security events
    4. Generic error messages to prevent user enumeration
    """
    client_ip = get_client_ip(request)
    user_agent = request.headers.get("User-Agent", "Unknown")

    # Check account lockout FIRST (before any database queries)
    is_locked, retry_after = is_account_locked(login_data.email)
    if is_locked:
        logger.warning(
            f"Login attempt for locked account: {login_data.email} from IP {client_ip}"
        )
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Account temporarily locked due to multiple failed login attempts. Try again in {retry_after} seconds.",
            headers={"Retry-After": str(retry_after)},
        )

    # Find user by email (case-insensitive)
    normalized_email = login_data.email.lower().strip()
    user = db.query(User).filter(User.email == normalized_email).first()

    # Unified check: user exists AND password is correct AND user is active
    # This prevents information leakage about account existence or status
    if (
        not user
        or not verify_password(login_data.password, user.hashed_password)
        or not user.is_active
    ):
        # Record failed attempt
        failed_count = record_failed_login(normalized_email, client_ip)

        # Log security event (without revealing which check failed)
        logger.warning(
            f"Failed login attempt for {normalized_email} from IP {client_ip} "
            f"(attempt #{failed_count})"
        )

        # Audit log for failed login (user_id may be None if user doesn't exist)
        try:
            audit_service.log_audit_event(
                db=db,
                user_id=user.id if user else 0,  # 0 for unknown user
                entity_type="auth",
                entity_id=None,
                action="login_failed",
                changes={
                    "email": normalized_email,
                    "attempt_number": failed_count,
                    "reason": "invalid_credentials",  # Generic reason
                },
                ip_address=client_ip,
            )
        except Exception as e:
            logger.error(f"Failed to log audit event: {e}")

        # Check if this attempt triggered lockout
        remaining_attempts = MAX_FAILED_ATTEMPTS - failed_count
        if remaining_attempts <= 0:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Account temporarily locked due to multiple failed login attempts. Try again in 15 minutes.",
                headers={"Retry-After": "900"},
            )

        # Generic error message (don't reveal if user exists or is inactive)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Successful login - clear failed attempts
    clear_failed_logins(normalized_email)

    # Set token expiration based on remember_me flag
    from datetime import timedelta

    if login_data.remember_me:
        expires_delta = timedelta(days=30)  # 30 days for remember me
        expires_in_seconds = 60 * 60 * 24 * 30  # 30 days in seconds
    else:
        expires_delta = None  # Use default from settings (typically 7 days)
        expires_in_seconds = 60 * 60 * 24 * 7  # 7 days in seconds

    # Generate JWT token with user data
    access_token = create_access_token(
        subject=user.id,
        role=user.role,
        must_change_password=user.must_change_password,
        expires_delta=expires_delta,
    )

    # Audit log for successful login
    try:
        audit_service.log_audit_event(
            db=db,
            user_id=user.id,
            entity_type="auth",
            entity_id=None,
            action="login_success",
            changes={
                "remember_me": login_data.remember_me,
                "user_agent": user_agent[:200] if user_agent else None,
            },
            ip_address=client_ip,
        )
    except Exception as e:
        logger.error(f"Failed to log audit event: {e}")

    logger.info(f"Successful login for user {user.id} ({user.email}) from IP {client_ip}")

    return AuthToken(
        access_token=access_token,
        token_type="bearer",
        expires_in=expires_in_seconds,
    )


@router.post(
    "/change-password",
    response_model=ApiResponse,
    tags=["auth"],
)
async def change_password(
    password_data: ChangePasswordRequest,
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Change user password endpoint.

    This endpoint:
    1. Verifies the current password
    2. Updates the user's password
    3. Sets must_change_password to False
    4. Logs the password change event
    """
    client_ip = get_client_ip(request)

    # Verify current password
    if not verify_password(
        password_data.current_password, current_user.hashed_password
    ):
        # Log failed password change attempt
        logger.warning(
            f"Failed password change attempt for user {current_user.id} from IP {client_ip}"
        )
        audit_service.log_audit_event(
            db=db,
            user_id=current_user.id,
            entity_type="auth",
            entity_id=None,
            action="password_change_failed",
            changes={"reason": "incorrect_current_password"},
            ip_address=client_ip,
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect current password",
        )

    # Update password and reset must_change_password flag
    old_hash = current_user.hashed_password[:20] + "..."  # Truncated for audit log
    current_user.hashed_password = get_password_hash(password_data.new_password)
    current_user.must_change_password = False

    # Save changes to database
    db.commit()
    db.refresh(current_user)

    # Log successful password change
    audit_service.log_audit_event(
        db=db,
        user_id=current_user.id,
        entity_type="auth",
        entity_id=None,
        action="password_change_success",
        changes={
            "must_change_password": {"before": True, "after": False},
        },
        ip_address=client_ip,
    )

    logger.info(f"Password changed successfully for user {current_user.id}")

    return ApiResponse(message="Password changed successfully")


@router.post("/logout", response_model=ApiResponse, tags=["auth"])
async def logout(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    Logout endpoint - invalidate user session by blacklisting the token.

    This endpoint:
    1. Blacklists the JWT token in Redis
    2. Token remains blacklisted until its original expiration
    3. Logs the logout event for audit purposes
    """
    client_ip = get_client_ip(request)
    token = credentials.credentials

    try:
        # Decode token to get expiration time
        payload = verify_token(token)
        exp = payload.get("exp")

        if exp:
            # Calculate remaining TTL
            now = datetime.now(timezone.utc).timestamp()
            expires_in = int(exp - now)

            if expires_in > 0:
                # Blacklist the token
                blacklist_token(token, expires_in)
                logger.info(
                    f"Token blacklisted for user {current_user.id}, "
                    f"expires in {expires_in} seconds"
                )
    except Exception as e:
        # Log but don't fail - still return success to user
        logger.error(f"Failed to blacklist token: {e}")

    # Log logout event
    try:
        audit_service.log_audit_event(
            db=db,
            user_id=current_user.id,
            entity_type="auth",
            entity_id=None,
            action="logout",
            changes=None,
            ip_address=client_ip,
        )
    except Exception as e:
        logger.error(f"Failed to log logout event: {e}")

    logger.info(f"User {current_user.id} ({current_user.email}) logged out from IP {client_ip}")

    return ApiResponse(message="Successfully logged out")


@router.get("/verify", tags=["auth"])
async def verify_auth(
    current_user: User = Depends(get_current_active_user),
):
    """
    Verify authentication status.

    Returns basic user info if the token is valid and not blacklisted.
    Useful for frontend to check if user session is still active.
    """
    return {
        "authenticated": True,
        "user_id": current_user.id,
        "email": current_user.email,
        "role": current_user.role,
        "must_change_password": current_user.must_change_password,
    }
