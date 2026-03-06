export interface ProblemPart {
  title: string;
  brief: string[];
  evaluationNotes: string[];
}

export interface ProblemStatement {
  id: string;
  title: string;
  tag: string;
  overview: string;
  parts: ProblemPart[];
}

export const PROBLEM_STATEMENTS: ProblemStatement[] = [
  {
    id: "smartglasses",
    title: "Smartglasses System Design",
    tag: "System Design / Mechanical",
    overview:
      "Multi-part problem exploring end-to-end hardware design thinking for a consumer wearable — from system architecture through detailed cross-section design and DFM.",
    parts: [
      {
        title: "Part 1 — System Architecture & Component Placement",
        brief: [
          "We are designing smartglasses with a central main frame, 2 lenses, and 2 temple arms.",
          "The glasses assembly includes 2× cameras, 2× speakers, and microphones.",
          "Describe what other components are required and where they should be placed in the system.",
        ],
        evaluationNotes: [
          "Battery — 1× or 2× cells? Placement in temple arms vs. main frame? How will thermals be managed (TIM pads, venting, duty-cycle throttling)?",
          "PCBA — rigid vs. flex vs. rigid-flex? Where to route and why (signal integrity near cameras, power near battery)?",
          "Sensors — IMU, proximity, ambient light, capacitive touch on temples?",
          "Antennas — BT/Wi-Fi placement for RF transparency, keep-out zones near metal?",
          "Hinge — mechanical complexity, degrees of freedom, fatigue life?",
          "Enclosure — plastic vs. metal shells? Weight budget, cosmetic requirements, IP rating?",
        ],
      },
      {
        title: "Part 2 — Hinge Design Deep-Dive",
        brief: [
          "Draw a cross-section of the hinge connecting the temple arm to the main frame.",
          "What materials will you choose for the hinge components?",
          "How will you transmit electricity through the hinge from the temple arms to the main center frame?",
        ],
        evaluationNotes: [
          "Mechanical wire routing — flex cable through hinge barrel, strain relief, bend radius management, cycle-life of flex at hinge.",
          "Pogo pins / spring contacts — pros (reliable, replaceable) vs. cons (contact resistance, wear, space).",
          "Hall-effect sensors / magnetic coupling — contactless signal transfer, limitations on power delivery.",
          "Mechanical switches — simple but wear-prone, added part count.",
          "Slip rings — continuous rotation capability vs. cost and size.",
          "Candidate should discuss drawbacks of each: fatigue life, signal noise, power loss, assembly complexity, cost.",
        ],
      },
      {
        title: "Part 3 — Temple Arm Cross-Section & DFM",
        brief: [
          "Draw cross-section of the temple arm at the battery region. Total arm width is 10 mm, battery is 5 mm, flex PCBA is 1 mm.",
          "Describe how you will manufacture the plastic enclosure for the arms.",
          "Walk through the full stack-up in this cross-section.",
          "What materials will you choose for the arms and how will you join them?",
        ],
        evaluationNotes: [
          "Reliability — battery tolerance (swelling up to 10%), need for compressible foam to absorb impact, thermal pad or gap filler between battery and shell.",
          "Manufacturing — how will the enclosure halves be split (top/bottom vs. inner/outer)? Joining methods: ultrasonic welding, snap fits, adhesive bonding, laser welding? Parting line cosmetics.",
          "Material properties — temple frame material (PC, nylon, magnesium, titanium?), foam (PU, silicone, poron), TIM selection (gap pad vs. thermal paste), structural adhesive selection.",
          "Tolerance stack-up — battery 5 mm ± tolerance, flex 1 mm, foam compression, adhesive bond-line, two shell halves → total must fit within 10 mm envelope. Does the candidate methodically walk through the stack?",
        ],
      },
    ],
  },
  {
    id: "dice_design",
    title: "Dice Design & Manufacturing",
    tag: "DFM / Materials / Process Selection",
    overview:
      "Design and manufacture a six-sided dice with dot markings for two scenarios: (a) a premium board game (<1,000 units/yr) and (b) mass-production cheap board game (>10M units/yr). Assesses high-level design thinking, creative problem solving, and depth in manufacturing and materials.",
    parts: [
      {
        title: "Part 1 — Requirements Definition",
        brief: [
          "What should be the requirements for both the premium and mass-production dice?",
          "Consider: dimensional accuracy, weight uniformity, balance/fairness, surface finish, marking durability, cost targets, regulatory compliance.",
        ],
        evaluationNotes: [
          "Premium — does the candidate discuss dice balance, weight consistency, flatness of each face (precision), graceful wear and tear with use, potential for customization (engraving, monograms)?",
          "Mass — does the candidate prioritize cost-per-unit, cycle time, tooling amortization, marking robustness at scale, consistent weight distribution across millions of units?",
        ],
      },
      {
        title: "Part 2 — Manufacturing Processes & Materials",
        brief: [
          "Describe at least 3 manufacturing processes you would use and the choice of materials for both dice scenarios.",
          "For each process, explain: material choice, why that process fits the volume, key process parameters, and cost drivers.",
        ],
        evaluationNotes: [
          "Premium dice materials — Brass (CZ121), 303/304 stainless, aircraft aluminum (6061) with hard anodization, soft-touch coated plastics, textured soft-touch plastic, leather-wrapped dice with clean seams, exotic woods.",
          "Premium mfg methods — CNC machining, metal inserts into plastic/wood/leather wraps, metal sintering (MIM), investment casting.",
          "Premium finishes — polished, PVD coated, anodization, brushed, nickel plated, tumbled.",
          "Premium markings — drilling/engraving with color infill (enamel or epoxy), laser engraving, chemical etching.",
          "Mass-production option A — Thermoplastic injection molding + pad printing. ABS or HIPS (tough, easy-mold, good color) or POM/Acetal for slicker, denser feel. Multi-cavity tool (64–128 cavities), cycle times 6–12 s, tools last millions of shots. Pad print pips with 2K ink → IR/oven cure → bulk pack. Piece cost ~$0.01–0.03 (molded) + $0.005–0.02 (print).",
          "Mass-production option B — Two-shot (2K) / co-injection molding with in-mold colored pips. ABS core + contrasting ABS for pips, or ABS + TPE for tactile dots. Eliminates printing station; pips are permanent and won't wear off. Higher tool complexity but lower long-run cost for 10M+/yr.",
          "Mass-production option C — Compression molding of thermoset + in-mold color fill (classic casino style). Urea-formaldehyde (UF) or melamine formaldehyde (MF) — very hard, glossy, dense. Pips drilled or co-formed then filled with contrasting MF paste. Legendary durability, high gloss without paint.",
        ],
      },
      {
        title: "Part 3 — Tolerances & Marking Methods",
        brief: [
          "What would be typical tolerances on key specs (size, weight) for either dice?",
          "What are some ways to mark the faces of dice?",
          "How would you test and decide between the marking options chosen?",
        ],
        evaluationNotes: [
          "Injection molding specifics — tooling structure, parting line locations, expected defects (flash, parting line mismatch, sink marks near thick sections), post-processing (tumble deburr, gate vestige removal).",
          "Balance considerations — uniform single-material body preferred; pad-printed pips are just ink (no mass removal) so balance remains excellent; drilled/engraved pips remove material asymmetrically.",
          "Testing — roll-distribution testing, wear/abrasion testing (Taber, rub count), drop testing, dimensional CMM inspection.",
          "Other high-volume options — laser marking on molded parts, in-mold labeling (IML), ultrasonic insertion of contrasting plugs.",
        ],
      },
    ],
  },
];
