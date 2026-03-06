import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { admin_secret, email, new_password } = await req.json();

    const secret = process.env.ADMIN_SECRET;
    if (!secret || admin_secret !== secret) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!email || !new_password) {
      return NextResponse.json(
        { error: "email and new_password are required" },
        { status: 400 }
      );
    }

    if (new_password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const db = await getDb();

    const existing = await db.execute({
      sql: "SELECT id, name, email FROM interviewers WHERE email = ?",
      args: [email],
    });

    if (existing.rows.length === 0) {
      return NextResponse.json(
        { error: "No account found with this email" },
        { status: 404 }
      );
    }

    const passwordHash = await bcrypt.hash(new_password, 10);

    await db.execute({
      sql: "UPDATE interviewers SET password_hash = ? WHERE email = ?",
      args: [passwordHash, email],
    });

    const user = existing.rows[0];
    return NextResponse.json({
      success: true,
      message: `Password reset for ${user.name} (${user.email})`,
    });
  } catch (err) {
    console.error("Admin reset-password error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
