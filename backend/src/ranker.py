# ranker.py
# Loads all 100K candidates, scores them, returns top N

import json
import time
from tqdm import tqdm
from src.config import CANDIDATES_FILE, SAMPLE_FILE, TOP_N
from src.features import score_candidate


def load_candidates(use_sample=False):
    """Load candidates from JSONL or sample JSON file."""
    if use_sample:
        print("Loading sample candidates (50)...")
        with open(SAMPLE_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    else:
        print("Loading full candidate pool (100,000)...")
        candidates = []
        with open(CANDIDATES_FILE, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    candidates.append(json.loads(line))
        return candidates


def run_ranking(use_sample=False):
    """
    Main ranking pipeline.
    1. Load candidates
    2. Score each one
    3. Sort by final_score
    4. Return top N
    """
    candidates = load_candidates(use_sample)
    total = len(candidates)
    print(f"Scoring {total} candidates...\n")

    results = []
    start = time.time()

    for candidate in tqdm(candidates, desc="Scoring", unit="candidate"):
        score = score_candidate(candidate)

        # Store original candidate data alongside scores
        score["profile"]         = candidate.get("profile", {})
        score["skills"]          = score.get("skills", 0)
        score["career_history"]  = candidate.get("career_history", [])
        score["redrob_signals"]  = candidate.get("redrob_signals", {})
        score["candidate_data"]  = candidate

        results.append(score)

    elapsed = time.time() - start
    print(f"\nScoring complete in {elapsed:.1f}s")

    # Sort by final score descending
    results.sort(key=lambda x: x["final_score"], reverse=True)

    # Filter out honeypots from top results
    clean_results = [r for r in results if not r["is_honeypot"]]
    honeypot_count = len(results) - len(clean_results)
    print(f"Honeypots detected and removed: {honeypot_count}")

    top = clean_results[:TOP_N]
    print(f"Top {TOP_N} candidates selected.")
    print(f"Score range: {top[-1]['final_score']:.4f} – {top[0]['final_score']:.4f}")

    return top