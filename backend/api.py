from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import json

from src.features import score_candidate

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/rank")
async def rank_candidates(file: UploadFile = File(...)):

    content = await file.read()

    if file.filename.endswith(".jsonl"):
        candidates = [
            json.loads(line)
            for line in content.decode().splitlines()
            if line.strip()
        ]
    else:
        candidates = json.loads(content)

    results = []

    for candidate in candidates:
        try:
            score = score_candidate(candidate)

            score["candidate_data"] = candidate

            results.append(score)

        except Exception as e:
            print(
                f"Skipping candidate "
                f"{candidate.get('candidate_id', 'UNKNOWN')} "
                f"because of error: {e}"
            )
            continue

    results.sort(
        key=lambda x: x["final_score"],
        reverse=True
    )

    for rank, result in enumerate(results, start=1):
        result["rank"] = rank
        result["id"] = result["candidate_id"]

    honeypot_count = sum(
        1 for r in results
        if r.get("is_honeypot", False)
    )

    clean = [
        r for r in results
        if not r.get("is_honeypot", False)
    ]

    return {
        "count": len(clean),
        "honeypots": honeypot_count,
        "results": clean
    }