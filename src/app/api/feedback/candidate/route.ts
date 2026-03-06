import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const candidateId = searchParams.get("candidate_id");

    if (!candidateId) {
      return NextResponse.json(
        { error: "candidate_id is required" },
        { status: 400 }
      );
    }

    const db = await getDb();

    const candidateResult = await db.execute({
      sql: "SELECT * FROM candidates WHERE id = ?",
      args: [candidateId],
    });

    const feedbackResult = await db.execute({
      sql: `SELECT f.*, i.name as interviewer_name, i.role as interviewer_role
            FROM feedback f
            JOIN interviewers i ON f.interviewer_id = i.id
            WHERE f.candidate_id = ?
            ORDER BY f.created_at DESC`,
      args: [candidateId],
    });

    return NextResponse.json({
      candidate: candidateResult.rows[0] || null,
      feedbacks: feedbackResult.rows,
    });
  } catch (err) {
    console.error("Feedback candidate GET error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
