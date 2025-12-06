# 🔐 Security Functions
# Password hashing, JWT token creation/verification, and security utilities

import hashlib
import html
import logging
import re
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple, Union

from app.core.config import settings
from jose import JWTError, jwt  # type: ignore
from passlib.context import CryptContext  # type: ignore

logger = logging.getLogger(__name__)

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def create_access_token(
    subject: Union[str, int],
    expires_delta: Optional[timedelta] = None,
    role: Optional[str] = None,
    must_change_password: Optional[bool] = None,
) -> str:
    """
    Create a new JWT access token.

    Args:
        subject: The subject (usually user ID) to encode in the token
        expires_delta: Custom expiration time, defaults to settings value
        role: User role to include in token payload
        must_change_password: Whether user must change password

    Returns:
        str: Encoded JWT token
    """
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode = {"exp": expire, "sub": str(subject), "iat": now}

    # Add optional fields to payload
    if role is not None:
        to_encode["role"] = role
    if must_change_password is not None:
        to_encode["must_change_password"] = must_change_password

    encoded_jwt = jwt.encode(
        to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM
    )
    return encoded_jwt


def verify_token(token: str) -> dict:
    """
    Verify and decode a JWT token.

    Args:
        token: JWT token string

    Returns:
        dict: Decoded token payload

    Raises:
        JWTError: If token is invalid or expired
    """
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        return payload
    except JWTError:
        raise JWTError("Invalid token")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a password against its hash.

    Args:
        plain_password: Plain text password
        hashed_password: Hashed password from database

    Returns:
        bool: True if password matches, False otherwise
    """
    # Bcrypt has a maximum password length of 72 bytes
    # Truncate to 72 bytes if password is too long
    if isinstance(plain_password, str):
        plain_password_bytes = plain_password.encode("utf-8")
        if len(plain_password_bytes) > 72:
            plain_password = plain_password_bytes[:72].decode("utf-8", errors="ignore")

    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """
    Generate password hash.

    Args:
        password: Plain text password

    Returns:
        str: Hashed password
    """
    # Bcrypt has a maximum password length of 72 bytes
    # Truncate to 72 bytes if password is too long
    if isinstance(password, str):
        password_bytes = password.encode("utf-8")
        if len(password_bytes) > 72:
            password = password_bytes[:72].decode("utf-8", errors="ignore")

    return pwd_context.hash(password)


def verify_password_reset_token(token: str) -> Optional[str]:
    """
    Verify password reset token and return user email.

    Args:
        token: Password reset token

    Returns:
        Optional[str]: User email if token is valid, None otherwise
    """
    try:
        decoded_token = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        return decoded_token.get("sub")
    except JWTError:
        return None


def generate_password_reset_token(email: str) -> str:
    """
    Generate a password reset token.

    Args:
        email: User email address

    Returns:
        str: Password reset token
    """
    delta = timedelta(hours=24)  # Token expires in 24 hours
    now = datetime.now(timezone.utc)
    expires = now + delta
    exp = expires.timestamp()
    encoded_jwt = jwt.encode(
        {"exp": exp, "nbf": now, "sub": email},
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )
    return encoded_jwt


# ============================================================================
# Token Blacklist (Logout/Revocation)
# ============================================================================


def blacklist_token(token: str, expires_in_seconds: int) -> bool:
    """
    Add a token to the blacklist.

    Args:
        token: JWT token to blacklist
        expires_in_seconds: TTL matching token expiration

    Returns:
        bool: True if successful, False otherwise
    """
    from app.db.base import get_redis_client

    try:
        redis_client = get_redis_client()
        # Hash the token to avoid storing raw JWTs
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        key = f"blacklist:{token_hash}"
        redis_client.setex(key, expires_in_seconds, "1")
        logger.info(f"Token blacklisted successfully (hash: {token_hash[:16]}...)")
        return True
    except Exception as e:
        logger.error(f"Failed to blacklist token: {str(e)}")
        return False


def is_token_blacklisted(token: str) -> bool:
    """
    Check if a token is blacklisted.

    Args:
        token: JWT token to check

    Returns:
        bool: True if blacklisted, False otherwise
    """
    from app.db.base import get_redis_client

    try:
        redis_client = get_redis_client()
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        key = f"blacklist:{token_hash}"
        return redis_client.exists(key) > 0
    except Exception as e:
        logger.error(f"Failed to check token blacklist: {str(e)}")
        # Fail open to avoid blocking all requests on Redis failure
        # In high-security environments, consider failing closed instead
        return False


# ============================================================================
# Account Lockout (Brute-Force Protection)
# ============================================================================

# Configuration
MAX_FAILED_ATTEMPTS = 5  # Lock after 5 failed attempts
LOCKOUT_WINDOW_SECONDS = 900  # 15 minute lockout window


def record_failed_login(email: str, ip_address: Optional[str] = None) -> int:
    """
    Record a failed login attempt.

    Args:
        email: Email address of the account
        ip_address: IP address of the request (for logging)

    Returns:
        int: Current number of failed attempts
    """
    from app.db.base import get_redis_client

    try:
        redis_client = get_redis_client()
        # Use email (normalized) as the key
        normalized_email = email.lower().strip()
        key = f"failed_login:{normalized_email}"

        # Increment counter
        current = redis_client.incr(key)

        # Set/reset expiration on first attempt or each subsequent attempt
        redis_client.expire(key, LOCKOUT_WINDOW_SECONDS)

        logger.warning(
            f"Failed login attempt #{current} for {normalized_email} from IP {ip_address}"
        )
        return current
    except Exception as e:
        logger.error(f"Failed to record failed login: {str(e)}")
        return 0


def is_account_locked(email: str) -> Tuple[bool, int]:
    """
    Check if an account is locked due to failed login attempts.

    Args:
        email: Email address to check

    Returns:
        Tuple[bool, int]: (is_locked, retry_after_seconds)
    """
    from app.db.base import get_redis_client

    try:
        redis_client = get_redis_client()
        normalized_email = email.lower().strip()
        key = f"failed_login:{normalized_email}"

        failed_attempts = redis_client.get(key)
        if not failed_attempts:
            return False, 0

        failed_attempts = int(failed_attempts)

        if failed_attempts >= MAX_FAILED_ATTEMPTS:
            ttl = redis_client.ttl(key)
            if ttl > 0:
                return True, ttl
            else:
                # Key has no TTL or expired, clear it
                redis_client.delete(key)
                return False, 0

        return False, 0
    except Exception as e:
        logger.error(f"Failed to check account lockout: {str(e)}")
        # Fail open to avoid blocking all logins on Redis failure
        return False, 0


def clear_failed_logins(email: str) -> bool:
    """
    Clear failed login attempts on successful login.

    Args:
        email: Email address to clear

    Returns:
        bool: True if successful
    """
    from app.db.base import get_redis_client

    try:
        redis_client = get_redis_client()
        normalized_email = email.lower().strip()
        key = f"failed_login:{normalized_email}"
        redis_client.delete(key)
        return True
    except Exception as e:
        logger.error(f"Failed to clear failed logins: {str(e)}")
        return False


def get_failed_login_count(email: str) -> int:
    """
    Get current failed login count for an email.

    Args:
        email: Email address to check

    Returns:
        int: Number of failed attempts
    """
    from app.db.base import get_redis_client

    try:
        redis_client = get_redis_client()
        normalized_email = email.lower().strip()
        key = f"failed_login:{normalized_email}"
        count = redis_client.get(key)
        return int(count) if count else 0
    except Exception as e:
        logger.error(f"Failed to get failed login count: {str(e)}")
        return 0


# ============================================================================
# HTML Sanitization & XSS Prevention
# ============================================================================


def sanitize_html(text: Optional[str], allow_basic_formatting: bool = False) -> Optional[str]:
    """
    Sanitize HTML content to prevent XSS attacks.

    This function removes dangerous HTML tags and attributes while optionally
    preserving basic formatting tags like <b>, <i>, <p>, <br>.

    Args:
        text: The text content to sanitize
        allow_basic_formatting: If True, allows basic HTML formatting tags.
                               If False, strips all HTML tags.

    Returns:
        Sanitized text with dangerous content removed, or None if input is None

    Examples:
        >>> sanitize_html("<script>alert('xss')</script>Hello")
        "Hello"

        >>> sanitize_html("<b>Bold</b> text", allow_basic_formatting=True)
        "<b>Bold</b> text"
    """
    if text is None:
        return None

    if not isinstance(text, str):
        return str(text)

    # List of dangerous tags to always remove
    dangerous_tags = [
        'script', 'iframe', 'object', 'embed', 'applet',
        'link', 'style', 'meta', 'base', 'form',
    ]

    # List of dangerous attributes to remove
    dangerous_attrs = [
        'onload', 'onerror', 'onclick', 'onmouseover', 'onmouseout',
        'onkeydown', 'onkeyup', 'onkeypress', 'onfocus', 'onblur',
        'onchange', 'onsubmit', 'onreset', 'onselect', 'onabort',
        'javascript:', 'data:', 'vbscript:',
    ]

    # Remove dangerous tags and their content
    for tag in dangerous_tags:
        # Remove opening tag, content, and closing tag
        pattern = f'<{tag}[^>]*>.*?</{tag}>'
        text = re.sub(pattern, '', text, flags=re.IGNORECASE | re.DOTALL)
        # Remove self-closing tags
        pattern = f'<{tag}[^>]*/>'
        text = re.sub(pattern, '', text, flags=re.IGNORECASE)

    # Remove dangerous attributes from remaining tags
    for attr in dangerous_attrs:
        # Remove attribute="value" or attribute='value' or attribute=value
        pattern = f'{attr}\\s*=\\s*["\']?[^"\'\\s>]*["\']?'
        text = re.sub(pattern, '', text, flags=re.IGNORECASE)

    # If basic formatting is not allowed, strip all remaining HTML tags
    if not allow_basic_formatting:
        text = re.sub('<[^>]+>', '', text)

    # Escape any remaining special HTML characters to prevent injection
    # This converts < > & " ' to their HTML entity equivalents
    if not allow_basic_formatting:
        text = html.escape(text)

    return text.strip()


def sanitize_text_input(text: Optional[str], max_length: Optional[int] = None) -> Optional[str]:
    """
    Sanitize plain text input by removing all HTML and limiting length.

    Args:
        text: The text to sanitize
        max_length: Maximum allowed length (characters will be truncated)

    Returns:
        Sanitized text with all HTML removed, or None if input is None
    """
    if text is None:
        return None

    # Remove all HTML tags
    sanitized = sanitize_html(text, allow_basic_formatting=False)

    # Trim to max length if specified
    if max_length and sanitized and len(sanitized) > max_length:
        sanitized = sanitized[:max_length]

    return sanitized


def sanitize_rich_text(text: Optional[str]) -> Optional[str]:
    """
    Sanitize rich text that may contain basic HTML formatting.

    Allows safe HTML tags like <b>, <i>, <u>, <p>, <br>, <ul>, <ol>, <li>
    while removing dangerous content.

    Args:
        text: The rich text content to sanitize

    Returns:
        Sanitized text with dangerous content removed, basic formatting preserved
    """
    if text is None:
        return None

    # First pass: remove dangerous content
    sanitized = sanitize_html(text, allow_basic_formatting=True)

    # Whitelist of allowed tags for rich text
    allowed_tags = {'b', 'i', 'u', 'strong', 'em', 'p', 'br', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'}

    # Remove tags not in whitelist
    def replace_tag(match):
        tag = match.group(1).lower()
        if tag.startswith('/'):
            tag = tag[1:]  # Remove slash for closing tags
        if tag in allowed_tags:
            return match.group(0)  # Keep allowed tags
        return ''  # Remove disallowed tags

    # Pattern to match HTML tags
    pattern = r'<(/?\w+)(?:\s[^>]*)?>'
    if sanitized is None:
        return None
    sanitized = re.sub(pattern, replace_tag, sanitized, flags=re.IGNORECASE)

    return sanitized
