import { useState, useEffect } from "react";
import { ArrowLeft, FileText, Share2, Calendar } from "lucide-react";
import { getAllPDFExports, PDFExportRecord } from "../../lib/pdfStorage";
import { Share } from "@capacitor/share";
import { toast } from "sonner";

interface SavedPDFsProps {
  onBack: () => void;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export function SavedPDFs({ onBack }: SavedPDFsProps) {
  const [exports, setExports] = useState<PDFExportRecord[]>([]);

  useEffect(() => {
    setExports(getAllPDFExports());
  }, []);

  const handleShare = async (record: PDFExportRecord) => {
    try {
      await Share.share({
        title: record.templateName,
        text: `Check out my exported legal document: ${record.templateName}`,
        dialogTitle: "Share PDF Document",
      });
    } catch (e) {
      toast.error("Sharing not supported or cancelled.");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", background: "#f8fafc" }}>
      {/* Native Blue Header consistent with Drafts/Profile */}
      <div style={{
        background: "#0f4ba8", color: "white",
        padding: "16px 16px 20px",
        display: "flex", alignItems: "center", gap: 12,
        flexShrink: 0,
      }}>
        <button
          onClick={onBack}
          style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 10, padding: 8, color: "white", cursor: "pointer" }}
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Saved PDFs</h1>
          <p style={{ margin: 0, fontSize: 12, opacity: 0.75 }}>{exports.length} exported document{exports.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
        {exports.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justify: "center", height: "60vh", gap: 16, color: "#94a3b8" }}>
            <div style={{ width: 80, height: 80, borderRadius: 20, background: "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <FileText size={36} color="#94a3b8" />
            </div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#64748b" }}>No Saved PDFs</h3>
            <p style={{ margin: 0, fontSize: 14, textAlign: "center", color: "#94a3b8", maxWidth: 240 }}>
              Export a template as a PDF from the Editor, and your files will be listed here.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {exports.map((item) => (
              <div
                key={item.id}
                style={{
                  background: "white", borderRadius: 16,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                  border: "1px solid #f1f5f9",
                  padding: "16px", display: "flex", alignItems: "center", gap: 12,
                }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: "#eff6ff", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <FileText size={20} color="#2563eb" />
                </div>
                
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#1e293b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {item.templateName}
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                    <Calendar size={11} color="#94a3b8" />
                    <span style={{ fontSize: 11, color: "#94a3b8" }}>{formatDate(item.exportedAt)}</span>
                  </div>
                  <div style={{ fontSize: 10, color: "#2563eb", fontWeight: 700, marginTop: 4 }}>
                    ID: {item.paymentId} (Paid: {item.amountPaid})
                  </div>
                </div>

                <button
                  onClick={() => handleShare(item)}
                  style={{
                    background: "#f1f5f9", border: "none", borderRadius: 10,
                    padding: 8, color: "#475569", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center"
                  }}
                >
                  <Share2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}