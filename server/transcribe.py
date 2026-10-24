import sys
import os
import json
import traceback
import whisper

def main():
    if len(sys.argv) < 2:
        msg = "No audio file path provided"
        sys.stderr.write(msg + "\n")
        print(json.dumps({"error": msg}))
        sys.exit(1)

    audio_path = sys.argv[1]
    if not os.path.exists(audio_path):
        msg = f"Audio file not found: {audio_path}"
        sys.stderr.write(msg + "\n")
        print(json.dumps({"error": msg}))
        sys.exit(1)

    file_size = os.path.getsize(audio_path)
    if file_size < 64:
        # File is empty
        print(json.dumps({"text": "", "language": "en"}))
        sys.exit(0)

    try:
        model = whisper.load_model("base")
        result = model.transcribe(audio_path, fp16=False)
        text = result.get("text", "").strip()
        lang = result.get("language", "en")
        print(json.dumps({"text": text, "language": lang}))
        sys.exit(0)
    except Exception as e:
        err_str = str(e)
        sys.stderr.write(f"Whisper exception: {err_str}\n")
        traceback.print_exc(file=sys.stderr)
        print(json.dumps({"error": err_str}))
        sys.exit(1)

if __name__ == "__main__":
    main()
