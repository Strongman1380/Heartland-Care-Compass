# Youth Profile Import Feature - User Guide

## Overview
The Edit Youth Profile dialog now includes an AI-powered import feature that allows you to paste text from any source (documents, emails, forms, etc.) and automatically populate the appropriate form fields.

## How to Use

### Step 1: Open Edit Youth Profile
1. Navigate to a youth's profile
2. Click the "Edit Profile" button
3. The Edit Youth Profile dialog will open

### Step 2: Access the Import Tab
1. The dialog opens with the **"Import"** tab selected by default (first tab)
2. You'll see a text area with instructions

### Step 3: Paste Your Text
1. Copy text from any source containing youth profile information:
   - Word documents
   - Email messages
   - PDF forms
   - Spreadsheet data
   - Handwritten notes (typed)
   - Any other text format

2. Paste the text into the large text area

### Step 4: Import the Data
1. Click the **"Import Profile Data"** button
2. The AI will analyze the text and extract relevant information
3. A success message will appear showing how many fields were populated
4. All matching fields across all tabs will be automatically filled

### Step 5: Review and Save
1. Navigate through the other tabs to review the imported data:
   - Personal Information
   - Background & History
   - Education
   - Medical Information
   - Mental Health
   - Assessments
   - etc.

2. Make any necessary adjustments to the imported data
3. Click **"Save Changes"** to update the youth profile

## What the AI Can Extract

The AI can intelligently parse and extract over 50 different fields, including:

### Personal Information
- First Name, Last Name, Middle Name
- Date of Birth, Age, Gender
- SSN, Medicaid Number
- Contact information

### Background & History
- Admission Date, Discharge Date
- Placement Type, Level
- Prior Placements
- Court Involvement
- Trauma History

### Education
- School Name, Grade Level
- Special Education Status
- Academic Performance

### Medical Information
- Medications
- Allergies
- Medical Conditions
- Primary Care Physician

### Mental Health
- Diagnoses
- Therapist information
- Treatment history
- Mental health notes

### And Much More!

## Supported Text Formats

The AI can handle various text formats:

### Labeled Format (Recommended)
```
Name: John Doe
Date of Birth: 01/15/2008
Gender: Male
Admission Date: 03/20/2024
Placement Type: Residential
Medications: Adderall 10mg daily
Allergies: Penicillin
```

### Paragraph Format
```
John Doe is a 16-year-old male admitted on March 20, 2024 to residential 
placement. He takes Adderall 10mg daily and is allergic to Penicillin.
```

### Mixed Format
The AI can handle a combination of both formats and will extract whatever information it can find.

## Tips for Best Results

1. **Include Labels**: When possible, use field labels (e.g., "Name:", "DOB:", "Medications:")
2. **Clear Formatting**: Separate different pieces of information with line breaks
3. **Complete Information**: Include as much detail as possible
4. **Review Before Saving**: Always review imported data for accuracy
5. **Partial Imports**: The AI will only populate fields it can confidently extract - empty fields won't be overwritten

## Technical Details

- **AI Model**: Uses OpenAI GPT for intelligent text parsing
- **Data Preservation**: Only non-empty extracted values will overwrite existing data
- **Date Handling**: Automatically converts various date formats to YYYY-MM-DD
- **Type Conversion**: Intelligently converts text to appropriate data types (numbers, arrays, etc.)
- **Error Handling**: Provides clear error messages if import fails

## Troubleshooting

### Import Button Not Working
- Ensure you've pasted text into the text area
- Check that the server is running (`npm run dev:full`)
- Verify your OpenAI API key is configured

### Fields Not Populating
- The AI may not have found matching information in the text
- Try using clearer labels or more structured text
- Check the browser console for any error messages

### Incorrect Data Imported
- Review and manually correct any fields
- The AI does its best but may occasionally misinterpret information
- Always verify critical information before saving

## Example Import Text

Here's an example of text you could paste:

```
Youth Profile Information

Name: Sarah Johnson
Date of Birth: 05/12/2007
Gender: Female
SSN: 123-45-6789

Admission Information:
Admission Date: 01/15/2024
Placement Type: Residential
Level: 3
Referring Agency: County DHS

Medical Information:
Medications: Zoloft 50mg daily, Melatonin 3mg at bedtime
Allergies: None known
Medical Conditions: Asthma (mild)
Primary Care Physician: Dr. Smith

Mental Health:
Diagnoses: Major Depressive Disorder, ADHD
Therapist: Jane Doe, LCSW
Psychiatrist: Dr. Brown

Education:
School: Lincoln High School
Grade: 10th
Special Education: Yes - IEP for ADHD
GPA: 2.8

Background:
Prior Placements: Foster care (2 years), Group home (6 months)
Court Involvement: Dependency case, no delinquency
Trauma History: Neglect, witnessed domestic violence
```

This text would automatically populate all the corresponding fields in the youth profile!

## Support

If you encounter any issues with the import feature, please contact your system administrator or check the application logs for detailed error information.