import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import ClienteFormFields from "@/components/ClienteFormFields";
import { atualizarCliente } from "../actions";
import type { Cliente } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EditarClientePage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data } = await supabase.from("clientes").select("*").eq("id", params.id).single();

  if (!data) notFound();
  const cliente = data as Cliente;
  const acao = atualizarCliente.bind(null, cliente.id);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/admin/clientes" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>
      <h1 className="text-2xl font-bold text-slate-900">Editar morador</h1>

      <form action={acao} className="card space-y-6">
        <ClienteFormFields cliente={cliente} />
        <div className="flex justify-end gap-2">
          <Link href="/admin/clientes" className="btn-outline">Cancelar</Link>
          <button type="submit" className="btn-primary">Salvar alterações</button>
        </div>
      </form>
    </div>
  );
}
