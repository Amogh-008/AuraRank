import type { RankResponse, RankedCandidate } from "./types";

const KEY = "ranked_response_v2";

export function saveRankedResponse(data: unknown) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(data));
  } catch (e) {
    console.error("Failed to persist ranked data", e);
  }
}

export function loadRankedResponse(): RankResponse | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    return normalize(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function clearRankedResponse() {
  sessionStorage.removeItem(KEY);
}

function normalize(payload: any): RankResponse {
  const rawResults: any[] = Array.isArray(payload?.results)
    ? payload.results
    : Array.isArray(payload)
      ? payload
      : (payload?.candidates ?? payload?.ranked ?? payload?.data ?? []);

  const results: RankedCandidate[] = rawResults
    .map((r: any, i: number) => {
      const profile = r?.candidate_data?.profile ?? r?.profile ?? {};
      const score = num(r.final_score ?? r.score ?? 0);

      return {
        id: String(
          r.id ??
          r.candidate_id ??
          profile.anonymized_name ??
          `cand_${i}`
        ),

        rank: num(r.rank ?? i + 1),

        final_score: score,

        career_score: num(
          r.career_score ??
          r.career_quality ??
          score
        ),

        behavioral_score: num(
          r.behavioral_score ??
          r.behavioral ??
          score
        ),

        role_fit_score: num(
          r.role_fit_score ??
          r.role_fit ??
          score
        ),

        skills_score: num(
          r.skills_score ??
          r.skills_match ??
          score
        ),

        location_score: num(
          r.location_score ??
          score
        ),

        is_honeypot: Boolean(
          r.is_honeypot ??
          r.honeypot ??
          false
        ),

        red_flags: Array.isArray(r.red_flags)
          ? r.red_flags
          : [],

        candidate_data: {
          profile: {
            anonymized_name: String(
              profile.anonymized_name ??
              profile.name ??
              `Candidate ${i + 1}`
            ),

            current_title: String(
              profile.current_title ??
              profile.title ??
              "—"
            ),

            years_of_experience: num(
              profile.years_of_experience ??
              profile.experience_years ??
              0
            ),

            location: profile.location ?? undefined,

            skills: Array.isArray(profile.skills)
              ? profile.skills
              : [],

            summary:
              profile.summary ??
              profile.bio ??
              "",
          },
        },
      };
    })
    .sort((a, b) => b.final_score - a.final_score)
    .map((c, i) => ({
      ...c,
      rank: i + 1,
    }));

  return {
    count: num(payload?.count ?? results.length),
    honeypots: num(payload?.honeypots ?? 0),
    results,
  } as RankResponse;
}

function num(v: any): number {
  const n =
    typeof v === "number"
      ? v
      : parseFloat(v);

  return Number.isFinite(n)
    ? n
    : 0;
}