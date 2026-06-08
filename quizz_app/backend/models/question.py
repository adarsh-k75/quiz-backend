from sqlalchemy.orm import Mapped, mapped_column
from .base import Base

class Question(Base):
    __tablename__ = "questions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    text: Mapped[str] = mapped_column(nullable=False)
    opt_a: Mapped[str] = mapped_column(nullable=False)
    opt_b: Mapped[str] = mapped_column(nullable=False)
    opt_c: Mapped[str] = mapped_column(nullable=False)
    opt_d: Mapped[str] = mapped_column(nullable=False)
    correct: Mapped[str] = mapped_column(nullable=False)  # Store 'A', 'B', 'C', or 'D'
