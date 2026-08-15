import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { criarLead } from "../actions";

export default function NovoLeadPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/admin/leads" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>
      <h1 className="text-2xl font-bold text-white">Novo lead</h1>

      <form action={criarLead} className="card space-y-5">
        <div>
          <label className="label" htmlFor="nome">Nome / Empresa *</label>
          <input id="nome" name="nome" className="input" required />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="segmento">Segmento</label>
            <select id="segmento" name="segmento" className="input" defaultValue="COMERCIAL">
              <option value="COMERCIAL">Comercial</option>
              <option value="INDUSTRIAL">Industrial</option>
              <option value="RESIDENCIAL">Residencial</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="cidade">Cidade</label>
            <input id="cidade" name="cidade" className="input" defaultValue="Recife" />
          </div>
          <div>
            <label className="label" htmlFor="estado">UF</label>
            <input id="estado" name="estado" className="input" defaultValue="PE" />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="bairro">Bairro</label>
            <input id="bairro" name="bairro" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="subsegmento">Subsegmento / ramo</label>
            <input id="subsegmento" name="subsegmento" className="input" placeholder="Ex.: Padaria, Mercado..." />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="endereco">Endereço</label>
            <input id="endereco" name="endereco" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="cep">CEP</label>
            <input id="cep" name="cep" className="input" />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="whatsapp">WhatsApp (só dígitos)</label>
            <input id="whatsapp" name="whatsapp" className="input" placeholder="5581999998888" />
          </div>
          <div>
            <label className="label" htmlFor="telefone">Telefone</label>
            <input id="telefone" name="telefone" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="email">E-mail</label>
            <input id="email" name="email" type="email" className="input" />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="consumo_estimado_kwh">Consumo estimado (kWh/mês)</label>
            <input id="consumo_estimado_kwh" name="consumo_estimado_kwh" type="number" min={0} step={1} className="input" defaultValue={0} />
          </div>
          <div>
            <label className="label" htmlFor="lead_score">Score (0–100)</label>
            <input id="lead_score" name="lead_score" type="number" min={0} max={100} className="input" defaultValue={50} />
          </div>
          <div>
            <label className="label" htmlFor="prioridade_operacional">Prioridade (0–100)</label>
            <input id="prioridade_operacional" name="prioridade_operacional" type="number" min={0} max={100} className="input" defaultValue={50} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="latitude">Latitude (opcional)</label>
            <input id="latitude" name="latitude" type="number" step="0.000001" className="input" placeholder="-8.055" />
          </div>
          <div>
            <label className="label" htmlFor="longitude">Longitude (opcional)</label>
            <input id="longitude" name="longitude" type="number" step="0.000001" className="input" placeholder="-34.90" />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="website">Website</label>
          <input id="website" name="website" className="input" placeholder="https://..." />
        </div>

        <div>
          <label className="label" htmlFor="observacoes">Observações</label>
          <input id="observacoes" name="observacoes" className="input" />
        </div>

        <div className="flex justify-end gap-2">
          <Link href="/admin/leads" className="btn-outline">Cancelar</Link>
          <button type="submit" className="btn-primary">Salvar lead</button>
        </div>
      </form>
    </div>
  );
}
