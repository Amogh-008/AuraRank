# ============================================================
# features.py
# AuraRank Hybrid Ranking Engine
# ============================================================

import math
from datetime import date, datetime

from src.config import *


# ============================================================
# Utility Functions
# ============================================================

def parse_date(date_str):
    if not date_str:
        return None
    try:
        return datetime.strptime(date_str[:10], "%Y-%m-%d").date()
    except Exception:
        return None


def safe_lower(value):
    if value is None:
        return ""
    return str(value).lower()


def normalize(score):
    return max(0.0, min(score, 1.0))


# ============================================================
# Job Description Helpers
# ============================================================

def extract_keywords(job_description):
    if not job_description:
        return []
    jd = job_description.lower()
    for sep in [",", ".", "\n", ";", ":", "(", ")", "/", "|"]:
        jd = jd.replace(sep, " ")
    return list(set(w.strip() for w in jd.split() if len(w.strip()) >= 3))


def candidate_text(candidate):
    profile = candidate.get("profile", {})
    skills = " ".join([safe_lower(s.get("name")) for s in candidate.get("skills", [])])
    experience = " ".join([
        safe_lower(job.get("title")) + " " +
        safe_lower(job.get("description")) + " " +
        safe_lower(job.get("company"))
        for job in candidate.get("career_history", [])
    ])
    return " ".join([
        safe_lower(profile.get("summary")),
        safe_lower(profile.get("headline")),
        safe_lower(profile.get("current_title")),
        safe_lower(profile.get("location")),
        skills,
        experience
    ])


# ============================================================
# Skills Score
# ============================================================

def score_skills(candidate, job_description=""):
    candidate_profile = candidate_text(candidate)
    jd_keywords = extract_keywords(job_description)

    keyword_hits = sum(1 for w in jd_keywords if w in candidate_profile)
    jd_score = normalize(keyword_hits / len(jd_keywords)) if jd_keywords else 0.50

    core_hits = sum(1 for skill in CORE_SKILLS if skill.lower() in candidate_profile)
    core_score = normalize(core_hits / max(len(CORE_SKILLS), 1) * 4)

    bonus_hits = sum(1 for skill in BONUS_SKILLS if skill.lower() in candidate_profile)
    bonus_score = normalize(bonus_hits / max(len(BONUS_SKILLS), 1) * 5)

    expert = sum(
        1 for skill in candidate.get("skills", [])
        if safe_lower(skill.get("proficiency")) in ("advanced", "expert")
        and any(core in safe_lower(skill.get("name")) for core in CORE_SKILLS)
    )
    expert_score = normalize(expert / 6)

    assessments = candidate.get("redrob_signals", {}).get("skill_assessment_scores", {})
    assessment_score = 0
    if assessments:
        values = list(assessments.values())
        if values:
            assessment_score = normalize(sum(values) / (len(values) * 100))

    rule_score = (
        core_score * 0.40 +
        bonus_score * 0.15 +
        expert_score * 0.25 +
        assessment_score * 0.20
    )

    return round(normalize(jd_score * 0.60 + rule_score * 0.40), 4)


# ============================================================
# Career Score
# ============================================================

def score_career(candidate, job_description=""):
    history = candidate.get("career_history", [])
    profile = candidate.get("profile", {})

    if not history:
        return 0.1

    yoe = profile.get("years_of_experience", 0)
    if IDEAL_YOE_MIN <= yoe <= IDEAL_YOE_MAX:
        yoe_score = 1.0
    elif yoe < IDEAL_YOE_MIN:
        yoe_score = normalize(yoe / IDEAL_YOE_MIN)
    else:
        yoe_score = max(0.6, 1.0 - (yoe - IDEAL_YOE_MAX) * 0.04)

    product_hits = 0
    consulting_hits = 0
    for job in history:
        company = safe_lower(job.get("company"))
        industry = safe_lower(job.get("industry"))
        if any(s in company for s in PRODUCT_COMPANY_SIGNALS):
            product_hits += 1
        if any(s in industry for s in PRODUCT_COMPANY_SIGNALS):
            product_hits += 1
        if any(b in company for b in CONSULTING_ONLY_COMPANIES):
            consulting_hits += 1

    company_score = normalize(product_hits / max(len(history), 1))
    if consulting_hits == len(history):
        company_score *= 0.40

    technical_titles = ["engineer", "developer", "scientist", "architect",
                        "ml", "ai", "software", "backend", "data"]
    title_hits = sum(
        1 for job in history
        if any(t in safe_lower(job.get("title")) for t in technical_titles)
    )
    role_score = normalize(title_hits / max(len(history), 1))

    production_keywords = ["production", "deployed", "launched", "built",
                           "implemented", "optimized", "scaled", "users",
                           "latency", "pipeline"]
    descriptions = " ".join(safe_lower(job.get("description")) for job in history)
    prod_hits = sum(1 for kw in production_keywords if kw in descriptions)
    production_score = normalize(prod_hits / 5)

    jd_keywords = extract_keywords(job_description)
    candidate_history = candidate_text(candidate)
    jd_hits = sum(1 for kw in jd_keywords if kw in candidate_history)
    jd_score = normalize(jd_hits / len(jd_keywords)) if jd_keywords else 0.50

    rule_score = (
        yoe_score * 0.25 +
        company_score * 0.25 +
        role_score * 0.25 +
        production_score * 0.25
    )

    return round(normalize(rule_score * 0.70 + jd_score * 0.30), 4)


# ============================================================
# Role Fit Score — NO semantic call here (moved to api.py)
# ============================================================

def score_role_fit(candidate, job_description=""):
    profile = candidate.get("profile", {})
    current_title = safe_lower(profile.get("current_title"))
    headline = safe_lower(profile.get("headline"))
    summary = safe_lower(profile.get("summary"))
    candidate_profile = " ".join([current_title, headline, summary])

    if any(bad in current_title for bad in DISQUALIFY_TITLES):
        return 0.05

    jd_keywords = extract_keywords(job_description)
    keyword_hits = sum(1 for w in jd_keywords if w in candidate_profile)
    keyword_score = normalize(keyword_hits / len(jd_keywords)) if jd_keywords else 0.50

    engineering_words = ["engineer", "developer", "software", "backend", "frontend",
                         "full stack", "fullstack", "machine learning", "ml", "ai",
                         "data scientist", "architect", "lead", "senior"]
    engineering_hits = sum(1 for w in engineering_words if w in candidate_profile)
    engineering_score = normalize(engineering_hits / 8)

    history = candidate.get("career_history", [])
    relevant_roles = sum(
        1 for job in history
        if any(w in safe_lower(job.get("title")) + " " + safe_lower(job.get("description"))
               for w in jd_keywords)
    )
    history_score = normalize(relevant_roles / max(len(history), 1))

    # ── NO semantic call here — semantic is done once in api.py ──
    final = (
        keyword_score * 0.45 +
        engineering_score * 0.25 +
        history_score * 0.30
    )

    return round(normalize(final), 4)


# ============================================================
# Behavioral Score
# ============================================================

def score_behavioral(candidate, job_description=""):
    signals = candidate.get("redrob_signals", {})
    today = date.today()

    last_active = parse_date(signals.get("last_active_date"))
    if last_active:
        inactive_days = (today - last_active).days
        if inactive_days <= 7:
            activity_score = 1.0
        elif inactive_days <= 30:
            activity_score = 0.8
        elif inactive_days <= 90:
            activity_score = 0.5
        else:
            activity_score = max(0.10, 1.0 - inactive_days / 365)
    else:
        activity_score = 0.30
        inactive_days = 999

    open_to_work = 1.0 if signals.get("open_to_work_flag", False) else 0.40
    response_rate = signals.get("recruiter_response_rate", 0)
    response_score = normalize(response_rate / GOOD_RESPONSE_RATE)

    notice = signals.get("notice_period_days", 90)
    if notice <= 30:
        notice_score = 1.0
    elif notice <= 60:
        notice_score = 0.70
    elif notice <= 90:
        notice_score = 0.40
    else:
        notice_score = max(0.10, 1.0 - notice / 180)

    github = signals.get("github_activity_score", -1)
    github_score = normalize(github / 100) if github >= 0 else 0.20

    interview_score = normalize(signals.get("interview_completion_rate", 0.50))
    profile_score = normalize(signals.get("profile_completeness_score", 50) / 100)

    jd = job_description.lower()
    jd_bonus = 0
    if "remote" in jd:
        jd_bonus += 0.05
    if "immediate" in jd and notice <= 30:
        jd_bonus += 0.05
    if "urgent" in jd and inactive_days <= 30:
        jd_bonus += 0.05

    final = (
        activity_score * 0.25 +
        open_to_work * 0.15 +
        response_score * 0.20 +
        notice_score * 0.15 +
        github_score * 0.10 +
        interview_score * 0.10 +
        profile_score * 0.05 +
        jd_bonus
    )

    return round(normalize(final), 4)


# ============================================================
# Location Score
# ============================================================

def score_location(candidate, job_description=""):
    profile = candidate.get("profile", {})
    signals = candidate.get("redrob_signals", {})
    location = safe_lower(profile.get("location"))
    country = safe_lower(profile.get("country"))
    relocate = signals.get("willing_to_relocate", False)
    jd = safe_lower(job_description)

    if "remote" in jd:
        return 1.0
    if "hybrid" in jd and relocate:
        return 1.0

    jd_locations = [city for city in PREFERRED_LOCATIONS if city in jd]
    for city in jd_locations:
        if city in location:
            return 1.0

    if country == "india" or "india" in location:
        return 0.90 if relocate else 0.75

    return 0.60 if relocate else 0.25


# ============================================================
# Honeypot Detection
# ============================================================

def is_honeypot(candidate):
    history = candidate.get("career_history", [])
    skills = candidate.get("skills", [])
    profile = candidate.get("profile", {})
    signals = candidate.get("redrob_signals", {})

    total_months = sum(job.get("duration_months", 0) for job in history)
    yoe = profile.get("years_of_experience", 0)

    if total_months > (yoe * 12) + 36:
        return True

    expert_skills = [s for s in skills if safe_lower(s.get("proficiency")) == "expert"]
    if len(expert_skills) > 8 and yoe < 3:
        return True

    title = safe_lower(profile.get("current_title"))
    ai_experts = sum(
        1 for skill in skills
        if safe_lower(skill.get("proficiency")) == "expert"
        and any(core in safe_lower(skill.get("name")) for core in CORE_SKILLS)
    )
    if any(bad in title for bad in DISQUALIFY_TITLES) and ai_experts >= 5:
        return True

    if not history and not skills:
        return True

    if signals.get("profile_completeness_score", 100) < 15:
        return True

    if signals.get("github_activity_score", 0) > 95 and yoe == 0:
        return True

    headline = safe_lower(profile.get("headline"))
    suspicious_words = ["world class", "best engineer", "100x", "genius",
                        "rockstar", "ninja", "wizard"]
    if any(w in headline for w in suspicious_words):
        return True

    if len(history) > (yoe * 2) + 5:
        return True

    return False


# ============================================================
# Helpers
# ============================================================

def get_matched_skills(candidate, job_description):
    jd_keywords = extract_keywords(job_description)
    candidate_skills = [safe_lower(s.get("name")) for s in candidate.get("skills", [])]
    return sorted(list(set(kw for kw in jd_keywords if kw in candidate_skills)))


def get_missing_skills(candidate, job_description):
    jd_keywords = extract_keywords(job_description)
    candidate_skills = [safe_lower(s.get("name")) for s in candidate.get("skills", [])]
    return sorted(list(set(kw for kw in jd_keywords if kw not in candidate_skills)))


def build_reasons(skills, career, role, behavioral, location, semantic=0.0):
    reasons = []
    if semantic >= 0.90:
        reasons.append("Excellent semantic match with the uploaded Job Description.")
    elif semantic >= 0.75:
        reasons.append("Strong semantic similarity with the required role.")
    if skills >= 0.80:
        reasons.append("Possesses most of the required technical skills.")
    if career >= 0.80:
        reasons.append("Career history aligns well with the target role.")
    if role >= 0.80:
        reasons.append("Current role closely matches the job requirements.")
    if behavioral >= 0.80:
        reasons.append("Highly active and recruiter-friendly profile.")
    if location >= 0.80:
        reasons.append("Location preference matches recruiter requirements.")
    if not reasons:
        reasons.append("Candidate satisfies a moderate number of recruitment criteria.")
    return reasons


# ============================================================
# Master Scoring Function
# ============================================================

def score_candidate(candidate, job_description=""):
    if is_honeypot(candidate):
        return {
            "candidate_id": candidate["candidate_id"],
            "skills": 0.0, "career": 0.0, "role_fit": 0.0,
            "behavioral": 0.0, "location": 0.0,
            "semantic_score": 0.0, "rule_score": 0.0, "final_score": 0.0,
            "is_honeypot": True,
            "matched_skills": [], "missing_skills": [], "matched_skill_count": 0,
            "reasons": ["Candidate identified as a honeypot or fake profile."]
        }

    s_skills    = score_skills(candidate, job_description)
    s_career    = score_career(candidate, job_description)
    s_role      = score_role_fit(candidate, job_description)
    s_behavioral = score_behavioral(candidate, job_description)
    s_location  = score_location(candidate, job_description)

    rule_score = normalize(
        s_skills    * WEIGHTS["skills"]   +
        s_career    * WEIGHTS["career"]   +
        s_role      * WEIGHTS["role_fit"] +
        s_behavioral * WEIGHTS["behavioral"] +
        s_location  * WEIGHTS["location"]
    )

    # semantic_score & final_score are set later in api.py
    # after batch processing top candidates
    final_score = rule_score

    matched_skills = get_matched_skills(candidate, job_description)
    missing_skills = get_missing_skills(candidate, job_description)
    reasons = build_reasons(s_skills, s_career, s_role, s_behavioral, s_location)

    return {
        "candidate_id": candidate["candidate_id"],
        "skills":    round(s_skills, 4),
        "career":    round(s_career, 4),
        "role_fit":  round(s_role, 4),
        "behavioral": round(s_behavioral, 4),
        "location":  round(s_location, 4),
        "semantic_score": 0.0,
        "rule_score":  round(rule_score, 4),
        "final_score": round(final_score, 4),
        "is_honeypot": False,
        "matched_skills": matched_skills,
        "missing_skills": missing_skills,
        "matched_skill_count": len(matched_skills),
        "reasons": reasons
    }