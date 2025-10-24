#!/usr/bin/env python3
"""
Seed Test Data for AI Music Royalty Attribution Platform

Per PRD Section 11: Next 7-Day Execution
Creates one test artist with one licensed track and consent true
"""

import asyncio
import uuid
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

# Database connection
DATABASE_URL = "postgresql+asyncpg://postgres:password@localhost:5432/ai_music_royalty"

async def seed_test_data():
    """Seed test artist and track with consent"""
    
    engine = create_async_engine(DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        try:
            # Create test artist
            artist_id = str(uuid.uuid4())
            artist_query = """
            INSERT INTO artists (id, name, email, created_at)
            VALUES (:id, :name, :email, :created_at)
            ON CONFLICT (email) DO NOTHING
            """
            
            await session.execute(artist_query, {
                "id": artist_id,
                "name": "Test Artist",
                "email": "test@example.com",
                "created_at": datetime.now(timezone.utc)
            })
            
            # Create test track with consent
            track_id = str(uuid.uuid4())
            track_query = """
            INSERT INTO tracks (id, title, artist_id, storage_url, consent, created_at)
            VALUES (:id, :title, :artist_id, :storage_url, :consent, :created_at)
            """
            
            await session.execute(track_query, {
                "id": track_id,
                "title": "Test Song - Licensed for AI Training",
                "artist_id": artist_id,
                "storage_url": "https://storage.example.com/tracks/test-song.mp3",
                "consent": True,
                "created_at": datetime.now(timezone.utc)
            })
            
            # Create sample generation log
            generation_id = str(uuid.uuid4())
            generation_query = """
            INSERT INTO generation_logs (id, generator_id, track_id, start_time, end_time, manifest_url, created_at)
            VALUES (:id, :generator_id, :track_id, :start_time, :end_time, :manifest_url, :created_at)
            """
            
            start_time = datetime.now(timezone.utc)
            end_time = datetime.now(timezone.utc)
            
            await session.execute(generation_query, {
                "id": generation_id,
                "generator_id": "test-generator-v1",
                "track_id": track_id,
                "start_time": start_time,
                "end_time": end_time,
                "manifest_url": f"https://api.example.com/manifests/{generation_id}.json",
                "created_at": start_time
            })
            
            # Create sample attribution result
            attribution_id = str(uuid.uuid4())
            attribution_query = """
            INSERT INTO attribution_results (id, generation_id, matched_track_id, confidence, verified, created_at)
            VALUES (:id, :generation_id, :matched_track_id, :confidence, :verified, :created_at)
            """
            
            await session.execute(attribution_query, {
                "id": attribution_id,
                "generation_id": generation_id,
                "matched_track_id": track_id,
                "confidence": 0.87,
                "verified": True,
                "created_at": datetime.now(timezone.utc)
            })
            
            await session.commit()
            
            print("✅ Test data seeded successfully!")
            print(f"   Artist ID: {artist_id}")
            print(f"   Track ID: {track_id}")
            print(f"   Generation ID: {generation_id}")
            print(f"   Attribution ID: {attribution_id}")
            
        except Exception as e:
            await session.rollback()
            print(f"❌ Failed to seed test data: {e}")
            raise
        finally:
            await engine.dispose()

if __name__ == "__main__":
    asyncio.run(seed_test_data())
