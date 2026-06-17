# config.py
# ─────────────────────────────────────────────────────────────
# Central configuration for the Redrob candidate ranker.
# All weights, thresholds, and keyword lists live here.
# If you want to tune the ranker, this is the only file
# you need to change.
# ─────────────────────────────────────────────────────────────

import os

# ── Paths ────────────────────────────────────────────────────
BASE_DIR        = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR        = os.path.join(BASE_DIR, "data")
OUTPUT_DIR      = os.path.join(BASE_DIR, "output")

CANDIDATES_FILE = os.path.join(DATA_DIR, "candidates.jsonl")
SAMPLE_FILE     = os.path.join(DATA_DIR, "sample_candidates.json")
OUTPUT_FILE     = os.path.join(OUTPUT_DIR, "submission.csv")

# ── Scoring weights (must sum to 1.0) ────────────────────────
# These control how much each dimension contributes to the
# final score. Tweak these to shift ranking priorities.
WEIGHTS = {
    "skills":       0.30,   # Do they have the right technical skills?
    "career":       0.25,   # Is their career history in the right direction?
    "role_fit":     0.20,   # Does their current title/trajectory match?
    "behavioral":   0.15,   # Are they active and reachable on the platform?
    "location":     0.10,   # Are they in India / willing to relocate?
}

# ── Must-have skills (core requirements from JD) ─────────────
# Candidates with MORE of these score higher in skills dimension.
CORE_SKILLS = [
    # Embeddings & retrieval
    "embeddings", "vector search", "semantic search", "sentence transformers",
    "faiss", "pinecone", "weaviate", "qdrant", "milvus", "opensearch",
    "elasticsearch", "dense retrieval", "hybrid search", "bge", "e5",
    # LLM & NLP
    "llm", "large language model", "nlp", "natural language processing",
    "transformers", "fine-tuning", "lora", "qlora", "peft", "rag",
    "retrieval augmented generation", "reranking", "cross-encoder",
    # Ranking & IR
    "information retrieval", "learning to rank", "ranking", "ndcg", "mrr",
    "recommendation system", "recommender", "search ranking",
    # ML fundamentals
    "machine learning", "deep learning", "pytorch", "tensorflow",
    "scikit-learn", "xgboost", "a/b testing", "evaluation framework",
    # Engineering
    "python", "vector database", "mlops", "model deployment",
    "production ml", "inference optimization",
]

# ── Nice-to-have skills (bonus points) ───────────────────────
BONUS_SKILLS = [
    "open source", "github", "distributed systems", "kafka",
    "spark", "kubernetes", "docker", "redis", "postgresql",
    "data pipeline", "feature store", "airflow",
]

# ── Disqualifying job titles ──────────────────────────────────
# Candidates whose CURRENT title matches these are down-weighted
# heavily — they are not AI/ML engineers.
DISQUALIFY_TITLES = [
    "marketing", "sales", "hr ", "human resource", "recruiter",
    "accountant", "finance", "legal", "operations manager",
    "customer support", "customer service", "content writer",
    "graphic design", "ui designer", "ux designer", "product designer",
    "business development", "supply chain", "logistics",
    "civil engineer", "mechanical engineer", "electrical engineer",
]

# ── Pure consulting company names (soft disqualifier) ────────
# Candidates who have ONLY worked at these are down-weighted.
CONSULTING_ONLY_COMPANIES = [
    "tcs", "tata consultancy", "infosys", "wipro", "accenture",
    "cognizant", "capgemini", "hcl", "tech mahindra", "mphasis",
    "hexaware", "niit technologies", "l&t infotech", "ltimindtree",
]

# ── Good company signals (product companies, startups) ───────
PRODUCT_COMPANY_SIGNALS = [
    "startup", "series a", "series b", "series c", "saas", "product",
    "platform", "ai company", "ml company", "tech company",
]

# ── Location signals ──────────────────────────────────────────
# Preferred cities from the JD
PREFERRED_LOCATIONS = [
    "pune", "noida", "delhi", "ncr", "gurugram", "gurgaon",
    "hyderabad", "mumbai", "bangalore", "bengaluru", "india",
]

# ── Behavioral signal thresholds ─────────────────────────────
# Used to score the redrob_signals object
MAX_INACTIVE_DAYS       = 90    # If inactive > 90 days, penalize
GOOD_RESPONSE_RATE      = 0.5   # 50%+ response rate is good
GOOD_NOTICE_PERIOD_DAYS = 30    # <= 30 days notice is ideal
MAX_NOTICE_PERIOD_DAYS  = 90    # > 90 days is a significant penalty

# ── Experience range from JD ──────────────────────────────────
IDEAL_YOE_MIN = 5
IDEAL_YOE_MAX = 9

# ── Output settings ───────────────────────────────────────────
TOP_N = 100   # How many candidates to output