/**
 * Generates a plain-text referral intake template that the referral parser
 * can read directly.  Each section header matches the labels the parser
 * already recognises, and each field is written as "Field Name: " so the
 * parser picks it up as a key/value pair.
 *
 * Users download this file, fill in the values after each colon, then
 * upload or paste it back into the Paste Referral Text panel.
 */
export function generateReferralTemplate(): string {
  const blank = " ";
  const line = (label: string, hint = "") =>
    `${label}: ${hint ? `[${hint}]` : blank}`;

  return [
    "=============================================================",
    "  HEARTLAND CARE COMPASS — REFERRAL INTAKE TEMPLATE",
    "  Fill in values after each colon, then upload or paste",
    "  this file into the Referral Management page.",
    "=============================================================",
    "",
    // ── Demographics ─────────────────────────────────────────────
    "DEMOGRAPHICS",
    "─────────────────────────────────────────────────────────────",
    line("First Name"),
    line("Last Name"),
    line("Date of Birth", "MM/DD/YYYY"),
    line("Age"),
    line("Sex"),
    line("Race"),
    line("Ethnicity"),
    line("Religion"),
    line("Place of Birth"),
    line("Current Placement"),
    line("Date of Referral", "MM/DD/YYYY"),
    line("Phone Number"),
    line("Reason for OOH"),
    "",
    // ── Family & Contacts ─────────────────────────────────────────
    "FAMILY & CONTACTS",
    "─────────────────────────────────────────────────────────────",
    line("Mother"),
    line("Father"),
    line("Guardian"),
    line("Custody"),
    line("Primary Contact"),
    line("Primary Contact Phone"),
    line("Alternate Contact"),
    line("Alternate Contact Phone"),
    line("Guardian Engagement"),
    line("Visitation"),
    "",
    // ── Education ─────────────────────────────────────────────────
    "EDUCATION",
    "─────────────────────────────────────────────────────────────",
    line("School"),
    line("Grade"),
    line("IEP", "Yes / No"),
    line("IEP Academic"),
    line("IEP Behavioral"),
    line("Special Education"),
    line("Credits"),
    line("Graduation"),
    line("Attendance"),
    "",
    // ── Medical ───────────────────────────────────────────────────
    "MEDICAL",
    "─────────────────────────────────────────────────────────────",
    line("Medication"),
    line("Allergy"),
    line("Physician"),
    line("Medical Provider"),
    line("Medical Compliance", "Yes / No"),
    line("Medical Needs"),
    "",
    // ── Mental Health ─────────────────────────────────────────────
    "MENTAL HEALTH",
    "─────────────────────────────────────────────────────────────",
    line("Diagnosis"),
    line("Therapy"),
    line("Treatment Level"),
    line("Treatment Modality"),
    line("Treatment Provider"),
    line("Current/Recent Treatment"),
    line("Medication Compliant", "Yes / No"),
    line("Prescribed Medication"),
    line("Trauma"),
    line("Behavioral Health Comment"),
    "",
    // ── Legal & Court ─────────────────────────────────────────────
    "LEGAL & COURT",
    "─────────────────────────────────────────────────────────────",
    line("Probation Officer"),
    line("PO Email"),
    line("County"),
    line("Judge"),
    line("Caseworker"),
    line("Caseworker Phone"),
    line("Offense"),
    line("Charge"),
    line("Court Order"),
    line("Jurisdiction"),
    line("GAL / CASA"),
    "",
    // ── Behavioral History ────────────────────────────────────────
    "BEHAVIORAL HISTORY",
    "─────────────────────────────────────────────────────────────",
    line("Substance Use History"),
    line("Substance Use Disorder"),
    line("Aggression"),
    line("Runaway"),
    line("Suicide Risk", "Yes / No"),
    line("Trafficking", "Yes / No"),
    line("Gang", "Yes / No"),
    line("LGBTQ", "Yes / No"),
    line("Problematic Sexual Behavior", "Yes / No"),
    line("Weapons", "Yes / No"),
    line("Assaultive History"),
    line("Missing from Home"),
    line("Victim Issues"),
    "",
    // ── Placement & Referral ──────────────────────────────────────
    "PLACEMENT & REFERRAL",
    "─────────────────────────────────────────────────────────────",
    line("Service Type"),
    line("Level of Service"),
    line("Date Service Needed", "MM/DD/YYYY"),
    line("Estimated Stay"),
    line("Discharge Location"),
    line("Discharge Timeframe"),
    line("Foster Care Preferred", "Yes / No"),
    line("Preferred Community"),
    line("Out of State", "Yes / No"),
    "",
    // ── Risk Assessment ───────────────────────────────────────────
    "RISK ASSESSMENT",
    "─────────────────────────────────────────────────────────────",
    line("Overall Risk Level", "Low / Moderate / High"),
    line("Date Completed", "MM/DD/YYYY"),
    line("YLS/CMI Score"),
    line("Prior Offenses"),
    line("School/Work"),
    line("Free Time"),
    line("Peers"),
    line("Alcohol/Drug"),
    line("Family Circumstances"),
    line("Coping/Self Control"),
    line("Thoughts and Beliefs"),
    line("Attitudes"),
    line("Brief Summary of Circumstances"),
    line("Primary Driver"),
    "",
    // ── Strengths & Interests ─────────────────────────────────────
    "STRENGTHS & INTERESTS",
    "─────────────────────────────────────────────────────────────",
    line("Strengths"),
    line("Interests"),
    line("Hobbies"),
    line("Prosocial Activities"),
    line("Positive Supports"),
    line("Prior Successful Services"),
    line("Barriers"),
    "",
    // ── Service History ───────────────────────────────────────────
    "SERVICE HISTORY",
    "─────────────────────────────────────────────────────────────",
    line("Services Home / Community"),
    line("Services Out of Home"),
    line("Services Therapeutic"),
    line("Prior Placement"),
    line("Detention"),
    "",
    // ── Discharge Goals ───────────────────────────────────────────
    "DISCHARGE GOALS",
    "─────────────────────────────────────────────────────────────",
    line("Outcome 1"),
    line("Outcome 2"),
    line("Outcome 3"),
    line("Projected Discharge"),
    line("Skills to Develop"),
    line("Treatment Goal"),
    "",
    // ── Insurance & Coverage ──────────────────────────────────────
    "INSURANCE & COVERAGE",
    "─────────────────────────────────────────────────────────────",
    line("Insurance"),
    line("Medicaid", "Yes / No"),
    line("Policy Number"),
    line("Policy Holder"),
    line("Mental Health Coverage", "Yes / No"),
    line("Substance Use Coverage", "Yes / No"),
    "",
    // ── Restrictions ─────────────────────────────────────────────
    "RESTRICTIONS",
    "─────────────────────────────────────────────────────────────",
    line("Contact Restriction"),
    line("No Contact Order"),
    line("Placement Restriction"),
    line("Special Request"),
    line("Language / Interpreter"),
    "",
    "=============================================================",
    "  END OF TEMPLATE",
    "=============================================================",
  ].join("\n");
}

/** Triggers a browser download of the template as a .txt file. */
export function downloadReferralTemplate(): void {
  const content = generateReferralTemplate();
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "referral-intake-template.txt";
  a.click();
  URL.revokeObjectURL(url);
}
