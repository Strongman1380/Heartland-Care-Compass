import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Printer, FileText, ClipboardList, User } from "lucide-react";

// ─────────────────────────────────────────────────────────────
// Print helpers
// ─────────────────────────────────────────────────────────────

function openPrintWindow(title: string, html: string) {
  const win = window.open("", "_blank", "width=900,height=1150");
  if (!win) return false;
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"/>
    <title>${title}</title>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: Arial, sans-serif; font-size: 10pt; color: #000; background: #fff; padding: 0.5in; }
      h1 { font-size: 14pt; font-weight: bold; text-align: center; }
      h2 { font-size: 11pt; font-weight: bold; text-align: center; margin-top: 3px; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #000; padding: 5px 7px; }
      .line { display: inline-block; border-bottom: 1px solid #000; }
      .field-line { border-bottom: 1px solid #000; height: 20px; width: 100%; margin-top: 4px; }
      @page { size: letter; margin: 0.5in; }
      @media print { body { padding: 0; } }
    </style>
  </head><body>${html}</body></html>`);
  win.document.close();
  win.onload = () => { win.focus(); win.print(); };
  return true;
}

// ─────────────────────────────────────────────────────────────
// DPN Progress Evaluation (Weekly / Bi-Weekly / Monthly)
// ─────────────────────────────────────────────────────────────

function buildDpnHtml(variant: "Weekly" | "Bi-Weekly" | "Monthly") {
  const ratingDomains = [
    "Relationship and Interaction with Peer",
    "Relationship and Interaction with Adults",
    "Investment Level in Program and Personal Growth",
    "How the Resident Deals with Authority and Structure",
  ];

  const domainRows = ratingDomains
    .map(
      (label) => `
    <div style="margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;font-weight:bold;margin-bottom:4px">
        <span>${label}</span>
        <span style="white-space:nowrap;margin-left:16px">Rating: <span class="line" style="width:80px;display:inline-block">&nbsp;</span></span>
      </div>
      <div class="field-line"></div>
      <div class="field-line"></div>
      <div class="field-line"></div>
    </div>`
    )
    .join("");

  return `
  <h1>Heartland Boys Home</h1>
  <h2>Resident ${variant} Progress Evaluation</h2>
  <hr style="margin:8px 0 12px;border-top:2px solid #000"/>

  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:14px;font-size:9pt">
    <div><strong>Name:</strong> <span class="line" style="width:150px">&nbsp;</span></div>
    <div><strong>From:</strong> <span class="line" style="width:100px">&nbsp;</span></div>
    <div><strong>To:</strong> <span class="line" style="width:100px">&nbsp;</span></div>
  </div>

  <div style="border:1px solid #555;border-radius:3px;padding:6px;margin-bottom:14px;background:#f5f5f5;font-size:9pt">
    <strong>Rating Scale:</strong>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:4px;margin-top:4px;font-weight:600;text-align:center">
      <span>1 = Poor</span><span>2 = Below Average</span><span>3 = Average</span><span>4 = Above Average</span>
    </div>
  </div>

  ${domainRows}

  <div style="margin-bottom:12px">
    <div style="font-weight:bold;margin-bottom:4px">Social Skills Strengths:</div>
    <div class="field-line"></div>
    <div class="field-line"></div>
    <div class="field-line"></div>
  </div>

  <div style="margin-bottom:14px">
    <div style="font-weight:bold;margin-bottom:4px">Social Skill Deficiencies:</div>
    <div class="field-line"></div>
    <div class="field-line"></div>
    <div class="field-line"></div>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;font-size:9pt;margin-top:8px">
    <div><strong>Evaluated By:</strong> <span class="line" style="width:140px">&nbsp;</span></div>
    <div><strong>Date:</strong> <span class="line" style="width:120px">&nbsp;</span></div>
  </div>`;
}

// ─────────────────────────────────────────────────────────────
// Progress Evaluation Report
// ─────────────────────────────────────────────────────────────

function buildProgressEvalHtml() {
  const ratingDomains = [
    "Relationship and Interaction with Peer",
    "Relationship and Interaction with Adults",
    "Investment Level in Program and his own Personal Growth",
    "How does the Resident deal with Authority and Structure",
    "Level of Self-Esteem and Motivation",
  ];

  const domainRows = ratingDomains
    .map(
      (label) => `
    <tr>
      <td style="border:1px solid #000;padding:6px 8px;font-weight:bold">${label}</td>
      <td style="border:1px solid #000;padding:6px 12px;text-align:center;white-space:nowrap;width:130px">
        Rating: <span style="display:inline-block;border-bottom:1px solid #000;width:70px">&nbsp;</span>
      </td>
    </tr>`
    )
    .join("");

  const textSections = [
    "Social Skills Strengths",
    "Social Skill Deficiencies",
    "Incidents This Period",
    "Recommendations and Comments",
  ]
    .map(
      (label) => `
    <div style="margin-top:12px">
      <strong>${label}:</strong>
      <div class="field-line"></div>
      <div class="field-line"></div>
      <div class="field-line"></div>
    </div>`
    )
    .join("");

  return `
  <h1>Heartland Boys Home</h1>
  <h2>Progress Evaluation Report</h2>
  <hr style="margin:8px 0 12px;border-top:2px solid #000"/>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;font-size:9pt">
    <div><strong>Name:</strong> <span class="line" style="width:170px">&nbsp;</span></div>
    <div><strong>Evaluation Date / Period:</strong> <span class="line" style="width:130px">&nbsp;</span></div>
  </div>

  <div style="border:1px solid #555;border-radius:3px;padding:6px;margin-bottom:12px;background:#f5f5f5;font-size:9pt">
    <strong>Rating Scale</strong>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:4px;margin-top:4px;font-weight:600;text-align:center">
      <span>1 = Poor</span><span>2 = Below Average</span><span>3 = Average</span><span>4 = Above Average</span>
    </div>
  </div>

  <table style="margin-bottom:12px">
    <tbody>${domainRows}</tbody>
  </table>

  <div style="margin-bottom:10px;font-size:9pt">
    <strong>Evaluated By:</strong> <span class="line" style="width:180px">&nbsp;</span>
    &nbsp;&nbsp;<strong>Date:</strong> <span class="line" style="width:110px">&nbsp;</span>
  </div>

  ${textSections}

  <div style="margin-top:18px">
    <table>
      <tbody>
        <tr>
          <td style="border:1px solid #000;padding:6px 10px;width:50%"><strong>Pass Schedule for:</strong> <span class="line" style="width:100px">&nbsp;</span></td>
          <td style="border:1px solid #000;padding:6px 10px;width:50%"><strong>With Whom:</strong> <span class="line" style="width:100px">&nbsp;</span></td>
        </tr>
        <tr>
          <td style="border:1px solid #000;padding:24px 10px"><strong>Director's Signature</strong></td>
          <td style="border:1px solid #000;padding:24px 10px"><strong>Resident's Signature</strong></td>
        </tr>
      </tbody>
    </table>
  </div>

  <div style="margin-top:14px">
    <p style="text-align:center;font-weight:bold;margin-bottom:6px">Pass and Sign-Out Information</p>
    <table>
      <thead>
        <tr>
          ${["Date / Day", "Time Out", "Signature", "Time In", "Signature"].map((h) => `<th style="border:1px solid #000;padding:4px 6px;text-align:center;font-size:9pt">${h}</th>`).join("")}
        </tr>
      </thead>
      <tbody>
        ${[1, 2, 3, 4].map(() => `<tr>${[0, 1, 2, 3, 4].map(() => `<td style="border:1px solid #000;padding:14px 6px">&nbsp;</td>`).join("")}</tr>`).join("")}
      </tbody>
    </table>
  </div>`;
}

// ─────────────────────────────────────────────────────────────
// Personal Style Profile (blank — columns A/B/C/D)
// ─────────────────────────────────────────────────────────────

const PSP_ROWS = [
  ["Caring and kind. Puts others' feelings first.", "Organized and prepared. Likes having a clear plan.", "Logical and curious. Likes figuring things out.", "Bold and energetic. Loves action and new things."],
  ["Great listener. People share their problems with me.", "Reliable and consistent. Follows through on commitments.", "Thinks carefully before deciding. Analyzes situations.", "Hands-on and active. Prefers doing over just talking."],
  ["Avoids conflict. Wants everyone to get along.", "Feels better when things are orderly and neat.", "Likes working things out independently. Values logic.", "Gets bored with routine. Needs variety."],
  ["Feelings and relationships are the most important things.", "Believes in doing things the right way and on time.", "Trusts facts and reasoning over emotions.", "Lives in the moment. Moves fast and takes risks."],
  ["Motivated by connection and making others feel valued.", "Motivated by completing tasks and meeting responsibilities.", "Motivated by learning and understanding how things work.", "Motivated by freedom, excitement, and new challenges."],
  ["Shows care through empathy and being present.", "Shows care through dependability and keeping promises.", "Shows care through solving problems and sharing knowledge.", "Shows care through actions, humor, and spontaneity."],
];

function buildPspHtml() {
  const rows = PSP_ROWS.map(
    (row, idx) => `
    <tr style="background:${idx % 2 === 0 ? "#fff" : "#f9f9f9"}">
      <td style="border:1px solid #000;padding:5px 7px;text-align:center;font-weight:bold">${idx + 1}</td>
      ${row
        .map(
          (text) => `
        <td style="border:1px solid #000;padding:5px 7px">
          <div style="display:flex;align-items:flex-start;gap:5px">
            <span style="display:inline-block;border:1px solid #000;width:18px;height:18px;flex-shrink:0;margin-top:2px"></span>
            <span style="line-height:1.3;font-size:9pt">${text}</span>
          </div>
        </td>`
        )
        .join("")}
    </tr>`
  ).join("");

  return `
  <h1>Heartland Boys Home</h1>
  <h2>Personal Style Profile</h2>
  <hr style="margin:8px 0 12px;border-top:2px solid #000"/>

  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:12px;font-size:9pt">
    <div><strong>Youth Name:</strong> <span class="line" style="width:150px">&nbsp;</span></div>
    <div><strong>Date:</strong> <span class="line" style="width:110px">&nbsp;</span></div>
    <div><strong>Staff:</strong> <span class="line" style="width:110px">&nbsp;</span></div>
  </div>

  <div style="border:1px solid #555;border-radius:3px;padding:6px;margin-bottom:12px;background:#f5f5f5;font-size:9pt">
    <strong>Instructions:</strong> Read each row. Rank all four descriptions using the numbers <strong>1–4</strong>.
    Use each number exactly once per row.<br/>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:6px;margin-top:6px;font-weight:600">
      <span>4 = Most like me</span><span>3 = A lot like me</span><span>2 = A little like me</span><span>1 = Least like me</span>
    </div>
  </div>

  <table style="margin-bottom:12px">
    <thead>
      <tr style="background:#1C2B4A;color:#fff">
        <th style="border:1px solid #000;padding:5px 7px;text-align:center;width:28px">#</th>
        ${["A", "B", "C", "D"].map((l) => `<th style="border:1px solid #000;padding:5px 7px;text-align:center;color:#fff;background:#1C2B4A">${l}</th>`).join("")}
      </tr>
    </thead>
    <tbody>
      ${rows}
      <tr style="background:#e8e8e8">
        <td style="border:1px solid #000;padding:5px 7px;text-align:center;font-weight:bold">Total</td>
        ${[0, 1, 2, 3].map(() => `<td style="border:1px solid #000;padding:10px;text-align:center"><div style="display:inline-block;border:2px solid #000;width:46px;height:24px"></div></td>`).join("")}
      </tr>
    </tbody>
  </table>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;font-size:9pt;margin-bottom:10px">
    <div>
      <strong>Youth Level:</strong> <span class="line" style="width:60px">&nbsp;</span>
      &nbsp;&nbsp;<strong>Next Review:</strong> <span class="line" style="width:90px">&nbsp;</span>
    </div>
    <div style="text-align:right">
      <strong>Primary Style:</strong> <span class="line" style="width:90px">&nbsp;</span>
      &nbsp;&nbsp;<strong>Secondary:</strong> <span class="line" style="width:80px">&nbsp;</span>
    </div>
  </div>

  <div style="font-size:9pt">
    <strong>Staff Observations:</strong>
    <div class="field-line"></div>
    <div class="field-line"></div>
    <div class="field-line"></div>
  </div>`;
}

// ─────────────────────────────────────────────────────────────
// Blank Daily DPN Scoring Form
// ─────────────────────────────────────────────────────────────

function buildDailyDpnHtml() {
  const domains = [
    { label: "Relationship and Interaction with Peers", short: "Peer Interaction" },
    { label: "Relationship and Interaction with Adults", short: "Adult Interaction" },
    { label: "Investment Level in Program and Personal Growth", short: "Investment Level" },
    { label: "How the Resident Deals with Authority and Structure", short: "Authority / Structure" },
  ];

  const domainRows = domains
    .map(
      (d) => `
    <tr>
      <td style="border:1px solid #000;padding:6px 8px;font-weight:bold;font-size:9pt;width:55%">${d.label}</td>
      <td style="border:1px solid #000;padding:6px 8px;text-align:center;width:15%">
        <div style="display:flex;justify-content:center;gap:8px">
          ${[0, 1, 2, 3, 4].map((n) => `<span style="display:inline-flex;align-items:center;gap:2px;font-size:9pt"><span style="display:inline-block;border:1px solid #000;width:14px;height:14px"></span>${n}</span>`).join("")}
        </div>
      </td>
    </tr>
    <tr>
      <td colspan="2" style="border:1px solid #000;padding:4px 8px">
        <div style="font-size:8pt;color:#555;margin-bottom:2px">Comments — ${d.short}:</div>
        <div class="field-line"></div>
        <div class="field-line"></div>
      </td>
    </tr>`
    )
    .join("");

  return `
  <h1>Heartland Boys Home</h1>
  <h2>Daily Performance Notes (DPN) — Scoring Form</h2>
  <hr style="margin:8px 0 12px;border-top:2px solid #000"/>

  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:14px;font-size:9pt">
    <div><strong>Youth Name:</strong> <span class="line" style="width:150px">&nbsp;</span></div>
    <div><strong>Date:</strong> <span class="line" style="width:120px">&nbsp;</span></div>
    <div><strong>Staff Name:</strong> <span class="line" style="width:130px">&nbsp;</span></div>
  </div>

  <div style="margin-bottom:14px;font-size:9pt">
    <strong>Time of Day:</strong>&nbsp;&nbsp;
    ${["Morning", "Day", "Evening"].map((t) => `<span style="margin-right:16px"><span style="display:inline-block;border:1px solid #000;width:14px;height:14px;vertical-align:middle;margin-right:3px"></span>${t}</span>`).join("")}
  </div>

  <div style="border:1px solid #555;border-radius:3px;padding:6px;margin-bottom:14px;background:#f5f5f5;font-size:9pt">
    <strong>Rating Scale (0–4):</strong>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr 1fr;gap:4px;margin-top:4px;font-weight:600;text-align:center">
      <span>0 = Not Observed</span><span>1 = Poor</span><span>2 = Below Average</span><span>3 = Average</span><span>4 = Above Average</span>
    </div>
  </div>

  <table style="margin-bottom:16px">
    <tbody>${domainRows}</tbody>
  </table>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;font-size:9pt">
    <div><strong>Staff Signature:</strong> <span class="line" style="width:160px">&nbsp;</span></div>
    <div><strong>Date / Time:</strong> <span class="line" style="width:140px">&nbsp;</span></div>
  </div>`;
}

// ─────────────────────────────────────────────────────────────
// Blank Interview Report Form
// ─────────────────────────────────────────────────────────────

function buildInterviewReportHtml() {
  const sections = [
    { label: "Youth Presentation", hint: "Appearance, demeanor, attitude during interview" },
    { label: "Motivation for Change", hint: "Self-identified goals, willingness to engage, understanding of placement" },
    { label: "Risk Factor Assessment", hint: "Violence history, substance use, runaway risk, self-harm, gang involvement" },
    { label: "Behavioral Indicators", hint: "Impulse control observations, emotional regulation, peer interaction style" },
    { label: "Family Dynamics", hint: "Family support, custody situation, family willingness to participate" },
    { label: "Educational Engagement", hint: "Academic motivation, school behavior, IEP needs" },
    { label: "Treatment History", hint: "Prior placements, therapy history, medication compliance" },
    { label: "Program Fit Assessment", hint: "Suitability for Heartland, anticipated challenges, recommended level" },
    { label: "Interviewer Recommendation", hint: "Accept / Deny / Conditional recommendation with rationale" },
    { label: "Director / Executive Director Summary", hint: "Concise leadership brief" },
  ];

  const sectionRows = sections
    .map(
      (s) => `
    <div style="margin-bottom:14px;page-break-inside:avoid">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
        <div>
          <span style="font-weight:bold;font-size:10pt">${s.label}</span>
          <span style="font-size:8pt;color:#666;margin-left:8px">${s.hint}</span>
        </div>
        <div style="white-space:nowrap;font-size:9pt">
          Rating:&nbsp;
          ${[1, 2, 3, 4, 5]
            .map(
              (n) =>
                `<span style="display:inline-flex;align-items:center;gap:1px;margin-right:6px"><span style="display:inline-block;border:1px solid #000;width:14px;height:14px"></span><span style="font-size:8pt">${n}</span></span>`
            )
            .join("")}
        </div>
      </div>
      <div class="field-line"></div>
      <div class="field-line"></div>
      <div class="field-line"></div>
      <div class="field-line"></div>
    </div>`
    )
    .join("");

  return `
  <h1>Heartland Boys Home</h1>
  <h2>Interview Report</h2>
  <hr style="margin:8px 0 12px;border-top:2px solid #000"/>

  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:14px;font-size:9pt">
    <div><strong>Youth Name:</strong> <span class="line" style="width:150px">&nbsp;</span></div>
    <div><strong>Date:</strong> <span class="line" style="width:120px">&nbsp;</span></div>
    <div><strong>Interviewer:</strong> <span class="line" style="width:130px">&nbsp;</span></div>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;font-size:9pt">
    <div><strong>Referral Source:</strong> <span class="line" style="width:180px">&nbsp;</span></div>
    <div><strong>Probation Officer:</strong> <span class="line" style="width:160px">&nbsp;</span></div>
  </div>

  <div style="border:1px solid #555;border-radius:3px;padding:6px;margin-bottom:14px;background:#f5f5f5;font-size:9pt">
    <strong>Rating Scale (1–5):</strong>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr 1fr;gap:4px;margin-top:4px;font-weight:600;text-align:center">
      <span>1 = Poor</span><span>2 = Below Avg</span><span>3 = Average</span><span>4 = Good</span><span>5 = Excellent</span>
    </div>
  </div>

  ${sectionRows}

  <div style="margin-top:16px;padding-top:10px;border-top:2px solid #000">
    <div style="font-weight:bold;font-size:10pt;margin-bottom:8px">Overall Recommendation:</div>
    <div style="display:flex;gap:24px;font-size:9pt;margin-bottom:12px">
      ${["Accept", "Conditional", "Deny"]
        .map(
          (opt) =>
            `<span style="display:inline-flex;align-items:center;gap:4px"><span style="display:inline-block;border:1px solid #000;width:14px;height:14px"></span>${opt}</span>`
        )
        .join("")}
    </div>
    <div style="font-size:9pt"><strong>Notes:</strong></div>
    <div class="field-line"></div>
    <div class="field-line"></div>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;font-size:9pt;margin-top:16px">
    <div><strong>Interviewer Signature:</strong> <span class="line" style="width:160px">&nbsp;</span></div>
    <div><strong>Date:</strong> <span class="line" style="width:140px">&nbsp;</span></div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;font-size:9pt;margin-top:10px">
    <div><strong>Director Signature:</strong> <span class="line" style="width:160px">&nbsp;</span></div>
    <div><strong>Date:</strong> <span class="line" style="width:140px">&nbsp;</span></div>
  </div>`;
}

// ─────────────────────────────────────────────────────────────
// Page component
// ─────────────────────────────────────────────────────────────

const FORMS = [
  {
    id: "dpn-daily",
    title: "DPN Daily Scoring Form",
    description: "Blank daily performance notes form with the four behavioral domains (0–4 scale), comment lines, and staff signature.",
    icon: ClipboardList,
    printLabel: "Print Blank Form",
    onPrint: () => openPrintWindow("DPN Daily Scoring Form — Blank", buildDailyDpnHtml()),
  },
  {
    id: "dpn-weekly",
    title: "DPN Weekly Progress Evaluation",
    description: "Blank weekly progress evaluation form covering the four behavioral domains, social skills strengths and deficiencies.",
    icon: ClipboardList,
    printLabel: "Print Blank Form",
    onPrint: () => openPrintWindow("DPN Weekly Progress Evaluation — Blank", buildDpnHtml("Weekly")),
  },
  {
    id: "dpn-biweekly",
    title: "DPN Bi-Weekly Progress Evaluation",
    description: "Same form layout as the weekly version, pre-labeled for a two-week evaluation period.",
    icon: ClipboardList,
    printLabel: "Print Blank Form",
    onPrint: () => openPrintWindow("DPN Bi-Weekly Progress Evaluation — Blank", buildDpnHtml("Bi-Weekly")),
  },
  {
    id: "dpn-monthly",
    title: "DPN Monthly Progress Evaluation",
    description: "Monthly version of the DPN progress evaluation form.",
    icon: ClipboardList,
    printLabel: "Print Blank Form",
    onPrint: () => openPrintWindow("DPN Monthly Progress Evaluation — Blank", buildDpnHtml("Monthly")),
  },
  {
    id: "progress-eval",
    title: "Progress Evaluation Report",
    description: "Full progress evaluation form including five rating domains, text sections, pass schedule, and sign-out log.",
    icon: FileText,
    printLabel: "Print Blank Form",
    onPrint: () => openPrintWindow("Progress Evaluation Report — Blank", buildProgressEvalHtml()),
  },
  {
    id: "interview-report",
    title: "Interview Report",
    description: "Blank interview report form with 10 structured assessment sections (1–5 rating scale), recommendation checkboxes, and signature lines.",
    icon: FileText,
    printLabel: "Print Blank Form",
    onPrint: () => openPrintWindow("Interview Report — Blank", buildInterviewReportHtml()),
  },
  {
    id: "psp",
    title: "Personal Style Profile",
    description: "Six-row ranking assessment (columns A–B–C–D) for identifying a youth's primary and secondary personal style.",
    icon: User,
    printLabel: "Print Blank Form",
    onPrint: () => openPrintWindow("Personal Style Profile — Blank", buildPspHtml()),
  },
];

export default function AdminForms() {
  const { toast } = useToast();

  const handlePrint = (form: typeof FORMS[number]) => {
    const ok = form.onPrint();
    if (!ok) {
      toast({
        title: "Pop-up blocked",
        description: "Allow pop-ups for this site and try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-yellow-50 to-red-100">
      <Header />
      <main className="container mx-auto px-4 py-6 pb-24 lg:pb-8 space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-red-800 via-red-700 to-yellow-600 bg-clip-text text-transparent">
            Forms Library
          </h1>
          <p className="text-red-700 mt-1">
            Print clean blank copies of facility forms. Each form opens in a new window and triggers the print dialog automatically.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {FORMS.map((form) => {
            const Icon = form.icon;
            return (
              <Card key={form.id} className="flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg p-2 bg-red-100 shrink-0">
                      <Icon className="h-5 w-5 text-red-800" />
                    </div>
                    <div>
                      <CardTitle className="text-base leading-snug">{form.title}</CardTitle>
                      <CardDescription className="mt-1 text-xs leading-relaxed">
                        {form.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="mt-auto pt-0">
                  <Button
                    onClick={() => handlePrint(form)}
                    className="w-full flex items-center gap-2"
                    style={{ backgroundColor: "#1C2B4A" }}
                  >
                    <Printer className="h-4 w-4" />
                    {form.printLabel}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
}
