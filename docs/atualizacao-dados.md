# Atualização de dados

Os números em `dados/` são gerados por `npm run dados`, que lê `catalogo/indicadores/*.json` e chama o adaptador indicado em `fonte.adaptador`.

## Adaptadores

| Adaptador | Arquivo | Parâmetros típicos |
|---|---|---|
| `ibge-sidra` | `scripts/adaptadores/ibge-sidra.mjs` | `tabela`, `variavel`, `classificacao`, `periodos`, `niveis` |
| `bcb-sgs` | `scripts/adaptadores/bcb-sgs.mjs` | `serie`, `inicio` |
| `anp-lpc` | `scripts/adaptadores/anp-lpc.mjs` | `produto` (ex.: `GASOLINA COMUM`) |
| `aneel-bandeiras` | `scripts/adaptadores/aneel-bandeiras.mjs` | — |

Cada adaptador exporta `async function coletar(indicador)` e devolve uma lista de observações `{ local, periodo, valor, categoria? }`.

Se o adaptador ainda não existir, o coletor mantém o arquivo atual em `dados/`. Arquivos com `"origem": "exemplo"` são ilustrativos e o site mostra um aviso.

## Agendamento

O workflow `.github/workflows/atualizar-dados.yml` roda diariamente e sob demanda (`workflow_dispatch`). Ele só faz commit quando `dados/` muda.
