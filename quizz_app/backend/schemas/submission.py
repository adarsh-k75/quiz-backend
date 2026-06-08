from typing import List
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from .question import AnswerSubmission

class UserJoin(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    batch: str = Field(..., min_length=1, max_length=100)
    answers: List[AnswerSubmission]

class SubmissionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    batch: str
    score: int
    speed_bonus: float
    submitted_at: datetime
