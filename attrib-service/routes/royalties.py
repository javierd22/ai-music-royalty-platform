from fastapi import APIRouter, HTTPException
from supabase import create_client
import os, time, json

from attrib_service_utils import supabase_client
from attrib_service_utils import get_table

from attrib-service.services.fusion import decide_event  # will fix import path below