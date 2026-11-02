/* Seu estado × média do Brasil × até 3 estados vizinhos, do maior para o menor. */
(function () {
  "use strict";

  var BG = window.BG;
  var C = BG.visuaisComum;

  function itens(ctx) {
    var e = ctx.estado;
    var lista = [];
    var br = ctx.dados.ultimo("BR");
    if (br) lista.push({ uf: "BR", rotulo: "Média do Brasil", valor: br.valor, tipo: "brasil" });
    if (ctx.temEstado) lista.push({ uf: e.uf, rotulo: C.rotuloLocal(ctx, e.uf) + ", seu estado", valor: ctx.dados.ultimo(e.uf).valor, tipo: "destaque" });
    (e.vizinhos || []).filter(function (uf) { return ctx.dados.tem(uf); }).slice(0, 3).forEach(function (uf) {
      lista.push({ uf: uf, rotulo: C.rotuloLocal(ctx, uf) + ", vizinho", valor: ctx.dados.ultimo(uf).valor, tipo: "contexto" });
    });
    lista.forEach(function (i) { i.texto = ctx.formatar(i.valor); });
    return lista.sort(function (a, b) { return b.valor - a.valor; });
  }

  BG.visuais.registrar("comparativo-local", {
    escopo: "estado",

    resposta: function (ctx) {
      if (!ctx.temEstado) {
        return { numero: ctx.marcadores.valorBrasil, unidade: "na média do Brasil", aviso: BG.avisoSemCobertura(ctx) };
      }
      var valor = ctx.dados.ultimo(ctx.estado.uf).valor;
      var br = ctx.dados.ultimo("BR");
      var d = br ? BG.textoDiferenca(ctx.indicador, valor, br.valor) : null;
      return {
        rotulo: ctx.cartao.rotulo ? ctx.texto(ctx.cartao.rotulo) : null,
        numero: ctx.marcadores.valorEstado,
        unidade: ctx.cartao.unidade ? ctx.texto(ctx.cartao.unidade) : "em " + ctx.marcadores.periodo,
        destaque: true,
        pill: d ? { texto: C.textoComparadoBrasil(ctx, valor), icone: d.igual ? "info" : d.sinal > 0 ? "subiu" : "caiu" } : null,
        frase: br ? "Na média do Brasil, o valor é " + ctx.marcadores.valorBrasil + "." : ""
      };
    },

    titulo: function (ctx) {
      return { texto: BG.cap(ctx.indicador.nome) + ": seu estado, vizinhos e Brasil", sub: "Do maior para o menor" };
    },

    legenda: function () {
      return [{ tipo: "destaque", rotulo: "Seu estado" }, { tipo: "brasil", rotulo: "Média do Brasil" }, { tipo: "contexto", rotulo: "Estados vizinhos" }];
    },

    desenhar: function (el, ctx) {
      BG.graficos.barras(el, itens(ctx));
    },

    tabela: function (ctx) {
      var br = ctx.dados.ultimo("BR");
      var postos = (ctx.dados.extras || {}).postosPesquisados;
      return {
        legenda: BG.cap(ctx.indicador.nome) + ": " + ctx.estado.nome + ", vizinhos e Brasil" + (ctx.dados.origem !== "api" ? " (dados ilustrativos)" : ""),
        colunas: [{ titulo: "Lugar" }, { titulo: "Valor", num: true }, { titulo: "Diferença para o Brasil", num: true }]
          .concat(postos ? [{ titulo: "Postos pesquisados", num: true }] : []),
        linhas: itens(ctx).map(function (i) {
          var dif = i.uf === "BR" || !br ? "Referência" : BG.textoDiferenca(ctx.indicador, i.valor, br.valor).texto;
          return {
            celulas: [i.rotulo, i.texto, dif].concat(postos ? [postos[i.uf] != null ? BG.fmt.num(postos[i.uf]) : "—"] : []),
            classe: i.tipo === "destaque" ? "linha-destaque" : i.tipo === "brasil" ? "linha-brasil" : ""
          };
        })
      };
    }
  });
})();
