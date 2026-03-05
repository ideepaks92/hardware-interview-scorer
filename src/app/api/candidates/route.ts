import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function GET() {
  const db = getDb();
  const candidates = db
    .prepare("SELECT * FROM candidates ORDER BY created_at DESC")
    .all();
  return NextResponse.json(candidates);
}

export async function POST(req: NextRequest) {
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
  let resumePath: string | null = null;

  if (resume && resume.size > 0) {
    const uploadsDir = path.join(process.cwd(), "uploads");
    await mkdir(uploadsDir, { recursive: true });

    const ext = path.extname(resume.name);
    resumeFilename = resume.name;
    resumePath = path.join(uploadsDir, `${id}${ext}`);

    const bytes = await resume.arrayBuffer();
    await writeFile(resumePath, Buffer.from(bytes));
  }

  const db = getDb();
  db.prepare(
    "INSERT INTO candidates (id, name, resume_filename, resume_path, position) VALUES (?, ?, ?, ?, ?)"
  ).run(id, name, resumeFilename, resumePath, position || null);

  const candidate = db
    .prepare("SELECT * FROM candidates WHERE id = ?")
    .get(id);
  return NextResponse.json(candidate);
}
