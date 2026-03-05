# Interview Scorer — Hardware Engineering

A structured interview scoring system designed for assessing hardware engineering candidates across 7 key competency areas.

## Scoring Categories

| Category | Subcriteria |
|---|---|
| **Technical Expertise** | Manufacturing, TA & GD&T, Materials Selection, Mechanism & Machine Design |
| **Design Analysis Skills** | Hand Calculations / FEA, Validation & Test Planning |
| **Cultural Fit** | Collaboration, No Asshole Behavior, Respect, Honesty |
| **Communication** | Conflict Resolution, Communication Style, Async vs In-Person Judgment |
| **Working Mindset** | Suitability for Fast-Moving Teams, Rapid Prototyping Skills |
| **Intuition** | Engineering Intuition |
| **Cross-Functional Focus** | Awareness of Electrical / Reliability / ID / Quality Engineering |

Each subcriteria is rated **1–5** (Poor → Excellent) with free-text comments per category.

## Features

- **Simple login** — name + email, no password
- **Candidate management** — add candidates with resume upload
- **Structured scoring** — 7 categories, 18 subcriteria, 1–5 scale
- **Comparison dashboard** — side-by-side candidate comparison with averaged scores
- **Comment aggregation** — all interviewer comments collected per candidate
- **Overall recommendation** — Strong Yes / Yes / Maybe / No / Strong No

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Tech Stack

- **Next.js 16** (App Router, TypeScript)
- **Tailwind CSS v4**
- **SQLite** via better-sqlite3 (local, zero-config database)
