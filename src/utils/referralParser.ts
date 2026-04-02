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
      "date of referral", "referral date", "csp", "comprehensive supervision",
      "reason for ooh", "out-of-home placement", "placement start",
    ],
    label: "Demographics",
  },
  {
    key: "family" as const,
    keywords: [
      "mother", "father", "parent", "guardian", "sibling", "family", "caregiver", "custody",
      "contact information", "engagement level", "primary guardian", "household",
      "mom", "dad", "stepmother", "stepfather", "step mother", "step father",
      "next of kin", "emergency contact", "foster parent", "grandmother", "grandfather",
      "grandparent", "aunt", "uncle", "relative", "biological parent",
      "primary contact", "alternate contact", "second contact",
      "engagement", "visitation", "custody arrangement",
      "guardian 1", "guardian 2", "crossover", "guardian engagement",
      "contact plan", "initial contact", "parent education", "extended family",
      "family visit", "visit plan",
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
      "treatment provider", "treatment recommendation", "treatment level",
      "treatment modality", "prescribed medication", "medication compliant",
      "iop", "day treatment", "partial care", "thgh", "outpatient",
      "behavioral health comment", "responsivity", "risk contribution",
      "current/recent treatment", "most recent treatment",
    ],
    label: "Mental Health",
  },
  {
    key: "legal" as const,
    keywords: [
      "court", "judge", "attorney", "probation", "caseworker", "case worker", "offense",
      "charge", "legal", "probation officer", "parole officer", "po ", "judicial", "violation",
      "dui", "court order", "committed", "jurisdiction",
      "gal", "casa", "county", "probation district", "probation email",
      "po email", "other professional",
    ],
    label: "Legal & Court",
  },
  {
    key: "behavioral" as const,
    keywords: [
      "behavior", "aggression", "anger", "violence", "runaway", "fighting",
      "impulsivity", "risk factor", "thc", "cannabis", "drug use", "alcohol", "threatening",
      "substance abuse", "substance misuse", "substance use history", "substance use disorder",
      "drug abuse", "tox screen",
      "youth responsivity", "family responsivity", "trafficking", "gang", "suicide",
      "assaultive", "weapons", "fire setting", "missing from home", "problematic sexual",
      "lgbtq", "teen parent", "victim issues", "dd/iq", "physical disability", "medical needs",
    ],
    label: "Behavioral History",
  },
  {
    key: "placement" as const,
    keywords: [
      "referral", "placement", "admission", "intake", "discharge", "group home",
      "estimated stay", "prtf", "foster care", "higher level of care", "duration",
      "out of state", "reason for seeking",
      "service type", "treatment type", "treatment track", "non-treatment",
      "level of service", "primary service", "secondary service", "accommodation",
      "date service needed", "service needed", "foster care preferred",
      "preferred community", "discharge location", "discharge timeframe",
    ],
    label: "Placement & Referral",
  },
  {
    key: "assessment" as const,
    keywords: [
      "assessment", "yls-cmi", "yls cmi", "yls/cmi", "risk level", "risk domain", "domain",
      "prior offenses", "school work", "coping", "self-control", "friends", "peers",
      "thoughts", "beliefs", "high risk",
      "yls", "overall risk", "life area", "coping/self", "free time", "use of free",
      "prior/current", "primary driver", "school/work", "iep academic", "iep behavioral",
      "employment status", "progress toward graduation", "home school", "plan 504",
      "mdt", "alcohol/drug", "thoughts and beliefs", "thoughts/beliefs",
      "date completed", "brief summary of circumstances", "key life area",
    ],
    label: "Risk Assessment",
  },
  {
    key: "strengths" as const,
    keywords: [
      "strength", "interest", "hobby", "talent", "strong", "skilled", "enjoys",
      "pro-social", "prosocial", "success", "resources", "visual learner", "goal",
      "known risk", "barrier", "prior successful", "positive support", "pro social",
    ],
    label: "Strengths & Interests",
  },
  {
    key: "serviceHistory" as const,
    keywords: [
      "service history", "community-based", "out-of-home", "therapeutic",
      "prior placement", "detention", "boys home", "youth center", "mst", "art",
      "previous service", "discharged", "completed",
      "services home", "services out", "services therapeutic",
      "home/community", "home and community",
    ],
    label: "Service History",
  },
  {
    key: "goals" as const,
    keywords: [
      "goal", "objective", "outcome", "discharge", "projected", "independent living",
      "treatment goal", "treatment objective", "long term", "will address", "needs to develop",
      "outcome 1", "outcome 2", "outcome 3", "projected discharge", "discharge goal",
      "placement outcome", "skills to develop", "time frames and other",
    ],
    label: "Discharge Goals",
  },
  {
    key: "insurance" as const,
    keywords: [
      "insurance", "medicaid", "policy", "coverage", "active", "medical coverage",
      "substance use coverage", "mental health coverage",
      "policy holder", "policy number", "private insurance",
      "mental health covered", "substance use covered", "treatment covered",
      "substance use treatment covered", "mental health treatment covered",
    ],
    label: "Insurance & Coverage",
  },
  {
    key: "restrictions" as const,
    keywords: [
      "restriction", "contact restriction", "restricted", "no contact", "probation",
      "court order", "authorized", "placement restriction",
      "interpreter", "language", "restriction by", "no contact order",
      "contact restriction by", "special request",
    ],
    label: "Restrictions",
  },
];

// Contact person detection — field names that represent a person role
const CONTACT_PERSON_RE = /^(mother'?s?|father'?s?|parent'?s?|parent\/guardian'?s?|parent\/guardians?|step-?mother|step-?father|legal guardian|primary guardian|secondary guardian|guardian'?s?|caregiver|next of kin|emergency contact|foster parent|relative|aunt|uncle|grandmother|grandfather|grandparent|grandma|grandpa)$/i;

// Generic sub-fields that should inherit the active contact person's prefix
const CONTACT_SUBFIELD_NAMES = new Set([
  'phone', 'cell', 'cell phone', 'mobile', 'mobile phone', 'home phone', 'work phone',
  'phone number', 'telephone', 'contact number', 'alt phone', 'alternate phone', 'pager',
  'address', 'home address', 'mailing address', 'street', 'street address',
  'city', 'state', 'zip', 'zip code', 'city/state', 'city, state', 'city state zip',
  'email', 'email address', 'e-mail',
  'relationship', 'relation', 'relation to youth', 'relationship to youth',
  'employer', 'occupation', 'workplace',
]);

function normalizeContactPersonLabel(fieldName: string): string {
  const lc = fieldName.toLowerCase().replace(/['']s$/, '').trim();
  if (lc === 'mother') return 'Mother';
  if (lc === 'father') return 'Father';
  if (lc === 'parent' || lc === 'parents') return 'Parent';
  if (lc === 'parent/guardian' || lc === 'parent/guardians') return 'Guardian';
  if (lc.includes('legal guardian') || lc.includes('primary guardian') || lc.includes('secondary guardian')) return 'Guardian';
  if (lc === 'guardian' || lc === 'guardians') return 'Guardian';
  if (lc === 'stepmother' || lc === 'step-mother') return 'Stepmother';
  if (lc === 'stepfather' || lc === 'step-father') return 'Stepfather';
  if (lc === 'caregiver') return 'Caregiver';
  if (lc === 'next of kin') return 'Next of Kin';
  if (lc === 'emergency contact') return 'Emergency Contact';
  if (lc === 'foster parent') return 'Foster Parent';
  if (lc === 'relative') return 'Relative';
  if (lc === 'aunt') return 'Aunt';
  if (lc === 'uncle') return 'Uncle';
  if (lc === 'grandmother' || lc === 'grandma') return 'Grandmother';
  if (lc === 'grandfather' || lc === 'grandpa') return 'Grandfather';
  if (lc === 'grandparent') return 'Grandparent';
  return fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
}

function normalizeFieldName(fieldName: string): string {
  // Strip leading checkbox characters (☒, ☐, and variants)
  let name = fieldName.replace(/^[\s☒☐✓✗□\u2610\u2611\u2612]+/, "").trim();
  // Normalize possessive forms: "Mother's Phone" → "Mother Phone"
  name = name.replace(/['']s\s+/g, ' ').replace(/['']s$/g, '').trim();
  return name;
}

/**
 * Normalize checkbox-style values like "☒ Yes ☐ No" → "Yes"
 * or "☒ Academic ☒ Behavioral" → "Academic, Behavioral"
 */
function normalizeCheckboxValue(value: string): string {
  // If value contains checkbox characters, extract checked items
  if (/[☒☐\u2610\u2611\u2612]/.test(value)) {
    const checkedItems: string[] = [];
    // Match ☒ followed by text (up to next checkbox or end)
    const checkedRe = /[☒\u2611\u2612]\s*([^☒☐\u2610\u2611\u2612]{1,60}?)(?=[☒☐\u2610\u2611\u2612]|$)/g;
    let m;
    while ((m = checkedRe.exec(value)) !== null) {
      const item = m[1].replace(/\bPlease specify\.?\s*/i, "").trim().replace(/[.,;]+$/, "");
      if (item) checkedItems.push(item);
    }
    if (checkedItems.length > 0) return checkedItems.join(", ");
    // Fall back to stripping all checkbox chars
    return value.replace(/[☒☐\u2610\u2611\u2612]/g, "").replace(/\s{2,}/g, " ").trim();
  }
  return value;
}

export const UNKNOWN_VALUE_RE = /^(n\/a|na|none|unknown|not provided|not documented|unspecified|-|—|click or tap here to enter text\.?|click here\.?|tap here\.?)$/i;

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

// OHP referral form section titles → internal section keys
const OHP_SECTION_HEADER_MAP: Record<string, keyof ParsedReferral> = {
  "youth information": "demographics",
  "parent/guardian information": "family",
  "parent guardian information": "family",
  "professional team information": "legal",
  "level of service requested": "placement",
  "assessment of strengths and needs": "strengths",
  "responsivity factors": "mentalHealth",
  "responsivity factors behavioral health needs": "mentalHealth",
  "behavioral health needs": "mentalHealth",
  "family visit and contact plan": "family",
  "current/prior services": "serviceHistory",
  "current prior services": "serviceHistory",
  "desired outcomes": "goals",
  "desired outcomes / discharge goals": "goals",
  "desired outcomes to achieve successful discharge": "goals",
  "discharge goals": "goals",
  "insurance / billing": "insurance",
  "insurance/billing": "insurance",
  "final comments": "restrictions",
  "attachments": "other",
  "description of key life areas": "assessment",
  "description of key life areas (domains) and areas of strength": "assessment",
  "key life areas": "assessment",
  "youth level of service inventory": "assessment",
  "youth level of service inventory/case management inventory": "assessment",
  "yls/cmi": "assessment",
};

export const detectSectionHeader = (line: string): keyof ParsedReferral | null => {
  // Strip leading checkbox characters before testing
  const stripped = line.replace(/^[\s☒☐✓✗□\u2610\u2611\u2612]+/, "").trim();
  const normalized = stripped.toLowerCase().replace(/[:\-]+$/g, "").trim();
  if (!normalized || normalized.length < 4) return null;

  // Check OHP form section titles first (exact or near-exact match)
  for (const [ohpTitle, sectionKey] of Object.entries(OHP_SECTION_HEADER_MAP)) {
    if (normalized === ohpTitle || normalized.startsWith(ohpTitle)) {
      return sectionKey;
    }
  }

  // Check internal section labels (existing logic)
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
    .map((l) => l.replace(/^\s*[•\-\u2022\*☒☐\u2610\u2611\u2612]\s*/, "").trim())
    .filter((l) => l.length > 0);

  let currentFieldRef: { section: keyof ParsedReferral; fieldName: string } | null = null;
  let activeSection: keyof ParsedReferral = "other";
  let activeContactPerson: string | null = null;
  // Holds a parsed field label that had no value on the same line (label-then-next-line-value format)
  let pendingLabel: { rawFieldName: string } | null = null;

  for (const line of lines) {
    const sectionHeader = detectSectionHeader(line);
    if (sectionHeader) {
      activeSection = sectionHeader;
      currentFieldRef = null;
      activeContactPerson = null;
      pendingLabel = null;
      continue;
    }

    // --- Handle pending label (label was on previous line with no value) ---
    if (pendingLabel) {
      // This line should be the value for the pending label.
      // Only treat it as the value if it does NOT itself look like a section header or a new label.
      const isNewLabel = /^[^:]{2,80}:\s*.+$/.test(line) || /^[^:]{2,80}:\s*$/.test(line);
      if (!isNewLabel && !detectSectionHeader(line)) {
        // Synthesize a full "Label: Value" line and process it
        const syntheticLine = `${pendingLabel.rawFieldName}: ${line.trim()}`;
        pendingLabel = null;
        const syntheticParsed = parseFieldLine(syntheticLine);
        if (syntheticParsed) {
          const { fieldName: rawFieldName, value: rawValue } = syntheticParsed;
          const fieldName = normalizeFieldName(rawFieldName);
          const value = normalizeCheckboxValue(rawValue);
          if (value && !UNKNOWN_VALUE_RE.test(value)) {
            const fieldNameLower = fieldName.toLowerCase().trim();
            if (/^placement outcome\s+\d+/i.test(fieldNameLower)) {
              result.goals[fieldName] = value;
              currentFieldRef = { section: 'goals', fieldName };
            } else if (CONTACT_PERSON_RE.test(fieldName)) {
              const personLabel = normalizeContactPersonLabel(fieldName);
              const compositeKey = `${personLabel} Name`;
              result.family[compositeKey] = value;
              currentFieldRef = { section: 'family', fieldName: compositeKey };
              activeContactPerson = personLabel;
            } else if (activeContactPerson && CONTACT_SUBFIELD_NAMES.has(fieldNameLower)) {
              const subLabel = fieldName.charAt(0).toUpperCase() + fieldName.slice(1).toLowerCase();
              const compositeKey = `${activeContactPerson} ${subLabel}`;
              result.family[compositeKey] = value;
              currentFieldRef = { section: 'family', fieldName: compositeKey };
            } else {
              const detectedSection = detectSectionForField(fieldName);
              if (detectedSection && detectedSection !== 'family') activeContactPerson = null;
              const section = detectedSection || activeSection;
              result[section][fieldName] = value;
              currentFieldRef = { section, fieldName };
            }
          }
        }
        continue;
      } else {
        // The "pending" label had no value at all — discard it and proceed normally
        pendingLabel = null;
      }
    }

    // --- Check for a label-only line (ends with colon, no value after it) ---
    const labelOnlyMatch = line.match(/^([^:]{2,80}):\s*$/);
    if (labelOnlyMatch) {
      // Save as pending; the next content line will be the value
      pendingLabel = { rawFieldName: labelOnlyMatch[1].trim() };
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

    const { fieldName: rawFieldName, value: rawValue } = parsedField;
    const fieldName = normalizeFieldName(rawFieldName);

    // Split tab-separated two-column values (Word table copy format).
    // e.g. "Carrie Miller\t531-361-4009" or "John Maser\tProbation District: District 3J"
    let primaryRaw = rawValue;
    let secondaryRaw: string | null = null;
    const tabIdx = rawValue.indexOf('\t');
    if (tabIdx !== -1) {
      primaryRaw = rawValue.slice(0, tabIdx).trim();
      secondaryRaw = rawValue.slice(tabIdx + 1)
        .replace(/^[\s☒☐\u2610\u2611\u2612]+/, '').trim();
      if (!secondaryRaw || UNKNOWN_VALUE_RE.test(secondaryRaw)) secondaryRaw = null;
    }

    const value = normalizeCheckboxValue(primaryRaw);
    if ((!value || UNKNOWN_VALUE_RE.test(value)) && !secondaryRaw) continue;

    const fieldNameLower = fieldName.toLowerCase().trim();

    // "Placement Outcome N" fields belong in goals, not placement
    if (/^placement outcome\s+\d+/i.test(fieldNameLower)) {
      result.goals[fieldName] = value;
      currentFieldRef = { section: 'goals', fieldName };
      continue;
    }

    // Contact person tracking: detect a person role as a "name" field
    if (CONTACT_PERSON_RE.test(fieldName)) {
      const personLabel = normalizeContactPersonLabel(fieldName);
      const compositeKey = `${personLabel} Name`;
      result.family[compositeKey] = value;
      currentFieldRef = { section: 'family', fieldName: compositeKey };
      activeContactPerson = personLabel;
      continue;
    }

    // If we have an active contact person and this is a sub-field, prefix it
    if (activeContactPerson && CONTACT_SUBFIELD_NAMES.has(fieldNameLower)) {
      const subLabel = fieldName.charAt(0).toUpperCase() + fieldName.slice(1).toLowerCase();
      const compositeKey = `${activeContactPerson} ${subLabel}`;
      result.family[compositeKey] = value;
      currentFieldRef = { section: 'family', fieldName: compositeKey };
      continue;
    }

    // Reset contact tracking when hitting a clearly different field
    const detectedSection = detectSectionForField(fieldName);
    if (detectedSection && detectedSection !== 'family') {
      activeContactPerson = null;
    }

    const section = detectedSection || activeSection;
    if (value && !UNKNOWN_VALUE_RE.test(value)) {
      result[section][fieldName] = value;
      currentFieldRef = { section, fieldName };
    }

    // Process tab-split secondary column value
    if (secondaryRaw) {
      const secondField = parseFieldLine(secondaryRaw);
      if (secondField) {
        // Secondary is a labeled field e.g. "Probation District: District 3J"
        const sfName = normalizeFieldName(secondField.fieldName);
        const sfValue = normalizeCheckboxValue(secondField.value);
        if (sfName && sfValue && !UNKNOWN_VALUE_RE.test(sfValue)) {
          const sfSection = detectSectionForField(sfName) || section;
          result[sfSection][sfName] = sfValue;
          currentFieldRef = { section: sfSection, fieldName: sfName };
        }
      } else {
        // Bare unlabeled value — phone number next to a contact person name
        const bareVal = normalizeCheckboxValue(secondaryRaw).trim();
        if (bareVal && !UNKNOWN_VALUE_RE.test(bareVal)) {
          if (/^\+?[\d][\d\s\-().]{6,14}$/.test(bareVal)) {
            // It's a phone number
            const phoneKey = activeContactPerson
              ? `${activeContactPerson} Phone`
              : `${fieldName} Phone`;
            const phoneSection = activeContactPerson ? 'family' : section;
            result[phoneSection][phoneKey] = bareVal;
          } else {
            // Generic unlabeled secondary value
            result[section][`${fieldName} (additional)`] = bareVal;
          }
        }
      }
    }
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
