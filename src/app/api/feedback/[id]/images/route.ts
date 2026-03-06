import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await getDb();

    const result = await db.execute({
      sql: "SELECT id, feedback_id, filename, mime_type, image_data, caption, created_at FROM feedback_images WHERE feedback_id = ? ORDER BY created_at ASC",
      args: [id],
    });

    return NextResponse.json(result.rows);
  } catch (err) {
    console.error("Feedback images GET error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: feedbackId } = await params;
    const formData = await req.formData();
    const files = formData.getAll("images") as File[];
    const captions = formData.getAll("captions") as string[];

    if (files.length === 0) {
      return NextResponse.json(
        { error: "At least one image is required" },
        { status: 400 }
      );
    }

    const db = await getDb();
    const inserted = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file || file.size === 0) continue;

      const id = uuidv4();
      const bytes = await file.arrayBuffer();
      const imageData = Buffer.from(bytes).toString("base64");

      await db.execute({
        sql: "INSERT INTO feedback_images (id, feedback_id, filename, mime_type, image_data, caption) VALUES (?, ?, ?, ?, ?, ?)",
        args: [
          id,
          feedbackId,
          file.name,
          file.type || "image/jpeg",
          imageData,
          captions[i] || null,
        ],
      });

      inserted.push({ id, filename: file.name, caption: captions[i] || null });
    }

    return NextResponse.json({ uploaded: inserted.length, images: inserted });
  } catch (err) {
    console.error("Feedback images POST error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
