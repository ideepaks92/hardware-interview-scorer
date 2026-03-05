import { NextRequest, NextResponse } from "next/server";
import getDb from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const interviewerId = searchParams.get("interviewer_id");
  const candidateId = searchParams.get("candidate_id");

  const db = getDb();

  let query = `
    SELECT f.*, c.name as candidate_name, c.position as candidate_position,
           i.name as interviewer_name, i.role as interviewer_role
    FROM feedback f
    JOIN candidates c ON f.candidate_id = c.id
    JOIN interviewers i ON f.interviewer_id = i.id
  `;
  const conditions: string[] = [];
  const params: string[] = [];

  if (interviewerId) {
    conditions.push("f.interviewer_id = ?");
    params.push(interviewerId);
  }
  if (candidateId) {
    conditions.push("f.candidate_id = ?");
    params.push(candidateId);
  }
  if (conditions.length > 0) {
    query += " WHERE " + conditions.join(" AND ");
  }
  query += " ORDER BY f.created_at DESC";

  const feedbacks = db.prepare(query).all(...params);
  return NextResponse.json(feedbacks);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (!body.interviewer_id || !body.candidate_id) {
    return NextResponse.json(
      { error: "Interviewer and candidate are required" },
      { status: 400 }
    );
  }

  const id = uuidv4();
  const db = getDb();

  db.prepare(`
    INSERT INTO feedback (
      id, interviewer_id, candidate_id, interview_date,
      manufacturing, ta_gdt, materials_selection, mechanism_machine_design, technical_comments,
      hand_calc_fea, validation_test_planning, design_analysis_comments,
      collaboration, no_asshole_behavior, respect, honesty, cultural_fit_comments,
      conflict_resolution, communication_style, async_vs_inperson, communication_comments,
      fast_moving_teams, rapid_prototyping, working_mindset_comments,
      intuition, intuition_comments,
      cross_functional_awareness, cross_functional_comments,
      overall_recommendation, overall_comments
    ) VALUES (
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?,
      ?, ?,
      ?, ?
    )
  `).run(
    id,
    body.interviewer_id,
    body.candidate_id,
    body.interview_date || new Date().toISOString().split("T")[0],
    body.manufacturing || null,
    body.ta_gdt || null,
    body.materials_selection || null,
    body.mechanism_machine_design || null,
    body.technical_comments || null,
    body.hand_calc_fea || null,
    body.validation_test_planning || null,
    body.design_analysis_comments || null,
    body.collaboration || null,
    body.no_asshole_behavior || null,
    body.respect || null,
    body.honesty || null,
    body.cultural_fit_comments || null,
    body.conflict_resolution || null,
    body.communication_style || null,
    body.async_vs_inperson || null,
    body.communication_comments || null,
    body.fast_moving_teams || null,
    body.rapid_prototyping || null,
    body.working_mindset_comments || null,
    body.intuition || null,
    body.intuition_comments || null,
    body.cross_functional_awareness || null,
    body.cross_functional_comments || null,
    body.overall_recommendation || null,
    body.overall_comments || null
  );

  const feedback = db.prepare("SELECT * FROM feedback WHERE id = ?").get(id);
  return NextResponse.json(feedback);
}
