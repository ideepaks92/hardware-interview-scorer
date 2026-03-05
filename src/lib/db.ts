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

      -- Technical Expertise (1-5)
      manufacturing INTEGER CHECK(manufacturing BETWEEN 1 AND 5),
      ta_gdt INTEGER CHECK(ta_gdt BETWEEN 1 AND 5),
      materials_selection INTEGER CHECK(materials_selection BETWEEN 1 AND 5),
      mechanism_machine_design INTEGER CHECK(mechanism_machine_design BETWEEN 1 AND 5),
      technical_comments TEXT,

      -- Design Analysis Skills (1-5)
      hand_calc_fea INTEGER CHECK(hand_calc_fea BETWEEN 1 AND 5),
      validation_test_planning INTEGER CHECK(validation_test_planning BETWEEN 1 AND 5),
      design_analysis_comments TEXT,

      -- Cultural Fit (1-5)
      collaboration INTEGER CHECK(collaboration BETWEEN 1 AND 5),
      no_asshole_behavior INTEGER CHECK(no_asshole_behavior BETWEEN 1 AND 5),
      respect INTEGER CHECK(respect BETWEEN 1 AND 5),
      honesty INTEGER CHECK(honesty BETWEEN 1 AND 5),
      cultural_fit_comments TEXT,

      -- Communication (1-5)
      conflict_resolution INTEGER CHECK(conflict_resolution BETWEEN 1 AND 5),
      communication_style INTEGER CHECK(communication_style BETWEEN 1 AND 5),
      async_vs_inperson INTEGER CHECK(async_vs_inperson BETWEEN 1 AND 5),
      communication_comments TEXT,

      -- Working Mindset (1-5)
      fast_moving_teams INTEGER CHECK(fast_moving_teams BETWEEN 1 AND 5),
      rapid_prototyping INTEGER CHECK(rapid_prototyping BETWEEN 1 AND 5),
      working_mindset_comments TEXT,

      -- Intuition (1-5)
      intuition INTEGER CHECK(intuition BETWEEN 1 AND 5),
      intuition_comments TEXT,

      -- Cross-functional Focus (1-5)
      cross_functional_awareness INTEGER CHECK(cross_functional_awareness BETWEEN 1 AND 5),
      cross_functional_comments TEXT,

      overall_recommendation TEXT,
      overall_comments TEXT,

      created_at TEXT DEFAULT (datetime('now')),

      FOREIGN KEY (interviewer_id) REFERENCES interviewers(id),
      FOREIGN KEY (candidate_id) REFERENCES candidates(id)
    );
  `);
}

export default getDb;
