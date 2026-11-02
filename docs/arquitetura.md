# Brasil em Gráfico — arquitetura modular

O site é montado a partir de três camadas independentes:

```
catalogo/   O QUE mostrar (indicadores, temas, páginas) ......... editado por pessoas
dados/      OS NÚMEROS, um arquivo por indicador ................. gerado pelo coletor
assets/js/  COMO mostrar (motor de páginas + visuais) ............ código
scripts/    DE ONDE vêm os números (coletor + adaptadores) ....... código
```

Fluxo: `catalogo/indicadores/*.json` → `scripts/atualizar-dados.mjs` (usa o adaptador da fonte) → `dados/<id>.json` → o navegador lê o catálogo e os dados e desenha os cartões com os visuais registrados.

---

## 1. Indicador — `catalogo/indicadores/<id>.json`

Um indicador é uma série de números com uma fonte oficial.

```json
{
  "id": "ipca-12m",
  "status": "ativo",
  "tema": "precos",
  "nome": "Quanto os preços subiram em 1 ano",
  "nomeTecnico": "IPCA acumulado em 12 meses",
  "unidade": "%",
  "formato": "pct",
  "casas": 1,
  "periodicidade": "mensal",
  "abrangencia": ["BR", "UF"],
  "cobertura": "O IBGE mede a inflação em 16 capitais e regiões metropolitanas.",
  "referencias": [{ "rotulo": "Meta do governo", "valor": 3.0 }],
  "fonte": {
    "orgao": "IBGE",
    "nome": "IPCA",
    "url": "https://sidra.ibge.gov.br/tabela/7060",
    "adaptador": "ibge-sidra",
    "parametros": { }
  }
}
```

| Campo | Valores |
|---|---|
| `status` | `ativo` (aparece no site), `rascunho` (coletado, mas escondido), `arquivado` (não coleta nem aparece) |
| `formato` | `pct`, `real`, `numero`, `milhoes`, `bilhoes`, `categoria` |
| `periodicidade` | `diaria`, `semanal`, `mensal`, `trimestral`, `anual` |
| `abrangencia` | `BR` (Brasil) e/ou `UF` (estados) |
| `referencias` | linhas fixas desenhadas nos gráficos (ex.: meta) — opcional |
| `fonte.adaptador` | nome de um arquivo em `scripts/adaptadores/` |
| `fonte.parametros` | livre; cada adaptador define os seus |

## 2. Dados — `dados/<id>.json` (gerado; não editar à mão)

Formato "longo": uma linha por número.

```json
{
  "id": "ipca-12m",
  "geradoEm": "2026-11-02T09:00:00Z",
  "origem": "api",
  "ultimoPeriodo": "2026-10",
  "observacoes": [
    { "local": "BR", "periodo": "2026-10", "valor": 3.9 },
    { "local": "BA", "periodo": "2026-10", "valor": 4.1 },
    { "local": "BR", "categoria": "Arroz", "periodo": "2025", "valor": -5.2 }
  ]
}
```

- `origem`: `api` (veio da fonte oficial) ou `exemplo` (dado ilustrativo — o site mostra o aviso "dados ilustrativos").
- `local`: `BR` ou a sigla do estado (`BA`, `SP`…). Para dados de capital/região metropolitana, usa-se a sigla do estado; o nome da área fica em `catalogo/locais.json` (`areaIpca`).
- `categoria`: opcional; subdivide o indicador (ex.: item de alimento, tipo de bandeira).
- `periodo`: `AAAA`, `AAAA-MM`, `AAAA-MM-DD` ou `AAAA-Tn` (trimestre). Ordenável como texto.
- `valor`: número. Indicadores de `formato: "categoria"` usam `categoria` como valor principal e `valor` como número associado (ex.: bandeira tarifária e custo extra).

Se a coleta falhar, o arquivo anterior é mantido.

## 3. Tema — `catalogo/temas/<id>.json`

Uma página de tema é uma lista de cartões. Cada cartão aponta para um indicador e um visual.

```json
{
  "id": "precos",
  "status": "ativo",
  "ordem": 1,
  "titulo": "Preços: quanto as coisas estão subindo",
  "nomeCurto": "Preços (inflação)",
  "descricao": "Veja quanto os preços subiram…",
  "icone": "cesta",
  "azulejo": "urucum",
  "resumo": { "indicador": "ipca-12m", "texto": "Os preços subiram {valor} em 1 ano." },
  "cartoes": [
    {
      "indicador": "ipca-12m",
      "visual": "linha",
      "pergunta": "Quanto os preços subiram em 1 ano?",
      "frase": "O que custava R$ 100 há um ano hoje custa cerca de {r100}.",
      "opcoes": { "periodos": 12 },
      "detalhes": ["Parágrafo explicando o cálculo."]
    }
  ]
}
```

Textos (`pergunta`, `frase`, `unidade`, `etiqueta`, `detalhes`) aceitam marcadores, trocados pelo motor:

| Marcador | Exemplo |
|---|---|
| `{valor}` | último valor do lugar do cartão (o estado, nos visuais de estado; senão o Brasil) — "4,1%" |
| `{valorBrasil}`, `{valorEstado}` | "3,9%", "4,1%" |
| `{estado}`, `{uf}`, `{gentilico}` | "Bahia", "BA", "baianos" |
| `{noEstado}`, `{doEstado}` | "na Bahia", "da Bahia" |
| `{naArea}`, `{area}` | "em Salvador e região" (área do IPCA), "Salvador e região" |
| `{periodo}`, `{periodoAnterior}` | "outubro de 2026", "setembro de 2026" |
| `{variacao}` | "Subiu de 5,2% para 5,6%" / "Subiu 15 centavos" |
| `{comparacao}` | "um pouco acima da média do Brasil" |
| `{diferenca}` | "20 centavos a mais" / "0,2 ponto acima" |
| `{r100}` | para porcentagens: quanto vale hoje o que custava R$ 100 — "R$ 103,90" |
| `{emCada100}` | o valor arredondado — "10" |

Opções comuns de cartão: `id` (âncora), `etiqueta`, `unidade` (texto abaixo do número), `rotulo` (texto acima do número), `frase`, `detalhes` (lista de parágrafos), `escopo` (`"estado"` ou `"brasil"`, para forçar), `opcoes` (específicas do visual — veja o comentário no topo de cada arquivo em `assets/js/visuais/`).

## 4. Visuais — `assets/js/visuais/<nome>.js`

Cada visual se registra no motor:

```js
BG.visuais.registrar("linha", {
  // contexto: { indicador, dados, estado, opcoes, fmt, ... }
  resposta(ctx) { return { numero: "3,9%", unidade: "em 12 meses" }; },
  desenhar(el, ctx) { /* desenha o gráfico */ },
  tabela(ctx) { return { colunas: [...], linhas: [...] }; }
});
```

Visuais disponíveis: `numero`, `linha`, `ranking-uf`, `comparativo-local`, `pictograma`, `bandeira`, `destaques-categorias`, `ano-a-ano`, `histograma`.

## 5. Páginas montadas pelo catálogo

| Arquivo | Página |
|---|---|
| `catalogo/site.json` → `temas` | Lista e ordem dos temas (menu "Temas", busca, página "Sobre os dados") |
| `catalogo/site.json` → `inicio` | "Hoje no Brasil" e o cartão "No seu estado" da página inicial |
| `catalogo/site.json` → `estado` | Cartões e comparação da página "Meu estado" |
| `catalogo/temas/*.json` | Uma página por tema em `tema.html?id=<tema>` |
| `catalogo/locais.json` | Nomes, preposições, vizinhos e códigos IBGE dos estados |

Passo a passo para adicionar dados novos: veja `docs/como-adicionar-dados.md`.
