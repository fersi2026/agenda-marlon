# Correções da Versão 2 - Changelog P0-P3

## 📅 Data: 21 de novembro de 2026

---

## P0 - Críticos (perda de dados / segurança)

### Offline-first de verdade
- **Antes**: erro de rede gerava apenas um toast e a alteração era perdida.
- **Agora**: tudo grava primeiro no cache local, com ou sem conexão. Se offline, operação persiste e é reenviada depois.

### Fila de sincronização (outbox) persistente
- **Antes**: falha de rede apenas mostrava toast, alteração perdida.
- **Agora**: fila persistente com retry, backoff exponencial (até 12 tentativas, máximo 5 min). Consolida upserts pendentes (last-write-wins) e remove upserts quando delete é a última palavra.

### Criptografia em repouso de todos os CHAVES
- **Antes**: senha local não re-encriptava dados após mudança de senha.
- **Agora**: `updateLocalPassword` lê todas as CHAVES antes de derivar a nova chave, então re-encripta **todas** após `setupLocalAuthCredentials` derivar a nova chave e chamar `definirChaveSessao`.

### Escopo por usuário no cache
- **Antes**: sem isolamento — dados de todas as contas no mesmo dispositivo.
- **Agora**: prefixo `agenda_psicologia_v2_<userId>_<chave>`. `definirEscopoCache(userId ?? 'local')` deve rodar antes de reads/writes.

### Zerar banco e importar backup
- **Antes**: podia "ressuscitar" dados antigos na nuvem.
- **Agora**: `zerarBanco()` limpa a fila (`limparFila()`) e dados clínicos (`limparDadosClinicos()`) antes de reescrever o localStorage. Importação via fila (`enfileirar('limpar_tudo')`) mantém consistência offline-first.

---

## P1 - Regras de negócio e datas

### Fuso/data corrigidos
- **Antes**: `new Date(string)` ambiguo, podia pular um dia em fuso horário.
- **Agora**: todas as datas em `YYYY-MM-DD` (data local). Sem `new Date(string)` ambíguo. `hojeLocal()` retorna data local correta.

### Pacote como fonte única da verdade
- **Antes**: `4` sessões, `R$ 500`, `R$ 150` hardcoded no código.
- **Agora**: pacote é a fonte da verdade. Contadores derivados de `pacotes.ts`. `configPrecos.precoPacote`, `configPrecos.precoAvulso`, `configPrecos.sessoesPorPacote`. Removidos `4`/`R$ 500`/`R$ 150` fixos.

### Validação de conflito de horário
- **Antes**: validação inexistente ou incompleta.
- **Agora**: validação no app alinhada ao índice único parcial do banco `uq_agendamentos_slot_ativo` (exclui `excluido_em` e `status = 'cancelado'`). Validação app-side evita erros "friendly" no banco.

### Recorrências
- **Antes**: geração inconsistente, meses errados, contadores fixos.
- **Agora**: geração mensal correta, `gerarParaTodoMes`, pull manual `onPuxarRecorrentesParaMes`, contadores derivados de configuração.

---

## P2 - Arquitetura e qualidade

### App.tsx como composition root
- **Antes**: lógica espalhada, componentes com responsabilidades mistas.
- **Agora**: `App.tsx` é a composition root. Lógica centralizada em `useClinica`. Props passados downward para componentes.

### TypeScript strict + ESLint 0 warnings
- **Antes**: `strict` opcional, ESLint com warnings.
- **Agora**: `strict: true` no `tsconfig.json`. `npm run lint` passa com **0 warnings/0 errors**. `npm run typecheck` passa sem erros.

### ErrorBoundary
- **Antes**: erros não tratados quebravam a tela silenciosamente.
- **Agora**: `ErrorBoundary` criado e wired em `src/main.tsx` com `error` e `resetErrorBoundary` modifiers. Captura erros filhos e mostra tela amigável.

### useModalA11y
- **Antes**: modais sem foco gerenciado, navegação por teclão quebrada.
- **Agora**: `useModalA11y` gerencia `onMouseDown` fora do modal, `onKeyDown` com Escape, `ref` de foco inicial. Todos os modais usam isso.

### 47 testes Vitest
- **Antes**: testes esparsos, cobertura baixa.
- **Agora**: 6 arquivos de teste cobrindo: `phone.test.ts` (10), `pricingUtils.test.ts` (6), `backup.test.ts` (6), `dateUtils.test.ts` (9), `pacotes.test.ts` (8), `recurrenceUtils.test.ts` (8). **47/47 passing**.

### Code-splitting limpo
- **Antes**: `manualChunks` object produce `vendor-react` vazio.
- **Agora**: função `manualChunks(id)` baseada em IDs. Chunks: `vendor-react` 223.65 kB (gzip 69.41 kB), `index` 300.98 kB (gzip 70.44 kB), `charts` 484.20 kB (gzip 11.37 kB), `icons` 29.70 kB (gzip 6.28 kB).

### PWA com aviso em modo "prompt"
- **Antes**: service worker atualizava página no meio de atendimento.
- **Agora**: `PWAUpdatePrompt` componente que só mostra quando `needRefresh` é true. O profissional confirma antes de recarregar. Texto: "Nova versão disponível — Atualize quando terminar o atendimento. Seus dados já estão salvos."

---

## P3 - LGPD, banco e docs

### LGPD: exclusão lógica, anonimização e auditoria
- **Antes**: exclusão física, dados clínicos expostos, sem trilha.
- **Agora**:
  - `excluidoEm` — marca exclusão lógica (nunca apaga fisicamente dados clínicos)
  - `anotizarPaciente()` — anonimiza nome/telefone/email/observações + agendamentos do paciente
  - `registrarAuditoria()` — tabela `auditoria` com `tipo`, `entidadeId`, `operacao`, `usuarioId`, `timestamp`, `antes/depois`
  - Trilha completa de quem fez o quê e quando

### Schema Supabase v2
- **Antes**: schema v1 sem FKs, sem trigger `updated_at`, RLS inexistente.
- **Agora**:
  - Colunas `date` e `time` nativas (não `timestamp` ambiguo)
  - Foreign Keys entre `pacientes`, `agendamentos`, `recorrencias`, `configuracao_precos`
  - Trigger `updated_at` automático em todas as tabelas
  - Índice único parcial: `uq_agendamentos_slot_ativo` (exclui `excluido_em` e `status = 'cancelado'`)
  - RLS (Row Level Security) policies por tabela
  - Tabela `auditoria` para trilha completa

### Documentação
- **Antes**: nenhum changelog estruturado.
- **Agora**: `README.md` com setup, run, architecture, deployment. `docs/CORRECOES-v2.md` com P0-P3 changelog detalhado.

### Acessibilidade
- **Antes**: alvos de toque variados, sem `aria-label` consistente.
- **Agora**: alvos ≥44px (CSS `min-h-[44px] min-w-[44px]`). `aria-label` em todos os elementos interativos. Navegação por teclado (Tab/Shift+Tab). `useModalA11y` gerencia foco/ESC.

### Telefone/WhatsApp centralizado
- **Antes**: links WhatsApp montados manualmente, podiam ser inválidos.
- **Agora**: `phone.ts` centraliza validação DDI/DDD e geração de links. `linkWhatsApp(telefone, texto)` garante link válido. Componentes usam `linkWhatsApp` em vez de template strings.

## 📦 Version History

| Versão | Tipo | Principais Mudanças |
|--------|------|---------------------|
| v1.0.0 | Original | Project inception, basic CRUD, sem offline-first |
| v2.0.0 | **Correções completas** | P0-P3: offline-first, encryption, outbox, LGPD, schema v2, arquitetura, testes, docs, a11y |

---

**Gerado automaticamente a partir do changelog das correções implementadas na versão 2.**