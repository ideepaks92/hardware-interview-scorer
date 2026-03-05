"use client";

import { useEffect, useState } from "react";
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
}

const SCORE_LABELS: Record<number, string> = {
  1: "Poor",
  2: "Below Avg",
  3: "Average",
  4: "Good",
  5: "Excellent",
};

const RECOMMENDATION_OPTIONS = [
  { value: "strong_yes", label: "Strong Yes", color: "bg-emerald-500" },
  { value: "yes", label: "Yes", color: "bg-green-500" },
  { value: "maybe", label: "Maybe", color: "bg-amber-500" },
  { value: "no", label: "No", color: "bg-red-500" },
  { value: "strong_no", label: "Strong No", color: "bg-red-700" },
];

export default function FeedbackPage() {
  const router = useRouter();
  const [interviewer, setInterviewer] = useState<Interviewer | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState("");
  const [interviewDate, setInterviewDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [scores, setScores] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [recommendation, setRecommendation] = useState("");
  const [overallComments, setOverallComments] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("interviewer");
    if (!stored) {
      router.push("/");
      return;
    }
    setInterviewer(JSON.parse(stored));

    fetch("/api/candidates")
      .then((r) => r.json())
      .then(setCandidates);
  }, [router]);

  function setScore(key: string, value: number) {
    setScores((prev) => ({ ...prev, [key]: value }));
  }

  function setComment(key: string, value: string) {
    setComments((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!interviewer || !selectedCandidate) return;
    setSubmitting(true);

    const body: Record<string, string | number | null> = {
      interviewer_id: interviewer.id,
      candidate_id: selectedCandidate,
      interview_date: interviewDate,
      overall_recommendation: recommendation || null,
      overall_comments: overallComments || null,
    };

    SCORING_CATEGORIES.forEach((cat) => {
      cat.subcriteria.forEach((sc) => {
        body[sc.key] = scores[sc.key] || null;
      });
      body[cat.commentKey] = comments[cat.commentKey] || null;
    });

    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      setSuccess(true);
      setTimeout(() => router.push("/dashboard"), 1500);
    }
    setSubmitting(false);
  }

  if (!interviewer) return null;

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-2">Feedback Submitted</h2>
          <p className="text-muted">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white border-b border-border sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/dashboard")}
              className="text-muted hover:text-foreground transition-colors cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="font-bold text-lg">New Interview Feedback</h1>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium">{interviewer.name}</p>
            <p className="text-xs text-muted">{interviewer.role}</p>
          </div>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Candidate selection */}
        <div className="bg-white border border-border rounded-2xl p-6">
          <h2 className="font-bold text-lg mb-4">Interview Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Candidate</label>
              <select
                value={selectedCandidate}
                onChange={(e) => setSelectedCandidate(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent bg-white cursor-pointer"
              >
                <option value="">Select a candidate...</option>
                {candidates.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.position ? `— ${c.position}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Interview Date</label>
              <input
                type="date"
                value={interviewDate}
                onChange={(e) => setInterviewDate(e.target.value)}
                className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>
        </div>

        {/* Scoring categories */}
        {SCORING_CATEGORIES.map((cat) => (
          <div key={cat.key} className="bg-white border border-border rounded-2xl p-6">
            <h2 className="font-bold text-lg mb-1">{cat.label}</h2>
            <p className="text-sm text-muted mb-5">Rate each area from 1 (Poor) to 5 (Excellent)</p>

            <div className="space-y-5">
              {cat.subcriteria.map((sc) => (
                <div key={sc.key}>
                  <label className="block text-sm font-medium mb-2">{sc.label}</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setScore(sc.key, val)}
                        className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-all cursor-pointer ${
                          scores[sc.key] === val
                            ? val >= 4
                              ? "bg-emerald-500 text-white border-emerald-500 shadow-sm"
                              : val === 3
                                ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                                : "bg-red-500 text-white border-red-500 shadow-sm"
                            : "bg-white border-border hover:bg-gray-50 text-foreground"
                        }`}
                      >
                        <div className="text-base">{val}</div>
                        <div className="text-[10px] opacity-75 hidden sm:block">{SCORE_LABELS[val]}</div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Comments — {cat.label}
                </label>
                <textarea
                  value={comments[cat.commentKey] || ""}
                  onChange={(e) => setComment(cat.commentKey, e.target.value)}
                  rows={3}
                  placeholder={`Notes on ${cat.label.toLowerCase()}...`}
                  className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent resize-y"
                />
              </div>
            </div>
          </div>
        ))}

        {/* Overall recommendation */}
        <div className="bg-white border border-border rounded-2xl p-6">
          <h2 className="font-bold text-lg mb-4">Overall Recommendation</h2>

          <div className="flex flex-wrap gap-2 mb-4">
            {RECOMMENDATION_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setRecommendation(opt.value)}
                className={`px-5 py-2.5 rounded-lg text-sm font-semibold border transition-all cursor-pointer ${
                  recommendation === opt.value
                    ? `${opt.color} text-white border-transparent shadow-sm`
                    : "bg-white border-border hover:bg-gray-50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Overall Notes</label>
            <textarea
              value={overallComments}
              onChange={(e) => setOverallComments(e.target.value)}
              rows={4}
              placeholder="Summary thoughts, strengths, concerns, hiring recommendation rationale..."
              className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent resize-y"
            />
          </div>
        </div>

        {/* Submit */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting || !selectedCandidate}
            className="flex-1 py-3.5 bg-accent text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {submitting ? "Submitting..." : "Submit Feedback"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="px-8 py-3.5 bg-gray-100 font-semibold rounded-xl hover:bg-gray-200 transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
