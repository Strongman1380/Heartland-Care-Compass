import {
  parseFieldLine,
  detectSectionForField,
  detectSectionHeader,
  parseProbationStyleBlock,
  parseReferralText,
  splitReferralEntries,
  inferReferralName,
  inferReferralSource,
  inferCaseWorker,
  inferGlobalReferralSource,
  inferGlobalStaffName,
} from "../referralParser";

// ---------------------------------------------------------------------------
// parseFieldLine
// ---------------------------------------------------------------------------
describe("parseFieldLine", () => {
  it("parses colon-separated fields", () => {
    expect(parseFieldLine("First Name: John")).toEqual({ fieldName: "First Name", value: "John" });
  });

  it("parses tab-separated fields", () => {
    expect(parseFieldLine("Date of Birth\t01/15/2010")).toEqual({ fieldName: "Date of Birth", value: "01/15/2010" });
  });

  it("parses dash-separated fields", () => {
    expect(parseFieldLine("School - Lincoln Middle School")).toEqual({ fieldName: "School", value: "Lincoln Middle School" });
  });

  it("returns null for plain text with no separator", () => {
    expect(parseFieldLine("just some text")).toBeNull();
  });

  it("returns null for a line that is too short", () => {
    expect(parseFieldLine("A: b")).toBeNull(); // field name < 2 chars
  });

  it("trims whitespace from field name and value", () => {
    const result = parseFieldLine("  Last Name  :   Doe  ");
    expect(result?.fieldName).toBe("Last Name");
    expect(result?.value).toBe("Doe");
  });

  it("handles colon inside value without splitting", () => {
    const result = parseFieldLine("Time: 10:30 AM");
    expect(result?.fieldName).toBe("Time");
    expect(result?.value).toBe("10:30 AM");
  });
});

// ---------------------------------------------------------------------------
// detectSectionForField
// ---------------------------------------------------------------------------
describe("detectSectionForField", () => {
  it("maps 'first name' to demographics", () => {
    expect(detectSectionForField("first name")).toBe("demographics");
  });

  it("maps 'probation officer' to legal", () => {
    expect(detectSectionForField("probation officer")).toBe("legal");
  });

  it("maps 'school' to education", () => {
    expect(detectSectionForField("school")).toBe("education");
  });

  it("maps 'diagnosis' to mentalHealth", () => {
    expect(detectSectionForField("diagnosis")).toBe("mentalHealth");
  });

  it("maps 'medication' to medical", () => {
    expect(detectSectionForField("medication")).toBe("medical");
  });

  it("maps 'placement' to placement", () => {
    expect(detectSectionForField("referral source")).toBe("placement");
  });

  it("maps 'substance' to behavioral", () => {
    expect(detectSectionForField("substance use")).toBe("behavioral");
  });

  it("maps 'mother' to family", () => {
    expect(detectSectionForField("mother")).toBe("family");
  });

  it("returns null for unknown fields", () => {
    expect(detectSectionForField("unknown xyz field")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// detectSectionHeader
// ---------------------------------------------------------------------------
describe("detectSectionHeader", () => {
  it("detects 'Demographics' header", () => {
    expect(detectSectionHeader("Demographics")).toBe("demographics");
  });

  it("detects 'Legal & Court' header", () => {
    expect(detectSectionHeader("Legal & Court")).toBe("legal");
  });

  it("detects header with trailing colon", () => {
    expect(detectSectionHeader("Education:")).toBe("education");
  });

  it("returns null for unrecognized header", () => {
    expect(detectSectionHeader("Foobar Section")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(detectSectionHeader("")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// parseReferralText — structured format
// ---------------------------------------------------------------------------
describe("parseReferralText — structured format", () => {
  const basic = `
First Name: John
Last Name: Doe
Date of Birth: 01/15/2010
Age: 14
Gender: Male
Probation Officer: Jane Smith
Current Offense: Theft
School: Lincoln Middle
Grade: 8th
Medications: Adderall 10mg
Diagnosis: ADHD
`.trim();

  it("parses demographics fields", () => {
    const result = parseReferralText(basic);
    expect(result.demographics["First Name"]).toBe("John");
    expect(result.demographics["Last Name"]).toBe("Doe");
    expect(result.demographics["Age"]).toBe("14");
  });

  it("parses legal fields", () => {
    const result = parseReferralText(basic);
    expect(result.legal["Probation Officer"]).toBe("Jane Smith");
    expect(result.legal["Current Offense"]).toBe("Theft");
  });

  it("parses education fields", () => {
    const result = parseReferralText(basic);
    expect(result.education["School"]).toBe("Lincoln Middle");
    expect(result.education["Grade"]).toBe("8th");
  });

  it("parses medical fields", () => {
    const result = parseReferralText(basic);
    expect(result.medical["Medications"]).toBe("Adderall 10mg");
  });

  it("parses mental health fields", () => {
    const result = parseReferralText(basic);
    expect(result.mentalHealth["Diagnosis"]).toBe("ADHD");
  });

  it("skips unknown/N/A values", () => {
    const result = parseReferralText("First Name: John\nLast Name: N/A\nAge: Unknown");
    expect(result.demographics["Last Name"]).toBeUndefined();
    expect(result.demographics["Age"]).toBeUndefined();
    expect(result.demographics["First Name"]).toBe("John");
  });

  it("puts unrecognized fields into other", () => {
    const result = parseReferralText("Hobbies: Fishing");
    expect(result.other["Hobbies"]).toBe("Fishing");
  });

  it("stores unrecognized lines in other as Line entries", () => {
    const result = parseReferralText("just a blob of text with no fields");
    expect(result.other["Line 1"]).toBe("just a blob of text with no fields");
  });

  it("handles section headers to bucket fields", () => {
    const text = `Demographics\nFirst Name: Alice\n\nLegal & Court\nCurrent Offense: Assault`;
    const result = parseReferralText(text);
    expect(result.demographics["First Name"]).toBe("Alice");
    expect(result.legal["Current Offense"]).toBe("Assault");
  });

  it("strips bullet point prefixes from lines", () => {
    const result = parseReferralText("• First Name: Bob\n- Last Name: Smith");
    expect(result.demographics["First Name"]).toBe("Bob");
    expect(result.demographics["Last Name"]).toBe("Smith");
  });
});

// ---------------------------------------------------------------------------
// parseProbationStyleBlock
// ---------------------------------------------------------------------------
describe("parseProbationStyleBlock", () => {
  const probLine = "John Doe - Yes - 14 - current offense (Theft), school (Lincoln Middle) - PO Jane Smith (402-555-1234)";

  it("returns null when line does not match probation format", () => {
    expect(parseProbationStyleBlock("First Name: John\nLast Name: Doe")).toBeNull();
  });

  it("parses name and age from header", () => {
    const result = parseProbationStyleBlock(probLine);
    expect(result?.demographics["Name"]).toBe("John Doe");
    expect(result?.demographics["Age"]).toBe("14");
  });

  it("parses referral recommendation", () => {
    const result = parseProbationStyleBlock(probLine);
    expect(result?.placement["Referral Recommendation"]).toBe("Yes");
  });

  it("parses probation officer name", () => {
    const result = parseProbationStyleBlock(probLine);
    expect(result?.legal["Probation Officer"]).toBe("Jane Smith");
  });

  it("parses probation officer phone", () => {
    const result = parseProbationStyleBlock(probLine);
    expect(result?.legal["Probation Officer Contact"]).toBe("(402-555-1234)");
  });

  it("parses current offense from labeled segment", () => {
    const result = parseProbationStyleBlock(probLine);
    expect(result?.legal["Current Offense"]).toBe("Theft");
  });

  it("parses school from labeled segment", () => {
    const result = parseProbationStyleBlock(probLine);
    expect(result?.education["School"]).toBe("Lincoln Middle");
  });

  it("normalizes No decision", () => {
    const line = "Jane Roe - No - 15 - current offense (Runaway) - PO Bob Jones";
    const result = parseProbationStyleBlock(line);
    expect(result?.placement["Referral Recommendation"]).toBe("No");
  });

  it("normalizes Maybe decision", () => {
    const line = "Sam Lee - Maybe - 13 - current offense (Theft) - PO Tim Brown";
    const result = parseProbationStyleBlock(line);
    expect(result?.placement["Referral Recommendation"]).toBe("Maybe");
  });
});

// ---------------------------------------------------------------------------
// splitReferralEntries
// ---------------------------------------------------------------------------
describe("splitReferralEntries", () => {
  it("returns empty array for empty input", () => {
    expect(splitReferralEntries("")).toEqual([]);
  });

  it("returns single entry for one referral", () => {
    const text = "First Name: John\nLast Name: Doe\nAge: 14";
    const result = splitReferralEntries(text);
    expect(result).toHaveLength(1);
  });

  it("splits on --- delimiter", () => {
    const text = "First Name: John\nLast Name: Doe\n---\nFirst Name: Jane\nLast Name: Smith";
    const result = splitReferralEntries(text);
    expect(result).toHaveLength(2);
  });

  it("splits on === delimiter", () => {
    const text = "First Name: John\n===\nFirst Name: Jane";
    const result = splitReferralEntries(text);
    expect(result).toHaveLength(2);
  });

  it("splits multiple First Name: markers", () => {
    const text = `First Name: John\nLast Name: Doe\nDate of Birth: 01/01/2010\n\nFirst Name: Jane\nLast Name: Smith\nDate of Birth: 02/02/2011`;
    const result = splitReferralEntries(text);
    expect(result).toHaveLength(2);
    expect(result[0]).toContain("John");
    expect(result[1]).toContain("Jane");
  });

  it("splits multiple probation-style entries", () => {
    const entry1 = "John Doe - Yes - 14 - current offense (Theft) - PO Jane Smith";
    const entry2 = "Bob Lee - No - 16 - current offense (Assault) - PO Tim Brown";
    const result = splitReferralEntries(`${entry1}\n${entry2}`);
    expect(result).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// inferReferralName
// ---------------------------------------------------------------------------
describe("inferReferralName", () => {
  it("combines first and last name", () => {
    const parsed = { demographics: { "First Name": "John", "Last Name": "Doe" }, family: {}, education: {}, medical: {}, mentalHealth: {}, legal: {}, behavioral: {}, placement: {}, other: {} };
    expect(inferReferralName(parsed)).toBe("John Doe");
  });

  it("falls back to full name field", () => {
    const parsed = { demographics: { "Full Name": "Alice Smith" }, family: {}, education: {}, medical: {}, mentalHealth: {}, legal: {}, behavioral: {}, placement: {}, other: {} };
    expect(inferReferralName(parsed)).toBe("Alice Smith");
  });

  it("returns empty string when no name fields present", () => {
    const parsed = { demographics: {}, family: {}, education: {}, medical: {}, mentalHealth: {}, legal: {}, behavioral: {}, placement: {}, other: {} };
    expect(inferReferralName(parsed)).toBe("");
  });
});

// ---------------------------------------------------------------------------
// inferReferralSource
// ---------------------------------------------------------------------------
describe("inferReferralSource", () => {
  it("finds referral source from placement section", () => {
    const parsed = { demographics: {}, family: {}, education: {}, medical: {}, mentalHealth: {}, legal: {}, behavioral: {}, placement: { "Referral Source": "Douglas County" }, other: {} };
    expect(inferReferralSource(parsed)).toBe("Douglas County");
  });

  it("finds county from placement", () => {
    const parsed = { demographics: {}, family: {}, education: {}, medical: {}, mentalHealth: {}, legal: {}, behavioral: {}, placement: { "County": "Lancaster" }, other: {} };
    expect(inferReferralSource(parsed)).toBe("Lancaster");
  });

  it("returns empty string when not found", () => {
    const parsed = { demographics: {}, family: {}, education: {}, medical: {}, mentalHealth: {}, legal: {}, behavioral: {}, placement: {}, other: {} };
    expect(inferReferralSource(parsed)).toBe("");
  });
});

// ---------------------------------------------------------------------------
// inferCaseWorker
// ---------------------------------------------------------------------------
describe("inferCaseWorker", () => {
  it("finds probation officer from legal section", () => {
    const parsed = { demographics: {}, family: {}, education: {}, medical: {}, mentalHealth: {}, legal: { "Probation Officer": "Jane Smith" }, behavioral: {}, placement: {}, other: {} };
    expect(inferCaseWorker(parsed)).toBe("Jane Smith");
  });

  it("finds caseworker from legal section", () => {
    const parsed = { demographics: {}, family: {}, education: {}, medical: {}, mentalHealth: {}, legal: { "Caseworker": "Bob Jones" }, behavioral: {}, placement: {}, other: {} };
    expect(inferCaseWorker(parsed)).toBe("Bob Jones");
  });

  it("returns empty string when not found", () => {
    const parsed = { demographics: {}, family: {}, education: {}, medical: {}, mentalHealth: {}, legal: {}, behavioral: {}, placement: {}, other: {} };
    expect(inferCaseWorker(parsed)).toBe("");
  });
});

// ---------------------------------------------------------------------------
// inferGlobalReferralSource / inferGlobalStaffName
// ---------------------------------------------------------------------------
describe("inferGlobalReferralSource", () => {
  it("extracts Source: line", () => {
    expect(inferGlobalReferralSource("Source: Douglas County\nOther text")).toBe("Douglas County");
  });

  it("returns empty string when not found", () => {
    expect(inferGlobalReferralSource("First Name: John")).toBe("");
  });
});

describe("inferGlobalStaffName", () => {
  it("extracts Staff: line", () => {
    expect(inferGlobalStaffName("Staff: Bob Jones\nFirst Name: John")).toBe("Bob Jones");
  });

  it("returns empty string when not found", () => {
    expect(inferGlobalStaffName("First Name: John")).toBe("");
  });
});
