# Hardware Interview Scorer

A structured interview scoring system for assessing hardware engineering candidates across 7 weighted competency areas, aligned with DoorDash values.

## Scoring Categories

| Category | Weight | Subcriteria | DoorDash Values |
|---|---|---|---|
| **Technical Expertise** | 25% | DFM & Process Selection, TA & GD&T, Materials Selection, Mechanism & Machine Design | Operate at the Lowest Level of Detail, And Not Either/Or, Dream Big Start Small |
| **Design Analysis Skills** | 15% | Analytical Judgment, Test Strategy & Requirements, Test Execution & Instrumentation | Truth Seek, Operate at the Lowest Level of Detail |
| **Cultural Fit** | 15% | Collaboration & Respect, No Asshole Behavior, Receptivity to Feedback, Intellectual Honesty | Make Room at the Table, One Team One Fight, 1% Better Every Day, Truth Seek |
| **Communication** | 10% | Conflict Resolution, Communication Style, Async vs In-Person Judgment | One Team One Fight, Choose Optimism and Have a Plan, Think Outside the Room, And Not Either/Or |
| **Working Mindset** | 15% | Fast-Moving Teams, Rapid Prototyping, Decision-Making Under Ambiguity | Bias for Action, Dream Big Start Small, Be an Owner, Choose Optimism and Have a Plan |
| **Intuition** | 10% | Failure Mode Awareness, Order-of-Magnitude Estimation | Operate at the Lowest Level of Detail, Truth Seek |
| **Cross-Functional Focus** | 10% | Cross-Functional Awareness, Cross-Functional Integration | Think Outside the Room, Customer-Obsessed Not Competitor Focused, One Team One Fight, And Not Either/Or |

Each subcriteria is rated **1–5** with context-specific behavioral anchors, plus an **N/A** option for unassessed areas.

## Features

- **Simple login** — name + email, no password
- **Candidate management** — add candidates with resume upload (PDF/DOCX)
- **Structured scoring** — 7 weighted categories, 21 subcriteria, behavioral 1–5 scales
- **DoorDash values alignment** — blue badge tags on every subcriteria
- **N/A support** — skip unassessed areas without affecting averages
- **Problem statements** — multi-select interview problems with expandable briefs and evaluation criteria (Smartglasses System Design, Dice Design & Manufacturing)
- **Weighted comparison dashboard** — side-by-side candidate comparison using weighted category averages
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
