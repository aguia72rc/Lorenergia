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

      <div className="sm:col-span-2">
        <label className="label" htmlFor="endereco">Endereço</label>
        <input id="endereco" name="endereco" className="input" placeholder="Rua José Paes de Barros, 156, Apt 04" defaultValue={cliente?.endereco ?? ""} />
      </div>

      <div>
        <label className="label" htmlFor="cidade_uf">Cidade / UF</label>
        <input id="cidade_uf" name="cidade_uf" className="input" placeholder="Recife - PE" defaultValue={cliente?.cidade_uf ?? ""} />
      </div>

      <div>
        <label className="label" htmlFor="cep">CEP</label>
        <input id="cep" name="cep" className="input" placeholder="51011-420" defaultValue={cliente?.cep ?? ""} />
      </div>

      <div>
        <label className="label" htmlFor="numero_medidor">Nº do medidor</label>
        <input id="numero_medidor" name="numero_medidor" className="input" defaultValue={cliente?.numero_medidor ?? ""} />
      </div>

      <div>
        <label className="label" htmlFor="tipo_ligacao">Tipo de ligação</label>
        <select id="tipo_ligacao" name="tipo_ligacao" className="input" defaultValue={cliente?.tipo_ligacao ?? ""}>
          <option value="">—</option>
          <option value="Monofásico">Monofásico</option>
          <option value="Bifásico">Bifásico</option>
          <option value="Trifásico">Trifásico</option>
        </select>
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
        <label className="flex items-center gap-2 text-sm font-medium text-slate-200">
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
