# app.py
# Hugging Face Spaces / Streamlit sandbox for the Redrob ranker

import streamlit as st
import json
import csv
import io
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.features import score_candidate
from src.config import TOP_N

st.set_page_config(
    page_title="Redrob Candidate Ranker",
    page_icon="🎯",
    layout="wide"
)

st.title("🎯 Redrob Intelligent Candidate Ranker")
st.markdown("""
**Redrob Data & AI Challenge — Candidate Ranking System**

Upload a JSON file containing candidates and get a ranked shortlist instantly.
""")

st.sidebar.header("⚙️ Settings")
top_n = st.sidebar.slider("Number of candidates to return", 5, 100, 10)

st.sidebar.markdown("---")
st.sidebar.markdown("### 📊 Scoring Weights")
st.sidebar.markdown("- Skills Match: **30%**")
st.sidebar.markdown("- Career Quality: **25%**")
st.sidebar.markdown("- Role Fit: **20%**")
st.sidebar.markdown("- Behavioral Signals: **15%**")
st.sidebar.markdown("- Location: **10%**")

# ── File Upload ───────────────────────────────────────────────
st.header("📁 Upload Candidates")
st.markdown("Upload a `.json` file (array of candidates) or `.jsonl` file (one per line).")

uploaded_file = st.file_uploader(
    "Choose a candidate file",
    type=["json", "jsonl"]
)

# ── Sample data button ────────────────────────────────────────
st.markdown("**Or try with built-in sample data:**")
use_sample = st.button("▶ Run on built-in sample (50 candidates)")

def load_from_upload(uploaded_file):
    content = uploaded_file.read().decode("utf-8")
    if uploaded_file.name.endswith(".jsonl"):
        candidates = []
        for line in content.strip().split("\n"):
            if line.strip():
                candidates.append(json.loads(line))
        return candidates
    else:
        return json.loads(content)

def run_ranker(candidates, top_n):
    results = []
    progress = st.progress(0)
    status   = st.empty()

    for i, candidate in enumerate(candidates):
        score = score_candidate(candidate)
        score["candidate_data"] = candidate
        results.append(score)
        progress.progress((i + 1) / len(candidates))
        status.text(f"Scoring candidate {i+1} of {len(candidates)}...")

    progress.empty()
    status.empty()

    results.sort(key=lambda x: x["final_score"], reverse=True)
    clean = [r for r in results if not r["is_honeypot"]]
    return clean[:top_n]

def display_results(top_candidates):
    st.success(f"✅ Ranked {len(top_candidates)} candidates successfully!")

    # Summary metrics
    col1, col2, col3 = st.columns(3)
    col1.metric("Top Score", f"{top_candidates[0]['final_score']:.4f}")
    col2.metric("Candidates Ranked", len(top_candidates))
    honeypots = sum(1 for r in top_candidates if r.get("is_honeypot"))
    col3.metric("Honeypots Detected", honeypots)

    st.header("🏆 Ranked Candidates")

    for rank, result in enumerate(top_candidates, 1):
        profile  = result["candidate_data"].get("profile", {})
        signals  = result["candidate_data"].get("redrob_signals", {})
        skills   = result["candidate_data"].get("skills", [])

        title    = profile.get("current_title", "Unknown")
        yoe      = profile.get("years_of_experience", 0)
        location = profile.get("location", "Unknown")
        name     = profile.get("anonymized_name", "Unknown")
        score    = result["final_score"]

        top_skills = [
            s["name"] for s in skills
            if s.get("proficiency") in ("advanced", "expert")
        ][:4]

        with st.expander(f"#{rank} — {name} | {title} | {yoe:.1f} yrs | Score: {score:.4f}"):
            col1, col2 = st.columns(2)

            with col1:
                st.markdown("**📍 Profile**")
                st.write(f"Location: {location}")
                st.write(f"Experience: {yoe:.1f} years")
                st.write(f"Open to work: {signals.get('open_to_work_flag', False)}")
                st.write(f"Notice period: {signals.get('notice_period_days', '?')} days")

            with col2:
                st.markdown("**📊 Score Breakdown**")
                st.write(f"Skills:    {result.get('skills', 0):.3f}")
                st.write(f"Career:    {result.get('career', 0):.3f}")
                st.write(f"Role Fit:  {result.get('role_fit', 0):.3f}")
                st.write(f"Behavioral:{result.get('behavioral', 0):.3f}")
                st.write(f"Location:  {result.get('location', 0):.3f}")

            if top_skills:
                st.markdown(f"**🛠 Top Skills:** {', '.join(top_skills)}")

    # Download CSV button
    st.header("⬇️ Download Results")
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["candidate_id", "rank", "score", "reasoning"])
    for rank, result in enumerate(top_candidates, 1):
        profile = result["candidate_data"].get("profile", {})
        skills  = result["candidate_data"].get("skills", [])
        signals = result["candidate_data"].get("redrob_signals", {})
        title   = profile.get("current_title", "?")
        yoe     = profile.get("years_of_experience", 0)
        loc     = profile.get("location", "?")
        notice  = signals.get("notice_period_days", "?")
        rr      = signals.get("recruiter_response_rate", 0)
        top_sk  = [s["name"] for s in skills if s.get("proficiency") in ("advanced","expert")][:3]
        sk_str  = ", ".join(top_sk) if top_sk else "general skills"
        reasoning = (f"{title} with {yoe:.1f} yrs ({loc}); "
                     f"strong in {sk_str}; "
                     f"{notice}d notice, {int(rr*100)}% response rate.")
        writer.writerow([result["candidate_id"], rank, result["final_score"], reasoning])

    st.download_button(
        label="📥 Download ranked CSV",
        data=output.getvalue(),
        file_name="ranked_candidates.csv",
        mime="text/csv"
    )

# ── Main logic ────────────────────────────────────────────────
if uploaded_file:
    with st.spinner("Loading candidates..."):
        candidates = load_from_upload(uploaded_file)
    st.info(f"Loaded {len(candidates)} candidates. Running ranker...")
    top = run_ranker(candidates, top_n)
    display_results(top)

elif use_sample:
    sample_path = os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        "data", "sample_candidates.json"
    )
    if os.path.exists(sample_path):
        with open(sample_path, "r", encoding="utf-8") as f:
            candidates = json.load(f)
        st.info(f"Loaded {len(candidates)} sample candidates. Running ranker...")
        top = run_ranker(candidates, top_n)
        display_results(top)
    else:
        st.error("Sample file not found. Please upload a candidate JSON file.")

else:
    st.info("👆 Upload a candidate file above or click the sample button to get started.")
    st.markdown("---")
    st.markdown("### 📋 Expected Input Format")
    st.code('''[
  {
    "candidate_id": "CAND_0000001",
    "profile": {
      "current_title": "ML Engineer",
      "years_of_experience": 6.5,
      "location": "Bangalore",
      "country": "India",
      ...
    },
    "skills": [...],
    "career_history": [...],
    "redrob_signals": {...}
  }
]''', language="json")