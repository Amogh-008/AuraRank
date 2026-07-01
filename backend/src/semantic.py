from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

# Load model only once
model = SentenceTransformer("all-MiniLM-L6-v2")

# Cache the JD embedding
_cached_jd = None
_cached_text = ""


def candidate_to_text(candidate):

    profile = candidate.get("profile", {})

    headline = profile.get("headline", "")
    summary = profile.get("summary", "")
    current_title = profile.get("current_title", "")
    location = profile.get("location", "")

    skills = " ".join(
        s.get("name", "")
        for s in candidate.get("skills", [])
    )

    experience = " ".join(
        " ".join([
            job.get("title", ""),
            job.get("company", ""),
            job.get("description", "")
        ])
        for job in candidate.get("career_history", [])
    )

    return " ".join([
        headline,
        summary,
        current_title,
        location,
        skills,
        experience
    ])


_cached_jd = None
_cached_text = ""


def get_jd_embedding(job_description):

    global _cached_jd
    global _cached_text

    if job_description != _cached_text:

        _cached_text = job_description

        _cached_jd = model.encode(
            job_description,
            convert_to_numpy=True
        )

    return _cached_jd


def semantic_similarity_batch(candidates, job_description):

    jd_embedding = get_jd_embedding(job_description)

    texts = [
        candidate_to_text(c)
        for c in candidates
    ]

    candidate_embeddings = model.encode(

        texts,

        batch_size=64,

        convert_to_numpy=True,

        show_progress_bar=True

    )

    similarities = cosine_similarity(

        candidate_embeddings,

        [jd_embedding]

    ).flatten()

    similarities = (similarities + 1) / 2

    return similarities.tolist()

def semantic_similarity(candidate, job_description):
    """
    Wrapper around batch semantic similarity.
    Allows features.py to keep using the old function.
    """

    return semantic_similarity_batch(
        [candidate],
        job_description
    )[0]