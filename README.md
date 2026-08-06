# ☀️ Lorenergia

Sistema de gestão e distribuição de **energia solar** para condomínios/prédios.
Cadastre os moradores, calcule o consumo de cada um, gere faturas com desconto e
envie pelo **WhatsApp**. Os moradores acessam um portal para ver suas faturas e
**quanto economizaram** usando energia solar.

Construído com **Next.js 14** + **Supabase** (banco de dados, autenticação e
segurança por linha) + **Tailwind CSS**.

---

## ✨ Funcionalidades

- **Cadastro de moradores** (nome, unidade, WhatsApp, e-mail, % de desconto).
- **Cálculo automático** do valor a pagar a partir do consumo informado, aplicando
  o desconto (até 20% ou o que você definir).
- **Geração de faturas** com prévia do cálculo em tempo real.
- **Envio pelo WhatsApp** com um clique (link `wa.me`, gratuito). Mensagem
  totalmente personalizável. Código pronto para a API Oficial (Meta) quando quiser.
- **Portal do morador**: cada pessoa acessa apenas as próprias faturas e vê a
  economia total acumulada.
- **Fatura em PDF**: página bonita que o morador imprime/salva como PDF.
- **Segurança**: cada morador só vê os próprios dados (Row Level Security do Supabase).

---

## 🧮 Como o cálculo funciona

```
valor_cheio   = consumo_kwh × tarifa_kwh (+ iluminação pública)
desconto      = valor_cheio × (% desconto / 100)
valor_a_pagar = valor_cheio − desconto
economia      = desconto
```

O morador paga o **valor com desconto** para a usina, e a **economia** é o quanto
ele deixou de pagar em relação à distribuidora tradicional.

---

## 🚀 Passo a passo para colocar no ar

### 1. Crie o projeto no Supabase
1. Acesse [supabase.com](https://supabase.com) e crie um projeto (plano gratuito serve).
2. No menu **SQL Editor**, cole e execute o conteúdo de
   [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql).
3. (Opcional) Execute [`supabase/seed.sql`](supabase/seed.sql) para criar dados de teste.

### 2. Configure as variáveis de ambiente
Copie `.env.example` para `.env.local` e preencha com os dados do seu projeto
(em **Supabase → Project Settings → API**):

```bash
cp .env.example .env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=chave-anon
SUPABASE_SERVICE_ROLE_KEY=chave-service-role   # usada só p/ convidar moradores
```

### 3. Rode localmente
```bash
npm install
npm run dev
```
Abra <http://localhost:3000>.

### 4. Crie sua conta de administrador (dono)
1. Acesse `/login` e entre com seu e-mail (use "Entrar com link por e-mail"),
   **ou** crie o usuário em **Supabase → Authentication → Users**.
2. Torne-se admin: edite o e-mail em
   [`supabase/tornar-admin.sql`](supabase/tornar-admin.sql) e rode no SQL Editor.
3. Faça login novamente — você cairá no painel `/admin`.

### 5. Use o sistema
- **Moradores**: cadastre em *Painel → Moradores*. Informe o WhatsApp (formato
  `55` + DDD + número) e o e-mail (para o morador acessar o portal).
- **Faturas**: em *Faturas → Nova fatura*, escolha o morador, o mês e digite o
  consumo (kWh). O sistema calcula tudo. Clique em **Gerar fatura**.
- **WhatsApp**: na lista de faturas, clique no botão verde do WhatsApp — abre o
  app com a mensagem e a fatura prontas.
- **Convidar morador ao portal**: na lista de moradores, clique no ícone de
  enviar (✉️) para mandar um convite por e-mail (requer `SUPABASE_SERVICE_ROLE_KEY`).

---

## 🌐 Publicar (deploy) na Vercel

1. Suba este repositório no GitHub.
2. Em [vercel.com](https://vercel.com), importe o repositório.
3. Em **Settings → Environment Variables**, adicione as mesmas variáveis do
   `.env.local` (inclua `NEXT_PUBLIC_SITE_URL` com a URL final do site, ex.:
   `https://sua-usina.vercel.app`).
4. Deploy. Pronto! 🎉

> No Supabase, em **Authentication → URL Configuration**, adicione a URL do site
> em *Site URL* e *Redirect URLs* (ex.: `https://sua-usina.vercel.app/auth/callback`).

---

## 📱 WhatsApp automático (opcional)

Por padrão o envio usa links `wa.me` (grátis, um clique). Para envio 100%
automático via **WhatsApp Cloud API (Meta)**:

1. Tenha uma conta WhatsApp Business + número verificado no Meta for Developers.
2. Preencha `WHATSAPP_CLOUD_API_TOKEN` e `WHATSAPP_PHONE_NUMBER_ID` no ambiente.
3. A função `enviarViaCloudApi` em [`src/lib/whatsapp.ts`](src/lib/whatsapp.ts) já
   está pronta para ser plugada.

---

## 🗂️ Estrutura do projeto

```
supabase/
  migrations/0001_init.sql   # schema + RLS
  seed.sql                   # dados de exemplo (opcional)
  tornar-admin.sql           # vira admin
src/
  app/
    page.tsx                 # landing
    login/                   # login (senha ou link mágico)
    admin/                   # área do dono (painel, moradores, faturas, config)
    portal/                  # área do morador (faturas + economia)
    fatura/[id]/             # fatura imprimível (admin e morador)
  components/                # UI reutilizável
  lib/
    calc.ts                  # regra de cálculo
    whatsapp.ts              # montagem da mensagem + wa.me / Cloud API
    supabase/                # clientes Supabase (browser/server/admin)
```

---

## 🔒 Segurança

- O acesso é protegido por **RLS**: administradores enxergam tudo; cada morador
  enxerga **apenas as próprias faturas e dados**.
- A chave `service_role` **nunca** é exposta no navegador — só é usada em ações
  do servidor (ex.: convidar moradores).

---

Feito com ☀️ para democratizar a energia solar.
