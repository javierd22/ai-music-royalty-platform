from fastapi import FastAPI, File, UploadFile
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

print(f"CORS allowed origins: {allowed_origins}")

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

# Version endpoint
@app.get("/version")
async def version():
    return {"service": "attribution-service", "version": "1.0.0", "status": "operational"}

# Mock attribution endpoint for testing
@app.post("/compare")
async def compare_audio(file: UploadFile = File(...)):
    """
    Mock attribution comparison endpoint for testing
    """
    print(f"Received file: {file.filename}, size: {file.size}")
    
    # Return mock matches for testing
    mock_matches = [
        {
            "trackTitle": "Sample Track 1",
            "artist": "Test Artist",
            "similarity": 0.85,
            "percentInfluence": 0.25
        },
        {
            "trackTitle": "Sample Track 2", 
            "artist": "Another Artist",
            "similarity": 0.72,
            "percentInfluence": 0.15
        }
    ]
    
    return {"matches": mock_matches, "status": "success"}

# router mount for royalties
try:
    from routes.royalties import router as royalties_router
    app.include_router(royalties_router)
except Exception as _e:
    print("royalties router not mounted:", _e)

# router mount for ingest
try:
    from routes.ingest import router as ingest_router
    app.include_router(ingest_router)
except Exception as _e:
    print("ingest router not mounted:", _e)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
