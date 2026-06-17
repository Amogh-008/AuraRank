import json
import random

skills_pool = [
    "Python", "Java", "React", "FastAPI", "Machine Learning",
    "NLP", "SQL", "AWS", "Docker", "TensorFlow",
    "PyTorch", "JavaScript", "Node.js", "Data Science"
]

titles = [
    "Software Engineer",
    "ML Engineer",
    "Data Scientist",
    "Backend Developer",
    "Full Stack Developer"
]

locations = [
    "Bangalore, India",
    "Hyderabad, India",
    "Pune, India",
    "Delhi, India",
    "Mumbai, India"
]

candidates = []

for i in range(1, 501): 
    selected_skills = random.sample(skills_pool, random.randint(4, 8))

    candidate = {
        "candidate_id": f"C{i:04d}",
        "profile": {
            "anonymized_name": f"Candidate {i}",
            "current_title": random.choice(titles),
            "headline": "Experienced technology professional",
            "summary": "Worked on software development and AI projects.",
            "years_of_experience": random.randint(1, 12),
            "location": random.choice(locations),
            "country": "India"
        },
        "skills": [
            {
                "name": skill,
                "proficiency": random.choice(
                    ["beginner", "intermediate", "advanced", "expert"]
                )
            }
            for skill in selected_skills
        ],
        "career_history": [
            {
                "company": f"Company {random.randint(1,100)}",
                "industry": "Software",
                "title": random.choice(titles),
                "description": "Built scalable software systems.",
                "duration_months": random.randint(12, 60)
            }
        ],
        "redrob_signals": {
            "last_active_date": "2026-06-01",
            "open_to_work_flag": random.choice([True, False]),
            "recruiter_response_rate": round(random.uniform(0.3, 1.0), 2),
            "notice_period_days": random.choice([0, 15, 30, 60, 90]),
            "github_activity_score": random.randint(20, 100),
            "interview_completion_rate": round(random.uniform(0.5, 1.0), 2),
            "profile_completeness_score": random.randint(50, 100),
            "willing_to_relocate": random.choice([True, False]),
            "skill_assessment_scores": {
                skill.lower(): random.randint(50, 100)
                for skill in selected_skills[:3]
            }
        }
    }

    candidates.append(candidate)

with open("candidates_500.json", "w", encoding="utf-8") as f:
    json.dump(candidates, f, indent=2)

print("Generated candidates_500.json")