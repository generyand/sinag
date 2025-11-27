# 🔐 FastAPI Dependencies
# Reusable dependency injection functions for authentication, database sessions, etc.

import logging
from typing import Generator, Optional

from app.core.security import verify_token
from app.db.base import get_db as get_db_session
from app.db.base import get_supabase, get_supabase_admin
from app.db.enums import UserRole
from app.db.models.user import User
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session, joinedload
from supabase import Client

logger = logging.getLogger(__name__)

# Security scheme for JWT tokens
security = HTTPBearer()


def get_db() -> Generator[Session, None, None]:
    """
    Database session dependency.
    Creates a new database session for each request and closes it when done.
    """
    yield from get_db_session()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    """
    Get the current authenticated user from JWT token.

    Args:
        credentials: JWT token from Authorization header
        db: Database session

    Returns:
        User: Current authenticated user

    Raises:
        HTTPException: If token is invalid or user not found
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        # Verify and decode the JWT token
        payload = verify_token(credentials.credentials)
        user_id: Optional[str] = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except Exception:
        raise credentials_exception

    # Get user from database
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception

    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Get the current authenticated and active user.

    Args:
        current_user: Current user from get_current_user dependency

    Returns:
        User: Current active user

    Raises:
        HTTPException: If user is inactive
    """
    if not getattr(current_user, "is_active"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user"
        )
    return current_user


async def get_current_admin_user(
    current_user: User = Depends(get_current_active_user),
) -> User:
    """
    Get the current authenticated admin user.

    Restricts access to users with MLGOO_DILG role.

    Args:
        current_user: Current active user from get_current_active_user dependency

    Returns:
        User: Current admin user

    Raises:
        HTTPException: If user doesn't have admin privileges
    """
    if current_user.role != UserRole.MLGOO_DILG:
        # Log unauthorized access attempt
        logger.warning(
            f"Unauthorized admin access attempt by user_id={current_user.id} "
            f"(role={current_user.role}, email={current_user.email})"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions. Admin access required.",
        )
    return current_user


def get_supabase_client() -> Client:
    """
    Get Supabase client dependency.

    Returns:
        Client: Supabase client for real-time operations and auth
    """
    return get_supabase()


def get_supabase_admin_client() -> Client:
    """
    Get Supabase admin client dependency.

    Returns:
        Client: Supabase admin client for server-side operations
    """
    return get_supabase_admin()


async def get_current_validator_user(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> User:
    """
    Get the current authenticated Validator user with governance area loaded.

    - Requires role to be VALIDATOR
    - Ensures an assigned validator_area exists
    - Returns the user with validator_area eagerly loaded

    Raises:
        HTTPException: 403 if role is not VALIDATOR or governance area missing
    """
    user_with_area = (
        db.query(User)
        .options(joinedload(User.validator_area))
        .filter(User.id == current_user.id)
        .first()
    )

    if not user_with_area:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if (
        getattr(user_with_area, "role", None) is None
        or user_with_area.role != UserRole.VALIDATOR
    ):
         raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions. Validator access required.",
        )

    if user_with_area.validator_area is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Validator must be assigned to a governance area.",
        )

    return user_with_area


async def get_current_validator_user_http(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    """
    HTTP-friendly dependency that authenticates and enforces Validator role.

    Returns 401 for any invalid credentials or missing validator context to align
    with tests that expect unauthorized when user context is incomplete.
    """
    # Verify and decode JWT
    try:
        payload = verify_token(credentials.credentials)
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Load user
    user = db.query(User).filter(User.id == user_id).first()
    if user is None or not getattr(user, "is_active", False):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Enforce validator role and governance area
    if getattr(user, "role", None) != UserRole.VALIDATOR:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_with_area = (
        db.query(User).options(joinedload(User.validator_area)).filter(User.id == user.id).first()
    )
    if user_with_area is None or user_with_area.validator_area is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user_with_area


async def get_current_assessor_or_validator(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> User:
    """
    Dependency that accepts both ASSESSOR and VALIDATOR roles.

    - VALIDATOR: Must have validator_area_id assigned
    - ASSESSOR: Can optionally have validator_area_id for filtered access,
                or None for system-wide access (flexible assignment)

    Returns:
        User: Current assessor or validator user with optional governance area

    Raises:
        HTTPException: 403 if user doesn't have ASSESSOR or VALIDATOR role
        HTTPException: 403 if VALIDATOR doesn't have validator_area_id assigned
    """
    # Check role is ASSESSOR or VALIDATOR
    if current_user.role not in (UserRole.ASSESSOR, UserRole.VALIDATOR):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. ASSESSOR or VALIDATOR role required.",
        )

    # Load user with validator_area relationship
    user_with_area = (
        db.query(User)
        .options(joinedload(User.validator_area))
        .filter(User.id == current_user.id)
        .first()
    )

    # VALIDATOR must have validator_area_id assigned
    if current_user.role == UserRole.VALIDATOR:
        if user_with_area is None or user_with_area.validator_area is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Validator must be assigned to a governance area.",
            )

    # ASSESSOR can have validator_area_id (for filtered access) or None (system-wide)
    # No additional validation required for ASSESSOR role

    return user_with_area


async def require_mlgoo_dilg(
    current_user: User = Depends(get_current_active_user),
) -> User:
    """
    Require MLGOO_DILG role for admin endpoints.

    This dependency function enforces that only users with MLGOO_DILG role
    can access administrative features (indicators, BBIs, deadlines, audit logs).

    Args:
        current_user: Current active user from get_current_active_user dependency

    Returns:
        User: Current MLGOO_DILG user

    Raises:
        HTTPException: 403 Forbidden if user doesn't have MLGOO_DILG role
    """
    if current_user.role != UserRole.MLGOO_DILG:
        # Log unauthorized admin access attempt
        logger.warning(
            f"Unauthorized admin access attempt by user_id={current_user.id} "
            f"(role={current_user.role}, email={current_user.email})"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions. MLGOO-DILG admin access required.",
        )
    return current_user


def get_client_ip(request: Request) -> Optional[str]:
    """
    Extract client IP address from request.

    Checks for X-Forwarded-For header (for proxied requests) first,
    then falls back to direct client IP.

    Args:
        request: FastAPI request object

    Returns:
        Optional[str]: Client IP address (IPv4 or IPv6), or None if unavailable
    """
    # Check X-Forwarded-For header (proxy/load balancer)
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        # X-Forwarded-For can contain multiple IPs (client, proxy1, proxy2, ...)
        # The first IP is the original client
        return forwarded_for.split(",")[0].strip()

    # Check X-Real-IP header (alternative proxy header)
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip.strip()

    # Fall back to direct client IP
    if request.client:
        return request.client.host

    return None


async def get_current_external_user(
    current_user: User = Depends(get_current_active_user),
) -> User:
    """
    Get the current authenticated external stakeholder user.

    Restricts access to users with KATUPARAN_CENTER_USER role.
    These users have read-only access to aggregated, anonymized SGLGB data for research purposes.

    Args:
        current_user: Current active user from get_current_active_user dependency

    Returns:
        User: Current external stakeholder user

    Raises:
        HTTPException: If user doesn't have external stakeholder role
    """
    if current_user.role != UserRole.KATUPARAN_CENTER_USER:
        # Log unauthorized access attempt
        logger.warning(
            f"Unauthorized external analytics access attempt by user_id={current_user.id} "
            f"(role={current_user.role}, email={current_user.email})"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions. External stakeholder access required.",
        )
    return current_user


# Assessor/Validator endpoints use the new combined dependency
# This supports both ASSESSOR (flexible assignment) and VALIDATOR (area-specific) roles
get_current_area_assessor_user = get_current_assessor_or_validator
get_current_area_assessor_user_http = get_current_assessor_or_validator
