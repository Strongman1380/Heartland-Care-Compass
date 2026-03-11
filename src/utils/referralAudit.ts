/**
 * Utility to audit referrals for missing key components
 * Run this after logging in by executing in browser console:
 *
 * import { auditReferrals } from '@/utils/referralAudit'
 * await auditReferrals()
 */

import { referralNotesService, type ReferralNoteRow } from '@/integrations/firebase/referralNotesService';

export interface ParsedReferral {
  demographics: Record<string, string>;
  family: Record<string, string>;
  education: Record<string, string>;
  medical: Record<string, string>;
  mentalHealth: Record<string, string>;
  legal: Record<string, string>;
  behavioral: Record<string, string>;
  placement: Record<string, string>;
}

interface ReferralIssue {
  referralName: string;
  referralId: string;
  status: string;
  issueType: 'missing_fields' | 'incomplete_parsed_data' | 'empty_sections';
  details: string[];
}

const PENDING_STATUSES = [
  'pending_interview',
  'schedule_interview',
  'waiting_for_response',
  'interview_scheduled',
];

const REQUIRED_FIELDS = [
  'referral_name',
  'referral_source',
  'staff_name',
  'status',
  'parsed_data',
];

const PARSED_DATA_SECTIONS: (keyof ParsedReferral)[] = [
  'demographics',
  'family',
  'education',
  'medical',
  'mentalHealth',
  'legal',
  'behavioral',
  'placement',
];

function isEmptyObject(obj: any): boolean {
  return !obj || (typeof obj === 'object' && Object.keys(obj).length === 0);
}

function checkReferralIssues(referral: ReferralNoteRow): ReferralIssue | null {
  const issues: string[] = [];

  // Check required fields
  REQUIRED_FIELDS.forEach(field => {
    const value = referral[field as keyof ReferralNoteRow];
    if (
      value === null ||
      value === undefined ||
      (typeof value === 'string' && value.trim() === '')
    ) {
      issues.push(`Missing or empty: ${field}`);
    }
  });

  // Check parsed data sections
  if (referral.parsed_data && typeof referral.parsed_data === 'object') {
    const emptySections: string[] = [];

    PARSED_DATA_SECTIONS.forEach(section => {
      const sectionData = referral.parsed_data[section];
      if (isEmptyObject(sectionData)) {
        emptySections.push(section);
      }
    });

    if (emptySections.length > 0) {
      issues.push(`Empty parsed sections: ${emptySections.join(', ')}`);
    }
  }

  if (issues.length === 0) {
    return null; // No issues
  }

  return {
    referralName: referral.referral_name || 'UNNAMED',
    referralId: referral.id,
    status: referral.status || 'no_status',
    issueType: issues[0].includes('parsed') ? 'incomplete_parsed_data' : 'missing_fields',
    details: issues,
  };
}

export async function auditReferrals(): Promise<void> {
  console.log('Starting referral audit...\n');

  try {
    // Fetch all referrals
    const allReferrals = await referralNotesService.list();

    // Filter for pending interview statuses
    const pendingReferrals = allReferrals.filter(ref =>
      PENDING_STATUSES.includes(ref.status || '')
    );

    console.log(`Found ${pendingReferrals.length} referrals with pending interview status`);
    console.log('='.repeat(80));

    const issuesList: ReferralIssue[] = [];

    // Check each referral
    pendingReferrals.forEach((referral, idx) => {
      const issue = checkReferralIssues(referral);

      console.log(`\n${idx + 1}. ${referral.referral_name || 'UNNAMED'}`);
      console.log(`   ID: ${referral.id}`);
      console.log(`   Status: ${referral.status}`);
      console.log(`   Source: ${referral.referral_source || '(missing)'}`);
      console.log(`   Staff: ${referral.staff_name || '(missing)'}`);
      console.log(`   Created: ${referral.created_at}`);

      if (!issue) {
        console.log(`   ✅ All components present`);
      } else {
        console.log(`   ❌ Issues:`);
        issue.details.forEach(detail => {
          console.log(`      - ${detail}`);
        });
        issuesList.push(issue);
      }
    });

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('\n📊 AUDIT SUMMARY');
    console.log(`Total with pending status: ${pendingReferrals.length}`);
    console.log(`Referrals with issues: ${issuesList.length}`);
    console.log(`Complete referrals: ${pendingReferrals.length - issuesList.length}`);

    if (issuesList.length > 0) {
      console.log('\n⚠️  REFERRALS REQUIRING REPARSE:\n');
      issuesList.forEach((issue, idx) => {
        console.log(`${idx + 1}. ${issue.referralName}`);
        console.log(`   ID: ${issue.referralId}`);
        console.log(`   Status: ${issue.status}`);
        issue.details.forEach(detail => {
          console.log(`   - ${detail}`);
        });
        console.log();
      });

      // Create exportable list
      const referralList = issuesList
        .map(issue => `${issue.referralName} (${issue.referralId})`)
        .join('\n');

      console.log('Copy this list to find referrals:\n');
      console.log(referralList);
    } else {
      console.log('\n✅ All referrals with pending status are complete!');
    }

  } catch (error) {
    console.error('Audit failed:', error);
    throw error;
  }
}

/**
 * Export detailed report as JSON
 */
export async function auditReferralsJSON(): Promise<{
  total: number;
  withIssues: number;
  complete: number;
  issues: ReferralIssue[];
}> {
  const allReferrals = await referralNotesService.list();
  const pendingReferrals = allReferrals.filter(ref =>
    PENDING_STATUSES.includes(ref.status || '')
  );

  const issues: ReferralIssue[] = [];

  pendingReferrals.forEach(referral => {
    const issue = checkReferralIssues(referral);
    if (issue) {
      issues.push(issue);
    }
  });

  return {
    total: pendingReferrals.length,
    withIssues: issues.length,
    complete: pendingReferrals.length - issues.length,
    issues,
  };
}
