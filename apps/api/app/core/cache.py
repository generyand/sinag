# 📦 Redis Caching Module
# Implements caching strategy for external analytics with configurable TTL

import json
import hashlib
import logging
from typing import Optional, Any, Callable
from functools import wraps
import redis
from redis.exceptions import RedisError

from app.core.config import settings

logger = logging.getLogger(__name__)

# Cache TTL configuration (in seconds)
CACHE_TTL_EXTERNAL_ANALYTICS = 3600  # 1 hour for external analytics (longer than internal)
CACHE_TTL_INTERNAL_ANALYTICS = 900   # 15 minutes for internal analytics
CACHE_TTL_DASHBOARD = 1800           # 30 minutes for dashboard data


class RedisCache:
    """
    Redis cache manager for VANTAGE application.

    Provides caching functionality with automatic serialization/deserialization,
    TTL management, and error handling.
    """

    def __init__(self):
        """Initialize Redis connection."""
        self._client: Optional[redis.Redis] = None
        self._is_available = False
        self._initialize_connection()

    def _initialize_connection(self) -> None:
        """Initialize Redis connection with error handling."""
        try:
            # Extract host and port from CELERY_BROKER_URL
            # Format: redis://localhost:6379/0
            broker_url = settings.CELERY_BROKER_URL

            # Parse Redis URL
            if broker_url.startswith("redis://"):
                parts = broker_url.replace("redis://", "").split("/")
                host_port = parts[0].split(":")
                host = host_port[0]
                port = int(host_port[1]) if len(host_port) > 1 else 6379
                db = int(parts[1]) if len(parts) > 1 else 0

                self._client = redis.Redis(
                    host=host,
                    port=port,
                    db=db,
                    decode_responses=True,  # Auto-decode bytes to strings
                    socket_connect_timeout=5,
                    socket_timeout=5,
                )

                # Test connection
                self._client.ping()
                self._is_available = True
                logger.info(f"✅ Redis cache connected ({host}:{port}/db{db})")
            else:
                logger.warning("⚠️  Invalid Redis URL format")
                self._is_available = False

        except RedisError as e:
            logger.warning(f"⚠️  Redis cache unavailable: {e}")
            self._is_available = False
        except Exception as e:
            logger.error(f"❌ Redis cache initialization error: {e}")
            self._is_available = False

    @property
    def is_available(self) -> bool:
        """Check if Redis is available."""
        return self._is_available and self._client is not None

    def _generate_cache_key(self, prefix: str, **kwargs) -> str:
        """
        Generate a deterministic cache key from parameters.

        Args:
            prefix: Cache key prefix (e.g., "external_analytics")
            **kwargs: Parameters to hash into the key

        Returns:
            Cache key string
        """
        # Sort kwargs for deterministic hashing
        sorted_params = sorted(kwargs.items())
        params_str = json.dumps(sorted_params, sort_keys=True)
        params_hash = hashlib.md5(params_str.encode()).hexdigest()[:16]

        return f"{prefix}:{params_hash}"

    def get(self, key: str) -> Optional[Any]:
        """
        Get value from cache.

        Args:
            key: Cache key

        Returns:
            Cached value (deserialized from JSON) or None if not found
        """
        if not self.is_available:
            return None

        try:
            cached_value = self._client.get(key)
            if cached_value:
                logger.debug(f"🎯 Cache HIT: {key}")
                return json.loads(cached_value)
            else:
                logger.debug(f"❌ Cache MISS: {key}")
                return None
        except RedisError as e:
            logger.warning(f"⚠️  Cache GET error for {key}: {e}")
            return None
        except json.JSONDecodeError as e:
            logger.error(f"❌ Cache deserialization error for {key}: {e}")
            return None

    def set(self, key: str, value: Any, ttl: int = 3600) -> bool:
        """
        Set value in cache with TTL.

        Args:
            key: Cache key
            value: Value to cache (will be JSON serialized)
            ttl: Time to live in seconds

        Returns:
            True if successful, False otherwise
        """
        if not self.is_available:
            return False

        try:
            serialized_value = json.dumps(value)
            self._client.setex(key, ttl, serialized_value)
            logger.debug(f"💾 Cache SET: {key} (TTL: {ttl}s)")
            return True
        except (RedisError, TypeError, ValueError) as e:
            logger.warning(f"⚠️  Cache SET error for {key}: {e}")
            return False

    def delete(self, key: str) -> bool:
        """
        Delete key from cache.

        Args:
            key: Cache key to delete

        Returns:
            True if successful, False otherwise
        """
        if not self.is_available:
            return False

        try:
            self._client.delete(key)
            logger.debug(f"🗑️  Cache DELETE: {key}")
            return True
        except RedisError as e:
            logger.warning(f"⚠️  Cache DELETE error for {key}: {e}")
            return False

    def delete_pattern(self, pattern: str) -> int:
        """
        Delete all keys matching a pattern.

        Args:
            pattern: Redis key pattern (e.g., "external_analytics:*")

        Returns:
            Number of keys deleted
        """
        if not self.is_available:
            return 0

        try:
            keys = self._client.keys(pattern)
            if keys:
                deleted = self._client.delete(*keys)
                logger.info(f"🗑️  Cache invalidated: {deleted} keys matching '{pattern}'")
                return deleted
            return 0
        except RedisError as e:
            logger.warning(f"⚠️  Cache pattern DELETE error for {pattern}: {e}")
            return 0

    def invalidate_external_analytics(self) -> int:
        """
        Invalidate all external analytics caches.

        This should be called when new assessments are validated.

        Returns:
            Number of keys invalidated
        """
        patterns = [
            "external_analytics:*",
            "external_dashboard:*",
            "external_export:*",
        ]

        total_deleted = 0
        for pattern in patterns:
            total_deleted += self.delete_pattern(pattern)

        if total_deleted > 0:
            logger.info(f"♻️  External analytics cache invalidated: {total_deleted} keys")

        return total_deleted


def cached(
    prefix: str,
    ttl: int = CACHE_TTL_EXTERNAL_ANALYTICS,
    key_builder: Optional[Callable] = None
):
    """
    Decorator for caching function results.

    Args:
        prefix: Cache key prefix
        ttl: Time to live in seconds
        key_builder: Optional custom key builder function

    Example:
        @cached(prefix="external_analytics", ttl=3600)
        def get_analytics_data(db, cycle=None):
            return expensive_query(db, cycle)
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Skip caching if Redis is unavailable
            if not cache.is_available:
                return func(*args, **kwargs)

            # Build cache key
            if key_builder:
                cache_key = key_builder(*args, **kwargs)
            else:
                # Default key builder: use function name and kwargs
                cache_key = cache._generate_cache_key(
                    prefix=f"{prefix}:{func.__name__}",
                    **kwargs
                )

            # Try to get from cache
            cached_result = cache.get(cache_key)
            if cached_result is not None:
                return cached_result

            # Cache miss - compute result
            result = func(*args, **kwargs)

            # Store in cache
            cache.set(cache_key, result, ttl=ttl)

            return result

        return wrapper
    return decorator


# Global cache instance
cache = RedisCache()
