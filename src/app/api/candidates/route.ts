import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
  try {
    const db = await getDb();
    const result = await db.execute(
      "SELECT id, name, resume_filename, position, created_at FROM candidates ORDER BY created_at DESC"
    );
    return NextResponse.json(result.rows);
  } catch (err) {
    console.error("Candidates GET error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const name = formData.get("name") as string;
    const position = formData.get("position") as string;
    const resume = formData.get("resume") as File | null;

    if (!name) {
      return NextResponse.json(
        { error: "Candidate name is required" },
        { status: 400 }
      );
    }

    const id = uuidv4();
    let resumeFilename: string | null = null;
    let resumeData: string | null = null;

    if (resume && resume.size > 0) {
      resumeFilename = resume.name;
      const bytes = await resume.arrayBuffer();
      resumeData = Buffer.from(bytes).toString("base64");
    }

    const db = await getDb();
    await db.execute({
      sql: "INSERT INTO candidates (id, name, resume_filename, resume_data, position) VALUES (?, ?, ?, ?, ?)",
      args: [id, name, resumeFilename, resumeData, position || null],
    });

    const result = await db.execute({
      sql: "SELECT id, name, resume_filename, position, created_at FROM candidates WHERE id = ?",
      args: [id],
    });

    return NextResponse.json(result.rows[0]);
  } catch (err) {
    console.error("Candidates POST error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
