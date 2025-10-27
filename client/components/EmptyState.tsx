import { FileQuestion } from "lucide-react";
import { Button } from "./ui/button";

interface EmptyStateProps {
  onClearFilters: () => void;
}

export default function EmptyState({ onClearFilters }: EmptyStateProps) {
  return (
    <tr>
      <td colSpan={6} className="px-6 py-16">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <FileQuestion className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-[#0F172A] mb-2">
            Tidak ada pengguna ditemukan
          </h3>
          <p className="text-[#64748B] mb-4">
            Coba sesuaikan filter atau pencarian Anda
          </p>
          <Button onClick={onClearFilters} variant="outline">
            Bersihkan Filter
          </Button>
        </div>
      </td>
    </tr>
  );
}