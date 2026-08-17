# MinhaUTI 10.4 — Login real

Este pacote foi criado em cima do ZIP atual enviado pelo usuário.

## Já está pronto no código

- Supabase URL: `https://pcyzmkzdqfmzqmjjsbdp.supabase.co`
- Publishable key: já configurada em `public/auth/auth-config.js`
- Login por **usuário + senha**
- Cadastro: **e-mail + usuário + senha**
- Recuperação pelo e-mail
- Redefinição de senha
- Sessão persistente
- Logout
- Proteção das páginas clínicas já existentes
- API `/api/auth/*` integrada ao MESMO Worker que serve o site
- O `wrangler.jsonc` da raiz continua publicando `./public`, agora com `worker.js` para as rotas `/api/*`
- 1 login = 1 UTI nesta fase

## O único segredo que NÃO está no ZIP

`SUPABASE_SECRET_KEY`

Ela começa com `sb_secret_...`.

**Não coloque essa chave no GitHub, HTML, JavaScript público ou wrangler.jsonc.**

## O que você precisa fazer depois de substituir o repositório

### 1. Cloudflare: adicionar o Secret

No Worker que publica `dadosuti.com.br`, adicione um Secret com:

Nome:
`SUPABASE_SECRET_KEY`

Valor:
a Secret key `sb_secret_...` do Supabase.

Se estiver usando Wrangler local:

```bash
npx wrangler secret put SUPABASE_SECRET_KEY
```

Cole a chave quando o terminal solicitar.

### 2. Supabase: URLs de autenticação

No painel do Supabase > Authentication > URL Configuration:

Site URL:
`https://dadosuti.com.br`

Redirect URLs:
- `https://dadosuti.com.br/auth/login.html`
- `https://dadosuti.com.br/auth/redefinir-senha.html`

### 3. Banco

Você já executou o SQL anteriormente. O arquivo `supabase/schema_auth.sql`
fica no projeto apenas para referência/reaplicação idempotente.

## Teste

1. Abra `https://dadosuti.com.br/auth/criar-conta.html`
2. Cadastre e-mail, usuário e senha.
3. Confirme o e-mail, se o Supabase solicitar.
4. Abra `https://dadosuti.com.br/auth/login.html`
5. Entre usando **usuário + senha**.
6. O site deve abrir `/app/main/`.
7. Atualize a página: a sessão deve continuar.
8. Clique em `Sair`.
9. Teste `Esqueci minha senha`.

## Importante

Os dados clínicos continuam locais nesta etapa.
O login ainda não sincroniza os leitos com o Supabase.
