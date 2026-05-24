import { ArrowLeft, FileText } from "lucide-react";

interface SavedPDFsProps {
  onBack: () => void;
}

export function SavedPDFs({ onBack }: SavedPDFsProps) {
  return (
    <div className="min-h-screen bg-[#fafafa]">

      <div className="bg-[#0f4ba8] text-white px-4 py-4 flex items-center gap-4">
        <button onClick={onBack}>
          <ArrowLeft className="w-6 h-6" />
        </button>

        <h1 className="text-xl font-semibold">
          Saved PDFs
        </h1>
      </div>

      <div className="p-6 flex flex-col items-center justify-center text-center mt-20">
        <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center mb-4">
          <FileText className="w-10 h-10 text-[#0f4ba8]" />
        </div>

        <h2 className="text-xl font-bold text-[#1e3a5f] mb-2">
          No PDFs Yet
        </h2>

        <p className="text-gray-500">
          Exported PDFs will appear here.
        </p>
      </div>
    </div>
  );
}