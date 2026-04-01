import { type ParsedReferral } from "./referralParser";

/**
 * Key information fields that should be displayed prominently.
 * These represent critical referral assessment data.
 */
export const KEY_INFORMATION_FIELDS = [
  "Name",
  "DOB",
  "Age",
  "Sex",
  "Referral Source",
  "Estimated Stay",
  "Probation Officer Name",
  "Probation Officer Contact",
  "School",
  "Referral Recommendation",
  "Mother Name",
  "Father Name",
  "Guardian Name",
  "Guardian Phone",
  "Mother Phone",
  "Father Phone",
  "Primary Guardian",
  "Legal Guardian",
  "Emergency Contact Name",
  "Emergency Contact Phone",
] as const;

/**
 * Field descriptions and display labels.
 * Used for tooltips and field labeling.
 */
export const FIELD_DESCRIPTIONS: Record<string, string> = {
  Name: "Youth's full name",
  DOB: "Date of birth",
  Age: "Current age in years",
  Sex: "Biological sex (M/F)",
  "Referral Source": "Who referred this youth to the facility",
  "Estimated Stay": "Predicted duration of placement",
  "Probation Officer Name": "Primary PO contact",
  "Probation Officer Contact": "PO phone or email",
  School: "Current/previous school",
  "Referral Recommendation": "Probation officer's decision (yes/maybe/no)",
};

/**
 * Extract key information fields from parsed referral data.
 * Returns only fields that are present in the data.
 *
 * @param parsedData - Parsed referral data object
 * @returns Array of {label, value} objects for key fields
 */
export function getKeyInformationFields(
  parsedData: ParsedReferral | null
): Array<{ label: string; value: string }> {
  if (!parsedData) return [];

  const keyFields: Array<{ label: string; value: string }> = [];

  // Search through all sections for key fields
  Object.entries(parsedData).forEach(([sectionKey, sectionData]) => {
    if (typeof sectionData !== "object" || sectionData === null) return;

    Object.entries(sectionData as Record<string, any>).forEach(([fieldName, fieldValue]) => {
      if (!fieldValue || typeof fieldValue !== "string") return;

      const isExactMatch = KEY_INFORMATION_FIELDS.includes(fieldName as any);

      // Fuzzy lookup: guardian fields in any section, mother/father fields in family section
      const fieldLower = fieldName.toLowerCase();
      const isFuzzyMatch =
        fieldLower.includes("guardian") ||
        (sectionKey === "family" && (fieldLower.includes("mother") || fieldLower.includes("father")));

      if ((isExactMatch || isFuzzyMatch) && !keyFields.find((f) => f.label === fieldName)) {
        keyFields.push({ label: fieldName, value: fieldValue });
      }
    });
  });

  return keyFields;
}

/**
 * Calculate completion percentage for a section.
 *
 * @param section - Section object with field key-value pairs
 * @param totalExpected - Total expected fields (optional, defaults to actual count)
 * @returns Object with completed count, total count, and percentage
 */
export function calculateFieldCompletion(
  section: Record<string, any> | null,
  totalExpected?: number
): {
  completed: number;
  total: number;
  percentage: number;
} {
  if (!section || typeof section !== "object") {
    return { completed: 0, total: totalExpected || 0, percentage: 0 };
  }

  const entries = Object.entries(section);
  const completed = entries.filter(([, val]) => val && String(val).trim()).length;
  const total = totalExpected || entries.length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return { completed, total, percentage };
}

/**
 * Get completion status for a section.
 *
 * @param section - Section object with field key-value pairs
 * @returns Status object with percentage and badge status
 */
export function getSectionStatus(section: Record<string, any> | null): {
  percentage: number;
  status: "empty" | "incomplete" | "partial" | "complete";
} {
  const { percentage } = calculateFieldCompletion(section);

  if (percentage === 0) {
    return { percentage, status: "empty" };
  } else if (percentage < 50) {
    return { percentage, status: "incomplete" };
  } else if (percentage < 80) {
    return { percentage, status: "partial" };
  } else {
    return { percentage, status: "complete" };
  }
}

/**
 * Get color for completion percentage.
 * Gradient: gray (0%) → yellow (50%) → green (80%) → blue (100%)
 *
 * @param percentage - Completion percentage (0-100)
 * @returns Tailwind color class for progress indicator
 */
export function getCompletionColor(percentage: number): string {
  if (percentage === 0) return "bg-gray-200";
  if (percentage < 50) return "bg-yellow-300";
  if (percentage < 80) return "bg-green-300";
  return "bg-blue-400";
}

/**
 * Get badge text color for completion status.
 *
 * @param status - Completion status
 * @returns Tailwind text color class
 */
export function getStatusBadgeColor(
  status: "empty" | "incomplete" | "partial" | "complete"
): string {
  switch (status) {
    case "empty":
      return "text-gray-500";
    case "incomplete":
      return "text-yellow-600";
    case "partial":
      return "text-green-600";
    case "complete":
      return "text-blue-600";
  }
}

// ─── Contact Person Grouping ────────────────────────────────────────────────

export interface ContactPersonCard {
  role: string;
  fields: Array<{ label: string; value: string }>;
}

const KNOWN_CONTACT_ROLES = [
  'Mother', 'Father', 'Parent', 'Guardian', 'Stepmother', 'Stepfather',
  'Caregiver', 'Next of Kin', 'Emergency Contact', 'Foster Parent',
  'Relative', 'Aunt', 'Uncle', 'Grandmother', 'Grandfather', 'Grandparent',
];

/**
 * Groups family section fields by person prefix into contact cards.
 * Fields that don't match any known person role go into `ungrouped`.
 *
 * @param familySection - Record of field key → value from the family section
 * @returns contacts array and ungrouped remainder
 */
export function groupContactPersons(familySection: Record<string, string>): {
  contacts: ContactPersonCard[];
  ungrouped: Record<string, string>;
} {
  const personMap = new Map<string, Array<{ label: string; value: string }>>();
  const ungrouped: Record<string, string> = {};

  for (const [key, value] of Object.entries(familySection)) {
    if (!value) continue;
    let matched = false;

    for (const role of KNOWN_CONTACT_ROLES) {
      const rolePrefix = role + ' ';
      if (key === role || key.startsWith(rolePrefix)) {
        const subField = key === role ? 'Name' : key.slice(rolePrefix.length);
        if (!personMap.has(role)) personMap.set(role, []);
        personMap.get(role)!.push({ label: subField, value });
        matched = true;
        break;
      }
      // Handle possessive: "Mother's Phone" → Mother / Phone
      const possessivePrefix = role + "'s ";
      if (key.startsWith(possessivePrefix)) {
        const subField = key.slice(possessivePrefix.length);
        if (!personMap.has(role)) personMap.set(role, []);
        personMap.get(role)!.push({ label: subField, value });
        matched = true;
        break;
      }
    }

    if (!matched) {
      ungrouped[key] = value;
    }
  }

  const fieldOrder: Record<string, number> = {
    Name: 0, Phone: 1, 'Phone Number': 1, Cell: 1, Mobile: 1, Email: 2,
    Address: 3, Relationship: 4,
  };

  const contacts: ContactPersonCard[] = Array.from(personMap.entries()).map(([role, fields]) => ({
    role,
    fields: fields.sort((a, b) => (fieldOrder[a.label] ?? 99) - (fieldOrder[b.label] ?? 99)),
  }));

  return { contacts, ungrouped };
}
