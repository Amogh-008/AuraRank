# generate_output.py
# Builds the reasoning string for each candidate and writes the CSV

import csv
import os
from datetime import date
from src.config import OUTPUT_FILE, TOP_N
from src.ranker import run_ranking


def build_reasoning(result):
    """
    Generate a specific, honest 1-2 sentence reasoning for each candidate.
    References real facts from their profile — no hallucination.
    """
    profile  = result["candidate_data"].get("profile", {})
    signals  = result["candidate_data"].get("redrob_signals", {})
    history  = result["candidate_data"].get("career_history", [])
    skills   = result["candidate_data"].get("skills", [])

    title    = profile.get("current_title", "Unknown")
    yoe      = profile.get("years_of_experience", 0)
    location = profile.get("location", "Unknown")

    # Top skills (advanced/expert only)
    top_skills = [
        s["name"] for s in skills
        if s.get("proficiency") in ("advanced", "expert")
    ][:4]
    skills_str = ", ".join(top_skills) if top_skills else "general engineering skills"

    # Notice period
    notice = signals.get("notice_period_days", "unknown")
    notice_str = f"{notice}-day notice period"

    # Response rate
    rr = signals.get("recruiter_response_rate", 0)
    rr_str = f"{int(rr * 100)}% recruiter response rate"

    # Last active
    last_active = signals.get("last_active_date", "")
    today = date.today()
    if last_active:
        from datetime import datetime
        la = datetime.strptime(last_active[:10], "%Y-%m-%d").date()
        days_ago = (today - la).days
        active_str = f"active {days_ago}d ago"
    else:
        active_str = "activity unknown"

    # Company history snippet
    recent_companies = [job["company"] for job in history[:2]]
    companies_str = " → ".join(recent_companies) if recent_companies else "unknown"

    # Open to work
    otw = "open to work" if signals.get("open_to_work_flag") else "not marked open"

    # Score breakdown hint
    s = result["final_score"]
    skill_score = result.get("skills", 0)
    career_score = result.get("career", 0)

    # Build the sentence
    sentence1 = (
        f"{title} with {yoe:.1f} yrs experience ({location}); "
        f"strong in {skills_str}."
    )
    sentence2 = (
        f"Career: {companies_str}; {notice_str}, {rr_str}, {active_str}, {otw}."
    )

    return f"{sentence1} {sentence2}"


def generate_csv(use_sample=False):
    """
    Full pipeline: rank candidates → build reasoning → write CSV.
    """
    # Run the ranker
    top_candidates = run_ranking(use_sample=use_sample)

    # Make sure output folder exists
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)

    print(f"\nWriting submission to: {OUTPUT_FILE}")

    with open(OUTPUT_FILE, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)

        # Header row
        writer.writerow(["candidate_id", "rank", "score", "reasoning"])

        for rank, result in enumerate(top_candidates, start=1):
            candidate_id = result["candidate_id"]
            score        = result["final_score"]
            reasoning    = build_reasoning(result)

            writer.writerow([candidate_id, rank, score, reasoning])

    print(f"Done! {TOP_N} candidates written to submission.csv")
    print("\nTop 5 preview:")
    for i, r in enumerate(top_candidates[:5], 1):
        print(f"  {i}. {r['candidate_id']} | score={r['final_score']:.4f} | "
              f"{r['candidate_data']['profile'].get('current_title','?')} | "
              f"{r['candidate_data']['profile'].get('years_of_experience','?')} yrs")


if __name__ == "__main__":
    generate_csv(use_sample=False)