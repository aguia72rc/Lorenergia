import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import ClienteRowActions from "@/components/ClienteRowActions";
import type { Cliente } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ClientesPage() {
  const supabase = createClient();
  const { data: clientes } = await supabase
    .from("clientes")
    .select("*")
    .order("nome", { ascending: true });

  const lista = (clientes ?? []) as Cliente[];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Moradores</h1>
          <p className="text-sm text-slate-500">{lista.length} cadastrado(s)</p>
        </div>
        <Link href="/admin/clientes/novo" className="btn-primary">
          <Plus className="h-4 w-4" /> Novo morador
        </Link>
      </div>

      {lista.length === 0 ? (
        <div className="card flex flex-col items-center py-12 text-center">
          <Users className="h-10 w-10 text-slate-300" />
          <p className="mt-3 text-slate-600">Nenhum morador cadastrado ainda.</p>
          <Link href="/admin/clientes/novo" className="btn-primary mt-4">
            <Plus className="h-4 w-4" /> Cadastrar primeiro morador
          </Link>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="pb-2 font-medium">Nome</th>
                <th className="pb-2 font-medium">Unidade</th>
                <th className="pb-2 font-medium">WhatsApp</th>
                <th className="pb-2 font-medium">Desconto</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((c) => (
                <tr key={c.id} className="border-b border-slate-100 last:border-0">
                  <td className="py-3 font-medium text-slate-900">{c.nome}</td>
                  <td className="py-3 text-slate-600">{c.unidade ?? "-"}</td>
                  <td className="py-3 text-slate-600">{c.telefone ?? "-"}</td>
                  <td className="py-3 text-slate-600">{c.desconto_percentual}%</td>
                  <td className="py-3">
                    {c.ativo ? (
                      <span className="badge bg-eco-100 text-eco-700">Ativo</span>
                    ) : (
                      <span className="badge bg-slate-200 text-slate-600">Inativo</span>
                    )}
                  </td>
                  <td className="py-3">
                    <ClienteRowActions id={c.id} temEmail={!!c.email} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
