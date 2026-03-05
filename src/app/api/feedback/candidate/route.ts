import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const candidateId = searchParams.get("candidate_id");

  if (!candidateId) {
    return NextResponse.json(
      { error: "candidate_id is required" },
      { status: 400 }
    );
  }

  const db = getDb();

  const candidate = db
    .prepare("SELECT * FROM candidates WHERE id = ?")
    .get(candidateId);

  const feedbacks = db
    .prepare(
      `SELECT f.*, i.name as interviewer_name, i.role as interviewer_role
       FROM feedback f
       JOIN interviewers i ON f.interviewer_id = i.id
       WHERE f.candidate_id = ?
       ORDER BY f.created_at DESC`
    )
    .all(candidateId);

  return NextResponse.json({ candidate, feedbacks });
}
