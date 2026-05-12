import { auditLogService } from "@/integrations/firebase/auditLogService";

export async function logAuditBestEffort(
  entry: Parameters<typeof auditLogService.log>[0],
  context: string,
  label: string
): Promise<void> {
  try {
    await auditLogService.log(entry);
  } catch (error) {
    console.warn(`[${label}] Audit log failed during ${context}:`, error);
  }
}
