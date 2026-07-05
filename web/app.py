from flask import Blueprint, jsonify
import json
import os

from services.history import save_daily_snapshot

personnel_bp = Blueprint("personnel", __name__)