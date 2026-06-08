from datetime import datetime
from sqlalchemy import func
from sqlalchemy.orm import Mapped, mapped_column
from .base import Base

class Submission(Base):
    __tablename__ = "submissions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(nullable=False)
    batch: Mapped[str] = mapped_column(nullable=False)
    score: Mapped[int] = mapped_column(nullable=False)
    speed_bonus: Mapped[float] = mapped_column(nullable=False)  # Represents cumulative seconds_left
    submitted_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)
