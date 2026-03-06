export type ScaleLabels = [string, string, string, string, string];

export interface SubcriteriaConfig {
  key: string;
  label: string;
  scale: ScaleLabels;
  doordashValues: string[];
}

export interface CategoryConfig {
  key: string;
  label: string;
  weight: number;
  subcriteria: SubcriteriaConfig[];
  commentKey: string;
}

export const SCORING_CATEGORIES: CategoryConfig[] = [
  {
    key: "technical_expertise",
    label: "Technical Expertise",
    weight: 0.2,
    subcriteria: [
      {
        key: "system_level_thinking",
        label: "System-Level / Product-Level Design Thinking",
        scale: [
          "Thinks only at component level; no awareness of system interactions",
          "Understands basic subsystem dependencies when pointed out",
          "Considers thermal, structural, and assembly interactions across subsystems",
          "Drives architecture decisions; balances system-level tradeoffs across EE/ME/SW",
          "Defines product architecture; anticipates cascading impacts; owns system integration",
        ],
        doordashValues: ["Dream Big Start Small", "Think Outside the Room"],
      },
      {
        key: "mechanism_machine_design",
        label: "Mechanism & Machine Design",
        scale: [
          "No experience",
          "Textbook knowledge only",
          "Designs simple mechanisms",
          "Designs complex multi-body systems",
          "Innovative solutions; patents-level thinking",
        ],
        doordashValues: [],
      },
      {
        key: "dfm_process_selection",
        label: "Manufacturing Processes & DFM",
        scale: [
          "Unfamiliar with processes",
          "Knows basic processes",
          "Selects appropriate process for volume/geometry",
          "Optimizes designs for manufacturability",
          "Drives DFM across the team; deep multi-process fluency",
        ],
        doordashValues: ["Operate at the Lowest Level of Detail"],
      },
      {
        key: "materials_selection",
        label: "Materials Selection",
        scale: [
          "No material knowledge",
          "Knows common materials",
          "Selects appropriately for application",
          "Optimizes tradeoffs across cost/weight/performance",
          "Deep cross-domain expertise; sources novel materials",
        ],
        doordashValues: ["And Not Either/Or"],
      },
      {
        key: "ta_gdt",
        label: "TA & GD&T",
        scale: [
          "Cannot read drawings",
          "Reads basic callouts",
          "Applies standards correctly",
          "Drives tolerance analysis; catches issues in reviews",
          "Full mastery; teaches others",
        ],
        doordashValues: ["Operate at the Lowest Level of Detail"],
      },
    ],
    commentKey: "technical_comments",
  },
  {
    key: "design_analysis",
    label: "Design Analysis Skills",
    weight: 0.1,
    subcriteria: [
      {
        key: "analytical_judgment",
        label: "Analytical Judgment (Hand Calcs & FEA)",
        scale: [
          "Cannot perform basic analysis",
          "Can do simple calcs; FEA only with hand-holding",
          "Chooses appropriate method; executes standard analysis",
          "Knows when FEA adds value vs. hand calcs; validates with sanity checks",
          "Drives analysis strategy; questions assumptions; catches others' errors",
        ],
        doordashValues: ["Truth Seek"],
      },
      {
        key: "test_strategy",
        label: "Test Strategy & Requirements",
        scale: [
          "No awareness of test standards",
          "Follows templates without understanding",
          "Defines acceptance criteria; knows relevant standards",
          "Designs HALT/HASS plans; links tests to failure modes",
          "Owns test strategy end-to-end; drives reliability culture",
        ],
        doordashValues: ["Be an Owner"],
      },
      {
        key: "test_execution",
        label: "Test Execution & Instrumentation",
        scale: [
          "No hands-on test experience",
          "Can run a pre-written test plan",
          "Selects sensors/fixtures; acquires clean data",
          "Designs custom fixtures; interprets results statistically",
          "Expert in instrumentation; builds test capability for org",
        ],
        doordashValues: ["Operate at the Lowest Level of Detail"],
      },
    ],
    commentKey: "design_analysis_comments",
  },
  {
    key: "cultural_fit",
    label: "Cultural Fit",
    weight: 0.2,
    subcriteria: [
      {
        key: "collaboration_respect",
        label: "Collaboration & Respect",
        scale: [
          "Works in isolation; dismissive of others",
          "Reluctant collaborator; inconsistent respect",
          "Participates when asked; polite",
          "Active partner; genuinely values others' input",
          "Drives collaboration; champions teammates",
        ],
        doordashValues: ["Make Room at the Table", "One Team One Fight"],
      },
      {
        key: "no_asshole_behavior",
        label: "No Asshole Behavior",
        scale: [
          "Disruptive to team dynamics",
          "Creates friction in discussions",
          "Neutral presence",
          "Considerate of impact on others",
          "Actively uplifts people around them",
        ],
        doordashValues: ["Make Room at the Table"],
      },
      {
        key: "receptivity_to_feedback",
        label: "Receptivity to Feedback",
        scale: [
          "Defensive; shuts down when challenged",
          "Listens but rarely changes approach",
          "Accepts feedback; adjusts when pushed",
          "Welcomes being challenged; adapts readily",
          "Actively seeks critique; grows visibly from input",
        ],
        doordashValues: ["1% Better Every Day"],
      },
      {
        key: "intellectual_honesty",
        label: "Intellectual Honesty",
        scale: [
          "Bluffs through unknowns",
          "Deflects when challenged on gaps",
          "Generally acknowledges limits",
          "Comfortably says 'I don't know'; self-aware",
          "Proactively flags blind spots; separates knowledge from inference",
        ],
        doordashValues: ["Truth Seek"],
      },
    ],
    commentKey: "cultural_fit_comments",
  },
  {
    key: "communication",
    label: "Communication",
    weight: 0.1,
    subcriteria: [
      {
        key: "conflict_resolution",
        label: "Conflict Resolution",
        scale: [
          "Avoids conflict or escalates unnecessarily",
          "Struggles to find resolution",
          "Manages disagreements adequately",
          "Resolves constructively; finds common ground",
          "Skilled mediator; turns conflict into alignment",
        ],
        doordashValues: ["One Team One Fight"],
      },
      {
        key: "communication_style",
        label: "Communication Style & Skillset",
        scale: [
          "Unclear; hard to follow",
          "Sometimes clear; loses audience",
          "Adequate; gets point across",
          "Clear and concise; adapts to audience",
          "Exceptional communicator; persuasive and precise",
        ],
        doordashValues: ["Think Outside the Room"],
      },
      {
        key: "async_vs_inperson",
        label: "Async vs In-Person Judgment",
        scale: [
          "Poor channel judgment; wrong medium for the message",
          "Defaults to one mode regardless of context",
          "Adequate judgment most of the time",
          "Good judgment; matches urgency/complexity to channel",
          "Optimal picker; maximizes team throughput via channel choice",
        ],
        doordashValues: [],
      },
    ],
    commentKey: "communication_comments",
  },
  {
    key: "working_mindset",
    label: "Startup Mindset",
    weight: 0.15,
    subcriteria: [
      {
        key: "fast_moving_teams",
        label: "Suitability for Fast-Moving Teams",
        scale: [
          "Needs stable, well-defined environment",
          "Adapts slowly to changing priorities",
          "Keeps pace with shifting goals",
          "Thrives when priorities shift; re-plans quickly",
          "Drives velocity; energizes team through change",
        ],
        doordashValues: ["Bias for Action"],
      },
      {
        key: "rapid_prototyping",
        label: "Rapid Prototyping Skills",
        scale: [
          "No prototyping experience",
          "Slow and methodical only",
          "Can build functional prototypes",
          "Fast and scrappy; builds to learn",
          "Exceptional — fastest path to insight",
        ],
        doordashValues: ["Dream Big Start Small"],
      },
      {
        key: "decision_under_ambiguity",
        label: "Decision-Making Under Ambiguity",
        scale: [
          "Paralyzed without full spec",
          "Needs most details before acting",
          "Reasonable progress with some gaps",
          "Comfortable with 70% information; makes reversible bets",
          "Thrives in ambiguity; moves fast, course-corrects often",
        ],
        doordashValues: ["Be an Owner", "Choose Optimism and Have a Plan"],
      },
    ],
    commentKey: "working_mindset_comments",
  },
  {
    key: "cross_functional",
    label: "Cross-Functional Focus",
    weight: 0.15,
    subcriteria: [
      {
        key: "cross_functional_awareness",
        label: "Cross-Functional Awareness",
        scale: [
          "Siloed; unaware of adjacent disciplines",
          "Aware of other teams but ignores their needs",
          "Considers other functions when prompted",
          "Proactively asks what EE/rel/ID/QE teams need",
          "Deep understanding of adjacent disciplines' constraints",
        ],
        doordashValues: ["Think Outside the Room", "Customer-Obsessed Not Competitor Focused"],
      },
      {
        key: "cross_functional_integration",
        label: "Cross-Functional Integration",
        scale: [
          "Does not change design based on other teams' input",
          "Acknowledges input but proceeds unchanged",
          "Incorporates feedback when trade-offs are minor",
          "Actively redesigns to satisfy cross-functional requirements",
          "Champions cross-functional optimization; co-designs with other teams",
        ],
        doordashValues: ["One Team One Fight", "And Not Either/Or"],
      },
    ],
    commentKey: "cross_functional_comments",
  },
  {
    key: "intuition",
    label: "Intuition",
    weight: 0.1,
    subcriteria: [
      {
        key: "failure_mode_awareness",
        label: "Failure Mode Awareness",
        scale: [
          "No awareness of potential failures",
          "Reactive; sees failures only after they happen",
          "Identifies obvious risks during design",
          "Anticipates subtle failure modes proactively",
          "Predicts field failures from design; DFMEA-level thinking",
        ],
        doordashValues: ["Operate at the Lowest Level of Detail"],
      },
      {
        key: "order_of_magnitude",
        label: "Order-of-Magnitude Estimation",
        scale: [
          "Cannot estimate; no reference frame",
          "Estimates often off by 10x or more",
          "Within 3x on common engineering quantities",
          "Within 50%; catches unreasonable numbers quickly",
          "Nails estimates; rapid sanity-check reflex",
        ],
        doordashValues: [],
      },
    ],
    commentKey: "intuition_comments",
  },
];

export const NA_SCORE = -1;

export const CATEGORY_SHORT_LABELS: Record<string, string> = {
  technical_expertise: "Tech",
  design_analysis: "Analysis",
  cultural_fit: "Cultural",
  communication: "Comm",
  working_mindset: "Startup",
  cross_functional: "X-func",
  intuition: "Intuition",
};

export function scoreToPercent(score: number | null): string {
  if (score === null || score <= 0) return "--";
  return `${Math.round((score / 5) * 100)}%`;
}

export function computeCategoryAverage(
  feedback: Record<string, number | string | null>,
  category: CategoryConfig
): number {
  const scores = category.subcriteria
    .map((sc) => feedback[sc.key])
    .filter((v): v is number => typeof v === "number" && v > 0);
  if (scores.length === 0) return 0;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

export function computeWeightedOverall(
  feedback: Record<string, number | string | null>
): number {
  let totalWeight = 0;
  let weightedSum = 0;

  for (const cat of SCORING_CATEGORIES) {
    const avg = computeCategoryAverage(feedback, cat);
    if (avg > 0) {
      weightedSum += avg * cat.weight;
      totalWeight += cat.weight;
    }
  }

  if (totalWeight === 0) return 0;
  return weightedSum / totalWeight;
}
