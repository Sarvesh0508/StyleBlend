import os
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    REPLICATE_API_TOKEN: str = ""
    HOST: str = "127.0.0.1"
    PORT: int = 8000
    DEBUG: bool = True
    MAX_UPLOAD_SIZE_MB: int = 10
    FILE_CLEANUP_AGE_HOURS: int = 1

    BASE_DIR: str = os.path.dirname(os.path.abspath(__file__))
    UPLOAD_DIR: str = os.path.join(BASE_DIR, "uploads")
    INPUT_DIR: str = os.path.join(UPLOAD_DIR, "inputs")
    OUTPUT_DIR: str = os.path.join(UPLOAD_DIR, "outputs")
    SAVED_DIR: str = os.path.join(UPLOAD_DIR, "saved")
    WARDROBE_DIR: str = os.path.join(UPLOAD_DIR, "wardrobe")
    DB_PATH: str = os.path.join(BASE_DIR, "styleblend.db")

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )


def get_settings() -> Settings:
    return Settings()
