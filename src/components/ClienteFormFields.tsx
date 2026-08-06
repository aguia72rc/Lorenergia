import type { Cliente } from "@/lib/types";

/** Campos do formulário de morador (reaproveitado em criar e editar). */
export default function ClienteFormFields({ cliente }: { cliente?: Cliente }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className="label" htmlFor="nome">Nome completo *</label>
        <input id="nome" name="nome" className="input" defaultValue={cliente?.nome ?? ""} required />
      </div>

      <div>
        <label className="label" htmlFor="unidade">Unidade / Apartamento</label>
        <input id="unidade" name="unidade" className="input" placeholder="Apto 101" defaultValue={cliente?.unidade ?? ""} />
      </div>

      <div>
        <label className="label" htmlFor="cpf">CPF</label>
        <input id="cpf" name="cpf" className="input" defaultValue={cliente?.cpf ?? ""} />
      </div>

      <div>
        <label className="label" htmlFor="email">E-mail (acesso ao portal)</label>
        <input id="email" name="email" type="email" className="input" defaultValue={cliente?.email ?? ""} />
      </div>

      <div>
        <label className="label" htmlFor="telefone">WhatsApp (com DDD)</label>
        <input id="telefone" name="telefone" className="input" placeholder="5511999998888" defaultValue={cliente?.telefone ?? ""} />
        <p className="mt-1 text-xs text-slate-400">Apenas números, com código do país (55) e DDD.</p>
      </div>

      <div>
        <label className="label" htmlFor="desconto_percentual">Desconto (%)</label>
        <input
          id="desconto_percentual"
          name="desconto_percentual"
          type="number"
          min={0}
          max={100}
          step={0.5}
          className="input"
          defaultValue={cliente?.desconto_percentual ?? 20}
        />
      </div>

      <div className="flex items-end">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input type="checkbox" name="ativo" defaultChecked={cliente?.ativo ?? true} className="h-4 w-4 rounded border-slate-300" />
          Morador ativo
        </label>
      </div>

      <div className="sm:col-span-2">
        <label className="label" htmlFor="observacoes">Observações</label>
        <textarea id="observacoes" name="observacoes" rows={2} className="input" defaultValue={cliente?.observacoes ?? ""} />
      </div>
    </div>
  );
}
