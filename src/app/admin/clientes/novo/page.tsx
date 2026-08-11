import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ClienteFormFields from "@/components/ClienteFormFields";
import { criarCliente } from "../actions";

export default function NovoClientePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/admin/clientes" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>
      <h1 className="text-2xl font-bold text-white">Novo morador</h1>

      <form action={criarCliente} className="card space-y-6">
        <ClienteFormFields />
        <div className="flex justify-end gap-2">
          <Link href="/admin/clientes" className="btn-outline">Cancelar</Link>
          <button type="submit" className="btn-primary">Salvar morador</button>
        </div>
      </form>
    </div>
  );
}
