import sys
import os
import json
import whisper

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No audio file provided"}))
        sys.exit(1)

    audio_path = sys.argv[1]
    if not os.path.exists(audio_path):
        print(json.dumps({"error": f"File not found: {audio_path}"}))
        sys.exit(1)

    try:
        model = whisper.load_model("base")
        result = model.transcribe(audio_path, fp16=False)
        text = result.get("text", "").strip()
        print(json.dumps({"text": text, "language": result.get("language", "en")}))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
