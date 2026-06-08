from pydantic_settings import BaseSettings
from pydantic import ConfigDict

class Settings(BaseSettings):
    model_config = ConfigDict(env_file=".env", extra="ignore")
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/quizz_db"
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    ADMIN_PASSWORD: str = "admin123"

settings = Settings()
