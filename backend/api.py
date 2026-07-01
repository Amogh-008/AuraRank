from fastapi import FastAPI, UploadFile, File, Form, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
import json
import os

from src.features import score_candidate

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Path to the full dataset on disk ─────────────────────────────────────────
CANDIDATES_JSONL = os.path.join(
    os.path.dirname(__file__), "data", "candidates.jsonl"
)

@app.get("/")
def home():
    return {"message": "AuraRank API Running", "docs": "/docs"}


@app.post("/rank")
async def rank_candidates(
    file: UploadFile = File(...),
    job_description: str = Form("")
):
    """Rank uploaded candidates (use for small files / demo)."""
    content = await file.read()
    if file.filename.endswith(".jsonl"):
        candidates = [
            json.loads(line)
            for line in content.decode().splitlines()
            if line.strip()
        ]
    else:
        candidates = json.loads(content)

    return _run_ranking(candidates, job_description, top_n=100000)


@app.post("/rank-full")
async def rank_full_dataset(
    job_description: str = Form("")
):
    """
    Rank the full 100K dataset directly from disk.
    Step 1: Rule-based scoring on ALL candidates (~30 sec)
    Step 2: Semantic scoring only on top 500 candidates (~10 sec)
    Total: ~1 minute
    """
    if not os.path.exists(CANDIDATES_JSONL):
        return {"error": f"File not found: {CANDIDATES_JSONL}"}

    print("Loading candidates from disk...")
    candidates = []
    with open(CANDIDATES_JSONL, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                candidates.append(json.loads(line))

    print(f"Loaded {len(candidates)} candidates. Running rule-based scoring...")
    return _run_ranking(candidates, job_description, top_n=100000)

CANDIDATES_10K = os.path.join(os.path.dirname(__file__), "data", "candidates_10k.jsonl")

@app.post("/rank-10k")
async def rank_10k_dataset(job_description: str = Form("")):
    if not os.path.exists(CANDIDATES_10K):
        return {"error": f"File not found: {CANDIDATES_10K}"}
    candidates = []
    with open(CANDIDATES_10K, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                candidates.append(json.loads(line))
    print(f"Loaded {len(candidates)} candidates.")
    return _run_ranking(candidates, job_description, top_n=100000)


def _run_ranking(candidates, job_description, top_n=100000):
    """
    Two-phase ranking:
    Phase 1 — Rule-based scoring on ALL candidates (fast, no ML)
    Phase 2 — Semantic scoring on top 500 only (fast, small batch)
    """
    from src.features import score_candidate

    # ── PHASE 1: Rule-based scoring on everyone ───────────────────────────
    print(f"Phase 1: Rule scoring {len(candidates)} candidates...")
    rule_results = []
    honeypot_count = 0

    for candidate in candidates:
        try:
            score = score_candidate(candidate, "")
            score["candidate_data"] = {
             "profile": {
                "anonymized_name": candidate.get("profile", {}).get("anonymized_name", ""),
                "current_title": candidate.get("profile", {}).get("current_title", ""),
                "years_of_experience": candidate.get("profile", {}).get("years_of_experience", 0),
                "location": candidate.get("profile", {}).get("location", ""),
                "skills": candidate.get("profile", {}).get("skills", []),
                "summary": candidate.get("profile", {}).get("summary", "")
                }
            }
            if score.get("is_honeypot", False):
                honeypot_count += 1
                continue
            rule_results.append(score)
        except Exception as e:
            print(f"Skipping {candidate.get('candidate_id', '?')}: {e}")

    # Sort by rule score, keep top 500 for semantic re-ranking
    rule_results.sort(key=lambda x: x["rule_score"], reverse=True)
    top_500 = rule_results[:500]
    rest = rule_results[500:]

    print(f"Phase 1 done. {len(rule_results)} clean candidates. Top 500 going to semantic.")

    # ── PHASE 2: Semantic scoring on top 500 only ─────────────────────────
    if job_description.strip() and top_500:
        print("Phase 2: Semantic scoring top 500...")
        from src.semantic import semantic_similarity_batch

        top_candidates = [r["candidate_data"] for r in top_500]
        sem_scores = semantic_similarity_batch(top_candidates, job_description)

        for i, result in enumerate(top_500):
            result["semantic_score"] = round(sem_scores[i], 4)
            result["final_score"] = round(
                result["rule_score"] * 0.75 + sem_scores[i] * 0.25, 4
            )
    else:
        # No JD provided — use rule score directly
        for result in top_500:
            result["semantic_score"] = 0.0
            result["final_score"] = result["rule_score"]

    # Rest of candidates get rule score as final score
    for result in rest:
        result["semantic_score"] = 0.0
        result["final_score"] = result["rule_score"]

    # ── Merge, sort, assign ranks ─────────────────────────────────────────
    all_results = top_500 + rest
    all_results.sort(key=lambda x: x["final_score"], reverse=True)

    for rank, result in enumerate(all_results[:top_n], start=1):
        result["rank"] = rank
        result["id"] = str(result.get("candidate_id", f"candidate_{rank}"))

        # Frontend-friendly score breakdowns
        result["skills_score"]   = round(result.get("skills", 0) * 100, 1)
        result["career_score"]   = round(result.get("career", 0) * 100, 1)
        result["role_fit_score"] = round(result.get("role_fit", 0) * 100, 1)
        result["behavioral_score"] = round(result.get("behavioral", 0) * 100, 1)
        result["location_score"] = round(result.get("location", 0) * 100, 1)

    final = all_results[:top_n]
    print(f"Done. Returning top {len(final)} candidates.")

    return {
        "count": len(final),
        "honeypots": honeypot_count,
        "job_description": job_description,
        "results": final
    }