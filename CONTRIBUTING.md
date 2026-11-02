# Como contribuir com o Brasil em Gráfico

O projeto é modular de propósito: a maior parte das contribuições são arquivos JSON e, às vezes, um visual em JavaScript. Não é preciso montar framework nem mexer nas páginas HTML.

## Fluxo rápido

1. Faça um fork e clone o repositório.
2. Crie uma branch (`git checkout -b indicador/meu-tema`).
3. Siga o guia **[docs/como-adicionar-dados.md](docs/como-adicionar-dados.md)**.
4. Abra um pull request descrevendo a fonte dos dados e o que o gráfico responde.

## O que é bem-vindo

| Tipo | Onde | Exemplo |
|---|---|---|
| Novo indicador | `catalogo/indicadores/<id>.json` + cartão no tema | Preço do diesel, IPCA de aluguel |
| Novo tema | `catalogo/temas/<id>.json` + entrada em `catalogo/site.json` | Educação, saúde |
| Novo visual | `assets/js/visuais/<nome>.js` | Mapa, barras empilhadas |
| Novo adaptador | `scripts/adaptadores/<nome>.mjs` | Fonte oficial ainda sem coletor |
| Correção de texto / acessibilidade | HTML, CSS, frases dos cartões | Perguntas mais claras |

## Regras do site (mantenha)

- Cada cartão responde **uma pergunta** em linguagem do dia a dia.
- No máximo **3 cores** por gráfico; eixo começa no zero quando faz sentido.
- Sempre existe uma **tabela equivalente** ao gráfico.
- Dados gerados pelo coletor vão em `dados/` com `"origem": "api"`. Não edite esses arquivos à mão em PRs de indicador — ajuste o adaptador ou o catálogo.
- Use `"origem": "exemplo"` só para rascunhos locais; o site mostra o aviso de dados ilustrativos.

## Checklist do pull request

- [ ] Indicador em `rascunho` enquanto testa; `ativo` quando pronto para aparecer.
- [ ] Fonte oficial citada (`fonte.orgao`, `fonte.url`).
- [ ] Cartão no tema com `visual` adequado (veja a tabela em `docs/como-adicionar-dados.md`).
- [ ] `npm run validar` passa (quando o script existir).
- [ ] Site local abre e o cartão aparece (`npm run dev`).

## Segurança

- Nunca inclua chaves, tokens ou senhas em commits. O coletor usa só APIs públicas.
- Links em `fonte.url` precisam começar com `https://`; nomes de `id`, `visual` e `adaptador` usam só letras minúsculas, números e hífen. O `npm run validar` confere isso.
- Mudanças em `.github/`, `scripts/`, `assets/js/` e nas páginas HTML passam por revisão do mantenedor.
- Encontrou uma falha? Siga o [SECURITY.md](SECURITY.md) em vez de abrir uma issue pública.

## Conversas

Dúvidas sobre o contrato dos JSON: veja **[docs/arquitetura.md](docs/arquitetura.md)**.
Para ideias grandes (novo tema, novo órgão), abra uma issue antes do PR.
