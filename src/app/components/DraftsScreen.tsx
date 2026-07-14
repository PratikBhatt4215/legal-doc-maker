import { useState, useEffect } from "react";
import { FileText, Trash2, ChevronRight, ArrowLeft, Clock, FolderOpen } from "lucide-react";
import { getAllDrafts, deleteDraft, Draft } from "../../lib/draftStorage";
import { storage } from "../../lib/storage";

interface DraftsScreenProps {
  onBack: () => void;
  onOpenDraft: (draft: Draft) => void;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export function DraftsScreen({ onBack, onOpenDraft }: DraftsScreenProps) {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const isHi = storage.loadLanguage() === "hi";

  const reload = () => setDrafts(getAllDrafts());

  useEffect(() => { reload(); }, []);

  const handleDelete = (id: string) => {
    deleteDraft(id);
    setConfirmDelete(null);
    reload();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", background: "#f8fafc" }}>
      {/* Header */}
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
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
            {isHi ? "मेरे ड्राफ्ट" : "My Drafts"}
          </h1>
          <p style={{ margin: 0, fontSize: 12, opacity: 0.75 }}>
            {isHi 
              ? `${drafts.length} सहेजा हुआ ड्राफ्ट` 
              : `${drafts.length} saved draft${drafts.length !== 1 ? "s" : ""}`}
          </p>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
        {drafts.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60vh", gap: 16, color: "#94a3b8" }}>
            <div style={{ width: 80, height: 80, borderRadius: 20, background: "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <FolderOpen size={36} color="#94a3b8" />
            </div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#64748b" }}>
              {isHi ? "अभी तक कोई ड्राफ्ट नहीं" : "No Drafts Yet"}
            </h3>
            <p style={{ margin: 0, fontSize: 14, textAlign: "center", color: "#94a3b8", maxWidth: 240 }}>
              {isHi 
                ? "एक टेम्पलेट खोलें, अपने संपादन करें, और इसे यहां सहेजने के लिए 'ड्राफ्ट के रूप में सहेजें' पर टैप करें।"
                : "Open a template, make your edits, and tap \"Save as Draft\" to save it here."}
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {drafts.map((draft) => (
              <div
                key={draft.id}
                style={{
                  background: "white", borderRadius: 16,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                  border: "1px solid #f1f5f9",
                  overflow: "hidden",
                }}
              >
                <button
                  onClick={() => onOpenDraft(draft)}
                  style={{
                    width: "100%", background: "transparent", border: "none",
                    padding: "16px", display: "flex", alignItems: "center", gap: 12,
                    cursor: "pointer", textAlign: "left",
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
                      {draft.templateName}
                    </p>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                      <Clock size={11} color="#94a3b8" />
                      <span style={{ fontSize: 11, color: "#94a3b8" }}>{formatDate(draft.savedAt)}</span>
                    </div>
                  </div>
                  <ChevronRight size={18} color="#cbd5e1" />
                </button>

                {/* Delete button */}
                <div style={{ borderTop: "1px solid #f8fafc", padding: "8px 16px", display: "flex", justifyContent: "flex-end" }}>
                  {confirmDelete === draft.id ? (
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: "#64748b" }}>
                        {isHi ? "इस ड्राफ्ट को हटाएं?" : "Delete this draft?"}
                      </span>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        style={{ fontSize: 12, color: "#64748b", background: "#f1f5f9", border: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}
                      >
                        {isHi ? "रद्द करें" : "Cancel"}
                      </button>
                      <button
                        onClick={() => handleDelete(draft.id)}
                        style={{ fontSize: 12, color: "white", background: "#ef4444", border: "none", borderRadius: 6, padding: "4px 10px", fontWeight: 700, cursor: "pointer" }}
                      >
                        {isHi ? "हटाएं" : "Delete"}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(draft.id)}
                      style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#ef4444", background: "transparent", border: "none", cursor: "pointer", padding: "4px 0" }}
                    >
                      <Trash2 size={13} /> {isHi ? "हटाएं" : "Delete"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
