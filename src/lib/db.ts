import { createClient, type Client } from "@libsql/client";

let client: Client | null = null;
let initialized = false;

export function getClient(): Client {
  if (!client) {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;

    if (!url || !authToken) {
      throw new Error(
        "TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set in .env.local"
      );
    }

    client = createClient({ url, authToken });
  }
  return client;
}

export async function getDb(): Promise<Client> {
  const db = getClient();
  if (!initialized) {
    await initializeDb(db);
    initialized = true;
  }
  return db;
}

async function initializeDb(db: Client) {
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS interviewers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS candidates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      resume_filename TEXT,
      resume_data TEXT,
      position TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS feedback (
      id TEXT PRIMARY KEY,
      interviewer_id TEXT NOT NULL,
      candidate_id TEXT NOT NULL,
      interview_date TEXT NOT NULL,

      system_level_thinking INTEGER,
      mechanism_machine_design INTEGER,
      dfm_process_selection INTEGER,
      materials_selection INTEGER,
      ta_gdt INTEGER,
      technical_comments TEXT,

      analytical_judgment INTEGER,
      test_strategy INTEGER,
      test_execution INTEGER,
      design_analysis_comments TEXT,

      collaboration_respect INTEGER,
      no_asshole_behavior INTEGER,
      receptivity_to_feedback INTEGER,
      intellectual_honesty INTEGER,
      cultural_fit_comments TEXT,

      conflict_resolution INTEGER,
      communication_style INTEGER,
      async_vs_inperson INTEGER,
      communication_comments TEXT,

      fast_moving_teams INTEGER,
      rapid_prototyping INTEGER,
      decision_under_ambiguity INTEGER,
      working_mindset_comments TEXT,

      failure_mode_awareness INTEGER,
      order_of_magnitude INTEGER,
      intuition_comments TEXT,

      cross_functional_awareness INTEGER,
      cross_functional_integration INTEGER,
      cross_functional_comments TEXT,

      problem_statements TEXT,

      overall_recommendation TEXT,
      overall_comments TEXT,

      time_spent_seconds INTEGER DEFAULT 0,
      status TEXT DEFAULT 'submitted',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),

      FOREIGN KEY (interviewer_id) REFERENCES interviewers(id),
      FOREIGN KEY (candidate_id) REFERENCES candidates(id)
    );

    CREATE TABLE IF NOT EXISTS feedback_images (
      id TEXT PRIMARY KEY,
      feedback_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      image_data TEXT NOT NULL,
      caption TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (feedback_id) REFERENCES feedback(id)
    );
  `);

  await migrate(db);
}

const NEW_COLUMNS = [
  "system_level_thinking",
  "dfm_process_selection",
  "analytical_judgment",
  "test_strategy",
  "test_execution",
  "collaboration_respect",
  "receptivity_to_feedback",
  "intellectual_honesty",
  "decision_under_ambiguity",
  "failure_mode_awareness",
  "order_of_magnitude",
  "cross_functional_integration",
];

async function migrate(db: Client) {
  const result = await db.execute("PRAGMA table_info(feedback)");
  const columns = result.rows as unknown as { name: string }[];

  if (columns.length === 0) return;

  const existing = new Set(columns.map((c) => c.name));

  for (const col of NEW_COLUMNS) {
    if (!existing.has(col)) {
      await db.execute(`ALTER TABLE feedback ADD COLUMN ${col} INTEGER`);
    }
  }

  if (!existing.has("problem_statements")) {
    await db.execute(
      "ALTER TABLE feedback ADD COLUMN problem_statements TEXT"
    );
  }

  if (!existing.has("status")) {
    await db.execute(
      "ALTER TABLE feedback ADD COLUMN status TEXT DEFAULT 'submitted'"
    );
  }

  if (!existing.has("updated_at")) {
    await db.execute(
      "ALTER TABLE feedback ADD COLUMN updated_at TEXT DEFAULT (datetime('now'))"
    );
  }

  if (!existing.has("time_spent_seconds")) {
    await db.execute(
      "ALTER TABLE feedback ADD COLUMN time_spent_seconds INTEGER DEFAULT 0"
    );
  }

  const candidateCols = await db.execute("PRAGMA table_info(candidates)");
  const candidateColNames = new Set(
    (candidateCols.rows as unknown as { name: string }[]).map((c) => c.name)
  );

  if (!candidateColNames.has("resume_data")) {
    await db.execute(
      "ALTER TABLE candidates ADD COLUMN resume_data TEXT"
    );
  }

  const interviewerCols = await db.execute("PRAGMA table_info(interviewers)");
  const interviewerColNames = new Set(
    (interviewerCols.rows as unknown as { name: string }[]).map((c) => c.name)
  );

  if (!interviewerColNames.has("password_hash")) {
    await db.execute(
      "ALTER TABLE interviewers ADD COLUMN password_hash TEXT"
    );
  }
}

export default getDb;
