from fastapi import APIRouter, HTTPException
from supabase import create_client
import os, time, json

from .utils import to_uuid  # we will create this small util inline below