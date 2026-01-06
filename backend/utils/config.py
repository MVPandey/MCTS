from pydantic import Field, PostgresDsn, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Self


class Config(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    openai_base_url: str = Field(
        default="https://openrouter.ai/api/v1",
        description="Base URL for LLM API",
    )
    openai_api_key: str = Field(
        ...,
        description="API key for LLM service",
    )

    openrouter_api_key: str = Field(
        default="",
        description="API key for OpenRouter API",
    )

    # LLM client settings
    llm_timeout: float = Field(
        default=60.0,
        description="Request timeout in seconds for LLM calls",
    )
    llm_max_retries: int = Field(
        default=2,
        description="Maximum retries for failed LLM requests",
    )
    max_concurrency: int = Field(
        default=16,
        description="Maximum concurrent LLM calls",
    )

    @model_validator(mode="after")
    def set_openrouter_fallback(self) -> Self:
        """Fall back to openai_api_key if openrouter_api_key is not set."""
        if not self.openrouter_api_key:
            self.openrouter_api_key = self.openai_api_key
        return self

    llm_name: str = Field(default="z-ai/glm-4.7", description="LLM model name")

    # --- These are for deep researcher ---
    fast_llm: str = Field(
        default="openrouter:bytedance-seed/seed-1.6-flash",
        description="Fast LLM model name",
    )
    smart_llm: str = Field(
        default="openrouter:google/gemini-2.0-flash-001",
        description="Smart LLM model name",
    )
    strategic_llm: str = Field(
        default="openrouter:minimax/minimax-m2.1",
        description="Strategic LLM model name",
    )

    firecrawl_api_key: str = Field(
        default="",
        description="API key for Firecrawl API",
    )

    scraper: str = Field(
        default="firecrawl",
        description="Web scraper to use (firecrawl, tavily, etc.)",
    )
    max_scraper_workers: int = Field(
        default=5,
        description="Maximum concurrent scraper workers for deep research",
    )

    embedding_base_url: str = Field(
        default="https://openrouter.ai/api/v1", description="Base URL for embedding API"
    )
    embedding_api_key: str = Field(
        default="",
        description="API key for embedding service (defaults to OPENAI_API_KEY if not set)",
    )
    embedding_model_name: str = Field(
        default="openai/text-embedding-3-small", description="Embedding model name"
    )
    llm_provider: str | None = Field(default="fireworks", description="LLM provider")
    logging_level: str = Field(default="INFO", description="Logging level")
    debug: bool = Field(default=False, description="Debug mode")
    server_port: int = Field(default=8000, ge=1, le=65535, description="Server port")
    server_host: str = Field(default="localhost", description="Server host")
    database_url: PostgresDsn | None = Field(
        default=None, env="DATABASE_URL", description="PostgreSQL database URL"
    )


config = Config()
