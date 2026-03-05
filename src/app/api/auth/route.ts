import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: NextRequest) {
  const { name, email, role } = await req.json();

  if (!name || !email) {
    return NextResponse.json(
      { error: "Name and email are required" },
      { status: 400 }
    );
  }

  const db = getDb();

  let interviewer = db
    .prepare("SELECT * FROM interviewers WHERE email = ?")
    .get(email) as Record<string, string> | undefined;

  if (!interviewer) {
    const id = uuidv4();
    db.prepare(
      "INSERT INTO interviewers (id, name, email, role) VALUES (?, ?, ?, ?)"
    ).run(id, name, email, role || "Interviewer");
    interviewer = db
      .prepare("SELECT * FROM interviewers WHERE id = ?")
      .get(id) as Record<string, string>;
  }

  return NextResponse.json(interviewer);
}
