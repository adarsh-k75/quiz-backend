import random
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text

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
    Randomly selects exactly 10 questions.
    Strips the correct answer column from the payload.
    """
    try:
        # Use func.random() for database-level random ordering and limit to 10
        query = select(Question).order_by(func.random()).limit(10)
        result = await db.execute(query)
        questions = result.scalars().all()
        
        # In case the table has fewer questions
        if len(questions) < 10:
            query_all = select(Question)
            all_res = await db.execute(query_all)
            questions = all_res.scalars().all()
            if len(questions) > 10:
                questions = random.sample(questions, 10)
                
        return questions
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve questions. Error: {str(e)}"
        )

@router.get("/check-username")
async def check_username(name: str, db: AsyncSession = Depends(get_db)):
    """
    Checks if a username has already been registered in the submissions.
    """
    try:
        query = select(Submission).where(Submission.name == name.strip())
        result = await db.execute(query)
        exists = result.scalar_one_or_none() is not None
        return {"exists": exists}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to check username. Error: {str(e)}"
        )

@router.post("/submit", response_model=SubmissionResponse)
async def submit_quiz(submission_data: UserJoin, db: AsyncSession = Depends(get_db)):
    """
    Submits user answers, calculates scores based on accuracy and speed,
    and saves the user submission.
    """
    try:
        if not submission_data.name or not submission_data.name.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Name cannot be empty."
            )

        # Check if username is already taken
        username_query = select(Submission).where(Submission.name == submission_data.name.strip())
        username_result = await db.execute(username_query)
        if username_result.scalar_one_or_none() is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Name is already taken. Please choose another name."
            )

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
            
            # Rules:
            # 1. If seconds_left == 0, score for that question is strictly 0.
            # 2. If correct, base weight: 100 points, Speed Multiplier: add (seconds_left * 10). Max score = 200.
            # 3. If incorrect, score is 0.
            if sec_left <= 0.0:
                question_score = 0
            elif ans.selected_option == q.correct:
                question_score = int(100 + (sec_left * 10))
                question_score = min(200, question_score) # Cap at 200
                # Record time left only for correct answers
                cumulative_time_left += sec_left
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

@router.post("/admin/questions/reset", status_code=status.HTTP_200_OK, dependencies=[Depends(verify_admin)])
async def reset_questions(db: AsyncSession = Depends(get_db)):
    try:
        await db.execute(text("TRUNCATE TABLE questions RESTART IDENTITY CASCADE"))
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
            ),
            Question(
                text="Which HTML5 element is used to display a self-contained thematic content like illustrations, diagrams, or photos?",
                opt_a="picture",
                opt_b="figure",
                opt_c="image",
                opt_d="aside",
                correct="B"
            ),
            Question(
                text="What is the correct syntax in CSS to target all elements with the class name 'highlight'?",
                opt_a="#highlight",
                opt_b=".highlight",
                opt_c="highlight",
                opt_d="*highlight",
                correct="B"
            ),
            Question(
                text="Which SQL keyword is used to sort the result-set in ascending or descending order?",
                opt_a="SORT BY",
                opt_b="ORDER BY",
                opt_c="GROUP BY",
                opt_d="ALIGN BY",
                correct="B"
            ),
            Question(
                text="In JavaScript, what is the value of typeof null?",
                opt_a="object",
                opt_b="null",
                opt_c="undefined",
                opt_d="boolean",
                correct="A"
            ),
            Question(
                text="Which of the following is NOT a valid state in a Promise in JavaScript?",
                opt_a="pending",
                opt_b="fulfilled",
                opt_c="rejected",
                opt_d="processing",
                correct="D"
            )
        ]
        db.add_all(seed_questions)
        await db.commit()
        return {"status": "success", "message": "Questions reset to default."}
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to reset questions. Error: {str(e)}")

@router.post("/admin/submissions/reset", status_code=status.HTTP_200_OK, dependencies=[Depends(verify_admin)])
async def reset_submissions(db: AsyncSession = Depends(get_db)):
    try:
        await db.execute(text("TRUNCATE TABLE submissions RESTART IDENTITY CASCADE"))
        await db.commit()
        return {"status": "success", "message": "Leaderboard submissions reset successfully."}
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to reset submissions. Error: {str(e)}")
