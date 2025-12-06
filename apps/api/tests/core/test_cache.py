"""
Tests for Redis caching functionality (app/core/cache.py)
"""

import time
from threading import Thread
from unittest.mock import MagicMock, patch

import pytest
from redis.exceptions import RedisError

from app.core.cache import (
    CACHE_TTL_DASHBOARD,
    CACHE_TTL_EXTERNAL_ANALYTICS,
    CACHE_TTL_LOOKUP,
    CACHE_TTL_SHORT,
    CacheMetrics,
    RedisCache,
    cache,
    cache_query_result,
    cached,
    get_cache_stats,
    invalidate_cache_pattern,
)


class TestRedisCache:
    """Test Redis cache functionality"""

    def test_cache_initialization(self):
        """Test cache initializes successfully"""
        test_cache = RedisCache()
        # Should initialize without errors
        assert test_cache is not None

    def test_cache_is_available_property(self):
        """Test is_available property"""
        # The global cache instance should check availability
        # This might be True or False depending on Redis status
        assert isinstance(cache.is_available, bool)

    def test_generate_cache_key_deterministic(self):
        """Test cache key generation is deterministic"""
        key1 = cache._generate_cache_key("test", param1="value1", param2="value2")
        key2 = cache._generate_cache_key("test", param1="value1", param2="value2")

        # Same parameters should generate same key
        assert key1 == key2

    def test_generate_cache_key_different_params(self):
        """Test cache key generation differs with different params"""
        key1 = cache._generate_cache_key("test", param1="value1")
        key2 = cache._generate_cache_key("test", param1="value2")

        # Different parameters should generate different keys
        assert key1 != key2

    def test_generate_cache_key_order_independent(self):
        """Test cache key generation is order-independent"""
        key1 = cache._generate_cache_key("test", a="1", b="2", c="3")
        key2 = cache._generate_cache_key("test", c="3", a="1", b="2")

        # Different parameter order should generate same key
        assert key1 == key2

    @pytest.mark.skipif(not cache.is_available, reason="Redis not available")
    def test_cache_set_and_get(self):
        """Test setting and getting cache values"""
        test_key = "test:cache_set_get"
        test_value = {"data": "test_value", "number": 123}

        # Set value
        success = cache.set(test_key, test_value, ttl=60)
        assert success is True

        # Get value
        retrieved = cache.get(test_key)
        assert retrieved == test_value

        # Cleanup
        cache.delete(test_key)

    @pytest.mark.skipif(not cache.is_available, reason="Redis not available")
    def test_cache_get_nonexistent_key(self):
        """Test getting a non-existent key returns None"""
        result = cache.get("nonexistent:key:12345")
        assert result is None

    @pytest.mark.skipif(not cache.is_available, reason="Redis not available")
    def test_cache_delete(self):
        """Test deleting cache values"""
        test_key = "test:cache_delete"
        test_value = {"data": "test"}

        # Set and verify
        cache.set(test_key, test_value, ttl=60)
        assert cache.get(test_key) == test_value

        # Delete
        success = cache.delete(test_key)
        assert success is True

        # Verify deleted
        assert cache.get(test_key) is None

    @pytest.mark.skipif(not cache.is_available, reason="Redis not available")
    def test_cache_ttl_expiration(self):
        """Test cache values expire after TTL"""
        test_key = "test:cache_ttl"
        test_value = {"data": "expires_soon"}

        # Set with 1 second TTL
        cache.set(test_key, test_value, ttl=1)

        # Should exist immediately
        assert cache.get(test_key) == test_value

        # Wait for expiration
        time.sleep(2)

        # Should be expired
        assert cache.get(test_key) is None

    @pytest.mark.skipif(not cache.is_available, reason="Redis not available")
    def test_cache_delete_pattern(self):
        """Test deleting cache values by pattern"""
        # Set multiple keys with same prefix
        cache.set("test_pattern:key1", {"val": 1}, ttl=60)
        cache.set("test_pattern:key2", {"val": 2}, ttl=60)
        cache.set("test_pattern:key3", {"val": 3}, ttl=60)
        cache.set("other:key", {"val": 4}, ttl=60)

        # Delete by pattern
        deleted_count = cache.delete_pattern("test_pattern:*")

        # Should delete 3 keys
        assert deleted_count == 3

        # Verify pattern keys deleted
        assert cache.get("test_pattern:key1") is None
        assert cache.get("test_pattern:key2") is None
        assert cache.get("test_pattern:key3") is None

        # Verify other key still exists
        assert cache.get("other:key") is not None

        # Cleanup
        cache.delete("other:key")

    @pytest.mark.skipif(not cache.is_available, reason="Redis not available")
    def test_cache_invalidate_external_analytics(self):
        """Test invalidating external analytics caches"""
        # Set some external analytics cache keys
        cache.set("external_analytics:test1", {"data": 1}, ttl=3600)
        cache.set("external_dashboard:test2", {"data": 2}, ttl=3600)
        cache.set("external_export:test3", {"data": 3}, ttl=3600)
        cache.set("internal:test4", {"data": 4}, ttl=3600)

        # Invalidate external analytics
        deleted_count = cache.invalidate_external_analytics()

        # Should delete external keys
        assert deleted_count >= 3

        # Verify external keys deleted
        assert cache.get("external_analytics:test1") is None
        assert cache.get("external_dashboard:test2") is None
        assert cache.get("external_export:test3") is None

        # Verify internal key still exists
        assert cache.get("internal:test4") is not None

        # Cleanup
        cache.delete("internal:test4")

    def test_cache_handles_unavailable_redis_gracefully(self):
        """Test cache operations fail gracefully when Redis is unavailable"""
        # Create a cache instance with mocked unavailable Redis
        test_cache = RedisCache()
        test_cache._is_available = False
        test_cache._client = None

        # All operations should return safe defaults without errors
        assert test_cache.get("any_key") is None
        assert test_cache.set("any_key", "value") is False
        assert test_cache.delete("any_key") is False
        assert test_cache.delete_pattern("*") == 0
        assert test_cache.invalidate_external_analytics() == 0

    @pytest.mark.skipif(not cache.is_available, reason="Redis not available")
    def test_cache_complex_data_structures(self):
        """Test caching complex nested data structures"""
        test_key = "test:complex_data"
        complex_value = {
            "string": "test",
            "number": 42,
            "float": 3.14,
            "bool": True,
            "null": None,
            "list": [1, 2, 3],
            "nested": {"dict": {"deeply": ["nested", "values"]}},
        }

        # Set and retrieve
        cache.set(test_key, complex_value, ttl=60)
        retrieved = cache.get(test_key)

        # Should match exactly
        assert retrieved == complex_value

        # Cleanup
        cache.delete(test_key)

    @patch("app.core.cache.redis.Redis")
    def test_cache_handles_redis_connection_error(self, mock_redis):
        """Test cache handles Redis connection errors during initialization"""
        # Mock Redis to raise connection error
        mock_redis.side_effect = RedisError("Connection failed")

        # Should initialize without crashing
        test_cache = RedisCache()

        # Should mark as unavailable
        assert test_cache.is_available is False

    @patch("app.core.cache.redis.Redis")
    def test_cache_handles_redis_ping_failure(self, mock_redis):
        """Test cache handles Redis ping failure"""
        # Mock Redis instance that fails ping
        mock_client = MagicMock()
        mock_client.ping.side_effect = RedisError("Ping failed")
        mock_redis.return_value = mock_client

        # Should initialize without crashing
        test_cache = RedisCache()

        # Should mark as unavailable
        assert test_cache.is_available is False


class TestCacheMetrics:
    """Test CacheMetrics data class functionality"""

    def test_cache_metrics_initialization(self):
        """Test metrics initialized with zero values"""
        metrics = CacheMetrics()
        assert metrics.hits == 0
        assert metrics.misses == 0
        assert metrics.errors == 0
        assert metrics.total_hit_time_ms == 0.0
        assert metrics.total_miss_time_ms == 0.0

    def test_hit_rate_calculation_no_requests(self):
        """Test hit rate returns 0 when no requests"""
        metrics = CacheMetrics()
        assert metrics.hit_rate == 0.0

    def test_hit_rate_calculation_with_data(self):
        """Test hit rate calculation with hits and misses"""
        metrics = CacheMetrics(hits=75, misses=25)
        assert metrics.hit_rate == 75.0

    def test_hit_rate_all_hits(self):
        """Test hit rate is 100% when all hits"""
        metrics = CacheMetrics(hits=100, misses=0)
        assert metrics.hit_rate == 100.0

    def test_hit_rate_all_misses(self):
        """Test hit rate is 0% when all misses"""
        metrics = CacheMetrics(hits=0, misses=50)
        assert metrics.hit_rate == 0.0

    def test_avg_hit_time_no_hits(self):
        """Test average hit time returns 0 when no hits"""
        metrics = CacheMetrics()
        assert metrics.avg_hit_time_ms == 0.0

    def test_avg_hit_time_calculation(self):
        """Test average hit time calculation"""
        metrics = CacheMetrics(hits=10, total_hit_time_ms=100.0)
        assert metrics.avg_hit_time_ms == 10.0

    def test_avg_miss_time_no_misses(self):
        """Test average miss time returns 0 when no misses"""
        metrics = CacheMetrics()
        assert metrics.avg_miss_time_ms == 0.0

    def test_avg_miss_time_calculation(self):
        """Test average miss time calculation"""
        metrics = CacheMetrics(misses=5, total_miss_time_ms=250.0)
        assert metrics.avg_miss_time_ms == 50.0

    def test_to_dict_conversion(self):
        """Test conversion to dictionary"""
        metrics = CacheMetrics(
            hits=100,
            misses=20,
            errors=5,
            total_hit_time_ms=500.0,
            total_miss_time_ms=1000.0,
        )
        result = metrics.to_dict()

        assert result["hits"] == 100
        assert result["misses"] == 20
        assert result["errors"] == 5
        assert result["hit_rate"] == 83.33  # 100/120 * 100
        assert result["avg_hit_time_ms"] == 5.0  # 500/100
        assert result["avg_miss_time_ms"] == 50.0  # 1000/20


class TestCacheThreadSafety:
    """Test thread safety of cache metrics tracking"""

    def test_record_hit_thread_safety(self):
        """Test record_hit is thread-safe with concurrent increments"""
        test_cache = RedisCache()
        test_cache._is_available = False  # Don't need actual Redis

        def increment_hits():
            for _ in range(100):
                test_cache.record_hit(1.0)

        threads = [Thread(target=increment_hits) for _ in range(10)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        # Should have 1000 hits (10 threads * 100 increments)
        assert test_cache._metrics.hits == 1000
        assert test_cache._metrics.total_hit_time_ms == 1000.0

    def test_record_miss_thread_safety(self):
        """Test record_miss is thread-safe with concurrent increments"""
        test_cache = RedisCache()
        test_cache._is_available = False

        def increment_misses():
            for _ in range(100):
                test_cache.record_miss(2.5)

        threads = [Thread(target=increment_misses) for _ in range(10)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        assert test_cache._metrics.misses == 1000
        assert test_cache._metrics.total_miss_time_ms == 2500.0

    def test_record_error_thread_safety(self):
        """Test record_error is thread-safe with concurrent increments"""
        test_cache = RedisCache()
        test_cache._is_available = False

        def increment_errors():
            for _ in range(100):
                test_cache.record_error()

        threads = [Thread(target=increment_errors) for _ in range(10)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        assert test_cache._metrics.errors == 1000

    def test_get_metrics_thread_safe(self):
        """Test get_metrics returns thread-safe copy"""
        test_cache = RedisCache()
        test_cache._is_available = False
        test_cache.record_hit(10.0)
        test_cache.record_miss(20.0)
        test_cache.record_error()

        metrics = test_cache.get_metrics()

        assert metrics["hits"] == 1
        assert metrics["misses"] == 1
        assert metrics["errors"] == 1

    def test_reset_metrics(self):
        """Test reset_metrics clears all metrics"""
        test_cache = RedisCache()
        test_cache._is_available = False
        test_cache.record_hit(10.0)
        test_cache.record_miss(20.0)
        test_cache.record_error()

        test_cache.reset_metrics()

        assert test_cache._metrics.hits == 0
        assert test_cache._metrics.misses == 0
        assert test_cache._metrics.errors == 0


class TestCacheKeyGeneration:
    """Test SHA256-based cache key generation"""

    def test_generate_cache_key_uses_sha256(self):
        """Test cache key uses SHA256 hash"""
        test_cache = RedisCache()
        test_cache._is_available = False

        key = test_cache._generate_cache_key("analytics", cycle_id=42, region="NCR")

        # Should have prefix and 16-char hash (truncated SHA256)
        assert key.startswith("analytics:")
        assert len(key.split(":")[1]) == 16

    def test_generate_cache_key_deterministic(self):
        """Test cache key generation is deterministic regardless of param order"""
        test_cache = RedisCache()
        test_cache._is_available = False

        key1 = test_cache._generate_cache_key("test", user_id=123, name="john", active=True)
        key2 = test_cache._generate_cache_key("test", active=True, name="john", user_id=123)

        # Same params in different order should produce same key
        assert key1 == key2

    def test_generate_cache_key_different_values(self):
        """Test different values produce different keys"""
        test_cache = RedisCache()
        test_cache._is_available = False

        key1 = test_cache._generate_cache_key("test", user_id=123)
        key2 = test_cache._generate_cache_key("test", user_id=456)

        assert key1 != key2


class TestDeletePattern:
    """Test SCAN-based pattern deletion"""

    @patch("app.core.cache.redis.Redis")
    def test_delete_pattern_uses_scan_not_keys(self, mock_redis):
        """Test delete_pattern uses SCAN instead of blocking KEYS command"""
        mock_client = MagicMock()
        mock_redis.return_value = mock_client
        mock_client.ping.return_value = True

        # Simulate SCAN returning keys in multiple batches
        mock_client.scan.side_effect = [
            (100, ["key1", "key2", "key3"]),  # First scan
            (0, ["key4", "key5"]),  # Second scan (cursor=0 means done)
        ]
        mock_client.delete.return_value = 5

        with patch("app.core.cache.settings") as mock_settings:
            mock_settings.REDIS_CACHE_URL = "redis://localhost:6380/0"

            test_cache = RedisCache()
            deleted = test_cache.delete_pattern("analytics:*")

            # Should call SCAN, not KEYS
            assert mock_client.scan.call_count == 2
            assert mock_client.delete.call_count == 2
            # Verify KEYS was never called
            assert not hasattr(mock_client, "keys") or mock_client.keys.call_count == 0

    @patch("app.core.cache.redis.Redis")
    def test_delete_pattern_handles_redis_error(self, mock_redis):
        """Test delete_pattern handles Redis errors gracefully"""
        mock_client = MagicMock()
        mock_redis.return_value = mock_client
        mock_client.ping.return_value = True
        mock_client.scan.side_effect = RedisError("Scan failed")

        with patch("app.core.cache.settings") as mock_settings:
            mock_settings.REDIS_CACHE_URL = "redis://localhost:6380/0"

            test_cache = RedisCache()
            deleted = test_cache.delete_pattern("analytics:*")

            assert deleted == 0


class TestCachedDecorator:
    """Test @cached decorator functionality"""

    @patch("app.core.cache.cache")
    def test_cached_decorator_hit(self, mock_cache):
        """Test decorator returns cached value on hit"""
        mock_cache.is_available = True
        mock_cache.get.return_value = {"cached": "result"}
        mock_cache._generate_cache_key.return_value = "test:key"

        @cached(prefix="test", ttl=300)
        def expensive_function(param1):
            return {"computed": "value"}

        result = expensive_function(param1="value")

        assert result == {"cached": "result"}
        mock_cache.get.assert_called_once()
        mock_cache.record_hit.assert_called_once()

    @patch("app.core.cache.cache")
    def test_cached_decorator_miss(self, mock_cache):
        """Test decorator computes and caches on miss"""
        mock_cache.is_available = True
        mock_cache.get.return_value = None  # Cache miss
        mock_cache.set.return_value = True
        mock_cache._generate_cache_key.return_value = "test:key"

        computed_value = {"computed": "value"}

        @cached(prefix="test", ttl=300)
        def expensive_function(param1):
            return computed_value

        result = expensive_function(param1="value")

        assert result == computed_value
        mock_cache.get.assert_called_once()
        mock_cache.set.assert_called_once_with("test:key", computed_value, ttl=300)
        mock_cache.record_miss.assert_called_once()

    @patch("app.core.cache.cache")
    def test_cached_decorator_skip_none(self, mock_cache):
        """Test decorator doesn't cache None when skip_none=True"""
        mock_cache.is_available = True
        mock_cache.get.return_value = None
        mock_cache._generate_cache_key.return_value = "test:key"

        @cached(prefix="test", ttl=300, skip_none=True)
        def returns_none():
            return None

        result = returns_none()

        assert result is None
        mock_cache.set.assert_not_called()  # Should not cache None

    @patch("app.core.cache.cache")
    def test_cached_decorator_cache_none_when_configured(self, mock_cache):
        """Test decorator caches None when skip_none=False"""
        mock_cache.is_available = True
        mock_cache.get.return_value = None
        mock_cache._generate_cache_key.return_value = "test:key"

        @cached(prefix="test", ttl=300, skip_none=False)
        def returns_none():
            return None

        result = returns_none()

        assert result is None
        mock_cache.set.assert_called_once_with("test:key", None, ttl=300)

    @patch("app.core.cache.cache")
    def test_cached_decorator_when_redis_unavailable(self, mock_cache):
        """Test decorator bypasses cache when Redis unavailable"""
        mock_cache.is_available = False

        call_count = 0

        @cached(prefix="test", ttl=300)
        def expensive_function():
            nonlocal call_count
            call_count += 1
            return {"computed": "value"}

        # Call twice - should compute both times (no caching)
        result1 = expensive_function()
        result2 = expensive_function()

        assert result1 == {"computed": "value"}
        assert result2 == {"computed": "value"}
        assert call_count == 2  # Function called twice
        mock_cache.get.assert_not_called()
        mock_cache.set.assert_not_called()

    @patch("app.core.cache.cache")
    def test_cached_decorator_custom_key_builder(self, mock_cache):
        """Test decorator with custom key builder"""
        mock_cache.is_available = True
        mock_cache.get.return_value = None

        def custom_key_builder(*args, **kwargs):
            return f"custom:{kwargs.get('user_id')}"

        @cached(prefix="test", ttl=300, key_builder=custom_key_builder)
        def get_user_data(user_id):
            return {"user_id": user_id, "data": "value"}

        result = get_user_data(user_id=123)

        # Should use custom key builder instead of default
        mock_cache.get.assert_called_once_with("custom:123")

    @patch("app.core.cache.cache")
    def test_cached_decorator_preserves_function_metadata(self, mock_cache):
        """Test decorator preserves function name and docstring"""
        mock_cache.is_available = False

        @cached(prefix="test", ttl=300)
        def my_function():
            """This is my function"""
            return "value"

        assert my_function.__name__ == "my_function"
        assert my_function.__doc__ == "This is my function"


class TestCacheQueryResultDecorator:
    """Test @cache_query_result decorator functionality"""

    @patch("app.core.cache.cache")
    def test_cache_query_result_delegates_to_cached(self, mock_cache):
        """Test cache_query_result is a wrapper around cached"""
        mock_cache.is_available = True
        mock_cache.get.return_value = None
        mock_cache._generate_cache_key.return_value = "query:key"

        @cache_query_result(ttl=CACHE_TTL_DASHBOARD, key_prefix="dashboard")
        def get_dashboard_data(db, user_id: int):
            return {"user_id": user_id, "stats": {}}

        result = get_dashboard_data(db=None, user_id=42)

        assert result == {"user_id": 42, "stats": {}}
        mock_cache.get.assert_called_once()


class TestModuleFunctions:
    """Test module-level functions"""

    @patch("app.core.cache.cache")
    def test_invalidate_cache_pattern(self, mock_cache):
        """Test invalidate_cache_pattern delegates to cache"""
        mock_cache.delete_pattern.return_value = 5

        deleted = invalidate_cache_pattern("dashboard:*")

        assert deleted == 5
        mock_cache.delete_pattern.assert_called_once_with("dashboard:*")

    @patch("app.core.cache.cache")
    def test_get_cache_stats_when_available(self, mock_cache):
        """Test get_cache_stats returns metrics when cache available"""
        mock_cache.is_available = True
        mock_cache.get_metrics.return_value = {
            "hits": 100,
            "misses": 20,
            "hit_rate": 83.33,
        }

        stats = get_cache_stats()

        assert stats["available"] is True
        assert stats["metrics"]["hits"] == 100
        assert stats["metrics"]["misses"] == 20

    @patch("app.core.cache.cache")
    def test_get_cache_stats_when_unavailable(self, mock_cache):
        """Test get_cache_stats returns None metrics when cache unavailable"""
        mock_cache.is_available = False

        stats = get_cache_stats()

        assert stats["available"] is False
        assert stats["metrics"] is None


class TestCacheTTLConstants:
    """Test cache TTL constants are properly defined"""

    def test_ttl_constants_exist(self):
        """Test all TTL constants are defined"""
        assert CACHE_TTL_EXTERNAL_ANALYTICS == 3600
        assert CACHE_TTL_DASHBOARD == 1800
        assert CACHE_TTL_LOOKUP == 3600
        assert CACHE_TTL_SHORT == 300

    def test_ttl_values_are_reasonable(self):
        """Test TTL values are within reasonable ranges"""
        assert 0 < CACHE_TTL_SHORT < CACHE_TTL_DASHBOARD
        assert CACHE_TTL_DASHBOARD <= CACHE_TTL_LOOKUP
        assert CACHE_TTL_EXTERNAL_ANALYTICS >= CACHE_TTL_DASHBOARD
