import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ScannerForm from "@/components/ScannerForm";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default function ScannerPage() {
  return (
    <div className="space-y-5">
      <Link href="/admin/leads" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Central de Leads
      </Link>
      <div>
        <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>🔍 Scanner de prospecção</h1>
        <p className="text-sm text-slate-400">Encontre estabelecimentos reais (OpenStreetMap) e transforme em leads da Lorenergia.</p>
      </div>
      <ScannerForm />
    </div>
  );
}
