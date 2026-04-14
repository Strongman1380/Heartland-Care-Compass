import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download, FileText, Edit, Save, X } from "lucide-react";
import { exportHTMLToPDF, exportHTMLToDocx } from "@/utils/export";
import { useToast } from "@/hooks/use-toast";

interface ReportPrintPreviewProps {
  open: boolean;
  onClose: () => void;
  html: string;
  filename: string;
}

export const ReportPrintPreview = ({ open, onClose, html, filename }: ReportPrintPreviewProps) => {
  const [editing, setEditing] = useState(false);
  const [editedHtml, setEditedHtml] = useState(html);
  const contentRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const currentHtml = editing ? editedHtml : html;

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head><title>${filename}</title></head>
          <body onload="window.print(); window.close();">${currentHtml}</body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const handleDownloadPDF = async () => {
    try {
      await exportHTMLToPDF(currentHtml, `${filename}.pdf`);
      toast({ title: "PDF Downloaded", description: `${filename}.pdf saved.` });
    } catch {
      toast({ title: "Error", description: "Failed to export PDF.", variant: "destructive" });
    }
  };

  const handleDownloadDocx = async () => {
    try {
      await exportHTMLToDocx(currentHtml, `${filename}.docx`);
      toast({ title: "DOCX Downloaded", description: `${filename}.docx saved.` });
    } catch {
      toast({ title: "Error", description: "Failed to export DOCX.", variant: "destructive" });
    }
  };

  const handleToggleEdit = () => {
    if (editing && contentRef.current) {
      setEditedHtml(contentRef.current.innerHTML);
    }
    setEditing(!editing);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-3 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg">{filename}</DialogTitle>
              <DialogDescription className="sr-only">
                Preview, edit, print, or export the generated report.
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={handleToggleEdit}>
                {editing ? <Save className="h-4 w-4 mr-1" /> : <Edit className="h-4 w-4 mr-1" />}
                {editing ? "Save Edits" : "Edit"}
              </Button>
              <Button size="sm" variant="outline" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-1" />
                Print
              </Button>
              <Button size="sm" variant="outline" onClick={handleDownloadPDF}>
                <Download className="h-4 w-4 mr-1" />
                PDF
              </Button>
              <Button size="sm" variant="outline" onClick={handleDownloadDocx}>
                <FileText className="h-4 w-4 mr-1" />
                DOCX
              </Button>
              <Button size="sm" variant="ghost" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div
            ref={contentRef}
            className="prose prose-sm max-w-none bg-white p-8 rounded-lg shadow-inner border"
            contentEditable={editing}
            suppressContentEditableWarning
            dangerouslySetInnerHTML={{ __html: currentHtml }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
