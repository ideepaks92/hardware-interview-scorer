"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { SCORING_CATEGORIES, computeWeightedOverall } from "@/lib/scoring";
import { PROBLEM_STATEMENTS } from "@/lib/problems";
import ThemeToggle from "@/components/ThemeToggle";

interface Interviewer {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Candidate {
  id: string;
  name: string;
  position: string;
  resume_filename: string | null;
}

interface Feedback {
  id: string;
  candidate_id: string;
  candidate_name: string;
  candidate_position: string;
  interviewer_name: string;
  interviewer_role: string;
  interview_date: string;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  [key: string]: string | number | null | undefined;
}

interface FeedbackImage {
  id: string;
  feedback_id: string;
  filename: string;
  mime_type: string;
  image_data: string;
  caption: string | null;
}

function ScorePill({ score }: { score: number | null }) {
  if (score === null || score === undefined)
    return <span className="text-muted">--</span>;
  const colors =
    score >= 4
      ? "bg-score-high-bg text-score-high-text"
      : score >= 3
        ? "bg-score-mid-bg text-score-mid-text"
        : "bg-score-low-bg text-score-low-text";
  return (
    <span
      className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${colors}`}
    >
      {score}
    </span>
  );
}

function parseProblemTags(raw: string | number | null | undefined): string[] {
  if (!raw || typeof raw !== "string") return [];
  try {
    const ids = JSON.parse(raw) as string[];
    return ids
      .map((id) => PROBLEM_STATEMENTS.find((p) => p.id === id)?.title)
      .filter((t): t is string => !!t);
  } catch {
    return [];
  }
}

function avgScore(feedback: Feedback, keys: string[]): number | null {
  const vals = keys
    .map((k) => feedback[k])
    .filter((v): v is number => typeof v === "number" && v > 0);
  if (vals.length === 0) return null;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
}

function weightedOverallFromFeedback(fb: Feedback): number | null {
  const score = computeWeightedOverall(fb as Record<string, number | string | null>);
  return score > 0 ? Math.round(score * 10) / 10 : null;
}

export default function DashboardPage() {
  const router = useRouter();
  const [interviewer, setInterviewer] = useState<Interviewer | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [allFeedbacks, setAllFeedbacks] = useState<Feedback[]>([]);
  const [showAddCandidate, setShowAddCandidate] = useState(false);
  const [newCandidateName, setNewCandidateName] = useState("");
  const [newCandidatePosition, setNewCandidatePosition] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState<"my-feedback" | "compare" | "all-feedback">(
    "my-feedback"
  );
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [myAllFeedbacks, setMyAllFeedbacks] = useState<Feedback[]>([]);
  const [feedbackImages, setFeedbackImages] = useState<Record<string, FeedbackImage[]>>({});
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("interviewer");
    if (!stored) {
      router.push("/");
      return;
    }
    setInterviewer(JSON.parse(stored));
  }, [router]);

  const fetchData = useCallback(async () => {
    if (!interviewer) return;
    const [candRes, fbRes, allFbRes, myAllFbRes] = await Promise.all([
      fetch("/api/candidates"),
      fetch(`/api/feedback?interviewer_id=${interviewer.id}`),
      fetch("/api/feedback"),
      fetch(`/api/feedback?interviewer_id=${interviewer.id}&include_drafts=true`),
    ]);
    setCandidates(await candRes.json());
    const myFb = await fbRes.json();
    const allFb = await allFbRes.json();
    const myAllFb = await myAllFbRes.json();
    setFeedbacks(myFb);
    setAllFeedbacks(allFb);
    setMyAllFeedbacks(myAllFb);

    const allIds = [...new Set([...myFb, ...allFb].map((f: Feedback) => f.id))];
    const imageMap: Record<string, FeedbackImage[]> = {};
    await Promise.all(
      allIds.map(async (id) => {
        try {
          const res = await fetch(`/api/feedback/${id}/images`);
          if (res.ok) {
            const imgs = await res.json();
            if (imgs.length > 0) imageMap[id as string] = imgs;
          }
        } catch { /* skip */ }
      })
    );
    setFeedbackImages(imageMap);
  }, [interviewer]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function addCandidate(e: React.FormEvent) {
    e.preventDefault();
    const formData = new FormData();
    formData.append("name", newCandidateName);
    formData.append("position", newCandidatePosition);
    if (resumeFile) formData.append("resume", resumeFile);

    await fetch("/api/candidates", { method: "POST", body: formData });
    setNewCandidateName("");
    setNewCandidatePosition("");
    setResumeFile(null);
    setShowAddCandidate(false);
    fetchData();
  }

  function toggleCandidateSelection(id: string) {
    setSelectedCandidates((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }

  function logout() {
    localStorage.removeItem("interviewer");
    router.push("/");
  }

  if (!interviewer) return null;

  const comparisonCandidates = candidates.filter((c) =>
    selectedCandidates.includes(c.id)
  );

  return (
    <div className="min-h-screen">
      <header className="bg-surface border-b border-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-accent text-white flex items-center justify-center font-bold text-sm">
              IS
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">
                Interview Scorer
              </h1>
              <p className="text-xs text-muted">
                Hardware Engineering Assessment
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <div className="text-right">
              <p className="text-sm font-medium">{interviewer.name}</p>
              <p className="text-xs text-muted">{interviewer.role}</p>
            </div>
            <button
              onClick={logout}
              className="text-sm text-muted hover:text-danger transition-colors cursor-pointer"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex gap-1 bg-surface-secondary rounded-lg p-1">
            <button
              onClick={() => setActiveTab("my-feedback")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                activeTab === "my-feedback"
                  ? "bg-surface text-foreground shadow-sm"
                  : "text-muted hover:text-foreground"
              }`}
            >
              My Feedback
            </button>
            <button
              onClick={() => setActiveTab("compare")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                activeTab === "compare"
                  ? "bg-surface text-foreground shadow-sm"
                  : "text-muted hover:text-foreground"
              }`}
            >
              Compare Candidates
            </button>
            <button
              onClick={() => setActiveTab("all-feedback")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                activeTab === "all-feedback"
                  ? "bg-surface text-foreground shadow-sm"
                  : "text-muted hover:text-foreground"
              }`}
            >
              All Feedback
              {myAllFeedbacks.filter((f) => f.status === "draft").length > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                  {myAllFeedbacks.filter((f) => f.status === "draft").length}
                </span>
              )}
            </button>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowAddCandidate(true)}
              className="px-4 py-2 bg-surface border border-border rounded-lg text-sm font-medium hover:bg-surface-secondary transition-colors cursor-pointer"
            >
              + Add Candidate
            </button>
            <button
              onClick={() => router.push("/feedback")}
              className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-hover transition-colors cursor-pointer"
            >
              + New Feedback
            </button>
          </div>
        </div>

        {showAddCandidate && (
          <div className="fixed inset-0 bg-overlay flex items-center justify-center z-50">
            <div className="bg-surface rounded-2xl p-8 w-full max-w-md shadow-xl border border-border">
              <h2 className="text-xl font-bold mb-6">Add New Candidate</h2>
              <form onSubmit={addCandidate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Candidate Name
                  </label>
                  <input
                    type="text"
                    value={newCandidateName}
                    onChange={(e) => setNewCandidateName(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Position Applied For
                  </label>
                  <input
                    type="text"
                    value={newCandidatePosition}
                    onChange={(e) => setNewCandidatePosition(e.target.value)}
                    className="w-full px-4 py-2.5 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Resume (PDF, DOCX)
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) =>
                      setResumeFile(e.target.files?.[0] || null)
                    }
                    className="w-full text-sm"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-accent text-white rounded-lg font-medium hover:bg-accent-hover transition-colors cursor-pointer"
                  >
                    Add Candidate
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddCandidate(false)}
                    className="flex-1 py-2.5 bg-surface-secondary rounded-lg font-medium hover:bg-surface-tertiary transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {activeTab === "my-feedback" && (
          <div className="space-y-6">
            {feedbacks.length === 0 ? (
              <div className="bg-surface border border-border rounded-2xl p-12 text-center">
                <p className="text-muted text-lg mb-2">
                  No feedback submitted yet
                </p>
                <p className="text-sm text-muted">
                  Click &quot;+ New Feedback&quot; to score your first candidate.
                </p>
              </div>
            ) : (
              <div className="bg-surface border border-border rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-surface-secondary border-b border-border">
                        <th className="text-left px-4 py-3 font-semibold">
                          Candidate
                        </th>
                        <th className="text-left px-4 py-3 font-semibold">
                          Position
                        </th>
                        <th className="text-left px-4 py-3 font-semibold">
                          Date
                        </th>
                        <th className="text-left px-4 py-3 font-semibold">
                          Problems
                        </th>
                        {SCORING_CATEGORIES.map((cat) => (
                          <th
                            key={cat.key}
                            className="text-center px-3 py-3 font-semibold whitespace-nowrap"
                          >
                            <div>{cat.label}</div>
                            <div className="text-[10px] font-normal text-muted">
                              {Math.round(cat.weight * 100)}%
                            </div>
                          </th>
                        ))}
                        <th className="text-center px-3 py-3 font-semibold">
                          Weighted
                        </th>
                        <th className="text-center px-3 py-3 font-semibold">
                          Rec
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {feedbacks.map((fb) => {
                        const catScores = SCORING_CATEGORIES.map((cat) =>
                          avgScore(
                            fb,
                            cat.subcriteria.map((s) => s.key)
                          )
                        );
                        const overall = weightedOverallFromFeedback(fb);
                        return (
                          <tr
                            key={fb.id}
                            className="border-b border-border hover:bg-surface-secondary transition-colors"
                          >
                            <td className="px-4 py-3 font-medium">
                              {fb.candidate_name}
                            </td>
                            <td className="px-4 py-3 text-muted">
                              {fb.candidate_position}
                            </td>
                            <td className="px-4 py-3 text-muted">
                              {fb.interview_date}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-1">
                                {parseProblemTags(fb.problem_statements).map(
                                  (t) => (
                                    <span
                                      key={t}
                                      className="inline-block px-2 py-0.5 rounded bg-accent-light text-accent text-xs font-medium"
                                    >
                                      {t}
                                    </span>
                                  )
                                )}
                                {parseProblemTags(fb.problem_statements)
                                  .length === 0 && (
                                  <span className="text-muted text-xs">
                                    --
                                  </span>
                                )}
                              </div>
                            </td>
                            {catScores.map((score, i) => (
                              <td key={i} className="text-center px-3 py-3">
                                <ScorePill score={score} />
                              </td>
                            ))}
                            <td className="text-center px-3 py-3">
                              <span className="inline-flex items-center justify-center w-10 h-8 rounded-full bg-accent-light text-accent text-sm font-bold">
                                {overall ?? "--"}
                              </span>
                            </td>
                            <td className="text-center px-3 py-3">
                              <span
                                className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                                  fb.overall_recommendation === "strong_yes"
                                    ? "bg-score-high-bg text-score-high-text"
                                    : fb.overall_recommendation === "yes"
                                      ? "bg-score-high-bg text-score-high-text"
                                      : fb.overall_recommendation === "maybe"
                                        ? "bg-score-mid-bg text-score-mid-text"
                                        : fb.overall_recommendation === "no"
                                          ? "bg-score-low-bg text-score-low-text"
                                          : "bg-surface-secondary text-muted"
                                }`}
                              >
                                {typeof fb.overall_recommendation === "string"
                                  ? fb.overall_recommendation
                                      .replace("_", " ")
                                      .toUpperCase()
                                  : "--"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {feedbacks.length > 0 && (
              <div className="bg-surface border border-border rounded-2xl p-6">
                <h3 className="font-bold text-lg mb-4">Detailed Comments</h3>
                <div className="space-y-6">
                  {feedbacks.map((fb) => (
                    <div
                      key={fb.id}
                      className="border-b border-border pb-6 last:border-0 last:pb-0"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <span className="font-semibold">
                          {fb.candidate_name}
                        </span>
                        <span className="text-muted">—</span>
                        <span className="text-sm text-muted">
                          {fb.interview_date}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {SCORING_CATEGORIES.map((cat) => {
                          const comment = fb[cat.commentKey] as string | null;
                          if (!comment) return null;
                          return (
                            <div
                              key={cat.key}
                              className="bg-surface-secondary rounded-lg p-3"
                            >
                              <p className="text-xs font-semibold text-muted uppercase mb-1">
                                {cat.label}
                              </p>
                              <p className="text-sm">{comment}</p>
                            </div>
                          );
                        })}
                        {fb.overall_comments && (
                          <div className="bg-accent-light rounded-lg p-3 md:col-span-2">
                            <p className="text-xs font-semibold text-accent uppercase mb-1">
                              Overall Notes
                            </p>
                            <p className="text-sm">
                              {fb.overall_comments as string}
                            </p>
                          </div>
                        )}
                        {feedbackImages[fb.id] && feedbackImages[fb.id].length > 0 && (
                          <div className="md:col-span-2">
                            <p className="text-xs font-semibold text-muted uppercase mb-2">
                              Screenshots & Whiteboard Photos
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                              {feedbackImages[fb.id].map((img) => (
                                <button
                                  key={img.id}
                                  type="button"
                                  onClick={() => setLightboxImage(`data:${img.mime_type};base64,${img.image_data}`)}
                                  className="rounded-lg overflow-hidden border border-border hover:border-accent transition-colors cursor-pointer"
                                >
                                  <img
                                    src={`data:${img.mime_type};base64,${img.image_data}`}
                                    alt={img.filename}
                                    className="w-full h-24 object-cover"
                                  />
                                  <p className="text-[10px] text-muted truncate px-1.5 py-1 bg-surface-secondary">
                                    {img.filename}
                                  </p>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "compare" && (
          <div className="space-y-6">
            <div className="bg-surface border border-border rounded-2xl p-6">
              <h3 className="font-bold mb-3">Select Candidates to Compare</h3>
              <div className="flex flex-wrap gap-2">
                {candidates.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => toggleCandidateSelection(c.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors cursor-pointer ${
                      selectedCandidates.includes(c.id)
                        ? "bg-accent text-white border-accent"
                        : "bg-surface text-foreground border-border hover:bg-surface-secondary"
                    }`}
                  >
                    {c.name}
                    {c.position && (
                      <span className="ml-1 opacity-60">({c.position})</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {comparisonCandidates.length > 0 && (
              <div className="bg-surface border border-border rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-surface-secondary border-b border-border">
                        <th className="text-left px-4 py-3 font-semibold sticky left-0 bg-surface-secondary z-[1]">
                          Category
                        </th>
                        {comparisonCandidates.map((c) => (
                          <th
                            key={c.id}
                            className="text-center px-6 py-3 font-semibold"
                          >
                            <div>{c.name}</div>
                            <div className="text-xs text-muted font-normal">
                              {c.position}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {SCORING_CATEGORIES.map((cat) => (
                        <>
                          <tr key={cat.key} className="bg-surface-secondary/50">
                            <td className="px-4 py-2 font-semibold text-accent sticky left-0 bg-surface-secondary/50">
                              <div>{cat.label}</div>
                              <div className="text-[10px] font-normal text-muted">
                                {Math.round(cat.weight * 100)}% weight
                              </div>
                            </td>
                            {comparisonCandidates.map((c) => {
                              const candidateFbs = allFeedbacks.filter(
                                (f) => f.candidate_id === c.id
                              );
                              const scores = candidateFbs
                                .map((fb) =>
                                  avgScore(
                                    fb,
                                    cat.subcriteria.map((s) => s.key)
                                  )
                                )
                                .filter((s): s is number => s !== null);
                              const avg =
                                scores.length > 0
                                  ? Math.round(
                                      (scores.reduce((a, b) => a + b, 0) /
                                        scores.length) *
                                        10
                                    ) / 10
                                  : null;
                              return (
                                <td
                                  key={c.id}
                                  className="text-center px-6 py-2"
                                >
                                  <span className="font-bold text-lg">
                                    {avg ?? "--"}
                                  </span>
                                  <span className="text-xs text-muted ml-1">
                                    ({scores.length} review
                                    {scores.length !== 1 ? "s" : ""})
                                  </span>
                                </td>
                              );
                            })}
                          </tr>
                          {cat.subcriteria.map((sc) => (
                            <tr
                              key={sc.key}
                              className="border-b border-border/50"
                            >
                              <td className="px-4 py-2 pl-8 text-muted sticky left-0 bg-surface">
                                {sc.label}
                              </td>
                              {comparisonCandidates.map((c) => {
                                const candidateFbs = allFeedbacks.filter(
                                  (f) => f.candidate_id === c.id
                                );
                                const scores = candidateFbs
                                  .map((fb) => fb[sc.key])
                                  .filter(
                                    (v): v is number =>
                                      typeof v === "number" && v > 0
                                  );
                                const avg =
                                  scores.length > 0
                                    ? Math.round(
                                        (scores.reduce((a, b) => a + b, 0) /
                                          scores.length) *
                                          10
                                      ) / 10
                                    : null;
                                return (
                                  <td
                                    key={c.id}
                                    className="text-center px-6 py-2"
                                  >
                                    <ScorePill score={avg} />
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </>
                      ))}
                      <tr className="bg-accent-light border-t-2 border-accent">
                        <td className="px-4 py-3 font-bold sticky left-0 bg-accent-light">
                          Weighted Overall
                        </td>
                        {comparisonCandidates.map((c) => {
                          const candidateFbs = allFeedbacks.filter(
                            (f) => f.candidate_id === c.id
                          );
                          const overalls = candidateFbs
                            .map((fb) => weightedOverallFromFeedback(fb))
                            .filter((s): s is number => s !== null);
                          const avg =
                            overalls.length > 0
                              ? Math.round(
                                  (overalls.reduce((a, b) => a + b, 0) /
                                    overalls.length) *
                                    10
                                ) / 10
                              : null;
                          return (
                            <td
                              key={c.id}
                              className="text-center px-6 py-3"
                            >
                              <span className="text-xl font-bold text-accent">
                                {avg ?? "--"}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {comparisonCandidates.length > 0 && (
              <div className="bg-surface border border-border rounded-2xl p-6">
                <h3 className="font-bold text-lg mb-4">
                  All Interviewer Comments
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {comparisonCandidates.map((c) => {
                    const candidateFbs = allFeedbacks.filter(
                      (f) => f.candidate_id === c.id
                    );
                    return (
                      <div
                        key={c.id}
                        className="border border-border rounded-xl p-4"
                      >
                        <h4 className="font-semibold text-lg mb-1">
                          {c.name}
                        </h4>
                        <p className="text-xs text-muted mb-3">{c.position}</p>
                        {candidateFbs.length === 0 ? (
                          <p className="text-sm text-muted">No feedback yet</p>
                        ) : (
                          <div className="space-y-4">
                            {candidateFbs.map((fb) => (
                              <div
                                key={fb.id}
                                className="bg-surface-secondary rounded-lg p-3"
                              >
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-sm font-medium">
                                    {fb.interviewer_name}
                                  </span>
                                  <span className="text-xs text-muted">
                                    ({fb.interviewer_role})
                                  </span>
                                  <span className="text-xs text-muted ml-auto">
                                    {fb.interview_date}
                                  </span>
                                </div>
                                {parseProblemTags(fb.problem_statements)
                                  .length > 0 && (
                                  <div className="flex flex-wrap gap-1 mb-2">
                                    {parseProblemTags(
                                      fb.problem_statements
                                    ).map((t) => (
                                      <span
                                        key={t}
                                        className="inline-block px-2 py-0.5 rounded bg-accent-light text-accent text-xs font-medium"
                                      >
                                        {t}
                                      </span>
                                    ))}
                                  </div>
                                )}
                                {SCORING_CATEGORIES.map((cat) => {
                                  const comment = fb[cat.commentKey] as
                                    | string
                                    | null;
                                  if (!comment) return null;
                                  return (
                                    <div key={cat.key} className="mb-2">
                                      <span className="text-xs font-semibold text-muted uppercase">
                                        {cat.label}:
                                      </span>{" "}
                                      <span className="text-sm">{comment}</span>
                                    </div>
                                  );
                                })}
                                {fb.overall_comments && (
                                  <div className="mt-2 pt-2 border-t border-border">
                                    <span className="text-xs font-semibold text-accent uppercase">
                                      Overall:
                                    </span>{" "}
                                    <span className="text-sm">
                                      {fb.overall_comments as string}
                                    </span>
                                  </div>
                                )}
                                {feedbackImages[fb.id] && feedbackImages[fb.id].length > 0 && (
                                  <div className="mt-2 pt-2 border-t border-border">
                                    <p className="text-xs font-semibold text-muted uppercase mb-1.5">
                                      Screenshots
                                    </p>
                                    <div className="flex gap-2 flex-wrap">
                                      {feedbackImages[fb.id].map((img) => (
                                        <button
                                          key={img.id}
                                          type="button"
                                          onClick={() => setLightboxImage(`data:${img.mime_type};base64,${img.image_data}`)}
                                          className="rounded overflow-hidden border border-border hover:border-accent transition-colors cursor-pointer"
                                        >
                                          <img
                                            src={`data:${img.mime_type};base64,${img.image_data}`}
                                            alt={img.filename}
                                            className="w-16 h-16 object-cover"
                                          />
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "all-feedback" && (
          <div className="space-y-4">
            {myAllFeedbacks.length === 0 ? (
              <div className="bg-surface border border-border rounded-2xl p-12 text-center">
                <p className="text-muted text-lg mb-2">No feedback yet</p>
                <p className="text-sm text-muted">
                  Click &quot;+ New Feedback&quot; to get started.
                </p>
              </div>
            ) : (
              myAllFeedbacks.map((fb) => {
                const isDraft = fb.status === "draft";
                const overall = weightedOverallFromFeedback(fb);
                const problems = parseProblemTags(fb.problem_statements);
                const ts = fb.updated_at || fb.created_at;
                const dateStr = ts
                  ? new Date(ts + (ts.includes("Z") ? "" : "Z")).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })
                  : fb.interview_date;

                return (
                  <div
                    key={fb.id}
                    className={`bg-surface border rounded-2xl p-5 ${isDraft ? "border-amber-500/50" : "border-border"}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-semibold text-base">
                            {fb.candidate_name}
                          </span>
                          {fb.candidate_position && (
                            <span className="text-sm text-muted">
                              — {fb.candidate_position}
                            </span>
                          )}
                          {isDraft ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 text-xs font-semibold">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                              Draft
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-score-high-bg text-score-high-text text-xs font-semibold">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Submitted
                            </span>
                          )}
                          {typeof fb.overall_recommendation === "string" && (
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                fb.overall_recommendation === "strong_yes" || fb.overall_recommendation === "yes"
                                  ? "bg-score-high-bg text-score-high-text"
                                  : fb.overall_recommendation === "maybe"
                                    ? "bg-score-mid-bg text-score-mid-text"
                                    : fb.overall_recommendation === "no" || fb.overall_recommendation === "strong_no"
                                      ? "bg-score-low-bg text-score-low-text"
                                      : "bg-surface-secondary text-muted"
                              }`}
                            >
                              {fb.overall_recommendation.replace("_", " ").toUpperCase()}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-sm text-muted mt-1 flex-wrap">
                          <span>Interview: {fb.interview_date}</span>
                          <span className="text-border">|</span>
                          <span>{isDraft ? "Last saved" : "Submitted"}: {dateStr}</span>
                          {typeof fb.time_spent_seconds === "number" && fb.time_spent_seconds > 0 && (
                            <>
                              <span className="text-border">|</span>
                              <span className="inline-flex items-center gap-1">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {fb.time_spent_seconds >= 60
                                  ? `${Math.floor(fb.time_spent_seconds / 60)}m ${fb.time_spent_seconds % 60}s`
                                  : `${fb.time_spent_seconds}s`}
                              </span>
                            </>
                          )}
                        </div>

                        {problems.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {problems.map((t) => (
                              <span
                                key={t}
                                className="inline-block px-2 py-0.5 rounded bg-accent-light text-accent text-xs font-medium"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        )}

                        {overall !== null && (
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs text-muted">Weighted score:</span>
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-accent-light text-accent text-sm font-bold">
                              {overall}
                            </span>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => router.push(`/feedback?edit=${fb.id}`)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-surface-secondary border border-border rounded-lg text-sm font-medium hover:bg-surface-tertiary transition-colors cursor-pointer flex-shrink-0"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        {isDraft ? "Continue" : "Edit"}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {lightboxImage && (
          <div
            className="fixed inset-0 bg-overlay z-50 flex items-center justify-center p-4"
            onClick={() => setLightboxImage(null)}
          >
            <div className="relative max-w-4xl max-h-[90vh]">
              <img
                src={lightboxImage}
                alt="Full size"
                className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
              />
              <button
                onClick={() => setLightboxImage(null)}
                className="absolute -top-3 -right-3 w-8 h-8 bg-surface border border-border rounded-full flex items-center justify-center text-foreground hover:bg-surface-secondary cursor-pointer shadow-lg"
              >
                &times;
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
