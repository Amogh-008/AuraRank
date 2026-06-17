# features.py
# Scores each candidate across 5 dimensions defined in config.py

import json
import math
from datetime import date, datetime
from src.config import *


def parse_date(date_str):
    """Convert a date string to a Python date object."""
    if not date_str:
        return None
    try:
        return datetime.strptime(date_str[:10], "%Y-%m-%d").date()
    except:
        return None


def score_skills(candidate):
    """
    Score based on technical skills match.
    Checks skill names + career descriptions for keyword presence.
    Returns 0.0 to 1.0
    """
    # Collect all text we can search through
    skill_names = [s["name"].lower() for s in candidate.get("skills", [])]
    skill_text  = " ".join(skill_names)

    # Also search career descriptions for evidence of real work
    career_text = " ".join([
        (job.get("description", "") + " " + job.get("title", "")).lower()
        for job in candidate.get("career_history", [])
    ])

    summary_text = candidate.get("profile", {}).get("summary", "").lower()
    headline_text = candidate.get("profile", {}).get("headline", "").lower()

    full_text = skill_text + " " + career_text + " " + summary_text + " " + headline_text

    # Count core skill matches
    core_hits = sum(1 for skill in CORE_SKILLS if skill in full_text)
    bonus_hits = sum(1 for skill in BONUS_SKILLS if skill in full_text)

    # Also reward high-proficiency skills
    expert_count = sum(
        1 for s in candidate.get("skills", [])
        if s.get("proficiency") in ("advanced", "expert")
        and any(core in s["name"].lower() for core in CORE_SKILLS)
    )

    # Normalize: 8+ core hits = full score
    core_score  = min(core_hits / 8.0, 1.0)
    bonus_score = min(bonus_hits / 5.0, 1.0) * 0.2
    expert_score = min(expert_count / 3.0, 1.0) * 0.2

    # Check skill assessment scores on platform
    assessments = candidate.get("redrob_signals", {}).get("skill_assessment_scores", {})
    assessment_score = 0.0
    if assessments:
        relevant = [v for k, v in assessments.items()
                    if any(core in k.lower() for core in CORE_SKILLS)]
        if relevant:
            assessment_score = min(sum(relevant) / (len(relevant) * 100), 1.0) * 0.2

    raw = core_score + bonus_score + expert_score + assessment_score
    return min(raw, 1.0)


def score_career(candidate):
    """
    Score based on career history quality.
    Rewards: product companies, AI/ML roles, right YOE.
    Penalizes: only consulting, pure research, no production.
    Returns 0.0 to 1.0
    """
    history = candidate.get("career_history", [])
    profile  = candidate.get("profile", {})
    yoe      = profile.get("years_of_experience", 0)

    if not history:
        return 0.1

    # ── YOE score ─────────────────────────────────────────────
    if IDEAL_YOE_MIN <= yoe <= IDEAL_YOE_MAX:
        yoe_score = 1.0
    elif yoe < IDEAL_YOE_MIN:
        yoe_score = yoe / IDEAL_YOE_MIN
    else:
        # Over 9 years — not disqualifying, just slightly less ideal
        yoe_score = max(0.6, 1.0 - (yoe - IDEAL_YOE_MAX) * 0.04)

    # ── Company quality score ─────────────────────────────────
    all_companies = [job.get("company", "").lower() for job in history]
    all_industries = [job.get("industry", "").lower() for job in history]

    consulting_count = sum(
        1 for co in all_companies
        if any(c in co for c in CONSULTING_ONLY_COMPANIES)
    )
    is_consulting_only = (consulting_count == len(history))

    # Reward tech/product company experience
    tech_industries = ["technology", "software", "ai", "machine learning",
                       "internet", "saas", "fintech", "edtech", "healthtech"]
    tech_count = sum(1 for ind in all_industries
                     if any(t in ind for t in tech_industries))
    company_score = min(tech_count / max(len(history), 1), 1.0)

    if is_consulting_only:
        company_score *= 0.4   # Heavy penalty for pure consulting

    # ── Role progression score ────────────────────────────────
    ai_titles = ["machine learning", "ml engineer", "ai engineer", "data scientist",
                 "nlp engineer", "research engineer", "applied scientist",
                 "software engineer", "backend engineer", "platform engineer",
                 "search engineer", "ranking engineer", "recommendation"]

    ai_role_count = sum(
        1 for job in history
        if any(t in job.get("title", "").lower() for t in ai_titles)
    )
    role_score = min(ai_role_count / max(len(history), 1), 1.0)

    # ── Production evidence ───────────────────────────────────
    production_keywords = ["deployed", "production", "scaled", "shipped",
                           "launched", "built", "implemented", "optimized",
                           "improved", "reduced latency", "real users"]
    all_descriptions = " ".join([job.get("description", "").lower() for job in history])
    prod_hits = sum(1 for kw in production_keywords if kw in all_descriptions)
    prod_score = min(prod_hits / 4.0, 1.0)

    final = (yoe_score * 0.25 + company_score * 0.30 +
             role_score * 0.25 + prod_score * 0.20)
    return round(final, 4)


def score_role_fit(candidate):
    """
    Score based on how well current title/trajectory matches
    Senior AI Engineer role.
    Returns 0.0 to 1.0
    """
    profile = candidate.get("profile", {})
    current_title = profile.get("current_title", "").lower()
    headline      = profile.get("headline", "").lower()
    summary       = profile.get("summary", "").lower()

    # Hard disqualify — clearly wrong role
    if any(bad in current_title for bad in DISQUALIFY_TITLES):
        return 0.05

    # Strong positive signals in title
    strong_titles = [
        "machine learning engineer", "ml engineer", "ai engineer",
        "nlp engineer", "search engineer", "ranking engineer",
        "applied scientist", "research engineer", "data scientist",
        "software engineer", "backend engineer", "senior engineer",
        "staff engineer", "principal engineer",
    ]
    title_score = 0.0
    for t in strong_titles:
        if t in current_title:
            title_score = 1.0
            break
        elif any(word in current_title for word in t.split()):
            title_score = max(title_score, 0.5)

    # Headline/summary signals
    context_text = headline + " " + summary
    context_keywords = ["ranking", "retrieval", "search", "recommendation",
                        "embedding", "llm", "nlp", "ml", "ai", "vector"]
    context_hits = sum(1 for kw in context_keywords if kw in context_text)
    context_score = min(context_hits / 5.0, 1.0)

    return round(title_score * 0.7 + context_score * 0.3, 4)


def score_behavioral(candidate):
    """
    Score based on redrob platform signals.
    Rewards: active, responsive, low notice period, github activity.
    Penalizes: inactive, unresponsive, very long notice period.
    Returns 0.0 to 1.0
    """
    signals = candidate.get("redrob_signals", {})
    today   = date.today()
    score   = 0.0

    # ── Activity score ────────────────────────────────────────
    last_active = parse_date(signals.get("last_active_date"))
    if last_active:
        days_inactive = (today - last_active).days
        if days_inactive <= 7:
            activity_score = 1.0
        elif days_inactive <= 30:
            activity_score = 0.8
        elif days_inactive <= 90:
            activity_score = 0.5
        else:
            activity_score = max(0.1, 1.0 - days_inactive / 365)
    else:
        activity_score = 0.3

    # ── Open to work ──────────────────────────────────────────
    open_to_work = 1.0 if signals.get("open_to_work_flag") else 0.4

    # ── Recruiter response rate ───────────────────────────────
    response_rate = signals.get("recruiter_response_rate", 0)
    response_score = min(response_rate / GOOD_RESPONSE_RATE, 1.0)

    # ── Notice period ─────────────────────────────────────────
    notice = signals.get("notice_period_days", 90)
    if notice <= 30:
        notice_score = 1.0
    elif notice <= 60:
        notice_score = 0.7
    elif notice <= 90:
        notice_score = 0.4
    else:
        notice_score = max(0.1, 1.0 - notice / 180)

    # ── GitHub activity ───────────────────────────────────────
    github = signals.get("github_activity_score", -1)
    github_score = (github / 100.0) if github >= 0 else 0.2

    # ── Interview & offer signals ─────────────────────────────
    interview_rate = signals.get("interview_completion_rate", 0.5)
    profile_complete = signals.get("profile_completeness_score", 50) / 100.0

    # ── Combine ───────────────────────────────────────────────
    final = (
        activity_score    * 0.25 +
        open_to_work      * 0.15 +
        response_score    * 0.20 +
        notice_score      * 0.15 +
        github_score      * 0.10 +
        interview_rate    * 0.10 +
        profile_complete  * 0.05
    )
    return round(min(final, 1.0), 4)


def score_location(candidate):
    """
    Score based on location match with JD requirements.
    Returns 0.0 to 1.0
    """
    profile  = candidate.get("profile", {})
    signals  = candidate.get("redrob_signals", {})

    location = profile.get("location", "").lower()
    country  = profile.get("country", "").lower()
    relocate = signals.get("willing_to_relocate", False)

    # Must be India-based or willing to relocate
    if country == "india" or "india" in location:
        # Check if in preferred cities
        if any(city in location for city in PREFERRED_LOCATIONS):
            return 1.0
        else:
            # India but not preferred city — relocate helps
            return 0.8 if relocate else 0.6
    else:
        # Outside India
        return 0.3 if relocate else 0.1


def is_honeypot(candidate):
    """
    Detect obviously fake/impossible profiles.
    Returns True if the candidate looks like a honeypot.
    """
    history  = candidate.get("career_history", [])
    skills   = candidate.get("skills", [])
    profile  = candidate.get("profile", {})

    # Check 1: Experience at company impossible given founding date
    # (we detect this by checking if total claimed duration > years_of_experience * 12 + 24)
    total_months = sum(job.get("duration_months", 0) for job in history)
    yoe_months   = profile.get("years_of_experience", 0) * 12
    if total_months > yoe_months + 36:   # 3-year buffer for overlaps
        return True

    # Check 2: Too many "expert" skills for low YOE
    expert_skills = [s for s in skills if s.get("proficiency") == "expert"]
    if len(expert_skills) > 8 and profile.get("years_of_experience", 0) < 3:
        return True

    # Check 3: Contradictory title vs skills
    # e.g. "Marketing Manager" with 15 AI expert skills
    title = profile.get("current_title", "").lower()
    is_non_tech_title = any(bad in title for bad in DISQUALIFY_TITLES)
    ai_expert_count   = sum(
        1 for s in skills
        if s.get("proficiency") == "expert"
        and any(core in s["name"].lower() for core in CORE_SKILLS)
    )
    if is_non_tech_title and ai_expert_count >= 5:
        return True

    return False


def score_candidate(candidate):
    """
    Master function: scores a single candidate across all dimensions.
    Returns a dict with individual scores + final weighted score.
    """
    # Honeypot check first
    if is_honeypot(candidate):
        return {
            "candidate_id": candidate["candidate_id"],
            "skills":     0.0,
            "career":     0.0,
            "role_fit":   0.0,
            "behavioral": 0.0,
            "location":   0.0,
            "final_score": 0.0,
            "is_honeypot": True,
        }

    s_skills     = score_skills(candidate)
    s_career     = score_career(candidate)
    s_role       = score_role_fit(candidate)
    s_behavioral = score_behavioral(candidate)
    s_location   = score_location(candidate)

    final = (
        s_skills     * WEIGHTS["skills"]   +
        s_career     * WEIGHTS["career"]   +
        s_role       * WEIGHTS["role_fit"] +
        s_behavioral * WEIGHTS["behavioral"] +
        s_location   * WEIGHTS["location"]
    )

    return {
        "candidate_id": candidate["candidate_id"],
        "skills":       round(s_skills, 4),
        "career":       round(s_career, 4),
        "role_fit":     round(s_role, 4),
        "behavioral":   round(s_behavioral, 4),
        "location":     round(s_location, 4),
        "final_score":  round(final, 4),
        "is_honeypot":  False,
    }
