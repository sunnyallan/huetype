import os
from contextlib import asynccontextmanager
from dotenv import load_dotenv

load_dotenv()  # loads .env in local dev; env vars take precedence on Render

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import projects, glyphs, jobs

ALLOWED_ORIGINS = os.environ.get(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://localhost:3001",
).split(",")


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(
    title="Hue Type API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(projects.router)
app.include_router(glyphs.router)
app.include_router(jobs.router)


@app.get("/health")
def health():
    return {"status": "ok", "version": "1.0.0"}
