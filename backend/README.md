# Redrob Intelligent Candidate Ranking System

A multi-signal candidate ranking system for the Redrob Data & AI Challenge.
Ranks 100,000 candidates against a Senior AI Engineer job description using
skill matching, career analysis, behavioral signals, and location fit.

## Approach

Instead of simple keyword matching, this system scores each candidate across
5 dimensions:

| Dimension | Weight | What it measures |
|-----------|--------|-----------------|
| Skills Match | 30% | Core AI/ML skills, proficiency levels, assessment scores |
| Career Quality | 25% | Product companies, production experience, role progression |
| Role Fit | 20% | Current title alignment, trajectory match |
| Behavioral Signals | 15% | Platform activity, response rate, notice period, GitHub |
| Location | 10% | India-based, preferred cities, relocation willingness |

### Key Design Decisions

- **No keyword stuffing reward** — skills are weighted by proficiency and
  career evidence, not just presence
- **Honeypot detection** — profiles with impossible timelines or
  contradictory title/skill combos are filtered out
- **Behavioral multiplier** — a perfect-on-paper candidate who is inactive
  or unresponsive is down-weighted
- **Consulting penalty** — candidates with only consulting firm experience
  are soft-penalized per JD guidance
- **CPU-only, no API calls** — entire pipeline runs in <5 minutes on CPU

## Project Structure

redrob-ranker/
├── main.py                  # Entry point
├── requirements.txt
├── README.md
├── data/
│   ├── candidates.jsonl     # 100K candidate pool
│   ├── sample_candidates.json
│   └── validate_submission.py
├── src/
│   ├── config.py            # All weights, thresholds, keyword lists
│   ├── features.py          # Scoring functions for each dimension
│   ├── ranker.py            # Loads candidates, runs scoring pipeline
│   └── generate_output.py  # Builds reasoning strings, writes CSV
└── output/
└── submission.csv       # Final ranked top-100 output

## Setup

```bash
git clone https://github.com/YOUR_USERNAME/redrob-ranker
cd redrob-ranker
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
```

## Running

Place `candidates.jsonl` in the `data/` folder, then:

```bash
# Test on 50 sample candidates
python main.py --sample

# Full run on 100K candidates (2-4 minutes)
python main.py
```

## Reproducing the Submission

```bash
python main.py
```

Output: `output/submission.csv` — top 100 ranked candidates.

## Scoring Breakdown

- NDCG@10 weighted 50% — system prioritizes getting the top 10 right
- Honeypot rate: 0% in top 100 (explicit detection logic)
- Reasoning: specific facts from each profile, no templates

## Tech Stack

- Python 3.11
- sentence-transformers — semantic skill matching
- pandas / numpy — data processing
- tqdm — progress tracking
- No GPU required, no external API calls