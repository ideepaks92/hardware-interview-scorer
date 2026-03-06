import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { SCORING_CATEGORIES } from "@/lib/scoring";

const SCORE_KEYS = SCORING_CATEGORIES.flatMap((cat) =>
  cat.subcriteria.map((sc) => sc.key)
);
const COMMENT_KEYS = SCORING_CATEGORIES.map((cat) => cat.commentKey);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const interviewerId = searchParams.get("interviewer_id");
  const candidateId = searchParams.get("candidate_id");

  const db = getDb();

  let query = `
    SELECT f.*, c.name as candidate_name, c.position as candidate_position,
           i.name as interviewer_name, i.role as interviewer_role
    FROM feedback f
    JOIN candidates c ON f.candidate_id = c.id
    JOIN interviewers i ON f.interviewer_id = i.id
  `;
  const conditions: string[] = [];
  const params: string[] = [];

  if (interviewerId) {
    conditions.push("f.interviewer_id = ?");
    params.push(interviewerId);
  }
  if (candidateId) {
    conditions.push("f.candidate_id = ?");
    params.push(candidateId);
  }
  if (conditions.length > 0) {
    query += " WHERE " + conditions.join(" AND ");
  }
  query += " ORDER BY f.created_at DESC";

  const feedbacks = db.prepare(query).all(...params);
  return NextResponse.json(feedbacks);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (!body.interviewer_id || !body.candidate_id) {
    return NextResponse.json(
      { error: "Interviewer and candidate are required" },
      { status: 400 }
    );
  }

  const id = uuidv4();
  const db = getDb();

  const allColumns = [
    "id",
    "interviewer_id",
    "candidate_id",
    "interview_date",
    "problem_statements",
    ...SCORE_KEYS,
    ...COMMENT_KEYS,
    "overall_recommendation",
    "overall_comments",
  ];

  const placeholders = allColumns.map(() => "?").join(", ");
  const columnList = allColumns.join(", ");

  const values = [
    id,
    body.interviewer_id,
    body.candidate_id,
    body.interview_date || new Date().toISOString().split("T")[0],
    body.problem_statements || null,
    ...SCORE_KEYS.map((k) => body[k] ?? null),
    ...COMMENT_KEYS.map((k) => body[k] || null),
    body.overall_recommendation || null,
    body.overall_comments || null,
  ];

  db.prepare(
    `INSERT INTO feedback (${columnList}) VALUES (${placeholders})`
  ).run(...values);

  const feedback = db.prepare("SELECT * FROM feedback WHERE id = ?").get(id);
  return NextResponse.json(feedback);
}
