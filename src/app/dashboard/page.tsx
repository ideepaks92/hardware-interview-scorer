"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  SCORING_CATEGORIES,
  CATEGORY_SHORT_LABELS,
  scoreToPercent,
  computeWeightedOverall,
  computeCategoryAverage,
} from "@/lib/scoring";
import { PROBLEM_STATEMENTS } from "@/lib/problems";
import ThemeToggle from "@/components/ThemeToggle";
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";
import { Radar } from "react-chartjs-2";

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

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
  interviewer_id: string;
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

function recLabel(rec: string | number | null | undefined): string {
  if (!rec || typeof rec !== "string") return "--";
  return rec.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function recColor(rec: string | number | null | undefined): string {
  if (!rec || typeof rec !== "string") return "bg-surface-secondary text-muted";
  if (rec === "strong_yes" || rec === "yes") return "bg-score-high-bg text-score-high-text";
  if (rec === "maybe") return "bg-score-mid-bg text-score-mid-text";
  return "bg-score-low-bg text-score-low-text";
}

function PercentPill({ score }: { score: number | null }) {
  if (score === null || score === undefined)
    return <span className="text-muted text-xs">--</span>;
  const pct = Math.round((score / 5) * 100);
  const colors =
    pct >= 80
      ? "bg-score-high-bg text-score-high-text"
      : pct >= 60
        ? "bg-score-mid-bg text-score-mid-text"
        : "bg-score-low-bg text-score-low-text";
  return (
    <span className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded text-xs font-semibold ${colors}`}>
      {pct}%
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

function formatShortDate(dateStr: string): string {
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[0].slice(2)}-${parts[1]}-${parts[2]}`;
  }
  return dateStr;
}

const CHART_COLORS = [
  { bg: "rgba(59, 130, 246, 0.15)", border: "rgb(59, 130, 246)" },
  { bg: "rgba(239, 68, 68, 0.15)", border: "rgb(239, 68, 68)" },
  { bg: "rgba(16, 185, 129, 0.15)", border: "rgb(16, 185, 129)" },
  { bg: "rgba(245, 158, 11, 0.15)", border: "rgb(245, 158, 11)" },
  { bg: "rgba(139, 92, 246, 0.15)", border: "rgb(139, 92, 246)" },
];

function generateComparisonSummary(
  candidates: Candidate[],
  allFeedbacks: Feedback[]
): string {
  if (candidates.length < 2) return "";

  const catAverages: Record<string, Record<string, number | null>> = {};
  const overalls: Record<string, number | null> = {};

  for (const c of candidates) {
    const fbs = allFeedbacks.filter((f) => f.candidate_id === c.id);
    catAverages[c.id] = {};
    for (const cat of SCORING_CATEGORIES) {
      const scores = fbs
        .map((fb) => avgScore(fb, cat.subcriteria.map((s) => s.key)))
        .filter((s): s is number => s !== null);
      catAverages[c.id][cat.key] = scores.length > 0
        ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
        : null;
    }
    const ov = fbs.map((fb) => weightedOverallFromFeedback(fb)).filter((s): s is number => s !== null);
    overalls[c.id] = ov.length > 0
      ? Math.round((ov.reduce((a, b) => a + b, 0) / ov.length) * 10) / 10
      : null;
  }

  const lines: string[] = [];

  const sorted = [...candidates].sort((a, b) => (overalls[b.id] ?? 0) - (overalls[a.id] ?? 0));
  const top = sorted[0];
  const topPct = overalls[top.id] ? scoreToPercent(overalls[top.id]) : "--";
  lines.push(`${top.name} leads overall at ${topPct} weighted.`);

  const biggestGaps: { cat: string; diff: number; winner: string; loser: string }[] = [];
  for (const cat of SCORING_CATEGORIES) {
    const vals = candidates.map((c) => ({ name: c.name, val: catAverages[c.id][cat.key] ?? 0 }));
    vals.sort((a, b) => b.val - a.val);
    if (vals[0].val > 0 && vals[vals.length - 1].val > 0) {
      biggestGaps.push({
        cat: CATEGORY_SHORT_LABELS[cat.key] || cat.label,
        diff: vals[0].val - vals[vals.length - 1].val,
        winner: vals[0].name.split(" ")[0],
        loser: vals[vals.length - 1].name.split(" ")[0],
      });
    }
  }
  biggestGaps.sort((a, b) => b.diff - a.diff);

  if (biggestGaps.length > 0) {
    const g = biggestGaps[0];
    lines.push(`Biggest gap is in ${g.cat} where ${g.winner} scores ${Math.round(g.diff / 5 * 100)} percentage points higher than ${g.loser}.`);
  }
  if (biggestGaps.length > 1) {
    const g = biggestGaps[1];
    lines.push(`${g.cat} also shows notable divergence (${g.winner} ahead by ${Math.round(g.diff / 5 * 100)}pp).`);
  }

  const closest = biggestGaps.filter((g) => g.diff < 0.3);
  if (closest.length > 0) {
    lines.push(`Candidates are closely matched in ${closest.map((g) => g.cat).join(", ")}.`);
  }

  return lines.join(" ");
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
  const [downloading, setDownloading] = useState<string | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

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
    try {
      const [candRes, fbRes, allFbRes, myAllFbRes] = await Promise.all([
        fetch("/api/candidates"),
        fetch(`/api/feedback?interviewer_id=${interviewer.id}`),
        fetch("/api/feedback"),
        fetch(`/api/feedback?interviewer_id=${interviewer.id}&include_drafts=true`),
      ]);

      const candData = await candRes.json();
      const myFb = await fbRes.json();
      const allFb = await allFbRes.json();
      const myAllFb = await myAllFbRes.json();

      if (Array.isArray(candData)) setCandidates(candData);
      if (Array.isArray(myFb)) setFeedbacks(myFb);
      if (Array.isArray(allFb)) setAllFeedbacks(allFb);
      if (Array.isArray(myAllFb)) setMyAllFeedbacks(myAllFb);

      const safeFb = Array.isArray(myFb) ? myFb : [];
      const safeAll = Array.isArray(allFb) ? allFb : [];
      const allIds = [...new Set([...safeFb, ...safeAll].map((f: Feedback) => f.id))];
      const imageMap: Record<string, FeedbackImage[]> = {};
      await Promise.all(
        allIds.map(async (id) => {
          try {
            const res = await fetch(`/api/feedback/${id}/images`);
            if (res.ok) {
              const imgs = await res.json();
              if (Array.isArray(imgs) && imgs.length > 0) imageMap[id as string] = imgs;
            }
          } catch { /* skip */ }
        })
      );
      setFeedbackImages(imageMap);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    }
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

  function pdfDateStr(dateStr: string): string {
    const parts = dateStr.split("-");
    if (parts.length === 3) return `${parts[1]}${parts[2]}${parts[0].slice(2)}`;
    return dateStr;
  }

  async function downloadReport(fb: Feedback) {
    setDownloading(fb.id);
    try {
      const [html2canvasModule, jsPDFModule] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      const html2canvas = html2canvasModule.default;
      const jsPDF = jsPDFModule.default;

      const el = reportRef.current;
      if (!el) return;

      el.innerHTML = buildReportHTML(fb);
      el.style.display = "block";

      await new Promise((r) => setTimeout(r, 100));

      const containerHeight = el.scrollHeight;
      const sections = Array.from(el.querySelectorAll("[data-section]"));
      const sectionTops = sections.map((s) => (s as HTMLElement).offsetTop);

      const canvas = await html2canvas(el, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        width: 800,
      });
      el.style.display = "none";

      const margin = 15;
      const contentWidth = 210 - 2 * margin;
      const contentHeight = 297 - 2 * margin;
      const pxPerMm = canvas.width / contentWidth;
      const pageHeightPx = contentHeight * pxPerMm;
      const domToCanvas = canvas.height / containerHeight;
      const sectionTopsPx = sectionTops.map((t) => Math.round(t * domToCanvas));

      const pageBreaks: number[] = [0];
      let cursor = 0;
      while (cursor + pageHeightPx < canvas.height) {
        let cut = cursor + pageHeightPx;
        for (let i = sectionTopsPx.length - 1; i >= 0; i--) {
          const st = sectionTopsPx[i];
          if (st > cursor + pageHeightPx * 0.25 && st <= cut) {
            const sEnd = i + 1 < sectionTopsPx.length ? sectionTopsPx[i + 1] : canvas.height;
            if (sEnd > cut) {
              cut = st - 2;
              break;
            }
          }
        }
        pageBreaks.push(cut);
        cursor = cut;
      }

      const pdf = new jsPDF("p", "mm", "a4");
      for (let i = 0; i < pageBreaks.length; i++) {
        if (i > 0) pdf.addPage();
        const srcY = pageBreaks[i];
        const srcH = (i + 1 < pageBreaks.length ? pageBreaks[i + 1] : canvas.height) - srcY;
        const slice = document.createElement("canvas");
        slice.width = canvas.width;
        slice.height = Math.round(srcH);
        const ctx = slice.getContext("2d")!;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, slice.width, slice.height);
        ctx.drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH);
        pdf.addImage(slice.toDataURL("image/png"), "PNG", margin, margin, contentWidth, srcH / pxPerMm);
      }

      const candidateFirst = fb.candidate_name.split(" ")[0];
      const interviewerFirst = fb.interviewer_name.split(" ")[0];
      const datePart = pdfDateStr(fb.interview_date);
      pdf.save(`Feedback-${candidateFirst}-${interviewerFirst}-${datePart}.pdf`);
    } catch (err) {
      console.error("Download error:", err);
    }
    setDownloading(null);
  }

  function buildReportHTML(fb: Feedback): string {
    const overall = weightedOverallFromFeedback(fb);
    const overallPct = overall ? scoreToPercent(overall) : "--";
    const recColorHex = fb.overall_recommendation === "strong_yes" || fb.overall_recommendation === "yes" ? "#16a34a" : fb.overall_recommendation === "maybe" ? "#d97706" : "#dc2626";

    let html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a1a1a; padding: 32px; width: 800px; background: #fff;">
        <div style="border-bottom: 2px solid #2563eb; padding-bottom: 16px; margin-bottom: 24px;">
          <h1 style="font-size: 22px; font-weight: 700; margin: 0 0 4px 0;">Interview Feedback Report</h1>
          <div style="display: flex; gap: 24px; font-size: 13px; color: #666; margin-top: 8px;">
            <span><b>Candidate:</b> ${fb.candidate_name}</span>
            <span><b>Position:</b> ${fb.candidate_position || "—"}</span>
          </div>
          <div style="display: flex; gap: 24px; font-size: 13px; color: #666; margin-top: 4px;">
            <span><b>Interviewer:</b> ${fb.interviewer_name}</span>
            <span><b>Date:</b> ${formatShortDate(fb.interview_date)}</span>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 16px; margin-bottom: ${fb.overall_comments ? "12px" : "20px"}; padding: 12px 16px; background: #f0f9ff; border-radius: 8px;">
          <div>
            <span style="font-size: 12px; color: #666; text-transform: uppercase; font-weight: 600;">Recommendation</span>
            <div style="font-size: 18px; font-weight: 700; color: ${recColorHex};">${recLabel(fb.overall_recommendation)}</div>
          </div>
          <div style="margin-left: auto; text-align: right;">
            <span style="font-size: 12px; color: #666; text-transform: uppercase; font-weight: 600;">Weighted Score</span>
            <div style="font-size: 28px; font-weight: 800; color: #2563eb;">${overallPct}</div>
          </div>
        </div>`;

    if (fb.overall_comments) {
      html += `
        <div style="margin-bottom: 20px; padding: 10px 14px; background: #eff6ff; border-radius: 6px; border-left: 3px solid #2563eb;">
          <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; color: #2563eb; margin-bottom: 3px;">Overall Notes</div>
          <div style="font-size: 13px; line-height: 1.5;">${fb.overall_comments}</div>
        </div>`;
    }

    html += `
        <div style="display: flex; background: #f1f5f9; padding: 8px 12px; font-size: 13px; font-weight: 600; border-bottom: 1px solid #e2e8f0;">
          <div style="flex: 1;">Category</div>
          <div style="width: 80px; text-align: center;">Weight</div>
          <div style="width: 80px; text-align: center;">Score</div>
        </div>`;

    for (const cat of SCORING_CATEGORIES) {
      const catAvg = avgScore(fb, cat.subcriteria.map((s) => s.key));
      html += `<div data-section>`;
      html += `
        <div style="display: flex; background: #f8fafc; padding: 6px 12px; font-size: 13px; font-weight: 600; border-bottom: 1px solid #e2e8f0;">
          <div style="flex: 1;">${cat.label}</div>
          <div style="width: 80px; text-align: center; font-weight: 400;">${Math.round(cat.weight * 100)}%</div>
          <div style="width: 80px; text-align: center; color: ${catAvg && catAvg >= 4 ? "#16a34a" : catAvg && catAvg >= 3 ? "#d97706" : catAvg ? "#dc2626" : "#999"};">${scoreToPercent(catAvg)}</div>
        </div>`;
      for (const sc of cat.subcriteria) {
        const val = fb[sc.key] as number | null;
        const display = val === -1 ? "N/A" : val ? `${val}/5` : "--";
        html += `
        <div style="display: flex; padding: 4px 12px 4px 28px; font-size: 12px; border-bottom: 1px solid #f1f5f9;">
          <div style="flex: 1; color: #666;">${sc.label}</div>
          <div style="width: 80px; text-align: center;"></div>
          <div style="width: 80px; text-align: center;">${display}</div>
        </div>`;
      }
      html += `</div>`;
    }

    const hasComments = SCORING_CATEGORIES.some((cat) => fb[cat.commentKey]);
    if (hasComments) {
      html += `<div data-section style="margin-top: 16px;"><h3 style="font-size: 14px; font-weight: 700; margin: 0 0 12px 0;">Comments</h3>`;
      for (const cat of SCORING_CATEGORIES) {
        const comment = fb[cat.commentKey] as string | null;
        if (comment) {
          html += `<div data-section style="margin-bottom: 10px; padding: 8px 12px; background: #f8fafc; border-radius: 6px; border-left: 3px solid #2563eb;">
            <div style="font-size: 11px; font-weight: 600; text-transform: uppercase; color: #666; margin-bottom: 2px;">${cat.label}</div>
            <div style="font-size: 13px;">${comment}</div>
          </div>`;
        }
      }
      html += `</div>`;
    }

    html += `</div>`;
    return html;
  }

  if (!interviewer) return null;

  const comparisonCandidates = candidates.filter((c) =>
    selectedCandidates.includes(c.id)
  );

  const radarData = comparisonCandidates.length > 0
    ? {
        labels: SCORING_CATEGORIES.map((cat) => CATEGORY_SHORT_LABELS[cat.key] || cat.label),
        datasets: comparisonCandidates.map((c, i) => {
          const fbs = allFeedbacks.filter((f) => f.candidate_id === c.id);
          const data = SCORING_CATEGORIES.map((cat) => {
            const scores = fbs
              .map((fb) => avgScore(fb, cat.subcriteria.map((s) => s.key)))
              .filter((s): s is number => s !== null);
            return scores.length > 0
              ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length / 5) * 100)
              : 0;
          });
          const color = CHART_COLORS[i % CHART_COLORS.length];
          return {
            label: c.name,
            data,
            backgroundColor: color.bg,
            borderColor: color.border,
            borderWidth: 2,
            pointBackgroundColor: color.border,
            pointRadius: 4,
          };
        }),
      }
    : null;

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
        <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
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
                  <label className="block text-sm font-medium mb-1.5">Candidate Name</label>
                  <input type="text" value={newCandidateName} onChange={(e) => setNewCandidateName(e.target.value)} required className="w-full px-4 py-2.5 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-accent" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Position Applied For</label>
                  <input type="text" value={newCandidatePosition} onChange={(e) => setNewCandidatePosition(e.target.value)} className="w-full px-4 py-2.5 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-accent" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Resume (PDF, DOCX)</label>
                  <input type="file" accept=".pdf,.doc,.docx" onChange={(e) => setResumeFile(e.target.files?.[0] || null)} className="w-full text-sm" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="submit" className="flex-1 py-2.5 bg-accent text-white rounded-lg font-medium hover:bg-accent-hover transition-colors cursor-pointer">Add Candidate</button>
                  <button type="button" onClick={() => setShowAddCandidate(false)} className="flex-1 py-2.5 bg-surface-secondary rounded-lg font-medium hover:bg-surface-tertiary transition-colors cursor-pointer">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ═══ MY FEEDBACK TAB ═══ */}
        {activeTab === "my-feedback" && (
          <div className="space-y-6">
            {feedbacks.length === 0 ? (
              <div className="bg-surface border border-border rounded-2xl p-12 text-center">
                <p className="text-muted text-lg mb-2">No feedback submitted yet</p>
                <p className="text-sm text-muted">Click &quot;+ New Feedback&quot; to score your first candidate.</p>
              </div>
            ) : (
              <div className="bg-surface border border-border rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-surface-secondary border-b border-border">
                        <th className="text-left px-3 py-2.5 font-semibold whitespace-nowrap">Candidate</th>
                        <th className="text-left px-2 py-2.5 font-semibold">Date</th>
                        <th className="text-center px-2 py-2.5 font-semibold">Rec</th>
                        <th className="text-center px-2 py-2.5 font-semibold">Weighted</th>
                        {SCORING_CATEGORIES.map((cat) => (
                          <th key={cat.key} className="text-center px-2 py-2.5 font-semibold whitespace-nowrap">
                            <div>{CATEGORY_SHORT_LABELS[cat.key]}</div>
                            <div className="text-[9px] font-normal text-muted">{Math.round(cat.weight * 100)}%</div>
                          </th>
                        ))}
                        <th className="text-center px-2 py-2.5 font-semibold">DL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {feedbacks.map((fb) => {
                        const catScores = SCORING_CATEGORIES.map((cat) =>
                          avgScore(fb, cat.subcriteria.map((s) => s.key))
                        );
                        const overall = weightedOverallFromFeedback(fb);
                        const overallPct = overall ? scoreToPercent(overall) : "--";
                        return (
                          <tr key={fb.id} className="border-b border-border hover:bg-surface-secondary transition-colors">
                            <td className="px-3 py-2 font-medium whitespace-nowrap">
                              <div>{fb.candidate_name}</div>
                              <div className="text-[10px] text-muted font-normal">{fb.candidate_position}</div>
                            </td>
                            <td className="px-2 py-2 text-muted whitespace-nowrap">{formatShortDate(fb.interview_date)}</td>
                            <td className="text-center px-2 py-2">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${recColor(fb.overall_recommendation)}`}>
                                {recLabel(fb.overall_recommendation)}
                              </span>
                            </td>
                            <td className="text-center px-2 py-2">
                              <span className="inline-flex items-center justify-center px-2 py-0.5 rounded bg-accent-light text-accent text-xs font-bold">
                                {overallPct}
                              </span>
                            </td>
                            {catScores.map((score, i) => (
                              <td key={i} className="text-center px-2 py-2">
                                <PercentPill score={score} />
                              </td>
                            ))}
                            <td className="text-center px-2 py-2">
                              <button
                                onClick={() => downloadReport(fb)}
                                disabled={downloading === fb.id}
                                title="Download report"
                                className="text-muted hover:text-accent transition-colors cursor-pointer disabled:opacity-50"
                              >
                                <svg className="w-4 h-4 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              </button>
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
                    <div key={fb.id} className="border-b border-border pb-6 last:border-0 last:pb-0">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="font-semibold">{fb.candidate_name}</span>
                        <span className="text-muted">—</span>
                        <span className="text-sm text-muted">{fb.interview_date}</span>
                      </div>
                      {fb.overall_comments && (
                        <div className="bg-accent-light rounded-lg p-3 mb-3">
                          <p className="text-xs font-semibold text-accent uppercase mb-1">Overall Notes</p>
                          <p className="text-sm">{fb.overall_comments as string}</p>
                        </div>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {SCORING_CATEGORIES.map((cat) => {
                          const comment = fb[cat.commentKey] as string | null;
                          if (!comment) return null;
                          return (
                            <div key={cat.key} className="bg-surface-secondary rounded-lg p-3">
                              <p className="text-xs font-semibold text-muted uppercase mb-1">{cat.label}</p>
                              <p className="text-sm">{comment}</p>
                            </div>
                          );
                        })}
                        {feedbackImages[fb.id] && feedbackImages[fb.id].length > 0 && (
                          <div className="md:col-span-2">
                            <p className="text-xs font-semibold text-muted uppercase mb-2">Screenshots & Whiteboard Photos</p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                              {feedbackImages[fb.id].map((img) => (
                                <button key={img.id} type="button" onClick={() => setLightboxImage(`data:${img.mime_type};base64,${img.image_data}`)} className="rounded-lg overflow-hidden border border-border hover:border-accent transition-colors cursor-pointer">
                                  <img src={`data:${img.mime_type};base64,${img.image_data}`} alt={img.filename} className="w-full h-24 object-cover" />
                                  <p className="text-[10px] text-muted truncate px-1.5 py-1 bg-surface-secondary">{img.filename}</p>
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

        {/* ═══ COMPARE TAB ═══ */}
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
                    {c.position && <span className="ml-1 opacity-60">({c.position})</span>}
                  </button>
                ))}
              </div>
            </div>

            {comparisonCandidates.length > 0 && radarData && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-surface border border-border rounded-2xl p-6">
                  <h3 className="font-bold text-lg mb-4">Comparison Chart</h3>
                  <div className="max-w-md mx-auto">
                    <Radar
                      data={radarData}
                      options={{
                        responsive: true,
                        scales: {
                          r: {
                            beginAtZero: true,
                            max: 100,
                            ticks: { stepSize: 20, font: { size: 10 } },
                            pointLabels: { font: { size: 11, weight: "bold" as const } },
                          },
                        },
                        plugins: {
                          legend: { position: "bottom" as const, labels: { font: { size: 12 } } },
                          tooltip: {
                            callbacks: {
                              label: (ctx) => `${ctx.dataset.label}: ${ctx.raw}%`,
                            },
                          },
                        },
                      }}
                    />
                  </div>
                </div>

                <div className="bg-surface border border-border rounded-2xl p-6">
                  <h3 className="font-bold text-lg mb-4">Summary</h3>
                  <p className="text-sm leading-relaxed">
                    {generateComparisonSummary(comparisonCandidates, allFeedbacks)}
                  </p>

                  <div className="mt-6 space-y-3">
                    {comparisonCandidates.map((c) => {
                      const fbs = allFeedbacks.filter((f) => f.candidate_id === c.id);
                      const ov = fbs.map((fb) => weightedOverallFromFeedback(fb)).filter((s): s is number => s !== null);
                      const avg = ov.length > 0 ? ov.reduce((a, b) => a + b, 0) / ov.length : null;
                      return (
                        <div key={c.id} className="flex items-center gap-3">
                          <span className="text-sm font-medium w-32 truncate">{c.name}</span>
                          <div className="flex-1 bg-surface-secondary rounded-full h-5 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-accent transition-all"
                              style={{ width: avg ? `${Math.round((avg / 5) * 100)}%` : "0%" }}
                            />
                          </div>
                          <span className="text-sm font-bold w-12 text-right">
                            {avg ? scoreToPercent(avg) : "--"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {comparisonCandidates.length > 0 && (
              <div className="bg-surface border border-border rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-surface-secondary border-b border-border">
                        <th className="text-left px-4 py-3 font-semibold sticky left-0 bg-surface-secondary z-[1]">Category</th>
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
                          <tr key={cat.key} className="bg-surface-secondary/50">
                            <td className="px-4 py-2 font-semibold text-accent sticky left-0 bg-surface-secondary/50">
                              <div>{cat.label}</div>
                              <div className="text-[10px] font-normal text-muted">{Math.round(cat.weight * 100)}% weight</div>
                            </td>
                            {comparisonCandidates.map((c) => {
                              const candidateFbs = allFeedbacks.filter((f) => f.candidate_id === c.id);
                              const scores = candidateFbs
                                .map((fb) => avgScore(fb, cat.subcriteria.map((s) => s.key)))
                                .filter((s): s is number => s !== null);
                              const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
                              return (
                                <td key={c.id} className="text-center px-6 py-2">
                                  <span className="font-bold text-lg">{scoreToPercent(avg)}</span>
                                  <span className="text-xs text-muted ml-1">({scores.length} review{scores.length !== 1 ? "s" : ""})</span>
                                </td>
                              );
                            })}
                          </tr>
                          {cat.subcriteria.map((sc) => (
                            <tr key={sc.key} className="border-b border-border/50">
                              <td className="px-4 py-2 pl-8 text-muted sticky left-0 bg-surface">{sc.label}</td>
                              {comparisonCandidates.map((c) => {
                                const candidateFbs = allFeedbacks.filter((f) => f.candidate_id === c.id);
                                const scores = candidateFbs
                                  .map((fb) => fb[sc.key])
                                  .filter((v): v is number => typeof v === "number" && v > 0);
                                const avg = scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null;
                                return (
                                  <td key={c.id} className="text-center px-6 py-2">
                                    <PercentPill score={avg} />
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </>
                      ))}
                      <tr className="bg-accent-light border-t-2 border-accent">
                        <td className="px-4 py-3 font-bold sticky left-0 bg-accent-light">Weighted Overall</td>
                        {comparisonCandidates.map((c) => {
                          const candidateFbs = allFeedbacks.filter((f) => f.candidate_id === c.id);
                          const overalls = candidateFbs.map((fb) => weightedOverallFromFeedback(fb)).filter((s): s is number => s !== null);
                          const avg = overalls.length > 0 ? overalls.reduce((a, b) => a + b, 0) / overalls.length : null;
                          return (
                            <td key={c.id} className="text-center px-6 py-3">
                              <span className="text-xl font-bold text-accent">{scoreToPercent(avg)}</span>
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
                <h3 className="font-bold text-lg mb-4">All Interviewer Comments</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {comparisonCandidates.map((c) => {
                    const candidateFbs = allFeedbacks.filter((f) => f.candidate_id === c.id);
                    return (
                      <div key={c.id} className="border border-border rounded-xl p-4">
                        <h4 className="font-semibold text-lg mb-1">{c.name}</h4>
                        <p className="text-xs text-muted mb-3">{c.position}</p>
                        {candidateFbs.length === 0 ? (
                          <p className="text-sm text-muted">No feedback yet</p>
                        ) : (
                          <div className="space-y-4">
                            {candidateFbs.map((fb) => (
                              <div key={fb.id} className="bg-surface-secondary rounded-lg p-3">
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
                                      <span className="text-xs font-semibold text-muted uppercase">{cat.label}:</span>{" "}
                                      <span className="text-sm">{comment}</span>
                                    </div>
                                  );
                                })}
                                {fb.overall_comments && (
                                  <div className="mt-2 pt-2 border-t border-border">
                                    <span className="text-xs font-semibold text-accent uppercase">Overall:</span>{" "}
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

        {/* ═══ ALL FEEDBACK TAB ═══ */}
        {activeTab === "all-feedback" && (
          <div className="space-y-4">
            {myAllFeedbacks.length === 0 ? (
              <div className="bg-surface border border-border rounded-2xl p-12 text-center">
                <p className="text-muted text-lg mb-2">No feedback yet</p>
                <p className="text-sm text-muted">Click &quot;+ New Feedback&quot; to get started.</p>
              </div>
            ) : (
              myAllFeedbacks.map((fb) => {
                const isDraft = fb.status === "draft";
                const overall = weightedOverallFromFeedback(fb);
                const problems = parseProblemTags(fb.problem_statements);
                const ts = fb.updated_at || fb.created_at;
                const dateStr = ts
                  ? new Date(ts + (ts.includes("Z") ? "" : "Z")).toLocaleString(undefined, {
                      month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
                    })
                  : fb.interview_date;

                return (
                  <div key={fb.id} className={`bg-surface border rounded-2xl p-5 ${isDraft ? "border-amber-500/50" : "border-border"}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-semibold text-base">{fb.candidate_name}</span>
                          {fb.candidate_position && <span className="text-sm text-muted">— {fb.candidate_position}</span>}
                          {isDraft ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 text-xs font-semibold">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                              Draft
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-score-high-bg text-score-high-text text-xs font-semibold">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                              Submitted
                            </span>
                          )}
                          {typeof fb.overall_recommendation === "string" && (
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${recColor(fb.overall_recommendation)}`}>
                              {recLabel(fb.overall_recommendation)}
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
                                {fb.time_spent_seconds >= 60 ? `${Math.floor(fb.time_spent_seconds / 60)}m ${fb.time_spent_seconds % 60}s` : `${fb.time_spent_seconds}s`}
                              </span>
                            </>
                          )}
                        </div>
                        {problems.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {problems.map((t) => (
                              <span key={t} className="inline-block px-2 py-0.5 rounded bg-accent-light text-accent text-xs font-medium">{t}</span>
                            ))}
                          </div>
                        )}
                        {overall !== null && (
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs text-muted">Weighted score:</span>
                            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded bg-accent-light text-accent text-sm font-bold">{scoreToPercent(overall)}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {!isDraft && (
                          <button onClick={() => downloadReport(fb)} disabled={downloading === fb.id} title="Download report" className="flex items-center gap-1.5 px-3 py-2 bg-surface-secondary border border-border rounded-lg text-sm font-medium hover:bg-surface-tertiary transition-colors cursor-pointer disabled:opacity-50">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                          </button>
                        )}
                        <button onClick={() => router.push(`/feedback?edit=${fb.id}`)} className="flex items-center gap-1.5 px-4 py-2 bg-surface-secondary border border-border rounded-lg text-sm font-medium hover:bg-surface-tertiary transition-colors cursor-pointer">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                          {isDraft ? "Continue" : "Edit"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Hidden report render target */}
        <div ref={reportRef} style={{ position: "absolute", left: "-9999px", top: 0, display: "none" }} />

        {lightboxImage && (
          <div className="fixed inset-0 bg-overlay z-50 flex items-center justify-center p-4" onClick={() => setLightboxImage(null)}>
            <div className="relative max-w-4xl max-h-[90vh]">
              <img src={lightboxImage} alt="Full size" className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" />
              <button onClick={() => setLightboxImage(null)} className="absolute -top-3 -right-3 w-8 h-8 bg-surface border border-border rounded-full flex items-center justify-center text-foreground hover:bg-surface-secondary cursor-pointer shadow-lg">&times;</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
