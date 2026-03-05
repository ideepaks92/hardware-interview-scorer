export interface CategoryConfig {
  key: string;
  label: string;
  subcriteria: { key: string; label: string }[];
  commentKey: string;
}

export const SCORING_CATEGORIES: CategoryConfig[] = [
  {
    key: "technical_expertise",
    label: "Technical Expertise",
    subcriteria: [
      { key: "manufacturing", label: "Manufacturing" },
      { key: "ta_gdt", label: "TA & GD&T" },
      { key: "materials_selection", label: "Materials Selection" },
      { key: "mechanism_machine_design", label: "Mechanism & Machine Design" },
    ],
    commentKey: "technical_comments",
  },
  {
    key: "design_analysis",
    label: "Design Analysis Skills",
    subcriteria: [
      { key: "hand_calc_fea", label: "Hand Calculations / FEA" },
      { key: "validation_test_planning", label: "Validation & Test Planning" },
    ],
    commentKey: "design_analysis_comments",
  },
  {
    key: "cultural_fit",
    label: "Cultural Fit",
    subcriteria: [
      { key: "collaboration", label: "Collaboration" },
      { key: "no_asshole_behavior", label: "No Asshole Behavior" },
      { key: "respect", label: "Respect" },
      { key: "honesty", label: "Honesty" },
    ],
    commentKey: "cultural_fit_comments",
  },
  {
    key: "communication",
    label: "Communication",
    subcriteria: [
      { key: "conflict_resolution", label: "Conflict Resolution" },
      { key: "communication_style", label: "Communication Style & Skillset" },
      { key: "async_vs_inperson", label: "Async vs In-Person Judgment" },
    ],
    commentKey: "communication_comments",
  },
  {
    key: "working_mindset",
    label: "Working Mindset",
    subcriteria: [
      { key: "fast_moving_teams", label: "Suitability for Fast-Moving Teams" },
      { key: "rapid_prototyping", label: "Rapid Prototyping Skills" },
    ],
    commentKey: "working_mindset_comments",
  },
  {
    key: "intuition",
    label: "Intuition",
    subcriteria: [{ key: "intuition", label: "Engineering Intuition" }],
    commentKey: "intuition_comments",
  },
  {
    key: "cross_functional",
    label: "Cross-Functional Focus",
    subcriteria: [
      {
        key: "cross_functional_awareness",
        label: "Awareness of Electrical / Reliability / ID / Quality Engineering",
      },
    ],
    commentKey: "cross_functional_comments",
  },
];

export function computeCategoryAverage(
  feedback: Record<string, number | string | null>,
  category: CategoryConfig
): number {
  const scores = category.subcriteria
    .map((sc) => feedback[sc.key])
    .filter((v): v is number => typeof v === "number");
  if (scores.length === 0) return 0;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

export function computeOverallScore(
  feedback: Record<string, number | string | null>
): number {
  const allScores = SCORING_CATEGORIES.flatMap((cat) =>
    cat.subcriteria
      .map((sc) => feedback[sc.key])
      .filter((v): v is number => typeof v === "number")
  );
  if (allScores.length === 0) return 0;
  return allScores.reduce((a, b) => a + b, 0) / allScores.length;
}
