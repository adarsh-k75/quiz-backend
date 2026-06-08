from typing import Optional
from pydantic import BaseModel, ConfigDict, Field

class QuestionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    text: str
    opt_a: str
    opt_b: str
    opt_c: str
    opt_d: str

class AnswerSubmission(BaseModel):
    question_id: int
    selected_option: Optional[str] = None  # 'A', 'B', 'C', 'D' or None
    seconds_left: float

class QuestionCreate(BaseModel):
    text: str = Field(..., min_length=1)
    opt_a: str = Field(..., min_length=1)
    opt_b: str = Field(..., min_length=1)
    opt_c: str = Field(..., min_length=1)
    opt_d: str = Field(..., min_length=1)
    correct: str = Field(..., min_length=1, max_length=1) # A, B, C, or D

class QuestionUpdate(BaseModel):
    text: Optional[str] = None
    opt_a: Optional[str] = None
    opt_b: Optional[str] = None
    opt_c: Optional[str] = None
    opt_d: Optional[str] = None
    correct: Optional[str] = None

class AdminQuestionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    text: str
    opt_a: str
    opt_b: str
    opt_c: str
    opt_d: str
    correct: str
