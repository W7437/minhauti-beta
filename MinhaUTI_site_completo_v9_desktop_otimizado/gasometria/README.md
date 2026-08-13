# DadosUTI — Gasometria v0.1

Módulo web independente para análise rápida de gasometria.

## Como publicar no mesmo GitHub do DadosUTI

1. Na raiz do repositório, crie a pasta `gasometria`.
2. Envie para ela os três arquivos desta pasta: `index.html`, `style.css` e `app.js`.
3. Faça Commit.
4. O Cloudflare Workers Static Assets deve publicar a rota automaticamente.

Teste inicialmente em:

`https://SEU-WORKER.workers.dev/gasometria/`

Depois, com o domínio conectado:

`https://dadosuti.com.br/gasometria/`

## Privacidade nesta versão

- Não há campos de nome, prontuário, leito ou hospital.
- Não usa localStorage/sessionStorage.
- Não envia dados a API.
- Não armazena gasometrias nesta v0.1.
- O armazenamento anônimo em D1 será acrescentado depois do sistema de login.

## Regras clínicas principais

- Interpretação de pH / PaCO2 / HCO3.
- Winter para acidose metabólica.
- Compensação de alcalose metabólica.
- Compensação aguda/crônica de distúrbios respiratórios.
- Anion Gap = Na - (Cl + HCO3).
- Correção do AG pela albumina.
- Delta gap quando há acidose metabólica com AG elevado.
- P/F quando PaO2 e FiO2 estão disponíveis.
- Gap CO2 = PvCO2 - PaCO2.
- ScvO2 e lactato como dados complementares, sempre dependentes do contexto clínico.

## Fontes

- Merck Manual Professional — Acid-Base Disorders.
- NCBI/StatPearls — Acid-base / Anion Gap.
- Ltaief Z, Schneider AG, Liaudet L. Critical Care 2021 — veno-arterial PCO2 gap.


## v0.2
O campo Texto curto agora usa formato fixo para transcrição: Ph / Po2 / Pco2 / Bic / So2 / AG / Be / PaO2-Fio2 / Lac. Campos não informados aparecem como —.
