# MinhaUTI v10.2

Principais alterações:
- Login passa a ser a porta de entrada mesmo antes da configuração do Supabase.
- Sem Supabase configurado, há botão explícito "Entrar em modo de teste"; não há mais aviso flutuante sobre a aplicação.
- Modo de teste vale apenas para a sessão atual do navegador (sessionStorage).
- Ajuste de legibilidade no desktop: removida a redução excessiva para 11 px em campos importantes.
- NPT: quadro "Exames e contexto do dia" ganhou mais largura útil; grade de exames passa a 4 colunas em desktops usuais e 6 colunas apenas em telas muito largas.
- Estrutura de deploy estabilizada: apenas `public/` é publicado.
- READMEs ficam fora dos assets públicos.
- Wrangler 4.123.0 declarado como devDependency.

## Login real
Preencha `public/auth-config.js` com a URL e a chave pública/publishable do projeto Supabase. Nunca coloque service_role ou outra chave privilegiada no navegador.

## Desenvolvimento
```bash
npm install
npm run dev
```

## Deploy
```bash
npm install
npm run deploy
```

> Nota: este ambiente não teve acesso ao registry para resolver as dependências transitivas do Wrangler. Ao executar `npm install` pela primeira vez, o npm completará/atualizará o `package-lock.json`; depois disso, versione o lock gerado e passe a usar `npm ci` nos builds.
