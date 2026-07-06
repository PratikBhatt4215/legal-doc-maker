import { useState, useEffect } from "react";
import { FileText, Trash2, ChevronRight, ArrowLeft, Clock, FolderOpen, FileUp } from "lucide-react";
import { getAllUploadedFiles, saveUploadedFile, deleteUploadedFile, UploadedFileRecord } from "../../lib/uploadedFileStorage";
import { toast } from "sonner";

interface UploadedFilesProps {
  onBack: () => void;
  onOpenFileRecord: (record: UploadedFileRecord) => void;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export function UploadedFiles({ onBack, onOpenFileRecord }: UploadedFilesProps) {
  const [files, setFiles] = useState<UploadedFileRecord[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const isHi = storage.loadLanguage() === "hi";

  const reload = () => setFiles(getAllUploadedFiles());

  useEffect(() => {
    reload();
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".docx")) {
      toast.error(isHi ? "कृपया एक मान्य वर्ड दस्तावेज़ (.docx) चुनें" : "Please select a valid Word document (.docx)");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const arrayBuffer = event.target?.result as ArrayBuffer;
        const uint8Array = new Uint8Array(arrayBuffer);
        
        // Convert to Base64 manually to be extremely safe and fast
        let binary = "";
        const len = uint8Array.byteLength;
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(uint8Array[i]);
        }
        const base64 = btoa(binary);

        saveUploadedFile(file.name, base64);
        toast.success(isHi ? "दस्तावेज़ सफलतापूर्वक अपलोड किया गया!" : "Document uploaded successfully!");
        reload();
      } catch (err) {
        toast.error(isHi ? "दस्तावेज़ फ़ाइल को प्रोसेस करने में विफल।" : "Failed to process document file.");
        console.error(err);
      }
    };
    reader.onerror = () => {
      toast.error(isHi ? "दस्तावेज़ फ़ाइल पढ़ने में त्रुटि।" : "Error reading document file.");
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDelete = (id: string) => {
    deleteUploadedFile(id);
    setConfirmDelete(null);
    toast.success(isHi ? "दस्तावेज़ स्थायी रूप से हटा दिया गया।" : "Document deleted permanently.");
    reload();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", background: "#f8fafc" }}>
      {/* Premium Header consistent with App Theme */}
      <div style={{
        background: "#0f4ba8", color: "white",
        padding: "16px 16px 20px",
        display: "flex", alignItems: "center", gap: 12,
        flexShrink: 0,
        boxShadow: "0 4px 12px rgba(15, 75, 168, 0.15)",
      }}>
        <button
          onClick={onBack}
          style={{
            background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 10,
            padding: 8, color: "white", cursor: "pointer", display: "flex",
            alignItems: "center", justifyContent: "center"
          }}
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
            {isHi ? "मेरे कस्टम दस्तावेज़" : "My Custom Documents"}
          </h1>
          <p style={{ margin: 0, fontSize: 12, opacity: 0.75 }}>
            {isHi 
              ? `${files.length} दस्तावेज़ अपलोड किए गए` 
              : `${files.length} document${files.length !== 1 ? "s" : ""} uploaded`}
          </p>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px", paddingBottom: "32px" }}>
        
        {/* Upload Custom File Premium Card */}
        <div style={{
          background: "linear-gradient(135deg, #0f4ba8 0%, #1e3a5f 100%)",
          color: "white", borderRadius: 20, padding: "20px",
          marginBottom: 20, boxShadow: "0 8px 20px rgba(15, 75, 168, 0.12)",
          position: "relative", overflow: "hidden"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: "rgba(255, 255, 255, 0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0
            }}>
              <FileUp size={22} color="white" />
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 700 }}>
                {isHi ? "नया .docx अपलोड करें" : "Upload New .docx"}
              </h3>
              <p style={{ margin: 0, fontSize: 11, opacity: 0.85 }}>
                {isHi ? "संपादित करने के लिए अपने डिवाइस से एक दस्तावेज़ चुनें" : "Select a document from your device to edit"}
              </p>
            </div>
            
            <label style={{
              background: "white", color: "#0f4ba8", border: "none",
              borderRadius: 10, padding: "8px 14px", fontSize: 12,
              fontWeight: 700, cursor: "pointer", display: "inline-block",
              boxShadow: "0 4px 10px rgba(0,0,0,0.1)", textAlign: "center"
            }}>
              {isHi ? "अपलोड करें" : "Upload File"}
              <input
                type="file"
                accept=".docx"
                onChange={handleFileUpload}
                style={{ display: "none" }}
              />
            </label>
          </div>
        </div>

        {files.length === 0 ? (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", height: "50vh", gap: 16, color: "#94a3b8"
          }}>
            <div style={{
              width: 80, height: 80, borderRadius: 20,
              background: "#e2e8f0", display: "flex", alignItems: "center",
              justifyContent: "center"
            }}>
              <FolderOpen size={36} color="#94a3b8" />
            </div>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#64748b" }}>
              {isHi ? "कोई कस्टम अपलोड नहीं" : "No Custom Uploads"}
            </h3>
            <p style={{ margin: 0, fontSize: 13, textAlign: "center", color: "#94a3b8", maxWidth: 260 }}>
              {isHi 
                ? "संपादक के अंदर देखने, संपादित करने और विवरण भरने के लिए अपने फोन स्टोरेज से कोई भी मानक कानूनी वर्ड (.docx) फ़ाइल अपलोड करें।"
                : "Upload any standard legal Word (.docx) file from your phone storage to view, edit, and fill details inside the editor."}
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <h4 style={{ margin: "0 0 4px", fontSize: 12, fontWeight: 700, color: "#64748b", letterSpacing: "0.5px" }}>
              {isHi ? "हाल के अपलोड" : "RECENT UPLOADS"}
            </h4>
            
            {files.map((file) => (
              <div
                key={file.id}
                style={{
                  background: "white", borderRadius: 16,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                  border: "1px solid #f1f5f9",
                  overflow: "hidden",
                }}
              >
                <button
                  onClick={() => onOpenFileRecord(file)}
                  style={{
                    width: "100%", background: "transparent", border: "none",
                    padding: "14px 16px", display: "flex", alignItems: "center", gap: 12,
                    cursor: "pointer", textAlign: "left",
                  }}
                >
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: "#eff6ff", flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <FileText size={18} color="#2563eb" />
                  </div>
                  
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      margin: 0, fontSize: 14, fontWeight: 700, color: "#1e293b",
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
                    }}>
                      {file.name}
                    </p>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                      <Clock size={11} color="#94a3b8" />
                      <span style={{ fontSize: 11, color: "#94a3b8" }}>{formatDate(file.uploadedAt)}</span>
                    </div>
                  </div>
                  
                  <ChevronRight size={18} color="#cbd5e1" />
                </button>

                {/* Confirm Guarded Deletion Bar */}
                <div style={{
                  borderTop: "1px solid #f8fafc", padding: "8px 16px",
                  display: "flex", justifyContent: "flex-end", background: "#fafafa"
                }}>
                  {confirmDelete === file.id ? (
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: "#64748b" }}>
                        {isHi ? "स्थायी रूप से हटाएं?" : "Delete permanently?"}
                      </span>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        style={{
                          fontSize: 11, color: "#64748b", background: "#f1f5f9",
                          border: "none", borderRadius: 6, padding: "4px 8px",
                          cursor: "pointer", fontWeight: 600
                        }}
                      >
                        {isHi ? "रद्द करें" : "Cancel"}
                      </button>
                      <button
                        onClick={() => handleDelete(file.id)}
                        style={{
                          fontSize: 11, color: "white", background: "#ef4444",
                          border: "none", borderRadius: 6, padding: "4px 8px",
                          fontWeight: 700, cursor: "pointer"
                        }}
                      >
                        {isHi ? "हटाएं" : "Delete"}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(file.id)}
                      style={{
                        display: "flex", alignItems: "center", gap: 4,
                        fontSize: 11, color: "#ef4444", background: "transparent",
                        border: "none", cursor: "pointer", padding: "4px 0",
                        fontWeight: 600
                      }}
                    >
                      <Trash2 size={12} /> {isHi ? "फ़ाइल हटाएं" : "Delete File"}
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
