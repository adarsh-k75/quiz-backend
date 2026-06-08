import os
import random
from typing import List, Optional
from datetime import datetime
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, ConfigDict
from pydantic_settings import BaseSettings
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base, Mapped, mapped_column
from sqlalchemy import select, func, text

# Configuration Settings
class Settings(BaseSettings):
    model_config = ConfigDict(env_file=".env", extra="ignore")
    DATABASE_URL: str = "sqlite+aiosqlite:///quizz_db.sqlite3"
    PORT: int = 8000
    HOST: str = "0.0.0.0"

settings = Settings()

# Database Setup
database_url = os.environ.get("DATABASE_URL") or settings.DATABASE_URL

# Rewrite connection scheme if needed to support asyncpg
if database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql+asyncpg://", 1)
elif database_url.startswith("postgresql://"):
    database_url = database_url.replace("postgresql://", "postgresql+asyncpg://", 1)

engine = create_async_engine(database_url, echo=True)
async_session = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

Base = declarative_base()

# SQLAlchemy Models
class Question(Base):
    __tablename__ = "questions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    text: Mapped[str] = mapped_column(nullable=False)
    opt_a: Mapped[str] = mapped_column(nullable=False)
    opt_b: Mapped[str] = mapped_column(nullable=False)
    opt_c: Mapped[str] = mapped_column(nullable=False)
    opt_d: Mapped[str] = mapped_column(nullable=False)
    correct: Mapped[str] = mapped_column(nullable=False) # Store 'A', 'B', 'C', or 'D'

class Submission(Base):
    __tablename__ = "submissions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(nullable=False)
    batch: Mapped[str] = mapped_column(nullable=False)
    score: Mapped[int] = mapped_column(nullable=False)
    speed_bonus: Mapped[float] = mapped_column(nullable=False) # Represents cumulative seconds_left
    submitted_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)

# Pydantic Schemas for validation
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
    selected_option: Optional[str] = None # 'A', 'B', 'C', 'D' or None
    seconds_left: float

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

# Async Database Dependency
async def get_db():
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()

# Startup and Lifespan
@asynccontextmanager
async def lifespan(app: FastAPI):
    global engine, async_session
    # Check database connectivity and fallback to SQLite if needed
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
    except Exception as db_err:
        print(f"Warning: Connection to primary database failed: {db_err}")
        print("Falling back to local SQLite database: quizz_db.sqlite3")
        await engine.dispose()
        engine = create_async_engine("sqlite+aiosqlite:///quizz_db.sqlite3", echo=True)
        async_session = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

    # Initialize tables and seed questions if empty
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        
        async with async_session() as session:
            async with session.begin():
                result = await session.execute(select(func.count(Question.id)))
                count = result.scalar()
                if count == 0:
                    seed_questions = [
                        Question(
                            text="Which of the following HTTP status codes represents 'Unauthorized' access?",
                            opt_a="400 Bad Request",
                            opt_b="401 Unauthorized",
                            opt_c="403 Forbidden",
                            opt_d="404 Not Found",
                            correct="B"
                        ),
                        Question(
                            text="What is the primary purpose of the 'defer' attribute in a <script> tag?",
                            opt_a="It executes the script asynchronously as soon as it is downloaded",
                            opt_b="It delays script execution until the HTML document is fully parsed",
                            opt_c="It blocks page rendering until the script is fully executed",
                            opt_d="It executes the script in a web worker thread",
                            correct="B"
                        ),
                        Question(
                            text="In CSS Flexbox, which property controls the alignment of items along the main axis?",
                            opt_a="align-items",
                            opt_b="align-content",
                            opt_c="justify-content",
                            opt_d="flex-direction",
                            correct="C"
                        ),
                        Question(
                            text="Which React Hook is designed to execute side effects in a functional component?",
                            opt_a="useState",
                            opt_b="useMemo",
                            opt_c="useEffect",
                            opt_d="useCallback",
                            correct="C"
                        ),
                        Question(
                            text="What is the primary role of the Event Loop in the JavaScript runtime?",
                            opt_a="It executes database operations asynchronously on separate OS threads",
                            opt_b="It manages memory allocation and garbage collection for the application",
                            opt_c="It monitors the call stack and execution queue to run asynchronous callbacks",
                            opt_d="It runs synchronous JavaScript code in a pool of worker threads",
                            correct="C"
                        )
                    ]
                    session.add_all(seed_questions)
        print("Database initialization and seeding complete.")
    except Exception as e:
        print(f"Warning: Database setup failed on startup. Details: {e}")
    yield
    await engine.dispose()

app = FastAPI(
    title="Real-time Quiz API",
    description="An API for a real-time web development trivia game (DevShowdown). Includes questions retrieval, quiz submissions, scoring validation, and live leaderboards.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS Middleware (Strict Setup)
allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://quiz-app-25bdf.web.app",
    "https://quiz-app-25bdf.firebaseapp.com"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Redirect root to Swagger
@app.get("/", include_in_schema=False)
async def redirect_to_docs():
    return RedirectResponse(url="/docs")

# Endpoints
@app.get("/api/questions", response_model=List[QuestionResponse])
async def get_questions(db: AsyncSession = Depends(get_db)):
    """
    Randomly selects exactly 5 questions.
    Strips the correct answer column from the payload.
    """
    try:
        # Use func.random() for database-level random ordering and limit to 5
        query = select(Question).order_by(func.random()).limit(5)
        result = await db.execute(query)
        questions = result.scalars().all()
        
        # In case the table has fewer questions (should not happen with seed)
        if len(questions) < 5:
            # Re-query all questions if needed, or return what we have
            query_all = select(Question)
            all_res = await db.execute(query_all)
            questions = all_res.scalars().all()
            if len(questions) > 5:
                questions = random.sample(questions, 5)
                
        return questions
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve questions. Error: {str(e)}"
        )

@app.post("/api/submit", response_model=SubmissionResponse)
async def submit_quiz(submission_data: UserJoin, db: AsyncSession = Depends(get_db)):
    """
    Submits user answers, calculates scores based on accuracy and speed,
    and saves the user submission.
    """
    try:
        # Verify if answers list is empty
        if not submission_data.answers:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Answers list cannot be empty."
            )

        # Retrieve questions from database
        question_ids = [ans.question_id for ans in submission_data.answers]
        query = select(Question).where(Question.id.in_(question_ids))
        result = await db.execute(query)
        db_questions = {q.id: q for q in result.scalars().all()}

        total_score = 0
        cumulative_time_left = 0.0

        for ans in submission_data.answers:
            q = db_questions.get(ans.question_id)
            if not q:
                continue # Skip invalid question ids
            
            # Constrain seconds_left to valid boundaries (0 to 5 seconds)
            sec_left = max(0.0, min(5.0, ans.seconds_left))
            
            # Record time left
            cumulative_time_left += sec_left
            
            # Rules:
            # 1. If seconds_left == 0, score for that question is strictly 0.
            # 2. If correct, base weight: 100 points, Speed Multiplier: add (seconds_left * 10). Max score = 150.
            # 3. If incorrect, score is 0.
            if sec_left <= 0.0:
                question_score = 0
            elif ans.selected_option == q.correct:
                question_score = int(100 + (sec_left * 10))
                question_score = min(150, question_score) # Cap at 150
            else:
                question_score = 0
                
            total_score += question_score

        # Save to database
        db_submission = Submission(
            name=submission_data.name.strip(),
            batch=submission_data.batch.strip(),
            score=total_score,
            speed_bonus=cumulative_time_left
        )
        db.add(db_submission)
        await db.commit()
        await db.refresh(db_submission)
        
        return db_submission

    except HTTPException as he:
        raise he
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to submit quiz results. Error: {str(e)}"
        )

@app.get("/api/leaderboard", response_model=List[SubmissionResponse])
async def get_leaderboard(db: AsyncSession = Depends(get_db)):
    """
    Returns all submissions ordered by score DESC, then speed_bonus DESC (time left).
    """
    try:
        query = select(Submission).order_by(Submission.score.desc(), Submission.speed_bonus.desc(), Submission.id.asc())
        result = await db.execute(query)
        return result.scalars().all()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch leaderboard. Error: {str(e)}"
        )

@app.get("/api/podium", response_model=List[SubmissionResponse])
async def get_podium(db: AsyncSession = Depends(get_db)):
    """
    Returns strictly the top 3 rows from the leaderboard.
    """
    try:
        query = select(Submission).order_by(Submission.score.desc(), Submission.speed_bonus.desc(), Submission.id.asc()).limit(3)
        result = await db.execute(query)
        return result.scalars().all()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch podium. Error: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.HOST, port=settings.PORT, reload=True)
