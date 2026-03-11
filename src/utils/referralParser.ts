export interface ParsedReferral {
  demographics: Record<string, string>;
  family: Record<string, string>;
  education: Record<string, string>;
  medical: Record<string, string>;
  mentalHealth: Record<string, string>;
  legal: Record<string, string>;
  behavioral: Record<string, string>;
  placement: Record<string, string>;
  assessment: Record<string, string>;
  strengths: Record<string, string>;
  serviceHistory: Record<string, string>;
  goals: Record<string, string>;
  insurance: Record<string, string>;
  restrictions: Record<string, string>;
  other: Record<string, string>;
}

export const SECTION_CONFIG = [
  {
    key: "demographics" as const,
    keywords: [
      "first name", "last name", "name", "dob", "date of birth", "age", "sex", "gender",
      "race", "ethnicity", "religion", "place of birth", "address", "city", "state", "zip",
      "current placement", "length of stay", "phone number", "contact",
    ],
    label: "Demographics",
  },
  {
    key: "family" as const,
    keywords: [
      "mother", "father", "parent", "guardian", "sibling", "family", "caregiver", "custody",
      "contact information", "engagement level", "primary guardian", "household",
    ],
    label: "Family & Contacts",
  },
  {
    key: "education" as const,
    keywords: [
      "school", "grade", "iep", "academic", "education", "teacher", "attendance",
      "credits", "graduation", "alternative learning", "special education",
    ],
    label: "Education",
  },
  {
    key: "medical" as const,
    keywords: [
      "medication", "allergy", "doctor", "medical", "health", "hospital", "clinic",
      "physician", "provider", "prescription", "compliance",
    ],
    label: "Medical",
  },
  {
    key: "mentalHealth" as const,
    keywords: [
      "diagnosis", "therapy", "counseling", "trauma", "anxiety", "depression", "adhd",
      "oppositional defiant", "odd", "mental health", "behavioral health", "clinical",
    ],
    label: "Mental Health",
  },
  {
    key: "legal" as const,
    keywords: [
      "court", "judge", "attorney", "probation", "caseworker", "case worker", "offense",
      "charge", "legal", "probation officer", "parole officer", "po ", "judicial", "violation",
      "dui", "court order", "committed", "jurisdiction",
    ],
    label: "Legal & Court",
  },
  {
    key: "behavioral" as const,
    keywords: [
      "behavior", "aggression", "anger", "violence", "substance", "runaway", "fighting",
      "impulsivity", "risk factor", "thc", "cannabis", "drug use", "alcohol", "threatening",
    ],
    label: "Behavioral History",
  },
  {
    key: "placement" as const,
    keywords: [
      "referral", "placement", "admission", "intake", "discharge", "group home",
      "estimated stay", "prtf", "foster care", "higher level of care", "duration",
      "out of state", "reason for seeking",
    ],
    label: "Placement & Referral",
  },
  {
    key: "assessment" as const,
    keywords: [
      "assessment", "yls-cmi", "yls cmi", "risk level", "risk domain", "domain",
      "prior offenses", "school work", "coping", "self-control", "friends", "peers",
      "thoughts", "beliefs", "high risk",
    ],
    label: "Risk Assessment",
  },
  {
    key: "strengths" as const,
    keywords: [
      "strength", "interest", "hobby", "talent", "strong", "skilled", "enjoys",
      "pro-social", "prosocial", "success", "resources", "visual learner", "goal",
    ],
    label: "Strengths & Interests",
  },
  {
    key: "serviceHistory" as const,
    keywords: [
      "service history", "community-based", "out-of-home", "therapeutic",
      "prior placement", "detention", "boys home", "youth center", "mst", "art",
      "previous service", "discharged", "completed",
    ],
    label: "Service History",
  },
  {
    key: "goals" as const,
    keywords: [
      "goal", "objective", "outcome", "discharge", "projected", "independent living",
      "treatment", "long term", "will address", "needs to develop",
    ],
    label: "Discharge Goals",
  },
  {
    key: "insurance" as const,
    keywords: [
      "insurance", "medicaid", "policy", "coverage", "active", "medical coverage",
      "substance use coverage", "mental health coverage",
    ],
    label: "Insurance & Coverage",
  },
  {
    key: "restrictions" as const,
    keywords: [
      "restriction", "contact restriction", "restricted", "no contact", "probation",
      "court order", "authorized", "placement restriction",
    ],
    label: "Restrictions",
  },
];

export const UNKNOWN_VALUE_RE = /^(n\/a|na|none|unknown|not provided|not documented|unspecified|-|—)$/i;

export const LINE_MARKER_RE = /^Line\s+(\d+):\s*$/i;

const PROBATION_ENTRY_RE =
  /^(?<name>.+?)\s*-\s*(?<decision>Yes|Maybe|No\+?-?|No\+o|No)\s*-\s*(?<age>\d{1,2})\s*-\s*(?<rest>.+)$/i;

const PROBATION_ENTRY_ALT_RE =
  /^(?<name>.+?)\s*-\s*(?<age>\d{1,2})\s*-\s*(?<decision>Yes|Maybe|No\+?-?|No\+o|No)\s*-\s*(?<rest>.+)$/i;

export const parseFieldLine = (line: string): { fieldName: string; value: string } | null => {
  const colonMatch = line.match(/^([^:]{2,80}):\s*(.+)$/);
  if (colonMatch) return { fieldName: colonMatch[1].trim(), value: colonMatch[2].trim() };

  const tabMatch = line.match(/^([^\t]{2,80})\t+(.+)$/);
  if (tabMatch) return { fieldName: tabMatch[1].trim(), value: tabMatch[2].trim() };

  const dashMatch = line.match(/^([A-Za-z][A-Za-z0-9 /()#&]{2,80})\s[-–—]\s(.+)$/);
  if (dashMatch) return { fieldName: dashMatch[1].trim(), value: dashMatch[2].trim() };

  return null;
};

export const detectSectionForField = (field: string): keyof ParsedReferral | null => {
  const fieldLower = field.toLowerCase();
  for (const section of SECTION_CONFIG) {
    if (section.keywords.some((kw) => fieldLower.includes(kw))) return section.key;
  }
  return null;
};

export const detectSectionHeader = (line: string): keyof ParsedReferral | null => {
  const normalized = line.toLowerCase().replace(/[:\-]+$/g, "").trim();
  if (!normalized) return null;
  for (const section of SECTION_CONFIG) {
    const label = section.label.toLowerCase();
    if (normalized === label || (normalized.includes(label) && normalized.length <= label.length + 14)) {
      return section.key;
    }
  }
  return null;
};

const normalizeDecision = (value: string): string => {
  const v = value.trim().toLowerCase();
  if (v === "yes") return "Yes";
  if (v === "maybe") return "Maybe";
  if (v.startsWith("no")) return "No";
  return value.trim();
};

const parseProbationEntryHeader = (
  line: string
): { name: string; decision: string; age: string; rest: string } | null => {
  const match = line.match(PROBATION_ENTRY_RE) || line.match(PROBATION_ENTRY_ALT_RE);
  if (!match?.groups) return null;
  if (!/\bPO\b/i.test(line)) return null;

  const name = (match.groups.name || "").trim();
  const decision = normalizeDecision((match.groups.decision || "").trim());
  const age = (match.groups.age || "").trim();
  const rest = (match.groups.rest || "").trim();
  if (!name || !decision || !age || !rest) return null;
  return { name, decision, age, rest };
};

const extractLabeledSegment = (text: string, labels: string[]): string => {
  const escaped = labels.map((l) => l.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const labelExpr = escaped.join("|");
  const re = new RegExp(`(?:^|,|;)\\s*(?:${labelExpr})\\s*\\(([^)]*)\\)`, "i");
  const match = text.match(re);
  return (match?.[1] || "").trim();
};

export const parseProbationStyleBlock = (raw: string): ParsedReferral | null => {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return null;

  let sourceLineNumber = "";
  const lineMarker = lines.find((l) => LINE_MARKER_RE.test(l));
  if (lineMarker) {
    sourceLineNumber = (lineMarker.match(LINE_MARKER_RE)?.[1] || "").trim();
  }

  const firstDataLine = lines.find((l) => !LINE_MARKER_RE.test(l));
  if (!firstDataLine) return null;
  const header = parseProbationEntryHeader(firstDataLine);
  if (!header) return null;

  const parsed: ParsedReferral = {
    demographics: {},
    family: {},
    education: {},
    medical: {},
    mentalHealth: {},
    legal: {},
    behavioral: {},
    placement: {},
    assessment: {},
    strengths: {},
    serviceHistory: {},
    goals: {},
    insurance: {},
    restrictions: {},
    other: {},
  };

  const poMatch = header.rest.match(/^(.*?)(?:\s*-\s*)?PO\s+([^()]+?)\s*(\([^)]+\)(?:\s*Ext\.?\s*[\dA-Za-z]+)?)?\s*$/i);
  const narrative = (poMatch?.[1] || header.rest).trim();
  const poName = (poMatch?.[2] || "").trim();
  const poPhone = (poMatch?.[3] || "").replace(/^\s+|\s+$/g, "");

  parsed.demographics["Name"] = header.name;
  parsed.demographics["Age"] = header.age;
  parsed.placement["Referral Recommendation"] = header.decision;
  if (poName) parsed.legal["Probation Officer"] = poName;
  if (poPhone) parsed.legal["Probation Officer Contact"] = poPhone;

  const currentOffense = extractLabeledSegment(narrative, ["current offense", "current offenses", "current charge", "current charges"]);
  const priorOffense = extractLabeledSegment(narrative, ["prior offense", "prior offenses", "previous offense", "previous offenses"]);
  const school = extractLabeledSegment(narrative, ["school"]);
  const substance = extractLabeledSegment(narrative, ["substance use"]);

  if (currentOffense) parsed.legal["Current Offense"] = currentOffense;
  if (priorOffense) parsed.legal["Prior Offense"] = priorOffense;
  if (school) parsed.education["School"] = school;
  if (substance) parsed.behavioral["Substance Use"] = substance;

  if (sourceLineNumber) parsed.other["Source Line"] = sourceLineNumber;
  parsed.other["Referral Narrative"] = narrative;
  parsed.other["Raw Entry"] = firstDataLine;

  return parsed;
};

export const parseReferralText = (raw: string): ParsedReferral => {
  const probationParsed = parseProbationStyleBlock(raw);
  if (probationParsed) return probationParsed;

  const result: ParsedReferral = {
    demographics: {},
    family: {},
    education: {},
    medical: {},
    mentalHealth: {},
    legal: {},
    behavioral: {},
    placement: {},
    assessment: {},
    strengths: {},
    serviceHistory: {},
    goals: {},
    insurance: {},
    restrictions: {},
    other: {},
  };

  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*[•\-\u2022\*]\s*/, "").trim())
    .filter((l) => l.length > 0);

  let currentFieldRef: { section: keyof ParsedReferral; fieldName: string } | null = null;
  let activeSection: keyof ParsedReferral = "other";

  for (const line of lines) {
    const sectionHeader = detectSectionHeader(line);
    if (sectionHeader) {
      activeSection = sectionHeader;
      currentFieldRef = null;
      continue;
    }

    const parsedField = parseFieldLine(line);
    if (!parsedField) {
      if (currentFieldRef) {
        const { section, fieldName } = currentFieldRef;
        const prev = result[section][fieldName] || "";
        result[section][fieldName] = prev ? `${prev} ${line}`.trim() : line.trim();
      } else {
        result.other[`Line ${Object.keys(result.other).length + 1}`] = line.trim();
      }
      continue;
    }

    const { fieldName, value } = parsedField;
    if (!value || UNKNOWN_VALUE_RE.test(value)) continue;

    const section = detectSectionForField(fieldName) || activeSection;
    result[section][fieldName] = value;
    currentFieldRef = { section, fieldName };
  }

  const totalParsed = Object.values(result).reduce((sum, section) => sum + Object.keys(section).length, 0);
  if (totalParsed === 0 && raw.trim().length > 0) {
    result.other["Referral Notes"] = raw.trim();
  }

  return result;
};

export const splitReferralEntries = (raw: string): string[] => {
  const normalized = raw.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const lines = normalized.split("\n");
  const probationBlocks: string[] = [];
  let pendingLineMarker = "";

  for (let i = 0; i < lines.length; i += 1) {
    const trimmed = lines[i].trim();
    if (!trimmed) continue;

    if (LINE_MARKER_RE.test(trimmed)) {
      pendingLineMarker = trimmed;
      continue;
    }

    if (!parseProbationEntryHeader(trimmed)) continue;

    const chunkLines: string[] = [];
    if (pendingLineMarker) chunkLines.push(pendingLineMarker);
    chunkLines.push(trimmed);
    pendingLineMarker = "";

    let j = i + 1;
    while (j < lines.length) {
      const next = lines[j].trim();
      if (!next) {
        j += 1;
        continue;
      }
      if (LINE_MARKER_RE.test(next) || parseProbationEntryHeader(next)) break;
      if (/^Feb\s+\d{1,2},\s+\d{4}$/i.test(next)) break;
      if (/^\d+\s+fields$/i.test(next) || /^Source:\s*/i.test(next) || /^Status:\s*/i.test(next)) break;
      chunkLines.push(next);
      j += 1;
    }

    probationBlocks.push(chunkLines.join("\n").trim());
    i = j - 1;
  }

  if (probationBlocks.length > 1) return probationBlocks;

  const firstNameStarts: number[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim().toLowerCase();
    if (/^first name\s*:/.test(line)) firstNameStarts.push(i);
  }
  if (firstNameStarts.length >= 2) {
    const segments: string[] = [];
    for (let i = 0; i < firstNameStarts.length; i += 1) {
      const start = firstNameStarts[i];
      const end = i + 1 < firstNameStarts.length ? firstNameStarts[i + 1] : lines.length;
      const block = lines.slice(start, end).join("\n").trim();
      if (block) segments.push(block);
    }
    if (segments.length > 1) return segments;
  }

  const delimiterSplit = normalized
    .split(/\n(?:[-_=]{3,}|\*{3,})\n/g)
    .map((s) => s.trim())
    .filter(Boolean);
  if (delimiterSplit.length > 1) return delimiterSplit;

  const sections = normalized
    .split(/\n\s*\n+/g)
    .map((s) => s.trim())
    .filter(Boolean);
  const likelyBlocks = sections.filter((s) =>
    /(first name|last name|date of birth|dob|referral source|reason for placement)/i.test(s)
  );
  if (likelyBlocks.length >= 2) return likelyBlocks;

  return [normalized];
};

export const inferReferralName = (parsed: ParsedReferral): string => {
  const findValue = (keys: string[]): string => {
    const entries = Object.entries(parsed.demographics);
    for (const [k, v] of entries) {
      const lk = k.toLowerCase();
      if (keys.some((x) => lk.includes(x)) && v.trim()) return v.trim();
    }
    return "";
  };

  const fullName = findValue(["full name", "name"]);
  const first = findValue(["first name"]);
  const last = findValue(["last name"]);

  if (first || last) return `${first} ${last}`.trim();
  return fullName;
};

export const inferReferralSource = (parsed: ParsedReferral): string => {
  const sections = [parsed.placement, parsed.legal, parsed.other];
  for (const section of sections) {
    for (const [k, v] of Object.entries(section)) {
      const lk = k.toLowerCase();
      if (lk.includes("referral source") || lk === "source" || lk.includes("placing agency") || lk.includes("county")) {
        if (v.trim()) return v.trim();
      }
    }
  }
  return "";
};

export const inferCaseWorker = (parsed: ParsedReferral): string => {
  const sections = [parsed.legal, parsed.placement, parsed.other];
  for (const section of sections) {
    for (const [k, v] of Object.entries(section)) {
      const lk = k.toLowerCase();
      if (
        lk.includes("case worker") || lk.includes("caseworker") ||
        lk.includes("probation officer") || lk.includes("parole officer") ||
        lk === "po" || lk.includes("p.o.") || lk.includes("worker name") ||
        lk.includes("assigned worker") || lk.includes("dcf worker")
      ) {
        if (v.trim()) return v.trim();
      }
    }
  }
  return "";
};

export const inferGlobalReferralSource = (raw: string): string => {
  const m = raw.match(/(?:^|\n)\s*Source:\s*([^\n|]+)/i);
  return (m?.[1] || "").trim();
};

export const inferGlobalStaffName = (raw: string): string => {
  const m = raw.match(/(?:^|\n)\s*Staff:\s*([^\n|]+)/i);
  return (m?.[1] || "").trim();
};
