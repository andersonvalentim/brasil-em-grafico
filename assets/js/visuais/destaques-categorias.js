/*
 * Destaques por categoria: o que mais subiu e o que mais caiu no último período.
 * opcoes.quantidade: quantos itens em cada grupo (padrão 5).
 */
(function () {
  "use strict";

  var BG = window.BG;
  var C = BG.visuaisComum;

  function grupos(ctx) {
    var periodo = ctx.dados.ultimoPeriodo;
    var n = ctx.opcoes.quantidade || 5;
    var valores = ctx.dados.categorias("BR").map(function (c) {
      var o = ctx.dados.noPeriodo("BR", periodo, c);
      return o ? { categoria: c, valor: o.valor } : null;
    }).filter(Boolean).sort(function (a, b) { return b.valor - a.valor; });
    return {
      periodo: periodo,
      subiram: valores.filter(function (v) { return v.valor > 0; }).slice(0, n),
      cairam: valores.filter(function (v) { return v.valor < 0; }).reverse().slice(0, n),
      todos: valores
    };
  }

  function juntar(nomes) {
    if (nomes.length <= 1) return nomes.join("");
    return nomes.slice(0, -1).join(", ") + " e " + nomes[nomes.length - 1];
  }

  BG.visuais.registrar("destaques-categorias", {
    resposta: function (ctx) {
      var g = grupos(ctx);
      var topo = g.subiram[0] || g.todos[0];
      if (!topo) return null;
      var frases = [];
      if (g.subiram.length) frases.push(juntar(g.subiram.slice(0, 2).map(function (v) { return v.categoria; })) + (g.subiram.length > 1 ? " foram os que mais subiram." : " foi o que mais subiu."));
      if (g.cairam.length) frases.push(juntar(g.cairam.slice(0, 3).map(function (v) { return v.categoria; })) + " ficaram mais baratos.");
      return {
        rotulo: topo.categoria,
        numero: (topo.valor > 0 ? "▲ " : "▼ ") + ctx.formatar(Math.abs(topo.valor)),
        unidade: (topo.valor > 0 ? "foi o que mais subiu em " : "variação em ") + C.rotuloPeriodo(ctx, g.periodo),
        destaque: true,
        frase: frases.join(" ")
      };
    },

    titulo: function (ctx) {
      var g = grupos(ctx);
      return { texto: "Quanto cada item subiu ou caiu em " + C.rotuloPeriodo(ctx, g.periodo), sub: "Os que mais subiram e os que mais caíram" };
    },

    legenda: function () {
      return [{ tipo: "destaque", rotulo: "▲ Subiu" }, { tipo: "dado", rotulo: "▼ Caiu" }];
    },

    desenhar: function (el, ctx) {
      var g = grupos(ctx);
      var max = Math.max.apply(null, g.todos.map(function (v) { return Math.abs(v.valor); }).concat([1]));
      el.innerHTML = (g.subiram.length ? '<h4 class="barras__grupo"><span aria-hidden="true">▲ </span>Os que mais subiram</h4><div data-g="sub"></div>' : "") +
        (g.cairam.length ? '<h4 class="barras__grupo"><span aria-hidden="true">▼ </span>Os que mais caíram</h4><div data-g="cai"></div>' : "");
      if (g.subiram.length) {
        BG.graficos.barras(BG.$("[data-g='sub']", el), g.subiram.map(function (v) {
          return { rotulo: v.categoria, valor: v.valor, texto: "subiu " + ctx.formatar(v.valor), tipo: "destaque" };
        }), { max: max });
      }
      if (g.cairam.length) {
        BG.graficos.barras(BG.$("[data-g='cai']", el), g.cairam.map(function (v) {
          return { rotulo: v.categoria, valor: v.valor, texto: "caiu " + ctx.formatar(Math.abs(v.valor)) };
        }), { max: max });
      }
    },

    tabela: function (ctx) {
      var g = grupos(ctx);
      return {
        legenda: "Variação de cada item em " + C.rotuloPeriodo(ctx, g.periodo),
        colunas: [{ titulo: "Item" }, { titulo: "Variação", num: true }],
        linhas: g.todos.map(function (v) {
          return { celulas: [v.categoria, (v.valor > 0 ? "+" : "") + ctx.formatar(v.valor)] };
        })
      };
    }
  });
})();
