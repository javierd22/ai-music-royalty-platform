from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

# Initialize FastAPI app
app = FastAPI(title="Attribution Service", version="1.0.0")

# CORS configuration
allowed_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://ai-music-royalty-platform.vercel.app"
]

production_origins = os.environ.get("ALLOWED_ORIGINS", "")
if production_origins:
    allowed_origins.extend(production_origins.split(","))

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"ok": True}

# router mount for royalties
try:
    from routes.royalties import router as royalties_router
    app.include_router(royalties_router)
except Exception as _e:
    print("royalties router not mounted:", _e)

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
