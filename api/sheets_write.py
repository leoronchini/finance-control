import os
import importlib.util
from dotenv import load_dotenv

_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(_ROOT, ".env"))

_spec = importlib.util.spec_from_file_location("bot_sheets", os.path.join(_ROOT, "bot", "sheets.py"))
_mod = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_mod)

append_transaction = _mod.append_transaction
