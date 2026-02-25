
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone } from "lucide-react";
import { Youth } from "@/integrations/firebase/services";

interface ContactsQuickReferenceProps {
  youth: Youth;
}

interface ContactRow {
  label: string;
  name: string | null | undefined;
  phone: string | null | undefined;
}

const parseCaseworkerName = (caseworker: unknown): string | null => {
  if (!caseworker) return null;
  if (typeof caseworker === "string") {
    try {
      const parsed = JSON.parse(caseworker);
      return parsed?.name || caseworker;
    } catch {
      return caseworker;
    }
  }
  if (typeof caseworker === "object") {
    const obj = caseworker as Record<string, unknown>;
    return (obj.name as string) || JSON.stringify(caseworker);
  }
  return String(caseworker);
};

export const ContactsQuickReference = ({ youth }: ContactsQuickReferenceProps) => {
  const rows: ContactRow[] = [
    { label: "Probation Officer", name: youth.probationContact, phone: youth.probationPhone },
    { label: "Caseworker", name: parseCaseworkerName(youth.caseworker), phone: null },
    { label: "Attorney", name: youth.attorney, phone: null },
    { label: "Therapist", name: youth.therapistName, phone: youth.therapistContact },
    { label: "Guardian", name: youth.guardianContact, phone: youth.guardianPhone },
    { label: "School Contact", name: youth.schoolContact, phone: youth.schoolPhone },
  ].filter((row) => (row.name && row.name.trim()) || (row.phone && row.phone.trim()));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Phone size={16} className="text-red-700" />
          Key Contacts
        </CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No contacts on file.</p>
        ) : (
          <div className="space-y-3">
            {rows.map((row) => (
              <div key={row.label}>
                <p className="text-[11px] text-gray-500 uppercase tracking-wide">{row.label}</p>
                {row.name && <p className="text-sm font-medium leading-tight">{row.name}</p>}
                {row.phone && row.phone.trim() && (
                  <a
                    href={`tel:${row.phone.replace(/\s/g, "")}`}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {row.phone}
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
