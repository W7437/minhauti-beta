# DadosUTI — Auxiliar de dados

Versão visualmente padronizada com os módulos **Gasometria** e **Guia de Prescrição de NPT**.

## O que foi alterado

Somente a interface:
- cabeçalho padrão DadosUTI;
- selo “Processamento local”;
- faixa fixa de privacidade;
- cards com círculos azuis numerados;
- botão principal azul em largura total;
- mesmas cores, fontes, tamanhos, bordas e sombras dos demais módulos.

A lógica de leitura do PDF/OCR foi mantida.

## Arquivos

- `index.html`
- `style.css`
- `app.js`
- `wrangler.jsonc`
- `.nojekyll`

## Cloudflare Worker

O nome do Worker permanece:

`auxiliar-de-dados`

Deploy:

```bash
npx wrangler deploy
```
