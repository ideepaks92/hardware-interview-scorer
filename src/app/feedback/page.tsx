"use client";

import { useEffect, useState, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SCORING_CATEGORIES, NA_SCORE } from "@/lib/scoring";
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
}

const RECOMMENDATION_OPTIONS = [
  { value: "strong_yes", label: "Strong Yes", color: "bg-emerald-500" },
  { value: "yes", label: "Yes", color: "bg-green-500" },
  { value: "maybe", label: "Maybe", color: "bg-amber-500" },
  { value: "no", label: "No", color: "bg-red-500" },
  { value: "strong_no", label: "Strong No", color: "bg-red-700" },
];

const ALL_SCORE_KEYS = SCORING_CATEGORIES.flatMap((cat) =>
  cat.subcriteria.map((sc) => sc.key)
);

function FeedbackForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");

  const [interviewer, setInterviewer] = useState<Interviewer | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState("");
  const [interviewDate, setInterviewDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [selectedProblems, setSelectedProblems] = useState<string[]>([]);
  const [expandedProblem, setExpandedProblem] = useState<string | null>(null);
  const [problemDropdownOpen, setProblemDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [recommendation, setRecommendation] = useState("");
  const [overallComments, setOverallComments] = useState("");
  const [pendingImages, setPendingImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("Feedback Submitted");
  const [uploadingImages, setUploadingImages] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const sessionStartRef = useRef<number>(Date.now());
  const accumulatedSecondsRef = useRef<number>(0);
  const pausedAtRef = useRef<number | null>(null);

  function getElapsedSeconds(): number {
    const sessionElapsed = pausedAtRef.current !== null
      ? Math.round((pausedAtRef.current - sessionStartRef.current) / 1000)
      : Math.round((Date.now() - sessionStartRef.current) / 1000);
    return accumulatedSecondsRef.current + sessionElapsed;
  }

  useEffect(() => {
    function handleVisibility() {
      if (document.hidden) {
        pausedAtRef.current = Date.now();
      } else {
        if (pausedAtRef.current !== null) {
          accumulatedSecondsRef.current += Math.round(
            (pausedAtRef.current - sessionStartRef.current) / 1000
          );
          sessionStartRef.current = Date.now();
          pausedAtRef.current = null;
        }
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  const loadExistingFeedback = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(
          `/api/feedback?include_drafts=true`
        );
        if (!res.ok) return;
        const all = await res.json();
        if (!Array.isArray(all)) return;
        const fb = all.find(
          (f: Record<string, unknown>) => f.id === id
        );
        if (!fb) return;

        setSelectedCandidate(fb.candidate_id || "");
        setInterviewDate(fb.interview_date || new Date().toISOString().split("T")[0]);

        if (fb.problem_statements) {
          try {
            setSelectedProblems(JSON.parse(fb.problem_statements as string));
          } catch { /* skip */ }
        }

        const loadedScores: Record<string, number> = {};
        ALL_SCORE_KEYS.forEach((key) => {
          if (fb[key] !== null && fb[key] !== undefined) {
            loadedScores[key] = fb[key] as number;
          }
        });
        setScores(loadedScores);

        const loadedComments: Record<string, string> = {};
        SCORING_CATEGORIES.forEach((cat) => {
          if (fb[cat.commentKey]) {
            loadedComments[cat.commentKey] = fb[cat.commentKey] as string;
          }
        });
        setComments(loadedComments);

        setRecommendation((fb.overall_recommendation as string) || "");
        setOverallComments((fb.overall_comments as string) || "");

        accumulatedSecondsRef.current = typeof fb.time_spent_seconds === "number" && fb.time_spent_seconds > 0
          ? fb.time_spent_seconds : 0;
        sessionStartRef.current = Date.now();
      } catch { /* skip */ }
    },
    []
  );

  useEffect(() => {
    const stored = localStorage.getItem("interviewer");
    if (!stored) {
      router.push("/");
      return;
    }
    setInterviewer(JSON.parse(stored));

    fetch("/api/candidates")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setCandidates(data); })
      .catch(() => {});
  }, [router]);

  useEffect(() => {
    if (editId) {
      loadExistingFeedback(editId);
    }
  }, [editId, loadExistingFeedback]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setProblemDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function toggleProblem(id: string) {
    setSelectedProblems((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  }

  function setScore(key: string, value: number) {
    setScores((prev) => ({ ...prev, [key]: value }));
    setValidationErrors([]);
  }

  function clearScore(key: string) {
    setScores((prev) => {
      if (prev[key] === NA_SCORE) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: NA_SCORE };
    });
    setValidationErrors([]);
  }

  function setComment(key: string, value: string) {
    setComments((prev) => ({ ...prev, [key]: value }));
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setPendingImages((prev) => [...prev, ...files]);
    const newPreviews = files.map((f) => URL.createObjectURL(f));
    setImagePreviews((prev) => [...prev, ...newPreviews]);
    e.target.value = "";
  }

  function removeImage(index: number) {
    URL.revokeObjectURL(imagePreviews[index]);
    setPendingImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  }

  function validate(): string[] {
    const errors: string[] = [];

    const unscored = ALL_SCORE_KEYS.filter(
      (key) => scores[key] === undefined
    );
    if (unscored.length > 0) {
      const labels = unscored.map((key) => {
        for (const cat of SCORING_CATEGORIES) {
          const sc = cat.subcriteria.find((s) => s.key === key);
          if (sc) return sc.label;
        }
        return key;
      });
      errors.push(
        `Rate or mark N/A: ${labels.slice(0, 3).join(", ")}${labels.length > 3 ? ` and ${labels.length - 3} more` : ""}`
      );
    }

    if (!recommendation) {
      errors.push("Overall recommendation is required");
    }

    return errors;
  }

  function buildBody(status: string): Record<string, string | number | null> {
    const body: Record<string, string | number | null> = {
      interviewer_id: interviewer!.id,
      candidate_id: selectedCandidate,
      interview_date: interviewDate,
      problem_statements:
        selectedProblems.length > 0 ? JSON.stringify(selectedProblems) : null,
      overall_recommendation: recommendation || null,
      overall_comments: overallComments || null,
      status,
      time_spent_seconds: getElapsedSeconds(),
    };

    if (editId) body.id = editId;

    SCORING_CATEGORIES.forEach((cat) => {
      cat.subcriteria.forEach((sc) => {
        const val = scores[sc.key];
        body[sc.key] = val !== undefined ? val : null;
      });
      body[cat.commentKey] = comments[cat.commentKey] || null;
    });

    return body;
  }

  async function uploadImages(fbId: string) {
    if (pendingImages.length === 0) return;
    setUploadingImages(true);
    const formData = new FormData();
    pendingImages.forEach((f) => formData.append("images", f));
    await fetch(`/api/feedback/${fbId}/images`, {
      method: "POST",
      body: formData,
    });
    setUploadingImages(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!interviewer || !selectedCandidate) return;

    const errors = validate();
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    setSubmitting(true);
    const body = buildBody("submitted");
    const method = editId ? "PUT" : "POST";

    const res = await fetch("/api/feedback", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const feedback = await res.json();
      await uploadImages(feedback.id);
      setSuccessMessage(editId ? "Feedback Updated" : "Feedback Submitted");
      setSuccess(true);
      setTimeout(() => router.push("/dashboard"), 1500);
    }
    setSubmitting(false);
  }

  async function handleSaveDraft() {
    if (!interviewer || !selectedCandidate) return;
    setSavingDraft(true);

    const body = buildBody("draft");
    const method = editId ? "PUT" : "POST";

    const res = await fetch("/api/feedback", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const feedback = await res.json();
      await uploadImages(feedback.id);
      setSuccessMessage("Draft Saved");
      setSuccess(true);
      setTimeout(() => router.push("/dashboard"), 1500);
    }
    setSavingDraft(false);
  }

  if (!interviewer) return null;

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-score-high-bg flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-success"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-2">
            {uploadingImages ? "Uploading images..." : successMessage}
          </h2>
          <p className="text-muted">
            {uploadingImages
              ? "Please wait while screenshots are saved..."
              : "Redirecting to dashboard..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-surface border-b border-border sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/dashboard")}
              className="text-muted hover:text-foreground transition-colors cursor-pointer"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <h1 className="font-bold text-lg">
              {editId ? "Edit Feedback" : "New Interview Feedback"}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <div className="text-right">
              <p className="text-sm font-medium">{interviewer.name}</p>
              <p className="text-xs text-muted">{interviewer.role}</p>
            </div>
          </div>
        </div>
      </header>

      <form
        onSubmit={handleSubmit}
        className="max-w-4xl mx-auto px-6 py-8 space-y-8"
      >
        {/* Interview Details */}
        <div className="bg-surface border border-border rounded-2xl p-6">
          <h2 className="font-bold text-lg mb-4">Interview Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Candidate <span className="text-danger">*</span>
              </label>
              <select
                value={selectedCandidate}
                onChange={(e) => setSelectedCandidate(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent bg-background cursor-pointer"
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
              <label className="block text-sm font-medium mb-1.5">
                Interview Date
              </label>
              <input
                type="date"
                value={interviewDate}
                onChange={(e) => setInterviewDate(e.target.value)}
                className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent bg-background"
              />
            </div>
          </div>
        </div>

        {/* Problem Statements */}
        <div className="bg-surface border border-border rounded-2xl p-6">
          <h2 className="font-bold text-lg mb-1">
            Problem Statements Discussed
          </h2>
          <p className="text-sm text-muted mb-4">
            Select which problems were given during the interview. Expand to view
            the full brief.
          </p>

          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setProblemDropdownOpen((o) => !o)}
              className="w-full flex items-center justify-between px-4 py-2.5 border border-border rounded-lg bg-background hover:bg-surface-secondary transition-colors cursor-pointer text-left"
            >
              <span
                className={selectedProblems.length === 0 ? "text-muted" : ""}
              >
                {selectedProblems.length === 0
                  ? "Select problems..."
                  : `${selectedProblems.length} problem${selectedProblems.length > 1 ? "s" : ""} selected`}
              </span>
              <svg
                className={`w-4 h-4 text-muted transition-transform ${problemDropdownOpen ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {problemDropdownOpen && (
              <div className="absolute z-20 mt-1 w-full bg-surface border border-border rounded-lg shadow-lg overflow-hidden">
                {PROBLEM_STATEMENTS.map((ps) => (
                  <button
                    key={ps.id}
                    type="button"
                    onClick={() => toggleProblem(ps.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-secondary transition-colors cursor-pointer text-left border-b border-border last:border-0"
                  >
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        selectedProblems.includes(ps.id)
                          ? "bg-accent border-accent"
                          : "border-surface-tertiary"
                      }`}
                    >
                      {selectedProblems.includes(ps.id) && (
                        <svg
                          className="w-3 h-3 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-sm">{ps.title}</div>
                      <div className="text-xs text-muted">{ps.tag}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedProblems.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {selectedProblems.map((pid) => {
                const ps = PROBLEM_STATEMENTS.find((p) => p.id === pid);
                if (!ps) return null;
                return (
                  <span
                    key={pid}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent-light text-accent text-sm font-medium"
                  >
                    {ps.title}
                    <button
                      type="button"
                      onClick={() => toggleProblem(pid)}
                      className="hover:text-danger transition-colors cursor-pointer"
                    >
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </span>
                );
              })}
            </div>
          )}

          {selectedProblems.length > 0 && (
            <div className="mt-6 space-y-4">
              {selectedProblems.map((pid) => {
                const ps = PROBLEM_STATEMENTS.find((p) => p.id === pid);
                if (!ps) return null;
                const isExpanded = expandedProblem === pid;
                return (
                  <div
                    key={pid}
                    className="border border-border rounded-xl overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedProblem(isExpanded ? null : pid)
                      }
                      className="w-full flex items-center justify-between px-5 py-3.5 bg-surface-secondary hover:bg-surface-tertiary transition-colors cursor-pointer text-left"
                    >
                      <div>
                        <span className="font-semibold text-sm">
                          {ps.title}
                        </span>
                        <span className="ml-2 text-xs text-muted px-2 py-0.5 bg-surface rounded-full border border-border">
                          {ps.tag}
                        </span>
                      </div>
                      <svg
                        className={`w-4 h-4 text-muted transition-transform flex-shrink-0 ${isExpanded ? "rotate-180" : ""}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>

                    {isExpanded && (
                      <div className="px-5 py-4 space-y-6">
                        <p className="text-sm text-muted italic">
                          {ps.overview}
                        </p>

                        {ps.parts.map((part, idx) => (
                          <div key={idx}>
                            <h4 className="font-semibold text-sm mb-2 text-accent">
                              {part.title}
                            </h4>

                            <div className="mb-3">
                              <p className="text-xs font-semibold uppercase text-muted mb-1.5">
                                Brief
                              </p>
                              <ul className="space-y-1">
                                {part.brief.map((b, i) => (
                                  <li key={i} className="flex gap-2 text-sm">
                                    <span className="text-accent mt-1 flex-shrink-0">
                                      &#8226;
                                    </span>
                                    <span>{b}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            <details className="group">
                              <summary className="text-xs font-semibold uppercase text-muted cursor-pointer hover:text-foreground transition-colors flex items-center gap-1">
                                <svg
                                  className="w-3 h-3 transition-transform group-open:rotate-90"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 5l7 7-7 7"
                                  />
                                </svg>
                                What to look for
                              </summary>
                              <ul className="mt-2 space-y-1.5">
                                {part.evaluationNotes.map((note, i) => (
                                  <li
                                    key={i}
                                    className="flex gap-2 text-sm text-muted"
                                  >
                                    <span className="text-warning mt-1 flex-shrink-0">
                                      &#9670;
                                    </span>
                                    <span>{note}</span>
                                  </li>
                                ))}
                              </ul>
                            </details>

                            {idx < ps.parts.length - 1 && (
                              <hr className="mt-5 border-border" />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Scoring categories */}
        {SCORING_CATEGORIES.map((cat) => (
          <div
            key={cat.key}
            className="bg-surface border border-border rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-bold text-lg">{cat.label}</h2>
              <span className="text-xs text-muted bg-surface-secondary px-2 py-0.5 rounded-full">
                Weight: {Math.round(cat.weight * 100)}%
              </span>
            </div>

            <div className="space-y-6">
              {cat.subcriteria.map((sc) => {
                const isNA = scores[sc.key] === NA_SCORE;
                const hasScore = scores[sc.key] !== undefined;
                const showMissing = validationErrors.length > 0 && !hasScore;
                return (
                  <div key={sc.key}>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <label className={`block text-sm font-medium ${showMissing ? "text-danger" : ""}`}>
                          {sc.label} <span className="text-danger">*</span>
                        </label>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {sc.doordashValues.map((v) => (
                            <span
                              key={v}
                              className="inline-block px-2 py-0.5 rounded bg-accent-light text-accent text-[11px] font-semibold"
                            >
                              {v}
                            </span>
                          ))}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => clearScore(sc.key)}
                        className={`text-xs px-2.5 py-1 rounded-md border transition-colors cursor-pointer flex-shrink-0 ml-3 mt-0.5 ${
                          isNA
                            ? "bg-surface-tertiary border-surface-tertiary text-foreground"
                            : "bg-surface border-border text-muted hover:bg-surface-secondary"
                        }`}
                      >
                        N/A
                      </button>
                    </div>

                    {isNA ? (
                      <div className="py-2.5 px-4 bg-surface-secondary rounded-lg text-sm text-muted italic">
                        Not assessed in this interview
                      </div>
                    ) : (
                      <div className={`flex gap-2 ${showMissing ? "ring-2 ring-danger/50 rounded-lg p-0.5" : ""}`}>
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
                                : "bg-surface border-border hover:bg-surface-secondary text-foreground"
                            }`}
                          >
                            <div className="text-base">{val}</div>
                            <div className="text-[10px] opacity-75 hidden sm:block leading-tight px-0.5">
                              {sc.scale[val - 1]}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Comments — {cat.label}
                </label>
                <textarea
                  value={comments[cat.commentKey] || ""}
                  onChange={(e) => setComment(cat.commentKey, e.target.value)}
                  rows={3}
                  placeholder={`Notes on ${cat.label.toLowerCase()}...`}
                  className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent resize-y bg-background"
                />
              </div>
            </div>
          </div>
        ))}

        {/* Whiteboard / Screenshot uploads */}
        <div className="bg-surface border border-border rounded-2xl p-6">
          <h2 className="font-bold text-lg mb-1">Screenshots & Whiteboard Photos</h2>
          <p className="text-sm text-muted mb-4">
            Upload photos of whiteboard sessions, sketches, or notes from this interview.
          </p>

          <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-surface-secondary border border-border rounded-lg hover:bg-surface-tertiary transition-colors cursor-pointer text-sm font-medium">
            <svg className="w-4 h-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Add Images
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageSelect}
              className="hidden"
            />
          </label>

          {imagePreviews.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-4">
              {imagePreviews.map((src, i) => (
                <div key={i} className="relative group rounded-lg overflow-hidden border border-border">
                  <img
                    src={src}
                    alt={pendingImages[i]?.name || `Image ${i + 1}`}
                    className="w-full h-32 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-xs"
                  >
                    &times;
                  </button>
                  <p className="text-[10px] text-muted truncate px-2 py-1 bg-surface">
                    {pendingImages[i]?.name}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Overall recommendation */}
        <div className="bg-surface border border-border rounded-2xl p-6">
          <h2 className="font-bold text-lg mb-4">
            Overall Recommendation <span className="text-danger">*</span>
          </h2>

          <div className={`flex flex-wrap gap-2 mb-4 ${validationErrors.length > 0 && !recommendation ? "ring-2 ring-danger/50 rounded-lg p-1" : ""}`}>
            {RECOMMENDATION_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { setRecommendation(opt.value); setValidationErrors([]); }}
                className={`px-5 py-2.5 rounded-lg text-sm font-semibold border transition-all cursor-pointer ${
                  recommendation === opt.value
                    ? `${opt.color} text-white border-transparent shadow-sm`
                    : "bg-surface border-border hover:bg-surface-secondary"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">
              Overall Notes
            </label>
            <textarea
              value={overallComments}
              onChange={(e) => setOverallComments(e.target.value)}
              rows={4}
              placeholder="Summary thoughts, strengths, concerns, hiring recommendation rationale..."
              className="w-full px-4 py-2.5 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent resize-y bg-background"
            />
          </div>
        </div>

        {/* Validation errors */}
        {validationErrors.length > 0 && (
          <div className="bg-score-low-bg border border-danger/30 rounded-xl p-4">
            <p className="text-sm font-semibold text-danger mb-1">Please fix the following:</p>
            <ul className="text-sm text-danger space-y-0.5">
              {validationErrors.map((err, i) => (
                <li key={i}>- {err}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Submit / Draft / Cancel */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting || savingDraft || !selectedCandidate}
            className="flex-1 py-3.5 bg-accent text-white font-semibold rounded-xl hover:bg-accent-hover transition-colors disabled:opacity-50 cursor-pointer"
          >
            {submitting
              ? "Submitting..."
              : editId
                ? "Update Feedback"
                : `Submit Feedback${pendingImages.length > 0 ? ` (${pendingImages.length} image${pendingImages.length > 1 ? "s" : ""})` : ""}`}
          </button>
          <button
            type="button"
            disabled={submitting || savingDraft || !selectedCandidate}
            onClick={handleSaveDraft}
            className="px-6 py-3.5 bg-surface-secondary border border-border font-semibold rounded-xl hover:bg-surface-tertiary transition-colors disabled:opacity-50 cursor-pointer"
          >
            {savingDraft ? "Saving..." : "Save Draft"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="px-6 py-3.5 bg-surface-secondary font-semibold rounded-xl hover:bg-surface-tertiary transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export default function FeedbackPage() {
  return (
    <Suspense>
      <FeedbackForm />
    </Suspense>
  );
}
