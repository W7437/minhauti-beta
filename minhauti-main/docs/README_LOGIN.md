# MinhaUTI — Login (Supabase Auth)

Esta versão adiciona autenticação sem mover os dados clínicos para o servidor. Leitos, evoluções e dados assistenciais continuam no armazenamento local do navegador.

## 1. Criar o projeto Supabase
1. Crie um projeto Supabase.
2. Em Authentication > Providers, mantenha Email habilitado.
3. Em Authentication > URL Configuration, defina o endereço publicado do MinhaUTI como Site URL e adicione como Redirect URL:
   - `https://SEU-DOMINIO/redefinir-senha.html`
   - seu endereço `workers.dev`, durante testes.

## 2. Configurar o site
Edite `auth-config.js` e substitua:
- `COLE_AQUI_A_URL_DO_PROJETO_SUPABASE`
- `COLE_AQUI_A_CHAVE_ANON_OU_PUBLISHABLE`

Use apenas a chave pública/anon/publishable no navegador. **Nunca** use `service_role` em HTML ou JavaScript público.

## 3. Criar os primeiros usuários
Para um beta fechado, desative cadastro público e crie/convide os usuários pelo painel do Supabase. Assim apenas pessoas autorizadas entram.

## 4. Planos
O cabeçalho lê `app_metadata.plan` (preferível) e exibe `beta` por padrão. Futuramente `free`, `beta` e `pro` podem ser usados para liberar módulos. Autorização real de recursos pagos deve ser validada no backend, não apenas escondendo botões no JavaScript.

## 5. O que está protegido
- `/`
- `/gasometria/`
- `/auxiliar/`
- `/npt/`
- `/escores/`
- `/tfg-antibiotico/`
- `/hidroeletroliticos/`

`/politicas.html`, `/login.html`, recuperação e redefinição de senha permanecem públicos.

## Correção v10.1
Enquanto `auth-config.js` ainda contiver os placeholders, o site abre em **modo de teste** e exibe um aviso discreto. A proteção de acesso só passa a bloquear as rotas depois que URL e chave pública do Supabase forem configuradas. Isso evita tela branca durante configuração/desenvolvimento local.
