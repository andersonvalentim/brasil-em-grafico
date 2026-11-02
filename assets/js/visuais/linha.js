/*
 * Linha: como um número mudou com o tempo.
 * opcoes.locais: ["BR"] (padrão) ou ["estado", "BR"]; opcoes.periodos: quantos pontos mostrar (padrão 24).
 */
(function () {
  "use strict";

  var BG = window.BG;
  var C = BG.visuaisComum;

  function montarSeries(ctx) {
    var pedidos = ctx.opcoes.locais || ["BR"];
    var locais = [];
    pedidos.forEach(function (l) {
      if (l === "estado") {
        if (ctx.temEstado) locais.push(ctx.estado.uf);
      } else if (ctx.dados.tem(l)) {
        locais.push(l);
      }
    });
    if (!locais.length) locais = ["BR"];

    var todos = {};
    locais.forEach(function (uf) { ctx.dados.serie(uf).forEach(function (o) { todos[o.periodo] = true; }); });
    var periodos = Object.keys(todos).sort().slice(-(ctx.opcoes.periodos || 24));
    var refs = ctx.indicador.referencias || [];
    var duas = locais.length > 1;

    var series = locais.map(function (uf, i) {
      var tipo = !duas ? "dado" : i === 0 ? "destaque" : refs.length ? "contexto" : "brasil";
      return {
        uf: uf,
        nome: C.rotuloLocal(ctx, uf),
        tipo: tipo,
        tracejada: tipo === "brasil",
        valores: periodos.map(function (p) {
          var o = ctx.dados.noPeriodo(uf, p);
          return o ? o.valor : null;
        })
      };
    });
    refs.forEach(function (r) {
      series.push({ nome: r.rotulo, tipo: "brasil", tracejada: true, referencia: true, valores: periodos.map(function () { return r.valor; }) });
    });
    return { periodos: periodos, series: series, pediuEstado: pedidos.indexOf("estado") !== -1 };
  }

  function ultimoValido(s) {
    for (var i = s.valores.length - 1; i >= 0; i--) if (s.valores[i] != null) return s.valores[i];
    return null;
  }

  BG.visuais.registrar("linha", {
    escopo: function (config) {
      return ((config.opcoes || {}).locais || []).indexOf("estado") !== -1 ? "estado" : "brasil";
    },

    resposta: function (ctx) {
      var m = montarSeries(ctx);
      var principal = m.series[0];
      var r = {
        numero: ctx.formatar(ultimoValido(principal)),
        unidade: ctx.cartao.unidade ? ctx.texto(ctx.cartao.unidade) : "em " + ctx.marcadores.periodo,
        destaque: principal.tipo === "destaque"
      };
      if (ctx.marcadores.variacao && ctx.marcadores.periodoAnterior) {
        r.pill = {
          texto: ctx.marcadores.variacao + " desde " + ctx.marcadores.periodoAnterior,
          icone: /^Subiu/.test(ctx.marcadores.variacao) ? "subiu" : /^Caiu/.test(ctx.marcadores.variacao) ? "caiu" : "info",
          neutra: true
        };
      }
      if (m.series.filter(function (s) { return !s.referencia; }).length > 1) {
        r.frase = ctx.texto("{comparacao}, que é {valorBrasil}.");
        r.frase = BG.cap(r.frase);
      }
      if (m.pediuEstado && !ctx.temEstado) r.aviso = BG.avisoSemCobertura(ctx);
      return r;
    },

    titulo: function (ctx) {
      var m = montarSeries(ctx);
      return { texto: BG.cap(ctx.indicador.nome) + (m.periodos.length ? ", de " + BG.periodo.curto(m.periodos[0]) + " a " + BG.periodo.curto(m.periodos[m.periodos.length - 1]) : ""), sub: "O eixo começa no zero" };
    },

    legenda: function (ctx) {
      return montarSeries(ctx).series.map(function (s) {
        return { tipo: s.tipo, rotulo: s.nome + (s.referencia ? " (" + ctx.formatar(s.valores[0]) + ")" : "") };
      });
    },

    desenhar: function (el, ctx) {
      var m = montarSeries(ctx);
      var maior = 0;
      m.series.forEach(function (s) { s.valores.forEach(function (v) { if (v != null && v > maior) maior = v; }); });
      var esc = BG.escala(maior * 1.05);
      el.className = "grafico-linha";
      var ultimo = m.series[0];
      BG.graficos.linha(el, {
        rotulos: m.periodos.map(BG.periodo.curto),
        series: m.series,
        max: esc.max,
        passo: esc.passo,
        formato: ctx.formatar,
        formatoEixo: C.formatoEixo(ctx, esc.passo),
        descricao: "Gráfico de linha: " + ctx.indicador.nome + ". " + ultimo.nome + " está em " + ctx.formatar(ultimoValido(ultimo)) +
          " em " + ctx.marcadores.periodo + "."
      });
    },

    tabela: function (ctx) {
      var m = montarSeries(ctx);
      return {
        legenda: BG.cap(ctx.indicador.nome) + (ctx.dados.origem !== "api" ? " (dados ilustrativos)" : ""),
        colunas: [{ titulo: "Período" }].concat(m.series.map(function (s) { return { titulo: s.nome, num: true }; })),
        linhas: m.periodos.slice().reverse().map(function (p) {
          var i = m.periodos.indexOf(p);
          return { celulas: [BG.cap(BG.periodo.longo(p))].concat(m.series.map(function (s) { return ctx.formatar(s.valores[i]); })) };
        })
      };
    }
  });
})();
