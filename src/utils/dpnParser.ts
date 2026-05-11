/**
 * DPN (Daily Performance Notes) file parser.
 * Extracts structured shift scores from plain text DPN documents.
 * Supports both pasted text and uploaded .txt files.
 */

export interface DpnShiftEntry {
  youthName: string;
  date: string;
  shift: "day" | "evening" | "night";
  peer: number;
  adult: number;
  investment: number;
  authority: number;
  comments: string;
  staff: string;
}

export interface DpnParseResult {
  entries: DpnShiftEntry[];
  warnings: string[];
}

const SHIFT_PATTERNS: { shift: DpnShiftEntry["shift"]; regex: RegExp }[] = [
  { shift: "day", regex: /\b(?:day\s*(?:shift)?|morning\s*(?:shift)?)\b/i },
  { shift: "evening", regex: /\b(?:evening\s*(?:shift)?|afternoon\s*(?:shift)?)\b/i },
  { shift: "night", regex: /\b(?:night\s*(?:shift)?|overnight\s*(?:shift)?)\b/i },
];

const DATE_REGEX = /(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2})/;

const DOMAIN_PATTERNS = [
  { key: "peer" as const, regex: /peer\s*(?:interaction)?\s*[:\-=]?\s*([\d.]+)/i },
  { key: "adult" as const, regex: /adult\s*(?:interaction)?\s*[:\-=]?\s*([\d.]+)/i },
  { key: "investment" as const, regex: /investment\s*(?:level)?\s*[:\-=]?\s*([\d.]+)/i },
  { key: "authority" as const, regex: /(?:deal(?:ing)?\s*(?:w(?:ith|\/))?\s*)?authority\s*[:\-=]?\s*([\d.]+)/i },
];

const STAFF_REGEX = /(?:staff|completed\s*by|scored\s*by|rater|evaluator)\s*[:\-=]?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i;
const YOUTH_NAME_REGEX = /(?:youth|resident|client|name)\s*[:\-=]?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i;

function normalizeDate(raw: string): string {
  const cleaned = raw.trim();
  // Try YYYY-MM-DD
  if (/^\d{4}[/-]\d{1,2}[/-]\d{1,2}$/.test(cleaned)) {
    const [y, m, d] = cleaned.split(/[/-]/);
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  // Try MM/DD/YYYY or MM-DD-YYYY
  if (/^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(cleaned)) {
    const parts = cleaned.split(/[/-]/);
    let y = parts[2];
    if (y.length === 2) y = `20${y}`;
    return `${y}-${parts[0].padStart(2, "0")}-${parts[1].padStart(2, "0")}`;
  }
  return cleaned;
}

function clamp04(val: number): number {
  return Math.min(4, Math.max(0, val));
}

/**
 * Splits DPN text into logical blocks. Each block typically represents
 * one shift entry. Blocks are separated by double newlines or shift headers.
 */
function splitIntoBlocks(text: string): string[] {
  // Split by double newlines or lines that look like shift headers
  const blocks: string[] = [];
  const lines = text.split(/\n/);
  let current: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // Detect shift boundary: a line that matches a shift pattern and isn't just a score line
    const isShiftHeader = SHIFT_PATTERNS.some((p) => p.regex.test(trimmed)) &&
      !DOMAIN_PATTERNS.some((p) => p.regex.test(trimmed));

    if (isShiftHeader && current.length > 0) {
      blocks.push(current.join("\n"));
      current = [trimmed];
    } else if (trimmed === "" && current.length > 0) {
      // Check if next non-empty lines form a new entry
      blocks.push(current.join("\n"));
      current = [];
    } else if (trimmed !== "") {
      current.push(trimmed);
    }
  }
  if (current.length > 0) blocks.push(current.join("\n"));

  return blocks.filter((b) => b.trim().length > 0);
}

/**
 * Attempts to extract a tabular format where scores are in CSV-like rows:
 * Youth Name, Date, Shift, Peer, Adult, Investment, Authority
 */
function tryTabularParse(text: string): DpnShiftEntry[] {
  const entries: DpnShiftEntry[] = [];
  const lines = text.split(/\n/).filter((l) => l.trim());

  for (const line of lines) {
    const cols = line.split(/[,\t]/).map((c) => c.trim());
    if (cols.length < 7) continue;

    // Check if columns 3-6 look like scores
    const scores = cols.slice(3, 7).map((c) => parseFloat(c));
    if (scores.some(isNaN)) continue;

    const shiftRaw = cols[2].toLowerCase();
    const shift: DpnShiftEntry["shift"] = shiftRaw.startsWith("eve")
      ? "evening"
      : shiftRaw.startsWith("nig") || shiftRaw.startsWith("ove")
        ? "night"
        : "day";

    entries.push({
      youthName: cols[0],
      date: normalizeDate(cols[1]),
      shift,
      peer: clamp04(scores[0]),
      adult: clamp04(scores[1]),
      investment: clamp04(scores[2]),
      authority: clamp04(scores[3]),
      comments: cols[7] || "",
      staff: cols[8] || "",
    });
  }

  return entries;
}

/**
 * Parses free-form DPN text using regex pattern matching.
 */
function parseFreeForm(text: string): DpnParseResult {
  const warnings: string[] = [];
  const entries: DpnShiftEntry[] = [];

  // Try to find a global date and youth name
  const globalDateMatch = text.match(DATE_REGEX);
  const globalDate = globalDateMatch ? normalizeDate(globalDateMatch[1]) : "";
  const globalNameMatch = text.match(YOUTH_NAME_REGEX);
  const globalName = globalNameMatch ? globalNameMatch[1] : "";
  const globalStaffMatch = text.match(STAFF_REGEX);
  const globalStaff = globalStaffMatch ? globalStaffMatch[1] : "";

  const blocks = splitIntoBlocks(text);

  for (const block of blocks) {
    // Detect shift
    let detectedShift: DpnShiftEntry["shift"] | null = null;
    for (const { shift, regex } of SHIFT_PATTERNS) {
      if (regex.test(block)) {
        detectedShift = shift;
        break;
      }
    }

    // Extract scores
    const scores: Partial<Record<"peer" | "adult" | "investment" | "authority", number>> = {};
    let hasAnyScore = false;
    for (const { key, regex } of DOMAIN_PATTERNS) {
      const match = block.match(regex);
      if (match) {
        scores[key] = clamp04(parseFloat(match[1]));
        hasAnyScore = true;
      }
    }

    if (!hasAnyScore) continue;

    // Extract block-level date, name, staff
    const blockDateMatch = block.match(DATE_REGEX);
    const blockDate = blockDateMatch ? normalizeDate(blockDateMatch[1]) : globalDate;
    const blockNameMatch = block.match(YOUTH_NAME_REGEX);
    const blockName = blockNameMatch ? blockNameMatch[1] : globalName;
    const blockStaffMatch = block.match(STAFF_REGEX);
    const blockStaff = blockStaffMatch ? blockStaffMatch[1] : globalStaff;

    if (!blockDate) warnings.push(`No date found for a shift block`);
    if (!blockName) warnings.push(`No youth name found for a shift block`);

    // Extract comments: lines that don't match score patterns
    const commentLines = block
      .split("\n")
      .filter((l) => {
        const t = l.trim();
        return (
          t.length > 0 &&
          !DOMAIN_PATTERNS.some((p) => p.regex.test(t)) &&
          !SHIFT_PATTERNS.some((p) => p.regex.test(t)) &&
          !DATE_REGEX.test(t) &&
          !YOUTH_NAME_REGEX.test(t) &&
          !STAFF_REGEX.test(t)
        );
      });

    entries.push({
      youthName: blockName,
      date: blockDate,
      shift: detectedShift || "day",
      peer: scores.peer ?? 0,
      adult: scores.adult ?? 0,
      investment: scores.investment ?? 0,
      authority: scores.authority ?? 0,
      comments: commentLines.join("; ").substring(0, 500),
      staff: blockStaff,
    });
  }

  return { entries, warnings };
}

/**
 * Main parse function. Tries tabular format first (CSV/TSV), falls back to free-form regex.
 */
export function parseDpnText(text: string): DpnParseResult {
  const trimmed = text.trim();
  if (!trimmed) return { entries: [], warnings: ["Empty input"] };

  // Try tabular format first
  const tabular = tryTabularParse(trimmed);
  if (tabular.length > 0) {
    return { entries: tabular, warnings: [] };
  }

  // Fall back to free-form parsing
  return parseFreeForm(trimmed);
}
