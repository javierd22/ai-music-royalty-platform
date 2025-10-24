"""
Attribution Service Main Application

Per PRD Section 5.3: Attribution Auditor
FastAPI service for audio similarity detection and attribution
"""

import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from compare import router as compare_router

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="AI Music Attribution Service",
    description="Audio similarity detection and attribution for AI music generation",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(compare_router)

@app.get("/")
async def root():
    """Root endpoint with service information"""
    return {
        "service": "AI Music Attribution Service",
        "version": "1.0.0",
        "description": "Audio similarity detection and attribution for AI music generation",
        "endpoints": {
            "compare": "/attribution/compare (POST)",
            "health": "/attribution/health (GET)",
            "add_reference": "/attribution/reference/add (POST)",
            "list_references": "/attribution/reference/list (GET)"
        },
        "prd_compliance": {
            "section_5.3": "Attribution Auditor - Vector similarity search",
            "section_5.4": "Royalty Event Engine - Dual proof verification"
        }
    }

@app.get("/health")
async def health():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "attribution",
        "timestamp": "2025-10-24T00:00:00Z"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
