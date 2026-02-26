
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

const parseContact = (contact: unknown): { name: string | null, phone: string | null } => {
  if (!contact) return { name: null, phone: null };
  
  if (typeof contact === "string") {
    try {
      const parsed = JSON.parse(contact);
      return { 
        name: parsed?.name || contact, 
        phone: parsed?.phone || null 
      };
    } catch {
      return { name: contact, phone: null };
    }
  }
  
  if (typeof contact === "object") {
    const obj = contact as Record<string, unknown>;
    const name = typeof obj.name === "string" && obj.name.trim() ? obj.name.trim() : null;
    return {
      name,
      phone: (obj.phone as string) || null
    };
  }

  return { name: String(contact), phone: null };
};

export const ContactsQuickReference = ({ youth }: ContactsQuickReferenceProps) => {
  const po = parseContact(youth.probationOfficer);
  const cw = parseContact(youth.caseworker);
  const lg = parseContact(youth.legalGuardian);
  const mother = parseContact(youth.mother);
  const father = parseContact(youth.father);

  const rows: ContactRow[] = [
    { label: "Probation Officer", name: po.name || youth.probationContact, phone: po.phone || youth.probationPhone },
    { label: "Caseworker", name: cw.name, phone: cw.phone },
    { label: "Legal Guardian", name: lg.name || youth.guardianContact, phone: lg.phone || youth.guardianPhone },
    { label: "Mother", name: mother.name, phone: mother.phone },
    { label: "Father", name: father.name, phone: father.phone },
    { label: "Attorney", name: youth.attorney, phone: null },
    { label: "Therapist", name: youth.therapistName, phone: youth.therapistContact },
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
