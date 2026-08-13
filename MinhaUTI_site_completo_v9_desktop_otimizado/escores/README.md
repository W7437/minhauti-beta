# MinhaUTI — Escores v3

Interface enxuta para uso rápido em plantão.

Fluxo:
1. começar a digitar nome, sigla ou situação clínica;
2. selecionar o escore sugerido;
3. revisar campos pré-preenchidos a partir do leito ativo, quando disponíveis;
4. calcular.

Foram removidos:
- painel Catálogo;
- Sugestões pelo contexto;
- blocos extras de navegação interna.

O módulo permanece totalmente local no navegador.


## v4 — fatores de risco explícitos

Sempre que um critério do escore mencionar “fatores de risco”, a interface passa a enumerar os fatores considerados naquele escore.

Nesta versão:
- HEART: HAS, hipercolesterolemia, DM, tabagismo, história familiar de DAC/aterosclerose e obesidade (IMC >30 kg/m²); doença aterosclerótica conhecida permanece como critério separado no componente de risco.
- TIMI UA/NSTEMI: DM, HAS, hipercolesterolemia, tabagismo atual e história familiar de DAC.
