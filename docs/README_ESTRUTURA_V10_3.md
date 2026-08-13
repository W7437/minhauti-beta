# MinhaUTI v10.3 — estrutura modular

Esta versão reorganiza o projeto sem adicionar função clínica nova.

## Pastas

- `public/auth/`: interface e cliente de autenticação. Não contém a base real de usuários.
- `public/app/`: programa principal MinhaUTI.
- `public/app/modules/`: cada ferramenta clínica isolada em sua subpasta.
- `public/app/shared/`: CSS/JS compartilhados entre o programa e os módulos.
- `public/legal/`: políticas de uso.

## Dados persistentes

- Contas reais de usuários: futuramente no Supabase, fora do Git.
- Dados clínicos/leitos: continuam locais no navegador.
- Código/configuração pública de autenticação: `public/auth/`.

## Compatibilidade

Os caminhos antigos (`/login.html`, `/npt/`, `/gasometria/` etc.) foram mantidos como redirecionadores para evitar quebrar favoritos e links antigos durante a migração.

## Deploy

O `wrangler.jsonc` na raiz publica somente `./public`.
