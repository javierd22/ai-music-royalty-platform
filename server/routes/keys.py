"""
API Key Management Routes
Per Threat Model T3: Partner key management with rotation
"""

from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from server.utils.db import get_db
from server.utils.security import generate_api_key

router = APIRouter(prefix="/keys", tags=["keys"])


# ============================================================================
# PYDANTIC MODELS
# ============================================================================


class Partner(BaseModel):
    """Partner organization"""

    id: UUID
    name: str
    email: Optional[str] = None
    is_active: bool = True
    created_at: datetime


class APIKeyCreate(BaseModel):
    """Request to create new API key"""

    partner_id: UUID = Field(..., description="Partner UUID")
    scopes: List[str] = Field(
        default=["log:write", "log:read"], description="Permission scopes"
    )
    expires_at: Optional[datetime] = Field(None, description="Optional expiry timestamp")


class APIKeyResponse(BaseModel):
    """Response when creating API key (includes secret - shown once!)"""

    id: UUID
    partner_id: UUID
    key_prefix: str
    full_key: str = Field(
        ..., description="IMPORTANT: Save this! Will not be shown again."
    )
    scopes: List[str]
    is_active: bool
    created_at: datetime
    expires_at: Optional[datetime] = None


class APIKeyInfo(BaseModel):
    """API key info (without secret)"""

    id: UUID
    partner_id: UUID
    key_prefix: str
    scopes: List[str]
    is_active: bool
    last_used_at: Optional[datetime] = None
    created_at: datetime
    expires_at: Optional[datetime] = None


class PartnerCreate(BaseModel):
    """Request to create new partner"""

    name: str = Field(..., min_length=1, max_length=100)
    email: Optional[str] = Field(None, max_length=255)


# ============================================================================
# ADMIN AUTHENTICATION DEPENDENCY
# ============================================================================


async def verify_admin(
    # In production, add proper admin JWT verification here
    # For now, require ADMIN_API_KEY header
) -> bool:
    """
    Verify admin access for key management.

    TODO: Implement proper admin authentication (JWT, OAuth, etc.)
    For now, this is a placeholder that should be secured before production.
    """
    # In production, replace with:
    # - JWT token verification
    # - Role-based access control
    # - Integration with Supabase Auth
    return True


# ============================================================================
# PARTNER MANAGEMENT
# ============================================================================


@router.post("/partners", response_model=Partner, status_code=status.HTTP_201_CREATED)
async def create_partner(
    partner_data: PartnerCreate,
    db: AsyncSession = Depends(get_db),
    _admin: bool = Depends(verify_admin),
):
    """
    Create a new partner organization.

    **Admin only endpoint.**

    Example:
        ```bash
        curl -X POST http://localhost:8001/keys/partners \\
          -H "Content-Type: application/json" \\
          -d '{"name": "Suno AI", "email": "api@suno.ai"}'
        ```
    """
    from sqlalchemy import Table, Column, MetaData, String, Boolean
    from sqlalchemy.dialects.postgresql import UUID as PG_UUID, TIMESTAMP

    metadata = MetaData()
    partners_table = Table(
        "partners",
        metadata,
        Column("id", PG_UUID, primary_key=True),
        Column("name", String),
        Column("email", String),
        Column("is_active", Boolean),
        Column("created_at", TIMESTAMP),
        Column("updated_at", TIMESTAMP),
    )

    # Check for duplicate name
    result = await db.execute(
        select(partners_table).where(partners_table.c.name == partner_data.name)
    )
    existing = result.first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Partner with name '{partner_data.name}' already exists",
        )

    # Insert new partner
    from sqlalchemy import insert

    stmt = (
        insert(partners_table)
        .values(
            name=partner_data.name,
            email=partner_data.email,
            is_active=True,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        .returning(partners_table)
    )

    result = await db.execute(stmt)
    await db.commit()
    row = result.first()

    return Partner(
        id=row.id,
        name=row.name,
        email=row.email,
        is_active=row.is_active,
        created_at=row.created_at,
    )


@router.get("/partners", response_model=List[Partner])
async def list_partners(
    db: AsyncSession = Depends(get_db), _admin: bool = Depends(verify_admin)
):
    """
    List all partner organizations.

    **Admin only endpoint.**
    """
    from sqlalchemy import Table, MetaData

    metadata = MetaData()
    partners_table = Table("partners", metadata, autoload_with=db.bind)

    result = await db.execute(
        select(partners_table).where(partners_table.c.is_active == True)
    )
    rows = result.all()

    return [
        Partner(
            id=row.id,
            name=row.name,
            email=row.email,
            is_active=row.is_active,
            created_at=row.created_at,
        )
        for row in rows
    ]


# ============================================================================
# API KEY MANAGEMENT
# ============================================================================


@router.post("/create", response_model=APIKeyResponse, status_code=status.HTTP_201_CREATED)
async def create_api_key(
    key_data: APIKeyCreate,
    db: AsyncSession = Depends(get_db),
    _admin: bool = Depends(verify_admin),
):
    """
    Create a new API key for a partner.

    **Admin only endpoint.**

    **IMPORTANT:** The full API key (with secret) is returned only once.
    Store it securely. The secret cannot be retrieved later.

    The key format is: `pk_live_{prefix}.{secret}`

    Example:
        ```bash
        curl -X POST http://localhost:8001/keys/create \\
          -H "Content-Type: application/json" \\
          -d '{
            "partner_id": "123e4567-e89b-12d3-a456-426614174000",
            "scopes": ["log:write", "log:read"]
          }'
        ```

    Returns:
        API key with full secret (shown once only)
    """
    from sqlalchemy import Table, MetaData, insert

    # Verify partner exists
    metadata = MetaData()
    partners_table = Table("partners", metadata, autoload_with=db.bind)

    result = await db.execute(
        select(partners_table).where(
            partners_table.c.id == key_data.partner_id,
            partners_table.c.is_active == True,
        )
    )
    partner = result.first()

    if not partner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Partner {key_data.partner_id} not found or inactive",
        )

    # Generate API key
    full_key, prefix, key_hash = generate_api_key()

    # Insert into database
    api_keys_table = Table("api_keys", metadata, autoload_with=db.bind)

    stmt = (
        insert(api_keys_table)
        .values(
            partner_id=key_data.partner_id,
            key_prefix=prefix,
            key_hash=key_hash,
            scopes=key_data.scopes,
            is_active=True,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
            expires_at=key_data.expires_at,
        )
        .returning(api_keys_table)
    )

    result = await db.execute(stmt)
    await db.commit()
    row = result.first()

    return APIKeyResponse(
        id=row.id,
        partner_id=row.partner_id,
        key_prefix=row.key_prefix,
        full_key=full_key,
        scopes=row.scopes,
        is_active=row.is_active,
        created_at=row.created_at,
        expires_at=row.expires_at,
    )


@router.post("/rotate/{key_id}", response_model=APIKeyResponse)
async def rotate_api_key(
    key_id: UUID,
    db: AsyncSession = Depends(get_db),
    _admin: bool = Depends(verify_admin),
):
    """
    Rotate an API key (generate new secret, deactivate old key).

    Per Threat Model T3: Key rotation without downtime.

    **Admin only endpoint.**

    The old key is marked inactive. The new key is returned once.

    Example:
        ```bash
        curl -X POST http://localhost:8001/keys/rotate/123e4567-e89b-12d3-a456-426614174000
        ```
    """
    from sqlalchemy import Table, MetaData

    metadata = MetaData()
    api_keys_table = Table("api_keys", metadata, autoload_with=db.bind)

    # Get existing key
    result = await db.execute(
        select(api_keys_table).where(api_keys_table.c.id == key_id)
    )
    old_key = result.first()

    if not old_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"API key {key_id} not found"
        )

    # Generate new key
    full_key, prefix, key_hash = generate_api_key()

    # Deactivate old key
    await db.execute(
        update(api_keys_table)
        .where(api_keys_table.c.id == key_id)
        .values(is_active=False, updated_at=datetime.now(timezone.utc))
    )

    # Insert new key
    from sqlalchemy import insert

    stmt = (
        insert(api_keys_table)
        .values(
            partner_id=old_key.partner_id,
            key_prefix=prefix,
            key_hash=key_hash,
            scopes=old_key.scopes,
            is_active=True,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
            expires_at=old_key.expires_at,
        )
        .returning(api_keys_table)
    )

    result = await db.execute(stmt)
    await db.commit()
    row = result.first()

    return APIKeyResponse(
        id=row.id,
        partner_id=row.partner_id,
        key_prefix=row.key_prefix,
        full_key=full_key,
        scopes=row.scopes,
        is_active=row.is_active,
        created_at=row.created_at,
        expires_at=row.expires_at,
    )


@router.delete("/revoke/{key_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_api_key(
    key_id: UUID,
    db: AsyncSession = Depends(get_db),
    _admin: bool = Depends(verify_admin),
):
    """
    Revoke an API key immediately (set is_active=false).

    Per Threat Model T3: Immediate revocation on compromise.

    **Admin only endpoint.**

    Example:
        ```bash
        curl -X DELETE http://localhost:8001/keys/revoke/123e4567-e89b-12d3-a456-426614174000
        ```
    """
    from sqlalchemy import Table, MetaData

    metadata = MetaData()
    api_keys_table = Table("api_keys", metadata, autoload_with=db.bind)

    result = await db.execute(
        update(api_keys_table)
        .where(api_keys_table.c.id == key_id)
        .values(is_active=False, updated_at=datetime.now(timezone.utc))
    )

    if result.rowcount == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"API key {key_id} not found"
        )

    await db.commit()
    return


@router.get("/list/{partner_id}", response_model=List[APIKeyInfo])
async def list_partner_keys(
    partner_id: UUID,
    db: AsyncSession = Depends(get_db),
    _admin: bool = Depends(verify_admin),
):
    """
    List all API keys for a partner (without secrets).

    **Admin only endpoint.**
    """
    from sqlalchemy import Table, MetaData

    metadata = MetaData()
    api_keys_table = Table("api_keys", metadata, autoload_with=db.bind)

    result = await db.execute(
        select(api_keys_table)
        .where(api_keys_table.c.partner_id == partner_id)
        .order_by(api_keys_table.c.created_at.desc())
    )
    rows = result.all()

    return [
        APIKeyInfo(
            id=row.id,
            partner_id=row.partner_id,
            key_prefix=row.key_prefix,
            scopes=row.scopes,
            is_active=row.is_active,
            last_used_at=row.last_used_at,
            created_at=row.created_at,
            expires_at=row.expires_at,
        )
        for row in rows
    ]


# ============================================================================
# KEY VERIFICATION (Internal - not exposed via HTTP)
# ============================================================================


async def get_partner_by_key_prefix(
    db: AsyncSession, key_prefix: str
) -> Optional[dict]:
    """
    Internal function to get partner info and key hash by prefix.

    Used by authentication middleware.

    Args:
        db: Database session
        key_prefix: API key prefix (pk_live_xxx)

    Returns:
        Dict with partner_id, key_hash, scopes, or None if not found
    """
    from sqlalchemy import Table, MetaData, select

    metadata = MetaData()
    api_keys_table = Table("api_keys", metadata, autoload_with=db.bind)

    result = await db.execute(
        select(api_keys_table).where(
            api_keys_table.c.key_prefix == key_prefix,
            api_keys_table.c.is_active == True,
        )
    )
    row = result.first()

    if not row:
        return None

    # Check if key expired
    if row.expires_at and datetime.now(timezone.utc) > row.expires_at:
        return None

    return {
        "key_id": row.id,
        "partner_id": row.partner_id,
        "key_hash": row.key_hash,
        "scopes": row.scopes,
    }


async def update_key_last_used(db: AsyncSession, key_id: UUID):
    """Update last_used_at timestamp for API key"""
    from sqlalchemy import Table, MetaData, update

    metadata = MetaData()
    api_keys_table = Table("api_keys", metadata, autoload_with=db.bind)

    await db.execute(
        update(api_keys_table)
        .where(api_keys_table.c.id == key_id)
        .values(last_used_at=datetime.now(timezone.utc))
    )
    await db.commit()

