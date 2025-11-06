from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.openapi.utils import get_openapi
import os

from app.database import create_db_and_tables
from app.api.auth import router as auth_router
from app.api.accounts import router as accounts_router
from app.api.contacts import router as contacts_router
from app.api.transactions import router as transactions_router

app = FastAPI(title="DiceBank API", version="1.0")

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static directory
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
os.makedirs(STATIC_DIR, exist_ok=True)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

@app.on_event("startup")
def on_startup():
    create_db_and_tables()

# Routers
app.include_router(auth_router)
app.include_router(accounts_router)
app.include_router(contacts_router)
app.include_router(transactions_router)

@app.get("/")
def root():
    return {"status": "running", "message": "Welcome to DiceBank API!"}

# Custom OpenAPI for Swagger "Authorize" button
def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema

    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        routes=app.routes,
    )

    openapi_schema["components"]["securitySchemes"] = {
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
        }
    }

    openapi_schema["security"] = [{"BearerAuth": []}]

    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi
# waaaaaaaaaaaaaaaaaaaa wld l97ba
