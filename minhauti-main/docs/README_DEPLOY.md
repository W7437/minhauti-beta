# MinhaUTI — site completo v1

Estrutura pronta para publicação no mesmo Worker `minhauti`:

- `/` — Minha UTI
- `/gasometria/` — Gasometria
- `/auxiliar/` — Auxiliar de dados
- `/npt/` — NPT
- `/tfg-antibiotico/` — TFG e ajuste Antibiótico
- `/escores/` — Escores
- `/politicas.html` — Políticas de uso

## Publicação

Abra o terminal nesta pasta e execute:

    npx wrangler deploy

Existe apenas um `wrangler.jsonc`, na raiz. Não adicione arquivos Wrangler dentro das subpastas.
Depois que `minhauti.com.br` estiver ativo na Cloudflare, vincule esse domínio como Custom Domain ao Worker `minhauti`.

A navegação entre módulos usa caminhos absolutos do mesmo domínio, portanto funciona tanto no `workers.dev` quanto em `minhauti.com.br`.
