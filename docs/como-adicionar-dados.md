# Como adicionar dados novos ao Brasil em Gráfico

Todo dado novo segue os mesmos 5 passos. Não é preciso mexer no HTML nem no motor do site.

```
1. Cadastrar o indicador      catalogo/indicadores/<id>.json   (status "rascunho")
2. Dizer de onde ele vem       fonte.adaptador + fonte.parametros
3. Coletar e conferir          npm run dados -- --so <id>
4. Escolher como mostrar       um cartão em catalogo/temas/<tema>.json
5. Classificar como útil       status "ativo"
```

Para ver o site no computador: `npm run dev` e abra http://127.0.0.1:8642.

---

## 1. Cadastrar o indicador

```bash
npm run novo-indicador -- --id ipca-aluguel --tema precos --adaptador ibge-sidra --nome "Quanto o aluguel subiu em 1 ano"
```

Isso cria `catalogo/indicadores/ipca-aluguel.json` com `"status": "rascunho"`. Nada aparece no site ainda.

Revise os campos (formato completo em `docs/arquitetura.md`):

- `nome`: a pergunta em palavras do dia a dia. Evite siglas.
- `nomeTecnico`: o nome oficial (aparece em "Entenda este número").
- `formato` e `casas`: `pct` com 1 casa ("5,6%"), `real` com 2 casas ("R$ 6,29"), `milhoes`…
- `abrangencia`: `["BR"]` se só existe para o Brasil, `["BR", "UF"]` se existe por estado.
- `cobertura`: uma frase quando o dado não existe para todos os estados.

## 2. Dizer de onde ele vem

Cada fonte oficial tem um adaptador em `scripts/adaptadores/`. Os parâmetros de cada um, com exemplos reais, estão em `docs/atualizacao-dados.md`.

| Fonte | Adaptador | Para quê |
|---|---|---|
| IBGE (SIDRA) | `ibge-sidra` | Qualquer tabela do IBGE: inflação, emprego, renda, população, PIB |
| Banco Central (SGS) | `bcb-sgs` | Qualquer série do Banco Central: dólar, juros, crédito |
| ANP | `anp-lpc` | Preço dos combustíveis por estado |
| ANEEL | `aneel-bandeiras` | Bandeira tarifária da conta de luz |

Para uma fonte que ainda não tem adaptador, crie `scripts/adaptadores/<nome>.mjs` exportando `async function coletar(indicador)`, que devolve uma lista de `{ local, periodo, valor, categoria? }`.

## 3. Coletar e conferir

```bash
npm run dados -- --so ipca-aluguel
npm run validar
```

Abra `dados/ipca-aluguel.json` e confira se os números batem com o site da fonte. Depois disso, a atualização diária (GitHub Actions) passa a buscar esse indicador sozinha.

## 4. Escolher como mostrar

Acrescente um cartão em `catalogo/temas/<tema>.json`, na lista `cartoes`:

```json
{
  "indicador": "ipca-aluguel",
  "visual": "ranking-uf",
  "pergunta": "Onde o aluguel subiu mais?",
  "opcoes": { "area": true },
  "detalhes": ["O IBGE pesquisa o valor do aluguel em 16 capitais e regiões metropolitanas."]
}
```

Escolha o visual pelo formato do dado:

| Visual | Mostra | Precisa de |
|---|---|---|
| `numero` | Só o número grande | Qualquer dado |
| `linha` | Como mudou com o tempo (Brasil, ou seu estado × Brasil) | Série no tempo. `opcoes.locais: ["estado","BR"]`, `opcoes.periodos: 24` |
| `ranking-uf` | Os 27 estados do maior para o menor | Dado por estado. `opcoes.semBrasil` para totais |
| `comparativo-local` | Seu estado × Brasil × vizinhos | Dado por estado |
| `histograma` | Quantos estados há em cada faixa | Dado por estado. `opcoes.faixa: 2` |
| `pictograma` | "Em cada 100 pessoas…" | Porcentagem. `opcoes.rotulos: ["sem trabalho","trabalhando"]` |
| `ano-a-ano` | Cada item numa linha, cada ano numa coluna | `categoria` + período anual. `opcoes.anos: 5` |
| `destaques-categorias` | O que mais subiu e o que mais caiu | `categoria` |
| `bandeira` | Bandeira tarifária do mês | Específico da ANEEL |

Os textos aceitam marcadores, como `{noEstado}` ("na Bahia") e `{valorBrasil}` ("3,9%"). A lista completa está em `docs/arquitetura.md`.

### Exemplo: comparar o preço dos alimentos ano a ano

Já existe no tema Preços. É o indicador `ipca-alimentos` (uma `categoria` por alimento e um `periodo` por ano) com o visual `ano-a-ano`:

```json
{
  "indicador": "ipca-alimentos",
  "visual": "ano-a-ano",
  "pergunta": "Como o preço de cada alimento mudou, ano a ano?",
  "rotuloCategoria": "Alimento",
  "unidade": "alimentos ficaram mais caros",
  "opcoes": { "anos": 5 }
}
```

Para incluir outro alimento, acrescente o subitem do IPCA na lista de itens em `fonte.parametros` de `catalogo/indicadores/ipca-alimentos.json` e rode `npm run dados -- --so ipca-alimentos`. Para fazer a mesma comparação com outra coisa (remédios, transporte, serviços), crie um indicador novo com outras categorias e use o mesmo visual.

## 5. Classificar como útil

Quando o cartão estiver bom, mude o indicador para `"status": "ativo"`.

| Status | Coleta os dados? | Aparece no site? |
|---|---|---|
| `rascunho` | Sim | Não (use para testar) |
| `ativo` | Sim | Sim |
| `arquivado` | Não | Não |

---

## Criar um tema novo

1. Crie `catalogo/temas/<id>.json` (copie um existente). Preencha `titulo`, `nomeCurto`, `descricao`, `icone`, `azulejo` (`azulejo`, `urucum`, `ipe` ou `contexto`), `palavras` para a busca, `resumo` e `cartoes`.
2. Acrescente o `id` na lista `temas` de `catalogo/site.json`, na ordem em que deve aparecer.

O tema aparece sozinho na página inicial, na busca e em "Sobre os dados", no endereço `tema.html?id=<id>`.

Ícones disponíveis: veja `assets/js/icones.js`.

## Criar um tipo de gráfico novo

1. Crie `assets/js/visuais/<nome>.js` (copie `numero.js`, o mais simples).
2. Registre com `BG.visuais.registrar("<nome>", { resposta, titulo, legenda, desenhar, tabela })`.
3. Use `"visual": "<nome>"` em qualquer cartão.

O arquivo só é baixado nas páginas que usam esse visual. Siga as regras do site: no máximo 3 cores por gráfico, eixo começando no zero, valor escrito no dado e sempre uma tabela equivalente.

## Mudar a página inicial ou a página "Meu estado"

Tudo fica em `catalogo/site.json`:

- `inicio.destaques`: os 4 números de "Hoje no Brasil".
- `inicio.foco`: o cartão grande "No seu estado".
- `estado.cartoes`: os cartões da página Meu estado.
- `estado.comparar`: os indicadores da comparação entre dois estados.
