from __future__ import annotations

import re
import unicodedata
from typing import Dict


def normalize_text(text: str | None) -> str:
    if text is None:
        return ""
    value = unicodedata.normalize("NFKC", str(text))
    value = value.replace("\u200c", "").replace("\u200d", "")
    value = re.sub(r"\s+", " ", value).strip()
    value = re.sub(r"([a-zA-Z])\1{2,}", r"\1\1", value)
    value = re.sub(r"([\w])\1{3,}", r"\1\1\1", value)
    return value


def preprocess_text(text: str | None) -> Dict[str, str | None]:
    original = (text or "").strip()
    normalized = normalize_text(original)
    return {
        "original_text": original,
        "normalized_text": normalized,
    }
