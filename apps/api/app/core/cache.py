# 📦 Redis Caching Module
# Implements caching strategy for analytics and query results with configurable TTL
# PERFORMANCE: Dedicated Redis instance for caching, separate from Celery queue

import json
import hashlib
import logging
import time
from dataclasses import dataclass, field
from threading import Lock
from typing import Optional, Any, Callable, Dict
from functools import wraps
import redis
from redis.exceptions import RedisError

from app.core.config import settings

logger = logging.getLogger(__name__)

# Cache TTL configuration (in seconds)
CACHE_TTL_EXTERNAL_ANALYTICS = 3600  # 1 hour for external analytics (longer than internal)
CACHE_TTL_INTERNAL_ANALYTICS = 900   # 15 minutes for internal analytics
CACHE_TTL_DASHBOARD = 1800           # 30 minutes for dashboard data
CACHE_TTL_LOOKUP = 3600              # 1 hour for lookup/reference data
CACHE_TTL_SHORT = 300                # 5 minutes for frequently changing data


@dataclass
class CacheMetrics:
    """Track cache hit/miss statistics for monitoring."""
    hits: int = 0
    misses: int = 0
    errors: int = 0
    total_hit_time_ms: float = 0.0
    total_miss_time_ms: float = 0.0

    @property
    def hit_rate(self) -> float:
        """Calculate cache hit rate."""
        total = self.hits + self.misses
        return (self.hits / total * 100) if total > 0 else 0.0

    @property
    def avg_hit_time_ms(self) -> float:
        """Average time for cache hits."""
        return (self.total_hit_time_ms / self.hits) if self.hits > 0 else 0.0

    @property
    def avg_miss_time_ms(self) -> float:
        """Average time for cache misses (includes computation)."""
        return (self.total_miss_time_ms / self.misses) if self.misses > 0 else 0.0

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API responses."""
        return {
            "hits": self.hits,
            "misses": self.misses,
            "errors": self.errors,
            "hit_rate": round(self.hit_rate, 2),
            "avg_hit_time_ms": round(self.avg_hit_time_ms, 2),
            "avg_miss_time_ms": round(self.avg_miss_time_ms, 2),
        }


class RedisCache:
    """
    Redis cache manager for SINAG application.

    Provides caching functionality with automatic serialization/deserialization,
    TTL management, error handling, and metrics tracking.

    PERFORMANCE: Uses dedicated Redis instance (REDIS_CACHE_URL) separate from Celery.
    """

    def __init__(self):
        """Initialize Redis connection."""
        self._client: Optional[redis.Redis] = None
        self._is_available = False
        self._metrics = CacheMetrics()
        self._metrics_lock = Lock()  # Thread safety for metrics updates
        self._initialize_connection()

    def _initialize_connection(self) -> None:
        """Initialize Redis connection with error handling."""
        try:
            # Use dedicated cache Redis URL (separate from Celery broker)
            # Format: redis://localhost:6380/0
            cache_url = getattr(settings, 'REDIS_CACHE_URL', None) or settings.CELERY_BROKER_URL

            # Parse Redis URL
            if cache_url.startswith("redis://"):
                parts = cache_url.replace("redis://", "").split("/")
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
                    retry_on_timeout=True,  # PERFORMANCE: Retry on timeout
                    health_check_interval=30,  # PERFORMANCE: Health check every 30s
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

    @property
    def metrics(self) -> CacheMetrics:
        """Get cache metrics for monitoring."""
        return self._metrics

    def get_metrics(self) -> Dict[str, Any]:
        """Get cache metrics as dictionary for API responses (thread-safe)."""
        with self._metrics_lock:
            return self._metrics.to_dict()

    def reset_metrics(self) -> None:
        """Reset cache metrics (useful for testing or periodic resets)."""
        with self._metrics_lock:
            self._metrics = CacheMetrics()

    def record_hit(self, elapsed_ms: float) -> None:
        """Record a cache hit (thread-safe)."""
        with self._metrics_lock:
            self._metrics.hits += 1
            self._metrics.total_hit_time_ms += elapsed_ms

    def record_miss(self, elapsed_ms: float) -> None:
        """Record a cache miss (thread-safe)."""
        with self._metrics_lock:
            self._metrics.misses += 1
            self._metrics.total_miss_time_ms += elapsed_ms

    def record_error(self) -> None:
        """Record a cache error (thread-safe)."""
        with self._metrics_lock:
            self._metrics.errors += 1

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
        # Use SHA256 for better security (truncated to 16 chars for key brevity)
        params_hash = hashlib.sha256(params_str.encode()).hexdigest()[:16]

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
        Delete all keys matching a pattern using SCAN (non-blocking).

        Uses SCAN instead of KEYS to avoid blocking Redis on large datasets.

        Args:
            pattern: Redis key pattern (e.g., "external_analytics:*")

        Returns:
            Number of keys deleted
        """
        if not self.is_available:
            return 0

        try:
            deleted = 0
            cursor = 0
            # Use SCAN iterator instead of KEYS (KEYS is O(n) and blocks Redis)
            while True:
                cursor, keys = self._client.scan(cursor, match=pattern, count=100)
                if keys:
                    deleted += self._client.delete(*keys)
                if cursor == 0:
                    break

            if deleted > 0:
                logger.info(f"[CACHE] Invalidated {deleted} keys matching '{pattern}'")
            return deleted
        except RedisError as e:
            logger.warning(f"[CACHE] Pattern DELETE error for {pattern}: {e}")
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
    key_builder: Optional[Callable] = None,
    skip_none: bool = True
):
    """
    Decorator for caching function results with metrics tracking.

    Args:
        prefix: Cache key prefix
        ttl: Time to live in seconds
        key_builder: Optional custom key builder function
        skip_none: If True, don't cache None results (default True)

    Example:
        @cached(prefix="external_analytics", ttl=3600)
        def get_analytics_data(db, cycle=None):
            return expensive_query(db, cycle)

        @cached(prefix="dashboard", ttl=CACHE_TTL_DASHBOARD)
        def get_dashboard_stats(db, user_id: int):
            return compute_stats(db, user_id)
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()

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
                # Cache hit - track metrics (thread-safe)
                elapsed_ms = (time.time() - start_time) * 1000
                cache.record_hit(elapsed_ms)
                return cached_result

            # Cache miss - compute result
            result = func(*args, **kwargs)

            # Track miss timing (thread-safe, includes computation time)
            elapsed_ms = (time.time() - start_time) * 1000
            cache.record_miss(elapsed_ms)

            # Store in cache (skip None if configured)
            if result is not None or not skip_none:
                cache.set(cache_key, result, ttl=ttl)

            return result

        # Add metadata to wrapper for introspection
        wrapper._cache_prefix = prefix
        wrapper._cache_ttl = ttl

        return wrapper
    return decorator


def cache_query_result(
    ttl: int = CACHE_TTL_DASHBOARD,
    key_prefix: str = "query"
):
    """
    Decorator for caching database query results.

    Designed for service layer methods that perform expensive database queries.
    Automatically builds cache keys from function name and keyword arguments.

    Args:
        ttl: Time to live in seconds (default: 30 minutes)
        key_prefix: Prefix for cache keys

    Example:
        @cache_query_result(ttl=900, key_prefix="dashboard")
        def get_dashboard_data(self, db, user_id: int):
            return db.query(...).all()

        @cache_query_result(ttl=CACHE_TTL_LOOKUP, key_prefix="lookup")
        def get_governance_areas(self, db):
            return db.query(GovernanceArea).all()
    """
    return cached(prefix=key_prefix, ttl=ttl, skip_none=True)


# Global cache instance
cache = RedisCache()


def invalidate_cache_pattern(pattern: str) -> int:
    """
    Invalidate all cache keys matching a pattern.

    Args:
        pattern: Redis key pattern (e.g., "dashboard:*")

    Returns:
        Number of keys invalidated
    """
    return cache.delete_pattern(pattern)


def get_cache_stats() -> Dict[str, Any]:
    """
    Get cache statistics for monitoring endpoints.

    Returns:
        Dictionary with cache availability and metrics
    """
    return {
        "available": cache.is_available,
        "metrics": cache.get_metrics() if cache.is_available else None,
    }
