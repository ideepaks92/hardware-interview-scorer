import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, action } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const db = await getDb();

    const existing = await db.execute({
      sql: "SELECT * FROM interviewers WHERE email = ?",
      args: [email],
    });

    if (action === "signup") {
      if (!name) {
        return NextResponse.json(
          { error: "Name is required for sign up" },
          { status: 400 }
        );
      }

      if (existing.rows.length > 0) {
        return NextResponse.json(
          { error: "An account with this email already exists. Please sign in." },
          { status: 409 }
        );
      }

      if (password.length < 6) {
        return NextResponse.json(
          { error: "Password must be at least 6 characters" },
          { status: 400 }
        );
      }

      const id = uuidv4();
      const passwordHash = await bcrypt.hash(password, 10);

      await db.execute({
        sql: "INSERT INTO interviewers (id, name, email, role, password_hash) VALUES (?, ?, ?, ?, ?)",
        args: [id, name, email, "Interviewer", passwordHash],
      });

      const result = await db.execute({
        sql: "SELECT id, name, email, role, created_at FROM interviewers WHERE id = ?",
        args: [id],
      });

      return NextResponse.json(result.rows[0]);
    }

    // Sign in
    if (existing.rows.length === 0) {
      return NextResponse.json(
        { error: "No account found with this email. Please sign up first." },
        { status: 404 }
      );
    }

    const user = existing.rows[0];
    const storedHash = user.password_hash as string | null;

    if (!storedHash) {
      // Legacy user without password — set their password now
      const passwordHash = await bcrypt.hash(password, 10);
      await db.execute({
        sql: "UPDATE interviewers SET password_hash = ? WHERE id = ?",
        args: [passwordHash, user.id],
      });
      return NextResponse.json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        created_at: user.created_at,
      });
    }

    const valid = await bcrypt.compare(password, storedHash);
    if (!valid) {
      return NextResponse.json(
        { error: "Incorrect password" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      created_at: user.created_at,
    });
  } catch (err) {
    console.error("Auth error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
