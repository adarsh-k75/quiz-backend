from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select, func, text

from config import settings
from db.session import engine, async_session
from models import Base, Question
from api.router import router

# Startup and Lifespan
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Verify database connectivity
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        print("Successfully connected to the PostgreSQL database.")
    except Exception as db_err:
        print(f"Error: Connection to PostgreSQL database failed: {db_err}")
        raise db_err

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

# CORS Middleware (Open Setup for easy developer access)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Router
app.include_router(router)

# Redirect root to Swagger
@app.get("/", include_in_schema=False)
async def redirect_to_docs():
    return RedirectResponse(url="/docs")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.HOST, port=settings.PORT, reload=True)
