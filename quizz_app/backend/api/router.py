import random
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from db.session import get_db
from models import Question, Submission
from schemas import (
    QuestionResponse, 
    UserJoin, 
    SubmissionResponse,
    QuestionCreate,
    QuestionUpdate,
    AdminQuestionResponse
)

router = APIRouter(prefix="/api")

@router.get("/questions", response_model=List[QuestionResponse])
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
        
        # In case the table has fewer questions
        if len(questions) < 5:
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

@router.post("/submit", response_model=SubmissionResponse)
async def submit_quiz(submission_data: UserJoin, db: AsyncSession = Depends(get_db)):
    """
    Submits user answers, calculates scores based on accuracy and speed,
    and saves the user submission.
    """
    try:
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
            
            # Constrain seconds_left to valid boundaries (0 to 10 seconds)
            sec_left = max(0.0, min(10.0, ans.seconds_left))
            
            # Record time left
            cumulative_time_left += sec_left
            
            # Rules:
            # 1. If seconds_left == 0, score for that question is strictly 0.
            # 2. If correct, base weight: 100 points, Speed Multiplier: add (seconds_left * 10). Max score = 200.
            # 3. If incorrect, score is 0.
            if sec_left <= 0.0:
                question_score = 0
            elif ans.selected_option == q.correct:
                question_score = int(100 + (sec_left * 10))
                question_score = min(200, question_score) # Cap at 200
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

@router.get("/leaderboard", response_model=List[SubmissionResponse])
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

@router.get("/podium", response_model=List[SubmissionResponse])
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

# Admin Authentication Dependency
async def verify_admin(x_admin_password: str = Header(None)):
    from config import settings
    if not x_admin_password or x_admin_password != settings.ADMIN_PASSWORD:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing admin password."
        )

# Admin endpoints for CRUD operations on Questions
@router.get("/admin/questions", response_model=List[AdminQuestionResponse], dependencies=[Depends(verify_admin)])
async def get_admin_questions(db: AsyncSession = Depends(get_db)):
    try:
        query = select(Question).order_by(Question.id.asc())
        result = await db.execute(query)
        return result.scalars().all()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch questions for admin. Error: {str(e)}"
        )

@router.post("/admin/questions", response_model=AdminQuestionResponse, dependencies=[Depends(verify_admin)])
async def create_question(question_data: QuestionCreate, db: AsyncSession = Depends(get_db)):
    try:
        new_q = Question(
            text=question_data.text.strip(),
            opt_a=question_data.opt_a.strip(),
            opt_b=question_data.opt_b.strip(),
            opt_c=question_data.opt_c.strip(),
            opt_d=question_data.opt_d.strip(),
            correct=question_data.correct.upper().strip()
        )
        if new_q.correct not in ['A', 'B', 'C', 'D']:
            raise HTTPException(status_code=400, detail="Correct option must be 'A', 'B', 'C', or 'D'.")
        db.add(new_q)
        await db.commit()
        await db.refresh(new_q)
        return new_q
    except HTTPException as he:
        raise he
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/admin/questions/{question_id}", response_model=AdminQuestionResponse, dependencies=[Depends(verify_admin)])
async def update_question(question_id: int, question_data: QuestionUpdate, db: AsyncSession = Depends(get_db)):
    try:
        query = select(Question).where(Question.id == question_id)
        result = await db.execute(query)
        q = result.scalar_one_or_none()
        if not q:
            raise HTTPException(status_code=404, detail="Question not found")
        
        if question_data.text is not None:
            q.text = question_data.text.strip()
        if question_data.opt_a is not None:
            q.opt_a = question_data.opt_a.strip()
        if question_data.opt_b is not None:
            q.opt_b = question_data.opt_b.strip()
        if question_data.opt_c is not None:
            q.opt_c = question_data.opt_c.strip()
        if question_data.opt_d is not None:
            q.opt_d = question_data.opt_d.strip()
        if question_data.correct is not None:
            correct_val = question_data.correct.upper().strip()
            if correct_val not in ['A', 'B', 'C', 'D']:
                raise HTTPException(status_code=400, detail="Correct option must be 'A', 'B', 'C', or 'D'.")
            q.correct = correct_val

        await db.commit()
        await db.refresh(q)
        return q
    except HTTPException as he:
        raise he
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/admin/questions/{question_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(verify_admin)])
async def delete_question(question_id: int, db: AsyncSession = Depends(get_db)):
    try:
        query = select(Question).where(Question.id == question_id)
        result = await db.execute(query)
        q = result.scalar_one_or_none()
        if not q:
            raise HTTPException(status_code=404, detail="Question not found")
        await db.delete(q)
        await db.commit()
        return None
    except HTTPException as he:
        raise he
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
