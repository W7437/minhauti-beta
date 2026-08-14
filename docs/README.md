# minhauti — DadosUTI

Versão preparada para publicação no Cloudflare Workers como site estático.

## Importante

Este projeto NÃO usa um script Worker com `return new Response("Hello World")`.

O `wrangler.jsonc` aponta diretamente para os arquivos estáticos:

- index.html
- style.css
- app.js

## Publicar

Abra o terminal dentro desta pasta e execute:

    npx wrangler deploy

Se já existir um Worker `minhauti` criado com o template Hello World,
este deploy deve substituí-lo pela versão estática.

## Estrutura

- index.html
- style.css
- app.js
- wrangler.jsonc
- .nojekyll


## Integração com o Auxiliar — v3

Foi adicionado um campo opcional para colar o resumo gerado pelo aplicativo Auxiliar.

O botão **Extrair dados selecionados** pode preencher:
- HGT
- Temperatura
- Diurese
- Balanço hídrico

Se um dos campos já estiver preenchido, o programa pede confirmação antes de substituí-lo.
A temperatura extraída é preservada como série/range para reconhecer tanto febre quanto hipotermia.


## v4 — DDE automático

- HGT, temperatura, diurese e balanço hídrico são procurados automaticamente no texto colado do Auxiliar.
- Não há mais caixas de seleção para escolher os quatro itens.
- O período do DDE é definido apenas como 12 h ou 24 h.
- Hipotermia pode ser exibida na conferência, mas não é narrada automaticamente na evolução final.
- A evolução gerada inclui, entre `#Dispositivos` e `#Evolução`:
  `#DDE (12h/24h): dados de enfermagem inseridos`


## v5 — fluxo compacto para UTI

- Removida a calculadora de escores e o SOFA da interface.
- `Importar dados` agora usa exatamente o mesmo tipo de botão dos demais.
- Removido `Lactato atual` da Hemodinâmica.
- Gasometria passou a ser uma caixa única em Laboratório para colar a saída do módulo Gasometria.
- Extração automática de pH, PaO2, PaCO2, HCO3, SO2, P/F, AG, BE, lactato e, quando presentes, PvCO2/ScvO2.
- Adicionado Neurológico junto de Hemodinâmica e Função Respiratória.
- Pupilas isocóricas geram `PIFR+` no `NEU:`.
- Anisocoria abre miose/midríase e direita/esquerda.
- Déficit motor `Não` gera `sem déficits motores`; `Sim` abre `Onde?`.
- Removidos peso ideal para critério urinário e intervalo da creatinina anterior.
- Mantidos creatinina basal/anterior, creatinina atual, ureia anterior e ureia atual.
- Terminologia: `Profilaxia para TEV` e `Profilaxia para LAMG`.
- Mantido `#DDE (12h/24h)` entre `#Dispositivos` e `#Evolução`.
- Interface reorganizada para minimizar scroll: cards lado a lado, laboratório em grade, DVA em mosaico, leito ativo e abas persistentes.


## v6 — reorganização do fluxo

- Ordem inicial: Paciente → Evolução anterior.
- DVA movida para uma aba própria.
- Adicionada Adrenalina à DVA.
- Sintomas/Queixas e Profilaxias movidos para uma aba própria.
- Adicionado campo Dieta em Paciente.
- CNO2 abre Fluxo de O₂ em L/min.
- Removido “Ureia acima do VR do laboratório”.
- Função Renal reorganizada em duas linhas:
  - DU, período, via, BH;
  - creatinina basal/anterior, creatinina atual, ureia anterior, ureia atual.
- Checklist alerta IOT/TQT sem Profilaxia para LAMG registrada.
- Evolução usa apenas “profilaxia para TEV”; textos antigos com PTEV são sanitizados ao carregar.


## v6.1 — DVA sem checkbox

- Removido o checkbox “DVA em uso”.
- A aba DVA fica sempre disponível.
- A vazão define se cada droga está em uso:
  - vazão vazia ou zero → “Não em uso”;
  - vazão preenchida → o minhauti tenta calcular a dose;
  - vazão preenchida com dados incompletos → alerta “Vazão informada, mas faltam dados para calcular a dose”.
- Se todas as vazões estiverem vazias, o paciente é considerado sem DVA em uso.


## v6.2 — Evolução e aviso de segurança

- Aumentada a altura-base dos quadros `Evolução` e `Sugestão de exame físico`.
- Em monitores maiores, os quadros aproveitam mais da altura disponível da tela.
- `#Dieta` passa a ocupar a posição superior antes usada por `#HD`.
- A hipótese diagnóstica (`HD`) passa para dentro do texto de `#Evolução`, na posição anteriormente ocupada pela dieta.
- A faixa de processamento local ganhou aviso explícito de uso como ferramenta de suporte e necessidade de revisão por profissional credenciado.


## v6.3 — aceite, políticas, FiO2 e saída final

- CNO2:
  - fluxo em L/min gera sugestão automática aproximada de FiO2;
  - regra prática usada: FiO2 ≈ 21% + 4 pontos percentuais por L/min, até 6 L/min;
  - a interface deixa explícito que é uma estimativa e que a FiO2 real varia com o padrão respiratório;
  - o campo FiO2 é preenchido automaticamente apenas quando estiver vazio ou ainda contiver uma sugestão automática;
  - edição manual da FiO2 é preservada.
- Dieta foi movida para a esquerda de “Em HD” na aba Paciente.
- A saída final passou a usar uma única caixa:
  - #HD
  - #Dispositivos
  - #Dados de Enfermagem
  - #Profilaxias
  - #Evolução
  - #Ao exame
- A sugestão de exame físico é incorporada automaticamente à saída final.
- Ao abrir a página, a ferramenta fica bloqueada por um aviso de uso.
- O acesso só é liberado após marcar “Li e concordo com as políticas de uso”.
- O aviso contém link para `politicas.html`.


## v6.4 — ventilação mecânica condicional

- PEEP fica oculto para suporte espontâneo, CNO2, VNI e TQT em ar ambiente.
- PEEP aparece apenas em:
  - IOT + AVM
  - TQT em AVM
- Nessas duas opções surge também “Modo ventilatório”:
  - PCV
  - VCV
  - PS
- Quando preenchidos, modo ventilatório e PEEP entram na descrição respiratória gerada e no exame físico.


## v6.5 — navegação global DadosUTI

- Mantém a lista de leitos/pacientes como navegação clínica à esquerda.
- Adiciona barra fixa de módulos à direita.
- Estrutura:
  - esquerda: leitos/pacientes
  - centro: ferramenta atual (`minhauti`)
  - direita: navegação global DadosUTI
- Links preparados:
  - `/` → Minha UTI
  - `/gasometria/`
  - `/auxiliar/`
  - `/npt/`
  - `/escores/`
  - `/iam/`
- O módulo atual é destacado automaticamente com base na URL.
- Em telas menores, a barra direita passa para uma navegação horizontal inferior para preservar espaço clínico.
- Os caminhos dos módulos já estão preparados, mas cada destino só funcionará após a respectiva pasta/módulo ser publicado no site.
