import { createClient } from "@/lib/supabase/server";
import { salvarConfiguracoes } from "./actions";
import type { Configuracoes } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ConfiguracoesPage() {
  const supabase = createClient();
  const { data } = await supabase.from("configuracoes").select("*").eq("id", 1).single();
  const cfg = data as Configuracoes;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Configurações</h1>
        <p className="text-sm text-slate-500">Parâmetros usados no cálculo e no envio das faturas.</p>
      </div>

      <form action={salvarConfiguracoes} className="card space-y-5">
        <div>
          <label className="label" htmlFor="nome_usina">Nome da usina</label>
          <input id="nome_usina" name="nome_usina" className="input" defaultValue={cfg?.nome_usina ?? ""} />
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Tarifas padrão (R$/kWh)</p>
          <div className="grid gap-4 sm:grid-cols-4">
            <div>
              <label className="label" htmlFor="tarifa_tusd">TUSD</label>
              <input id="tarifa_tusd" name="tarifa_tusd" type="number" min={0} step={0.00001} className="input" defaultValue={cfg?.tarifa_tusd ?? 0} />
            </div>
            <div>
              <label className="label" htmlFor="tarifa_te">TE</label>
              <input id="tarifa_te" name="tarifa_te" type="number" min={0} step={0.00001} className="input" defaultValue={cfg?.tarifa_te ?? 0} />
            </div>
            <div>
              <label className="label" htmlFor="adicional_bandeira">Adic. bandeira</label>
              <input id="adicional_bandeira" name="adicional_bandeira" type="number" min={0} step={0.00001} className="input" defaultValue={cfg?.adicional_bandeira ?? 0} />
            </div>
            <div>
              <label className="label" htmlFor="fio_b">Fio-B TUSD GII</label>
              <input id="fio_b" name="fio_b" type="number" min={0} step={0.00001} className="input" defaultValue={cfg?.fio_b ?? 0} />
            </div>
          </div>
          <p className="mt-1 text-xs text-slate-400">Valores por kWh cobrados pela distribuidora. O desconto incide sobre TUSD + TE + bandeira.</p>
        </div>

        <div>
          <label className="label" htmlFor="taxa_iluminacao_publica">Iluminação pública padrão (R$)</label>
          <input id="taxa_iluminacao_publica" name="taxa_iluminacao_publica" type="number" min={0} step={0.01} className="input" defaultValue={cfg?.taxa_iluminacao_publica ?? 0} />
        </div>

        <div>
          <label className="label" htmlFor="dados_pagamento">Dados de pagamento (PIX / instruções)</label>
          <textarea id="dados_pagamento" name="dados_pagamento" rows={2} className="input" placeholder="Ex.: PIX (chave): seu-email@exemplo.com" defaultValue={cfg?.dados_pagamento ?? ""} />
        </div>

        <div>
          <label className="label" htmlFor="mensagem_whatsapp">Mensagem do WhatsApp</label>
          <textarea id="mensagem_whatsapp" name="mensagem_whatsapp" rows={8} className="input font-mono text-xs" defaultValue={cfg?.mensagem_whatsapp ?? ""} />
          <div className="mt-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
            <p className="mb-1 font-medium text-slate-600">Variáveis disponíveis:</p>
            <p><code>{"{nome}"}</code>, <code>{"{referencia}"}</code>, <code>{"{consumo}"}</code>, <code>{"{valor}"}</code>, <code>{"{economia}"}</code>, <code>{"{vencimento}"}</code>, <code>{"{link}"}</code></p>
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" className="btn-primary">Salvar configurações</button>
        </div>
      </form>
    </div>
  );
}
