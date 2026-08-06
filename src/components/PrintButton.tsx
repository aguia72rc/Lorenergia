"use client";

import { Printer } from "lucide-react";

export default function PrintButton() {
  return (
    <button onClick={() => window.print()} className="btn-outline no-print">
      <Printer className="h-4 w-4" /> Imprimir / Salvar PDF
    </button>
  );
}
