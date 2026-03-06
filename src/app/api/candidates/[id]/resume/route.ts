import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import path from "path";

const MIME_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = await getDb();

  const result = await db.execute({
    sql: "SELECT resume_filename, resume_data FROM candidates WHERE id = ?",
    args: [id],
  });

  const row = result.rows[0];
  if (!row || !row.resume_data || !row.resume_filename) {
    return NextResponse.json({ error: "No resume found" }, { status: 404 });
  }

  const filename = row.resume_filename as string;
  const ext = path.extname(filename).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";
  const buffer = Buffer.from(row.resume_data as string, "base64");

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
