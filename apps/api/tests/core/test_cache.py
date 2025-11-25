"""
Tests for Redis caching functionality (app/core/cache.py)
"""

import pytest
import time
from unittest.mock import patch, MagicMock
from redis.exceptions import RedisError

from app.core.cache import RedisCache, cache, CACHE_TTL_EXTERNAL_ANALYTICS


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
            "nested": {
                "dict": {
                    "deeply": ["nested", "values"]
                }
            }
        }

        # Set and retrieve
        cache.set(test_key, complex_value, ttl=60)
        retrieved = cache.get(test_key)

        # Should match exactly
        assert retrieved == complex_value

        # Cleanup
        cache.delete(test_key)

    @patch('app.core.cache.redis.Redis')
    def test_cache_handles_redis_connection_error(self, mock_redis):
        """Test cache handles Redis connection errors during initialization"""
        # Mock Redis to raise connection error
        mock_redis.side_effect = RedisError("Connection failed")

        # Should initialize without crashing
        test_cache = RedisCache()

        # Should mark as unavailable
        assert test_cache.is_available is False

    @patch('app.core.cache.redis.Redis')
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
