# Utils package for attribution service

def to_uuid(value):
    """Convert string to UUID, return as string."""
    import uuid
    if isinstance(value, str):
        try:
            return str(uuid.UUID(value))
        except ValueError:
            return str(uuid.uuid4())
    return str(uuid.uuid4())
