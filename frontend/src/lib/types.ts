// Shape returned by POST /rank — matches the Python backend exactly.

export type RankedProfile = {
  anonymized_name: string;
  current_title: string;
  years_of_experience: number;
  location?: string;
  skills?: string[];
  summary?: string;
};

export type RankedCandidate = {
  id: string;
  rank: number;
  final_score: number;
  career_score: number;
  behavioral_score: number;
  role_fit_score: number;
  skills_score: number;
  location_score: number;
  is_honeypot: boolean;
  red_flags: string[];
  candidate_data: {
    profile: RankedProfile;
  };
};

export type RankResponse = {
  count: number;
  honeypots: number;
  results: RankedCandidate[];
};