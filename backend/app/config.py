from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "aiscriptify API"
    app_version: str = "0.1.0"
    cors_origins: list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]
    llm_api_key: str = ""
    llm_base_url: str = "https://api.deepseek.com"
    llm_model: str = "deepseek-v4-pro"
    llm_proxy_url: str = ""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
