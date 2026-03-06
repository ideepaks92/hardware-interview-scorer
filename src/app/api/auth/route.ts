import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: NextRequest) {
  try {
    const { name, email, role } = await req.json();

    if (!name || !email) {
      return NextResponse.json(
        { error: "Name and email are required" },
        { status: 400 }
      );
    }

    const db = await getDb();

    const existing = await db.execute({
      sql: "SELECT * FROM interviewers WHERE email = ?",
      args: [email],
    });

    if (existing.rows.length > 0) {
      return NextResponse.json(existing.rows[0]);
    }

    const id = uuidv4();
    await db.execute({
      sql: "INSERT INTO interviewers (id, name, email, role) VALUES (?, ?, ?, ?)",
      args: [id, name, email, role || "Interviewer"],
    });

    const result = await db.execute({
      sql: "SELECT * FROM interviewers WHERE id = ?",
      args: [id],
    });

    return NextResponse.json(result.rows[0]);
  } catch (err) {
    console.error("Auth error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
