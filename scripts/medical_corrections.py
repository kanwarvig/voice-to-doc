"""Correct common Whisper mishearings for medical terminology."""
from __future__ import annotations

import difflib
import json
import re
from pathlib import Path

_DICTIONARY_PATH = Path(__file__).resolve().parent.parent / "data" / "medical-dictionary.json"

_DRUG_SUFFIXES = (
    "statin",
    "pril",
    "olol",
    "sartan",
    "pine",
    "mycin",
    "cillin",
    "azole",
    "formin",
    "ide",
    "tan",
    "afil",
    "prazole",
)

# Generated mishearings: prefix + "statin" / "statin" compounds
_STATIN_DRUGS: dict[str, list[str]] = {
    "atorvastatin": [
        "tourbus",
        "torbus",
        "turbus",
        "tour bus",
        "tor bus",
        "tour va",
        "tourvah",
        "ator bus",
        "atorbus",
        "a torbus",
        "a torva",
        "ator va",
        "atorvas",
        "torva",
        "torvah",
        "a tourva",
        "a tour va",
        "the tourbus",
        "the torbus",
        "tour buzz",
        "tourbus's",
        "atorva",
        "eight orva",
        "a tourbus",
        "tourbus staten",
        "tour bus staten",
        "ator vastatin",
        "atorva statin",
        "lipitor",  # brand sometimes spoken
    ],
    "simvastatin": [
        "simba",
        "simva",
        "sim bus",
        "simv",
        "zocor",
    ],
    "rosuvastatin": [
        "rosova",
        "rosuva",
        "rosuva",
        "crestor",
    ],
    "pravastatin": [
        "prava",
        "pravva",
        "prav a",
    ],
    "lovastatin": [
        "lova",
        "love a",
    ],
}

_FORMIN_DRUGS: dict[str, list[str]] = {
    "metformin": [
        "meta formin",
        "met for min",
        "metta formin",
        "met formin",
        "med formin",
        "metformen",
        "met forming",
    ],
}

_PRIL_DRUGS: dict[str, list[str]] = {
    "lisinopril": [
        "lie sinopril",
        "lisi nopril",
        "lysinopril",
        "listen april",
        "listen o pril",
        "lysin o pril",
        "lie sin o pril",
        "lisino pril",
    ],
    "enalapril": ["enala pril", "ee nala pril"],
    "ramipril": ["rami pril", "rammy pril"],
}


def _build_generated_mishearings() -> dict[str, str]:
    generated: dict[str, str] = {}

    for drug, prefixes in _STATIN_DRUGS.items():
        for prefix in prefixes:
            generated[f"{prefix} statin"] = drug
            generated[f"{prefix}statin"] = drug
            generated[f"{prefix} staten"] = drug
            generated[f"{prefix} stating"] = drug
            if " " in prefix:
                generated[prefix] = drug
                generated[f"{prefix} statin"] = drug

    for drug, variants in _FORMIN_DRUGS.items():
        for variant in variants:
            generated[variant] = drug

    for drug, variants in _PRIL_DRUGS.items():
        for variant in variants:
            generated[variant] = drug

    return generated


def _load_dictionary() -> tuple[list[str], dict[str, str]]:
    with _DICTIONARY_PATH.open(encoding="utf-8") as handle:
        data = json.load(handle)

    terms = [str(term).lower() for term in data.get("terms", [])]
    mishearings = {
        str(key).lower(): str(value)
        for key, value in data.get("mishearings", {}).items()
    }
    mishearings.update(_build_generated_mishearings())
    return terms, mishearings


def _normalize_patient_terms(extra_terms: list[str] | None) -> list[str]:
    if not extra_terms:
        return []
    return list({str(term).lower().strip() for term in extra_terms if str(term).strip()})


def _apply_phrase_replacements(text: str, mishearings: dict[str, str]) -> str:
    corrected = text
    for wrong in sorted(mishearings, key=len, reverse=True):
        corrected = re.sub(
            re.escape(wrong),
            mishearings[wrong],
            corrected,
            flags=re.IGNORECASE,
        )
    return corrected


def _fix_compound_drugs(
    text: str,
    vocabulary: list[str],
    patient_terms: list[str],
    mishearings: dict[str, str],
) -> str:
    """Fix 'tourbus statin' style compounds using patient meds first."""
    statins = set(t for t in vocabulary if t.endswith("statin"))
    patient_statins = [t for t in patient_terms if t.endswith("statin")] or list(statins)

    def replace_statin_phrase(match: re.Match[str]) -> str:
        prefix = match.group(1).lower().strip()
        if prefix in statins:
            return match.group(0)

        phrase = f"{prefix} statin"
        if phrase in mishearings:
            return mishearings[phrase]

        for drug in patient_statins:
            stem = drug.replace("statin", "")
            if difflib.SequenceMatcher(None, prefix, stem).ratio() >= 0.62:
                return drug

        for drug in statins:
            stem = drug.replace("statin", "")
            if difflib.SequenceMatcher(None, prefix, stem).ratio() >= 0.72:
                return drug

        return match.group(0)

    text = re.sub(
        r"\b([\w]+)\s+statin\b",
        replace_statin_phrase,
        text,
        flags=re.IGNORECASE,
    )

    def replace_merged_statin_word(match: re.Match[str]) -> str:
        word = match.group(0).lower()
        if word in statins:
            return match.group(0)

        close = difflib.get_close_matches(
            word,
            list(patient_statins),
            n=1,
            cutoff=0.76,
        )
        if close:
            return _preserve_token_style(match.group(0), close[0])

        return match.group(0)

    # One-word garbles like "tourbusstatin" (not valid *statin drug names)
    return re.sub(
        r"\b[A-Za-z]{5,}statin\b",
        replace_merged_statin_word,
        text,
        flags=re.IGNORECASE,
    )


def _looks_like_drug_token(token: str) -> bool:
    lowered = token.lower()
    return len(lowered) >= 5 and (
        any(lowered.endswith(suffix) for suffix in _DRUG_SUFFIXES)
        or lowered in {"insulin", "aspirin", "heparin", "warfarin", "metformin"}
    )


def _best_fuzzy_match(
    token: str,
    vocabulary: list[str],
    patient_terms: list[str],
) -> str | None:
    if len(token) < 5:
        return None

    lowered = token.lower()

    if patient_terms:
        patient_match = difflib.get_close_matches(lowered, patient_terms, n=1, cutoff=0.78)
        if patient_match:
            return patient_match[0]

    candidates = vocabulary
    if _looks_like_drug_token(lowered):
        candidates = [v for v in vocabulary if _looks_like_drug_token(v)] or vocabulary

    matches = difflib.get_close_matches(lowered, candidates, n=1, cutoff=0.82)
    return matches[0] if matches else None


def apply_medical_corrections(text: str, extra_terms: list[str] | None = None) -> str:
    if not text.strip():
        return text

    vocabulary, mishearings = _load_dictionary()
    patient_terms = _normalize_patient_terms(extra_terms)

    if patient_terms:
        vocabulary = list({*vocabulary, *patient_terms})
        for term in patient_terms:
            mishearings[term] = term

    corrected = _apply_phrase_replacements(text, mishearings)
    corrected = _fix_compound_drugs(corrected, vocabulary, patient_terms, mishearings)

    tokens = corrected.split()
    output: list[str] = []
    i = 0

    while i < len(tokens):
        matched = False
        for size in (4, 3, 2):
            if i + size > len(tokens):
                continue
            phrase = " ".join(tokens[i : i + size]).lower()
            if phrase in mishearings:
                output.append(mishearings[phrase])
                i += size
                matched = True
                break

            if re.search(r"\d", phrase):
                break

            search_pool = patient_terms if patient_terms else vocabulary
            close = difflib.get_close_matches(phrase, search_pool, n=1, cutoff=0.88)
            if close and size >= 2:
                output.append(close[0])
                i += size
                matched = True
                break

        if matched:
            continue

        token = tokens[i]
        bare = re.sub(r"[^\w]", "", token)
        if bare.lower() in {"statin", "staten", "stating", "pril", "formin"}:
            output.append(token)
            i += 1
            continue

        replacement = _best_fuzzy_match(bare, vocabulary, patient_terms) if bare else None

        if replacement and bare.lower() != replacement:
            output.append(_preserve_token_style(token, replacement))
        else:
            output.append(token)

        i += 1

    return " ".join(output)


def _preserve_token_style(original: str, replacement: str) -> str:
    if original[:1].isupper():
        return replacement[:1].upper() + replacement[1:]
    return replacement
