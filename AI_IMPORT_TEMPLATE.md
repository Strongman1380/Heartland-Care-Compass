# AI Youth Profile Import Template

## Overview
This template ensures the AI can properly parse youth profile information and populate all fields correctly, including the Json object fields (legal guardian, probation officer, family contacts, etc.).

## Recommended Format for Copying/Pasting Profiles

When pasting a youth profile for AI import, use this format for best results:

```
YOUTH PROFILE

=== PERSONAL INFORMATION ===
First Name: Elijah
Last Name: Christian
Date of Birth: 10/27/2010
Age: 14
Sex: Male
Race: Caucasian
Religion: Christian
Place of Birth: Omaha, NE
Social Security Number: XXX-XX-XXXX
ID Number: (leave blank for auto-generation)

=== PHYSICAL DESCRIPTION ===
Height: 5'6"
Weight: 130 lbs
Hair Color: Brown
Eye Color: Blue
Tattoos/Scars: Small scar on left forearm

=== HOME ADDRESS ===
Street: 123 Main Street
City: Omaha
State: NE
Zip: 68105

=== ADMISSION INFORMATION ===
Admission Date: 06/30/2025
Initial Level: 3
Placement Authority: County DHS
Estimated Stay: 6-12 months
Referral Source: Juvenile Court
Referral Reason: Behavioral issues, truancy, family conflict

=== LEGAL GUARDIAN ===
Name: Mary Christian
Relationship: Mother
Contact: mary.christian@email.com
Phone: (402) 555-1234
Email: mary.christian@email.com

=== PROBATION OFFICER ===
Name: Jared MacLeod
Contact: jared.macleod@county.gov
Phone: (402) 318-9666

=== MOTHER ===
Name: Mary Christian
Phone: (402) 555-1234

=== FATHER ===
Name: Robert Christian
Phone: (402) 555-5678

=== NEXT OF KIN ===
Name: Susan Johnson
Relationship: Aunt
Phone: (402) 555-9999

=== LEGAL CONTACTS ===
Placing Agency/County: Douglas County DHS
Caseworker Name: Jennifer Smith
Caseworker Phone: (402) 555-3333
Guardian ad Litem: Thomas Anderson
Attorney: Robert Wilson
Judge: Honorable Sarah Martinez

=== PRIOR PLACEMENTS ===
Prior Placements: Foster Care, Group Home
Number of Prior Placements: 2
Length of Most Recent Placement: 4 months
Court Involvement: Delinquency, Status Offense

=== EDUCATION ===
Current School: BEST Education
Grade: 9th
Has IEP: Yes
Academic Strengths: Math, hands-on learning
Academic Challenges: Reading comprehension, focus in classroom
Educational Goals: Earn high school diploma, learn a trade
School Contact: Mrs. Johnson
School Phone: (402) 555-7777

=== MEDICAL INFORMATION ===
Primary Physician: Dr. Michael Stevens
Physician Phone: (402) 555-8888
Insurance Provider: Medicaid
Policy Number: MC123456789
Allergies: Penicillin
Medical Conditions: Asthma
Medical Restrictions: Avoid strenuous exercise during asthma flare-ups

=== MENTAL HEALTH ===
Current Diagnoses: ADHD, Oppositional Defiant Disorder, Anxiety
Trauma History: Physical Abuse, Witness to Violence
Previous Treatment: Outpatient therapy 2022-2024
Current Counseling: Individual, Family
Therapist Name: Dr. Lisa Chen
Therapist Contact: (402) 555-4444
Session Frequency: Weekly
Session Time: Tuesdays at 2:00 PM
Self-Harm History: None
Date of Last Incident: N/A
Safety Plan in Place: Yes

=== HYRNA RISK ASSESSMENT ===
Risk Level: High
HYRNA Score: 63
Assessment Date: 09/24/2025

=== BEHAVIOR TRACKING ===
On Subsystem: No
Points in Current Level: 0
Daily Points for Privileges: 10
```

## Alternative Format (Narrative Style)

The AI can also parse narrative/paragraph format:

```
Elijah Christian is a 14-year-old Caucasian male, DOB 10/27/2010, admitted on 6/30/2025 at Level 3. He is 5'6" tall, weighs 130 lbs, with brown hair and blue eyes. He has a small scar on his left forearm.

His legal guardian is his mother, Mary Christian, who can be reached at (402) 555-1234 or mary.christian@email.com. His father is Robert Christian, phone (402) 555-5678. Next of kin is his aunt, Susan Johnson at (402) 555-9999.

Elijah's probation officer is Jared MacLeod at (402) 318-9666, email jared.macleod@county.gov. He was placed by Douglas County DHS. His caseworker is Jennifer Smith at (402) 555-3333. His guardian ad litem is Thomas Anderson. His attorney is Robert Wilson and his judge is Honorable Sarah Martinez.

Home address: 123 Main Street, Omaha, NE 68105.

He has had 2 prior placements (foster care and group home), with his most recent placement lasting 4 months. Court involvement includes delinquency and status offenses. He was referred due to behavioral issues, truancy, and family conflict.

Currently enrolled at BEST Education in 9th grade with an IEP. Academic strengths include math and hands-on learning. Challenges include reading comprehension and classroom focus. Educational goals are to earn his high school diploma and learn a trade. School contact is Mrs. Johnson at (402) 555-7777.

Medical: Dr. Michael Stevens (402) 555-8888. Insurance: Medicaid, policy MC123456789. Allergies: Penicillin. Conditions: Asthma. Restrictions: Avoid strenuous exercise during flare-ups.

Mental Health: Diagnosed with ADHD, Oppositional Defiant Disorder, and Anxiety. Trauma history includes physical abuse and witnessing violence. Previous outpatient therapy 2022-2024. Currently in individual and family therapy with Dr. Lisa Chen (402) 555-4444, Tuesdays at 2:00 PM. No self-harm history. Safety plan in place.

HYRNA Assessment: High Risk, score 63, assessed 9/24/2025.
```

## Key Tips for Best AI Parsing Results

### 1. **Use Clear Labels**
The AI looks for keywords like:
- "Name:", "First Name:", "Last Name:"
- "DOB:", "Date of Birth:", "Born:"
- "Mother:", "Father:", "Guardian:", "Probation Officer:"
- "Phone:", "Contact:", "Email:"
- "Address:", "Street:", "City:", "State:", "Zip:"

### 2. **Separate Contact Information**
Clearly separate different contacts:
```
Legal Guardian: Mary Christian (Mother) - (402) 555-1234
Probation Officer: Jared MacLeod - (402) 318-9666
Mother: Mary Christian - (402) 555-1234
Father: Robert Christian - (402) 555-5678
```

### 3. **Include Relationships**
For family/contacts, include the relationship:
```
Mother: Mary Christian
Next of Kin: Susan Johnson (Aunt)
Legal Guardian: Mary Christian (Mother)
```

### 4. **Use Standard Date Formats**
- MM/DD/YYYY (10/27/2010)
- MM-DD-YYYY (10-27-2010)
- Month DD, YYYY (October 27, 2010)

### 5. **Phone Number Formats**
Any of these work:
- (402) 555-1234
- 402-555-1234
- 402.555.1234
- 4025551234

## What the AI Will Extract

The AI parsing will create Json objects for:

1. **Legal Guardian** → `{name, relationship, contact, phone, email}`
2. **Probation Officer** → `{name, contact, phone}`
3. **Mother** → `{name, phone}`
4. **Father** → `{name, phone}`
5. **Next of Kin** → `{name, relationship, phone}`
6. **Caseworker** → `{name, phone}`
7. **Guardian ad Litem** → `{name}`
8. **Address** → `{street, city, state, zip}`
9. **Physical Description** → `{height, weight, hairColor, eyeColor, tattoosScars}`

## Example: Minimal Profile

If you only have basic information, that works too:

```
Name: John Smith
DOB: 5/15/2009
Admitted: 7/1/2025
Level: 2
Mother: Jane Smith (555-1234)
Probation Officer: Officer Jones (555-5678)
School: Lincoln High, 10th grade
```

The AI will extract what's available and leave other fields blank.

## How to Use in the Application

1. **Go to Youth Profiles** → **Add Youth**
2. **Click the "Import" tab**
3. **Paste your profile** (using any of the formats above)
4. **Click "Parse with AI"**
5. **Review the populated fields**
6. **Fill in any missing information**
7. **Click "Add Youth"** to save

The AI will intelligently extract all the information and format it correctly for the database!
