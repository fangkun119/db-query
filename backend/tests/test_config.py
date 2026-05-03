"""Test configuration loading."""

import pytest


def clear_settings_cache():
    """Helper to clear settings cache between tests."""
    from importlib import reload
    import app.config
    reload(app.config)


class TestGetSettings:
    """Test settings retrieval."""

    def test_get_settings_returns_singleton(self):
        """Test that get_settings returns the same instance (cached)."""
        from app.config import get_settings
        settings1 = get_settings()
        settings2 = get_settings()

        # Should be the same cached instance
        assert settings1 is settings2

    def test_get_settings_has_required_fields(self):
        """Test that settings has all required fields."""
        from app.config import get_settings
        settings = get_settings()

        # Check all required fields exist
        assert hasattr(settings, 'cors_origins')
        assert hasattr(settings, 'db_query_db_path')
        assert hasattr(settings, 'default_limit')
        assert hasattr(settings, 'openai_api_key')
        assert hasattr(settings, 'openai_api_endpoint')
        assert hasattr(settings, 'openai_model')

    def test_settings_values_are_correct_types(self):
        """Test that settings values are the correct types."""
        from app.config import get_settings
        settings = get_settings()

        assert isinstance(settings.cors_origins, str)
        assert isinstance(settings.db_query_db_path, str)
        assert isinstance(settings.default_limit, int)
        assert isinstance(settings.openai_api_key, str)
        assert isinstance(settings.openai_api_endpoint, str)
        assert isinstance(settings.openai_model, str)


class TestDefaultValues:
    """Test default configuration values."""

    def test_default_limit_is_positive_int(self):
        """Test that default limit is a positive integer."""
        from app.config import get_settings
        settings = get_settings()

        assert settings.default_limit > 0
        assert isinstance(settings.default_limit, int)

    def test_default_openai_endpoint(self):
        """Test default OpenAI endpoint."""
        from app.config import get_settings
        settings = get_settings()

        assert 'openai.com' in settings.openai_api_endpoint
        assert settings.openai_api_endpoint.startswith('https://')

    def test_default_openai_model(self):
        """Test default OpenAI model is set."""
        from app.config import get_settings
        settings = get_settings()

        assert len(settings.openai_model) > 0
        assert 'gpt' in settings.openai_model.lower()

    def test_default_cors_origins(self):
        """Test default CORS origins setting."""
        from app.config import get_settings
        settings = get_settings()

        assert len(settings.cors_origins) > 0

    def test_db_path_is_valid_string(self):
        """Test that db_path is a valid string."""
        from app.config import get_settings
        settings = get_settings()

        assert isinstance(settings.db_query_db_path, str)
        assert len(settings.db_query_db_path) > 0
        # Path should contain 'db' or 'database'
        assert 'db' in settings.db_query_db_path.lower()


class TestSettingsReload:
    """Test settings cache reloading."""

    def test_cache_clear_forces_reload(self):
        """Test that cache clear forces a reload of settings."""
        from app.config import get_settings
        import app.config

        # Get initial settings
        settings1 = get_settings()

        # Clear cache
        get_settings.cache_clear()

        # Get new settings (should be a new instance)
        settings2 = get_settings()

        # They should be different instances after cache clear
        # (though values might be the same)
        assert settings1 is not settings2
