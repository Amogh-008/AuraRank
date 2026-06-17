# AuraRank – AI Candidate Ranking Platform

## Overview

AuraRank is an AI-powered candidate ranking system designed to help recruiters quickly identify top talent from large candidate pools.

The platform evaluates candidates across five dimensions:

* Skills Match
* Career Progression
* Role Fit
* Behavioral Signals
* Location Compatibility

It also detects and filters potential honeypot candidates before generating a ranked shortlist.

---

## Features

* Upload candidate dataset (JSON/JSONL)
* AI-powered candidate scoring
* Multi-dimensional ranking engine
* Honeypot detection
* Top candidate shortlist generation
* FastAPI backend
* React + TypeScript frontend
* Real-time dashboard analytics

---

## Tech Stack

### Frontend

* React
* TypeScript
* TanStack Router
* Tailwind CSS
* Framer Motion

### Backend

* Python
* FastAPI

---

## Architecture

Candidate Dataset
↓
FastAPI Backend
↓
Scoring Engine
↓
Honeypot Detection
↓
Ranking Pipeline
↓
React Dashboard

---

## Running Locally

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn api:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## Results

* 500 candidates processed
* 485 ranked candidates
* 15 honeypots detected
* Top candidates shortlisted automatically

---

## Author

Amogh Gaur
ABES Engineering College
CSE AIML
