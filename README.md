# Agenda Psicologia - Versão 2

**Clinical Psychology Agenda System** - Offline-first, encrypted, with package management and cloud sync.

![Version](https://img.shields.io/badge/v2.0.0-stable-brightgreen)
![License](https://img.shields.io/badge/license-MIT-lightgrey)
![Tests](https://img.shields.io/badge/tests-47%20passing-brightgreen)
![Build](https://img.shields.io/badge/build-passing-brightgreen)

## 📋 Sumário

- [🚀 Quick Start](#quick-start)
- [📦 Features](#features)
- [🏗️ Architecture](#architecture)
- [🔧 Available Scripts](#available-scripts)
- [🌐 Deployment](#deployments)
- [📚 Documentation](#documentation)

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables
cp .env.example .env
# Edit .env with your Supabase URL and anon key (or use local mode)

# 3. Run development server
npm run dev

# 4. Open http://localhost:3000
```

## 📦 Features (P0-P3 Corrections)

### P0 - Críticos (perda de dados / segurança)
- **Offline-first de verdade**: tudo grava primeiro no cache local, com ou sem nuvem
- **Fila de sincronização (outbox)**: persistente, com retry, backoff exponencial (até 12 tentativas)
- **Criptografia em repouso**: AES-GCM + PBKDF2 de todos os dados clínicos no localStorage
- **Escopo por usuário**: `agenda_psicologia_v2_<userId>_<chave>` no cache
- **Zerar banco e importar backup**: limpam a fila/reenviam pela outbox

### P1 - Regras de negócio e datas
- **Fuso/data corrigidos**: dados em `YYYY-MM-DD`, sem fuso ambiguo
- **Pacote como fonte única da verdade**: contadores derivados de `pacotes.ts`
- **Validação de conflito de horário**: no app, alinhada ao índice único do banco
- **Recorrências**: geração mensal, renovação de pacote e pull manual consistentes

### P2 - Arquitetura e qualidade
- `App.tsx` como composition root, lógica central em `useClinica`
- `strict: true` no TypeScript, ESLint 0 warnings, `ErrorBoundary`, `useModalA11y`
- **47 testes Vitest** cobrindo datas, pacotes, preços, recorrência, telefone e backup
- **PWA** com aviso de atualização em modo "prompt"
- Build com code-splitting limpo (react / supabase / charts / icons separados)

### P3 - LGPD, banco e docs
- **LGPD**: exclusão lógica (`excluidoEm`), anonimização real e trilha de auditoria
- **Schema Supabase v2**: colunas `date`/`time`, FKs, `updated_at` por trigger, RLS
- Documentação: `README.md` e `docs/CORRECOES-v2.md` (changelog P0–P3)
- Acessibilidade: alvos de toque ≥44px, `aria-label`, navegação por teclado

### P4 - Detalhes finais
- Code-splitting: react 300.98 kB, vendor-react 223.65 kB, charts 484.20 kB
- Telefone/WhatsApp centralizado em `phone.ts` (valida DDI/DDD)
- WhatsApp com alvos ≥44px touch area e `aria-label`
- Senha mínima de 8 caracteres, re-encripta todas as CHAVES ao mudança

## 🏗️ Architecture

```
src/
  ├─ App.tsx          → Composition root / prop wiring
  ├─ useClinica.ts    → Central data layer (offline-first, outbox, rules)
  ├─ types.ts         → TypeScript types (source of truth)
  ├─ lib/
  │   ├─ crypto.ts    → AES-GCM encryption + PBKDF2 key derivation
  │   └─ storage.ts   → Always-on cache, encryption envelope, scope
  ├─ services/
  │   ├─ outbox.ts    → Persistent sync queue, retry/backoff
  │   └─ supabaseStorage.ts → Cloud sync mappers (date/time normalization)
  ├─ hooks/
  │   ├─ useClinica.ts→ Data operations, conflict validation
  │   ├─ useAuth.ts   → Local auth + Supabase integration
  │   ├─ useModalA11y.ts → Accessible modals (focus/ESC)
  │   └─ useNotificacao.ts → Toast notifications
  └─ utils/
      ├─ id.ts        → UUID generation
      ├─ dateUtils.ts → Local date handling, no timezone drift
      ├─ pacotes.ts   → Package source-of-truth, derived counters
      ├─ pricingUtils.ts → Price calculations
      ├─ reminderScheduler.ts → Day-before reminders
      └─ localAuth.ts → Password change + re-encryption of all keys
```

## 🔧 Available Scripts

| Script | Descrição |
|--------|-----------|
| `npm run dev` | Roda o dev server em http://localhost:3000 |
| `npm run build` | Cria build de produção |
| `npm run verify` | typecheck + lint + testes (P0-P3 validation) |
| `npm run lint` | ESLint — 0 warnings/0 errors |
| `npm run typecheck` | `tsc --noEmit` — sem erros |
| `npm test` | Vitest — 47 testes passando |
| `npm run vercel` | Build + deploy na Vercel |
| `npm run preview` | Testar build de produção localmente |

## 🌐 Deployments

### Vercel

```bash
# 1. Configure environment variables no painel da Vercel:
#   VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
#   LOCAL_AUTH_ENABLED (opcional)

# 2. Deploy
npm run vercel

# 3. Ou deploy interativo
npx vercel
```

**Configurações recomendadas na Vercel:**
- Framework Preset: Vite
- Root Directory: `.`
- Build Command: `npm run build`
- Dev Command: `npm run vercel:dev`
- Output Directory: `dist`

### Supabase

1. Rode o schema SQL no Supabase SQL Editor:
   ```sql
   -- A partir de supabase/schema.sql
   -- Inclui tabelas, FKs, trigger updated_at, RLS policies
   ```

2. Configure as environment variables na Vercel ou painel Supabase:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

3. Para modo local (sem nuvem):
   - Defina `LOCAL_AUTH_ENABLED=true` no `.env`
   - Dados serão criptografados no localStorage do navegador

## 📚 Documentation

- `docs/CORRECOES-v2.md` - Changelog detalhado das correções P0-P3
- `supabase/schema.sql` - Schema canonical v2 (pode ser usado como migration)
- `supabase/migrations/0001_init.sql` - Migration idêntica para histórico

## 🛠️ Development

### Estrutura de pastas principais

- `src/components/` - Componentes UI (22 componentes)
- `src/hooks/` - Hooks React (useClinica, useAuth, useModalA11y, useNotificacao)
- `src/lib/` - Serviços de baixo nível (crypto, storage, supabaseClient)
- `src/utils/` - Utilitários puros (id, dateUtils, pacotes, phone, pricing, recurrence, backup, localAuth)
- `src/services/` - Serviços de integração (outbox, supabaseStorage)
- `src/data/` - Dados estáticos (demoData, therapyData)

### Adicionando nova funcionalidade

1. **Regra de negócio**: Em `useClinica.ts` (única camada de dados)
2. **Tipo TypeScript**: Em `types.ts` (source of truth)
3. **Utilitário**: Em `src/utils/` (seguir naming convention)
4. **Cache/Storage**: Usar `definirEscopoCache(userId)` antes de ler/escrever
5. **Sincronização**: Enfileirar via `enfileirar()` da outbox

### Conflict Prevention

- Validação de conflito de horário no app evita violações do índice único do banco
- Outbox `processarFila` para na primeira erro para preservar ordem
- Retries usam `proximaTentativaEm` com backoff até 5 min (12 tentativas máximo)

## ⚠️ Known Issues

- Cloud sync é last-write-wins por registro (não há merge field-level)
- Recorrências não têm merge field-level na nuvem
- Status de lembretes são locais (não criptografados) - intencional, não são dados clínicos

## 📄 License

MIT - Marlon Figueiredo • Psicologia Clínica