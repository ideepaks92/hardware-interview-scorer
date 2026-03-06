import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "interview-scorer.db");

let db: Database.Database;

function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    initializeDb(db);
  }
  return db;
}

const NEW_COLUMNS = [
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

function initializeDb(db: Database.Database) {
  db.exec(`
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
      resume_path TEXT,
      position TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS feedback (
      id TEXT PRIMARY KEY,
      interviewer_id TEXT NOT NULL,
      candidate_id TEXT NOT NULL,
      interview_date TEXT NOT NULL,

      -- Technical Expertise (1-5, or -1 for N/A)
      dfm_process_selection INTEGER,
      ta_gdt INTEGER,
      materials_selection INTEGER,
      mechanism_machine_design INTEGER,
      technical_comments TEXT,

      -- Design Analysis Skills
      analytical_judgment INTEGER,
      test_strategy INTEGER,
      test_execution INTEGER,
      design_analysis_comments TEXT,

      -- Cultural Fit
      collaboration_respect INTEGER,
      no_asshole_behavior INTEGER,
      receptivity_to_feedback INTEGER,
      intellectual_honesty INTEGER,
      cultural_fit_comments TEXT,

      -- Communication
      conflict_resolution INTEGER,
      communication_style INTEGER,
      async_vs_inperson INTEGER,
      communication_comments TEXT,

      -- Working Mindset
      fast_moving_teams INTEGER,
      rapid_prototyping INTEGER,
      decision_under_ambiguity INTEGER,
      working_mindset_comments TEXT,

      -- Intuition
      failure_mode_awareness INTEGER,
      order_of_magnitude INTEGER,
      intuition_comments TEXT,

      -- Cross-functional Focus
      cross_functional_awareness INTEGER,
      cross_functional_integration INTEGER,
      cross_functional_comments TEXT,

      problem_statements TEXT,

      overall_recommendation TEXT,
      overall_comments TEXT,

      created_at TEXT DEFAULT (datetime('now')),

      FOREIGN KEY (interviewer_id) REFERENCES interviewers(id),
      FOREIGN KEY (candidate_id) REFERENCES candidates(id)
    );
  `);

  migrate(db);
}

function migrate(db: Database.Database) {
  const columns = db
    .prepare("PRAGMA table_info(feedback)")
    .all() as { name: string }[];

  if (columns.length === 0) return;

  const existing = new Set(columns.map((c) => c.name));

  for (const col of NEW_COLUMNS) {
    if (!existing.has(col)) {
      db.exec(`ALTER TABLE feedback ADD COLUMN ${col} INTEGER`);
    }
  }

  if (!existing.has("problem_statements")) {
    db.exec("ALTER TABLE feedback ADD COLUMN problem_statements TEXT");
  }
}

export default getDb;
