"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { SCORING_CATEGORIES } from "@/lib/scoring";

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
  [key: string]: string | number | null;
}

function ScorePill({ score }: { score: number | null }) {
  if (score === null || score === undefined) return <span className="text-gray-300">--</span>;
  const colors =
    score >= 4
      ? "bg-emerald-100 text-emerald-800"
      : score >= 3
        ? "bg-amber-100 text-amber-800"
        : "bg-red-100 text-red-800";
  return (
    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${colors}`}>
      {score}
    </span>
  );
}

function avgScore(feedback: Feedback, keys: string[]): number | null {
  const vals = keys
    .map((k) => feedback[k])
    .filter((v): v is number => typeof v === "number");
  if (vals.length === 0) return null;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
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
  const [activeTab, setActiveTab] = useState<"my-feedback" | "compare">("my-feedback");
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);

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
    const [candRes, fbRes, allFbRes] = await Promise.all([
      fetch("/api/candidates"),
      fetch(`/api/feedback?interviewer_id=${interviewer.id}`),
      fetch("/api/feedback"),
    ]);
    setCandidates(await candRes.json());
    setFeedbacks(await fbRes.json());
    setAllFeedbacks(await allFbRes.json());
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
      {/* Header */}
      <header className="bg-white border-b border-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-accent text-white flex items-center justify-center font-bold text-sm">
              IS
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">Interview Scorer</h1>
              <p className="text-xs text-muted">Hardware Engineering Assessment</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
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
        {/* Action bar */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab("my-feedback")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                activeTab === "my-feedback"
                  ? "bg-white text-foreground shadow-sm"
                  : "text-muted hover:text-foreground"
              }`}
            >
              My Feedback
            </button>
            <button
              onClick={() => setActiveTab("compare")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                activeTab === "compare"
                  ? "bg-white text-foreground shadow-sm"
                  : "text-muted hover:text-foreground"
              }`}
            >
              Compare Candidates
            </button>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowAddCandidate(true)}
              className="px-4 py-2 bg-white border border-border rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors cursor-pointer"
            >
              + Add Candidate
            </button>
            <button
              onClick={() => router.push("/feedback")}
              className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors cursor-pointer"
            >
              + New Feedback
            </button>
          </div>
        </div>

        {/* Add candidate modal */}
        {showAddCandidate && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-xl">
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
                    className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
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
                    className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Resume (PDF, DOCX)
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                    className="w-full text-sm"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-accent text-white rounded-lg font-medium hover:bg-blue-700 transition-colors cursor-pointer"
                  >
                    Add Candidate
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddCandidate(false)}
                    className="flex-1 py-2.5 bg-gray-100 rounded-lg font-medium hover:bg-gray-200 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* My Feedback Tab */}
        {activeTab === "my-feedback" && (
          <div className="space-y-6">
            {feedbacks.length === 0 ? (
              <div className="bg-white border border-border rounded-2xl p-12 text-center">
                <p className="text-muted text-lg mb-2">No feedback submitted yet</p>
                <p className="text-sm text-muted">
                  Click &quot;+ New Feedback&quot; to score your first candidate.
                </p>
              </div>
            ) : (
              <div className="bg-white border border-border rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-border">
                        <th className="text-left px-4 py-3 font-semibold">Candidate</th>
                        <th className="text-left px-4 py-3 font-semibold">Position</th>
                        <th className="text-left px-4 py-3 font-semibold">Date</th>
                        {SCORING_CATEGORIES.map((cat) => (
                          <th key={cat.key} className="text-center px-3 py-3 font-semibold whitespace-nowrap">
                            {cat.label}
                          </th>
                        ))}
                        <th className="text-center px-3 py-3 font-semibold">Overall</th>
                        <th className="text-center px-3 py-3 font-semibold">Recommendation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {feedbacks.map((fb) => {
                        const catScores = SCORING_CATEGORIES.map((cat) =>
                          avgScore(fb, cat.subcriteria.map((s) => s.key))
                        );
                        const validScores = catScores.filter((s): s is number => s !== null);
                        const overall =
                          validScores.length > 0
                            ? Math.round((validScores.reduce((a, b) => a + b, 0) / validScores.length) * 10) / 10
                            : null;
                        return (
                          <tr key={fb.id} className="border-b border-border hover:bg-gray-50">
                            <td className="px-4 py-3 font-medium">{fb.candidate_name}</td>
                            <td className="px-4 py-3 text-muted">{fb.candidate_position}</td>
                            <td className="px-4 py-3 text-muted">{fb.interview_date}</td>
                            {catScores.map((score, i) => (
                              <td key={i} className="text-center px-3 py-3">
                                <ScorePill score={score} />
                              </td>
                            ))}
                            <td className="text-center px-3 py-3">
                              <span className="inline-flex items-center justify-center w-10 h-8 rounded-full bg-blue-100 text-blue-800 text-sm font-bold">
                                {overall ?? "--"}
                              </span>
                            </td>
                            <td className="text-center px-3 py-3">
                              <span
                                className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                                  fb.overall_recommendation === "strong_yes"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : fb.overall_recommendation === "yes"
                                      ? "bg-green-100 text-green-800"
                                      : fb.overall_recommendation === "maybe"
                                        ? "bg-amber-100 text-amber-800"
                                        : fb.overall_recommendation === "no"
                                          ? "bg-red-100 text-red-800"
                                          : "bg-gray-100 text-gray-600"
                                }`}
                              >
                                {typeof fb.overall_recommendation === "string" ? fb.overall_recommendation.replace("_", " ").toUpperCase() : "--"}
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

            {/* Comments section */}
            {feedbacks.length > 0 && (
              <div className="bg-white border border-border rounded-2xl p-6">
                <h3 className="font-bold text-lg mb-4">Detailed Comments</h3>
                <div className="space-y-6">
                  {feedbacks.map((fb) => (
                    <div key={fb.id} className="border-b border-border pb-6 last:border-0 last:pb-0">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="font-semibold">{fb.candidate_name}</span>
                        <span className="text-muted">—</span>
                        <span className="text-sm text-muted">{fb.interview_date}</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {SCORING_CATEGORIES.map((cat) => {
                          const comment = fb[cat.commentKey] as string | null;
                          if (!comment) return null;
                          return (
                            <div key={cat.key} className="bg-gray-50 rounded-lg p-3">
                              <p className="text-xs font-semibold text-muted uppercase mb-1">
                                {cat.label}
                              </p>
                              <p className="text-sm">{comment}</p>
                            </div>
                          );
                        })}
                        {fb.overall_comments && (
                          <div className="bg-blue-50 rounded-lg p-3 md:col-span-2">
                            <p className="text-xs font-semibold text-blue-600 uppercase mb-1">
                              Overall Notes
                            </p>
                            <p className="text-sm">{fb.overall_comments as string}</p>
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

        {/* Compare Candidates Tab */}
        {activeTab === "compare" && (
          <div className="space-y-6">
            {/* Candidate selector */}
            <div className="bg-white border border-border rounded-2xl p-6">
              <h3 className="font-bold mb-3">Select Candidates to Compare</h3>
              <div className="flex flex-wrap gap-2">
                {candidates.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => toggleCandidateSelection(c.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors cursor-pointer ${
                      selectedCandidates.includes(c.id)
                        ? "bg-accent text-white border-accent"
                        : "bg-white text-foreground border-border hover:bg-gray-50"
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
              <div className="bg-white border border-border rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-border">
                        <th className="text-left px-4 py-3 font-semibold sticky left-0 bg-gray-50 z-[1]">
                          Category
                        </th>
                        {comparisonCandidates.map((c) => (
                          <th key={c.id} className="text-center px-6 py-3 font-semibold">
                            <div>{c.name}</div>
                            <div className="text-xs text-muted font-normal">{c.position}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {SCORING_CATEGORIES.map((cat) => (
                        <>
                          <tr key={cat.key} className="bg-gray-50/50">
                            <td className="px-4 py-2 font-semibold text-accent sticky left-0 bg-gray-50/50">
                              {cat.label}
                            </td>
                            {comparisonCandidates.map((c) => {
                              const candidateFbs = allFeedbacks.filter(
                                (f) => f.candidate_id === c.id
                              );
                              const scores = candidateFbs.map((fb) =>
                                avgScore(fb, cat.subcriteria.map((s) => s.key))
                              ).filter((s): s is number => s !== null);
                              const avg = scores.length > 0
                                ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
                                : null;
                              return (
                                <td key={c.id} className="text-center px-6 py-2">
                                  <span className="font-bold text-lg">{avg ?? "--"}</span>
                                  <span className="text-xs text-muted ml-1">
                                    ({scores.length} review{scores.length !== 1 ? "s" : ""})
                                  </span>
                                </td>
                              );
                            })}
                          </tr>
                          {cat.subcriteria.map((sc) => (
                            <tr key={sc.key} className="border-b border-border/50">
                              <td className="px-4 py-2 pl-8 text-muted sticky left-0 bg-white">
                                {sc.label}
                              </td>
                              {comparisonCandidates.map((c) => {
                                const candidateFbs = allFeedbacks.filter(
                                  (f) => f.candidate_id === c.id
                                );
                                const scores = candidateFbs
                                  .map((fb) => fb[sc.key])
                                  .filter((v): v is number => typeof v === "number");
                                const avg = scores.length > 0
                                  ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
                                  : null;
                                return (
                                  <td key={c.id} className="text-center px-6 py-2">
                                    <ScorePill score={avg} />
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </>
                      ))}
                      {/* Overall row */}
                      <tr className="bg-blue-50 border-t-2 border-accent">
                        <td className="px-4 py-3 font-bold sticky left-0 bg-blue-50">
                          Overall Average
                        </td>
                        {comparisonCandidates.map((c) => {
                          const candidateFbs = allFeedbacks.filter(
                            (f) => f.candidate_id === c.id
                          );
                          const allKeys = SCORING_CATEGORIES.flatMap((cat) =>
                            cat.subcriteria.map((s) => s.key)
                          );
                          const allScores = candidateFbs.flatMap((fb) =>
                            allKeys.map((k) => fb[k]).filter((v): v is number => typeof v === "number")
                          );
                          const overall = allScores.length > 0
                            ? Math.round((allScores.reduce((a, b) => a + b, 0) / allScores.length) * 10) / 10
                            : null;
                          return (
                            <td key={c.id} className="text-center px-6 py-3">
                              <span className="text-xl font-bold text-accent">{overall ?? "--"}</span>
                            </td>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Comparison comments */}
            {comparisonCandidates.length > 0 && (
              <div className="bg-white border border-border rounded-2xl p-6">
                <h3 className="font-bold text-lg mb-4">All Interviewer Comments</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {comparisonCandidates.map((c) => {
                    const candidateFbs = allFeedbacks.filter(
                      (f) => f.candidate_id === c.id
                    );
                    return (
                      <div key={c.id} className="border border-border rounded-xl p-4">
                        <h4 className="font-semibold text-lg mb-1">{c.name}</h4>
                        <p className="text-xs text-muted mb-3">{c.position}</p>
                        {candidateFbs.length === 0 ? (
                          <p className="text-sm text-muted">No feedback yet</p>
                        ) : (
                          <div className="space-y-4">
                            {candidateFbs.map((fb) => (
                              <div key={fb.id} className="bg-gray-50 rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-sm font-medium">{fb.interviewer_name}</span>
                                  <span className="text-xs text-muted">({fb.interviewer_role})</span>
                                  <span className="text-xs text-muted ml-auto">{fb.interview_date}</span>
                                </div>
                                {SCORING_CATEGORIES.map((cat) => {
                                  const comment = fb[cat.commentKey] as string | null;
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
                                    <span className="text-xs font-semibold text-blue-600 uppercase">
                                      Overall:
                                    </span>{" "}
                                    <span className="text-sm">{fb.overall_comments as string}</span>
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
      </main>
    </div>
  );
}
