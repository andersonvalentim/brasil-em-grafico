# Brasil em Gráfico

Site estático e acessível que traduz dados oficiais do Brasil em perguntas simples e gráficos claros.

Qualquer pessoa pode contribuir com **novos indicadores**, **temas** ou **tipos de gráfico** — sem precisar reescrever o HTML. O catálogo em JSON define o que aparece; o coletor preenche os números; o motor desenha.

## Como o projeto se organiza

```
catalogo/   O QUE mostrar (indicadores, temas, páginas)  …… editado por pessoas
dados/      OS NÚMEROS, um arquivo por indicador ……… gerado pelo coletor
assets/js/  COMO mostrar (páginas + visuais) …………… código
scripts/    DE ONDE vêm os números (adaptadores) ……… código
docs/       Contratos e guias de contribuição
```

## Rodar localmente

```bash
npm install
npm run dados      # atualiza dados/ a partir das fontes oficiais
npm run dev        # sobe http://127.0.0.1:8642
```

Se o coletor ainda não estiver disponível, o site usa os arquivos em `dados/` com `"origem": "exemplo"` (o site avisa que são ilustrativos).

## Como contribuir

Leia **[CONTRIBUTING.md](CONTRIBUTING.md)** e o guia prático **[docs/como-adicionar-dados.md](docs/como-adicionar-dados.md)**.

Em resumo:

1. Cadastre um indicador em `catalogo/indicadores/<id>.json` (`status: "rascunho"`).
2. Informe a fonte (`fonte.adaptador` + `fonte.parametros`).
3. Colete e confira (`npm run dados -- --so <id>`).
4. Escolha o visual em um cartão de `catalogo/temas/<tema>.json`.
5. Mude para `status: "ativo"` e abra um pull request.

Para um tipo de gráfico novo, veja a seção “Criar um tipo de gráfico novo” no guia.

## Licença

MIT — veja [LICENSE](LICENSE).
Os dados oficiais continuam pertencendo às suas fontes (IBGE, BCB, ANP, ANEEL etc.).
