"""Transcribe an audio file with OpenAI Whisper (local). Prints JSON to stdout."""
import json
import os
import sys
import warnings
from pathlib import Path

os.environ.setdefault("PYTHONWARNINGS", "ignore")

from medical_corrections import apply_medical_corrections


def _load_context() -> dict:
    context_file = os.environ.get("WHISPER_CONTEXT_FILE", "").strip()
    if not context_file:
        return {}

    path = Path(context_file)
    if not path.exists():
        return {}

    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def main() -> None:
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Missing audio file path"}), flush=True)
        sys.exit(1)

    audio_path = sys.argv[1]
    model_name = sys.argv[2] if len(sys.argv) > 2 else "base"
    context = _load_context()
    initial_prompt = context.get("initial_prompt", "")
    extra_terms = context.get("terms", [])

    try:
        import whisper

        warnings.filterwarnings("ignore", category=UserWarning)

        model = whisper.load_model(model_name)
        transcribe_kwargs: dict = {
            "verbose": False,
            "fp16": False,
            "language": "en",
        }
        if initial_prompt:
            transcribe_kwargs["initial_prompt"] = initial_prompt

        result = model.transcribe(audio_path, **transcribe_kwargs)
        text = (result.get("text") or "").strip()
        text = apply_medical_corrections(text, extra_terms)
        print(json.dumps({"text": text}), flush=True)
    except Exception as exc:
        message = str(exc)
        if "ffmpeg" in message.lower() and "not found" in message.lower():
            message = (
                "ffmpeg not found. Add ffmpeg to PATH or set FFMPEG_PATH in .env "
                "(folder containing ffmpeg.exe)."
            )
        print(json.dumps({"error": message}), flush=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
