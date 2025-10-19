# Complete Youth Profile Import Guide

## Quick Start

**You can now paste youth profiles in any format and the AI will intelligently extract all information!**

The AI has been updated to recognize and parse all contact fields including Legal Guardian, Probation Officer, Mother, Father, Next of Kin, Caseworker, Guardian ad Litem, Attorney, and Judge.

## How to Import a Profile

1. **Navigate to Add Youth**
   - Click "Add Youth" button
   - Go to the "Import" tab

2. **Paste Profile Text**
   - Copy youth profile information from any source (court docs, PDFs, emails, etc.)
   - Paste into the text area

3. **Click "Parse with AI"**
   - AI will extract all available information
   - Fields will auto-populate

4. **Review & Complete**
   - Check the populated fields across all tabs
   - Fill in any missing information
   - Click "Add Youth" to save

## Recommended Format Examples

### Format 1: Structured with Headers

```
YOUTH PROFILE

=== PERSONAL INFORMATION ===
First Name: Elijah
Last Name: Christian
Date of Birth: 10/27/2010
Age: 14
Sex: Male
Race: Caucasian

=== LEGAL GUARDIAN ===
Name: Mary Christian
Relationship: Mother
Phone: (402) 555-1234
Email: mary.christian@email.com

=== PROBATION OFFICER ===
Name: Jared MacLeod
Phone: (402) 318-9666

=== FAMILY CONTACTS ===
Mother: Mary Christian - (402) 555-1234
Father: Robert Christian - (402) 555-5678
Next of Kin: Susan Johnson (Aunt) - (402) 555-9999

=== LEGAL TEAM ===
Caseworker: Jennifer Smith - (402) 555-3333
Guardian ad Litem: Thomas Anderson
Attorney: Robert Wilson
Judge: Honorable Sarah Martinez
Placing Agency: Douglas County DHS

=== EDUCATION ===
School: BEST Education
Grade: 9th
Has IEP: Yes
```

### Format 2: Narrative/Paragraph Style

```
Elijah Christian, 14-year-old male (DOB 10/27/2010), admitted 6/30/2025.

His mother and legal guardian is Mary Christian at (402) 555-1234 (mary.christian@email.com). Father is Robert Christian (402) 555-5678. Next of kin is his aunt Susan Johnson at (402) 555-9999.

Probation officer: Jared MacLeod (402) 318-9666. Placed by Douglas County DHS. Caseworker Jennifer Smith (402) 555-3333. Guardian ad litem Thomas Anderson. Attorney Robert Wilson. Judge Honorable Sarah Martinez.

Currently in 9th grade at BEST Education with an IEP.
```

### Format 3: Court Document Style

```
IN THE MATTER OF ELIJAH CHRISTIAN

Youth: Elijah Christian
DOB: October 27, 2010
Mother: Mary Christian, (402) 555-1234
Father: Robert Christian, (402) 555-5678

PROBATION OFFICER: Jared MacLeod | (402) 318-9666
CASEWORKER: Jennifer Smith, Douglas County DHS | (402) 555-3333
GUARDIAN AD LITEM: Thomas Anderson
ATTORNEY: Robert Wilson
PRESIDING JUDGE: Honorable Sarah Martinez

EDUCATIONAL INFORMATION:
School: BEST Education
Grade: 9th
IEP Status: Active
```

## What the AI Can Extract

The AI will intelligently parse and populate these fields:

### Personal Information
- First Name, Last Name
- Date of Birth (any format: MM/DD/YYYY, Month DD YYYY, etc.)
- Age (calculated from DOB if not provided)
- Sex, Race, Religion
- Place of Birth
- Social Security Number
- Physical Description (height, weight, hair, eyes, tattoos/scars)
- Address (street, city, state, zip)

### Contact Information ✨ New!
The AI now extracts and formats as Json objects:
- **Legal Guardian** → name, relationship, contact, phone, email
- **Probation Officer** → name, contact, phone
- **Mother** → name, phone
- **Father** → name, phone
- **Next of Kin** → name, relationship, phone
- **Caseworker** → name, phone
- **Guardian ad Litem** → name
- **Attorney** → name
- **Judge** → name
- **Placing Agency/County** → name

### Admission & Placement
- Admission Date
- Initial Level (0-4, or "Orientation")
- Placement Authority
- Estimated Length of Stay
- Referral Source
- Referral Reason

### Prior History
- Prior Placements (list)
- Number of Prior Placements
- Length of Most Recent Placement
- Court Involvement

### Education
- Current School
- Grade
- Has IEP (Yes/No)
- Academic Strengths
- Academic Challenges
- Educational Goals
- School Contact, School Phone

### Medical
- Primary Physician, Physician Phone
- Insurance Provider, Policy Number
- Allergies
- Medical Conditions
- Medical Restrictions

### Mental Health
- Current Diagnoses
- Trauma History
- Previous Treatment
- Current Counseling (Individual, Group, Family)
- Therapist Name, Contact
- Session Frequency, Time
- Self-Harm History
- Safety Plan Status

### Risk Assessment
- HYRNA Risk Level (High/Medium/Low)
- HYRNA Score
- Assessment Date

## Tips for Best Results

### 1. Use Clear Labels
The AI recognizes these keywords:
- **Names**: "First Name:", "Last Name:", "Name:", "Youth:"
- **Dates**: "DOB:", "Date of Birth:", "Born:", "Admitted:", "Admission Date:"
- **Contacts**: "Mother:", "Father:", "Guardian:", "Probation Officer:", "Caseworker:", "Attorney:", "Judge:"
- **Phone**: "Phone:", "Tel:", "Contact:", "(###) ###-####"
- **Email**: "Email:", "@"

### 2. Include Relationships
Help the AI understand connections:
```
Good: "Mother: Mary Christian (Legal Guardian) - (402) 555-1234"
Good: "Next of Kin: Susan Johnson (Aunt)"
Good: "Guardian ad Litem: Thomas Anderson"
```

### 3. Separate Different Contacts
Make it clear when switching between contacts:
```
Legal Guardian: Mary Christian - (402) 555-1234
Probation Officer: Jared MacLeod - (402) 318-9666
Mother: Mary Christian - (402) 555-1234
Father: Robert Christian - (402) 555-5678
```

### 4. Any Date Format Works
- 10/27/2010
- 10-27-2010
- October 27, 2010
- Oct 27 2010

### 5. Any Phone Format Works
- (402) 555-1234
- 402-555-1234
- 402.555.1234
- 4025551234

## What Happens Behind the Scenes

When you click "Parse with AI":

1. **AI analyzes the text** and identifies key information
2. **Extracts contact information** into structured Json objects:
   - Legal Guardian → `{name: "Mary Christian", relationship: "Mother", phone: "(402) 555-1234", ...}`
   - Mother → `{name: "Mary Christian", phone: "(402) 555-1234"}`
   - Probation Officer → `{name: "Jared MacLeod", phone: "(402) 318-9666"}`
3. **Populates all form fields** across all tabs
4. **Saves to database** in correct Json format (matching Supabase schema)

## Example: Minimal Profile

Don't have all the information? No problem! The AI works with whatever you provide:

```
John Smith, 15 years old
Mother: Jane Smith (555-1234)
Probation: Officer Jones (555-5678)
School: Lincoln High, 10th grade
```

The AI will extract what's available and leave other fields blank for you to fill in later.

## Troubleshooting

**AI didn't extract a field correctly?**
- Just manually edit that field after AI parsing
- AI parsing is a starting point - you have full control

**Want to try different formats?**
- The AI is flexible! Try copying from Word docs, PDFs, emails
- It recognizes patterns and keywords across different formats

**Need to import multiple profiles?**
- Import one at a time
- Each import takes only seconds with AI parsing

## Full Template Example

See [AI_IMPORT_TEMPLATE.md](AI_IMPORT_TEMPLATE.md) for complete template with all possible fields.

## Summary

✅ Paste youth profiles in ANY format
✅ AI extracts ALL contact information as Json objects
✅ All fields auto-populate
✅ Data saves correctly to Supabase
✅ No more manual typing!

The AI import feature now fully supports the corrected Supabase schema with proper Json object formatting for all contact fields!
