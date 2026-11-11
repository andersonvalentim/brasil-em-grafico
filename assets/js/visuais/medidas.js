/*
 * Medidas: várias medidas do mesmo assunto lado a lado (ex.: desemprego, subutilização e desalento).
 * Cada medida mostra a pergunta que responde, o valor do ano mais recente e os anos anteriores.
 * Lê uma `categoria` por medida e um período por ano.
 * opcoes.ordem: as categorias, na ordem em que aparecem (a primeira é o número principal).
 * opcoes.perguntas: { categoria: "a pergunta que essa medida responde" }.
 * opcoes.formatos: { categoria: { "formato": "...", "casas": n } } quando a medida tem outra unidade.
 * opcoes.anos: quantos anos mostrar em cada medida (padrão 4).
 * Marcadores para os textos do cartão: {ano}, {medida1}, {medida2}, {medida3}...
 */
(function () {
  "use strict";

  var BG = window.BG;

  function localDoCartao(ctx) {
    var uf = ctx.estado.uf;
    return ctx.dados.observacoes.some(function (o) { return o.local === uf; }) ? uf : "BR";
  }

  function montar(ctx) {
    var local = localDoCartao(ctx);
    var ordem = ctx.opcoes.ordem || ctx.dados.categorias("BR");
    var formatos = ctx.opcoes.formatos || {};
    var anos = ctx.dados.periodos(function (o) { return o.local === local; }).slice(-(ctx.opcoes.anos || 4));
    var ultimo = anos[anos.length - 1];
    var medidas = ordem.map(function (cat) {
      var ind = Object.assign({}, ctx.indicador, formatos[cat] || {});
      var fmt = function (v, o) { return BG.formatar(ind, v, o); };
      var valores = anos.map(function (a) {
        var o = ctx.dados.noPeriodo(local, a, cat);
        return o ? o.valor : null;
      });
      var br = ctx.dados.noPeriodo("BR", ultimo, cat);
      return {
        categoria: cat,
        pergunta: (ctx.opcoes.perguntas || {})[cat] || "",
        fmt: fmt,
        valores: valores,
        atual: valores[valores.length - 1],
        anterior: valores.length > 1 ? valores[valores.length - 2] : null,
        brasil: local !== "BR" && br ? br.valor : null
      };
    });
    return { local: local, anos: anos, ultimo: ultimo, medidas: medidas };
  }

  function comparacao(m, med) {
    if (med.atual == null || med.anterior == null) return null;
    var antes = m.anos[m.anos.length - 2];
    if (med.atual === med.anterior) return { texto: "Igual a " + antes, icone: "info" };
    return {
      texto: (med.atual < med.anterior ? "Menor" : "Maior") + " que em " + antes + " (" + med.fmt(med.anterior) + ")",
      icone: med.atual < med.anterior ? "caiu" : "subiu"
    };
  }

  BG.visuais.registrar("medidas", {
    escopo: "estado",

    marcadores: function (ctx) {
      var m = montar(ctx);
      var extras = { ano: m.ultimo || "" };
      m.medidas.forEach(function (med, i) { extras["medida" + (i + 1)] = med.fmt(med.atual); });
      return extras;
    },

    resposta: function (ctx) {
      var m = montar(ctx);
      var principal = m.medidas[0];
      if (!principal || principal.atual == null) return null;
      var r = {
        numero: principal.fmt(principal.atual),
        unidade: (ctx.cartao.unidade ? ctx.texto(ctx.cartao.unidade) + " " : "") + "em " + m.ultimo,
        destaque: m.local !== "BR"
      };
      var c = comparacao(m, principal);
      if (c) r.pill = { texto: c.texto, icone: c.icone, neutra: true };
      return r;
    },

    titulo: function (ctx) {
      var m = montar(ctx);
      var lugar = m.local === "BR" ? "Brasil" : ctx.estado.nome;
      return {
        texto: (ctx.cartao.tituloGrafico || BG.cap(ctx.indicador.nome)) + ": " + lugar + (m.anos.length ? ", de " + m.anos[0] + " a " + m.ultimo : ""),
        sub: "Média de cada ano · cada medida responde a uma pergunta diferente"
      };
    },

    legenda: function (ctx) {
      var m = montar(ctx);
      return [{ tipo: "destaque", rotulo: String(m.ultimo) }, { tipo: "dado", rotulo: "Anos anteriores" }];
    },

    desenhar: function (el, ctx) {
      var m = montar(ctx);
      var pre = "medida-" + Math.random().toString(36).slice(2, 8);
      el.innerHTML = '<div class="medidas">' + m.medidas.map(function (med, i) {
        var c = comparacao(m, med);
        return '<section class="medida" aria-labelledby="' + pre + i + '">' +
          '<h4 id="' + pre + i + '">' + BG.escapar(med.categoria) + "</h4>" +
          (med.pergunta ? '<p class="medida__pergunta">' + BG.escapar(med.pergunta) + "</p>" : "") +
          '<p class="medida__valor"><span class="numero numero--medio">' + BG.escapar(med.fmt(med.atual)) + "</span>" +
          '<span class="numero__unidade">em ' + BG.escapar(m.ultimo) + (c ? " · " + BG.escapar(c.texto.charAt(0).toLowerCase() + c.texto.slice(1)) : "") + "</span>" +
          (med.brasil != null ? '<span class="numero__unidade">No Brasil: ' + BG.escapar(med.fmt(med.brasil)) + "</span>" : "") + "</p>" +
          '<div class="medida__anos" data-anos="' + i + '"></div></section>';
      }).join("") + "</div>";
      m.medidas.forEach(function (med, i) {
        var max = 0;
        med.valores.forEach(function (v) { if (v != null && Math.abs(v) > max) max = Math.abs(v); });
        var itens = m.anos.slice().reverse().map(function (a, j) {
          var v = med.valores[m.anos.length - 1 - j];
          return { rotulo: a, valor: v, texto: v == null ? "sem dado" : med.fmt(v, { curto: true }), tipo: v == null ? "sem-dado" : a === m.ultimo ? "destaque" : "" };
        });
        BG.graficos.barras(BG.$('[data-anos="' + i + '"]', el), itens, { max: max || 1 });
      });
    },

    tabela: function (ctx) {
      var m = montar(ctx);
      return {
        legenda: BG.cap(ctx.indicador.nome) + ", " + (m.local === "BR" ? "Brasil" : ctx.estado.nome) + (ctx.dados.origem !== "api" ? " (dados ilustrativos)" : ""),
        colunas: [{ titulo: "Ano" }].concat(m.medidas.map(function (med) { return { titulo: med.categoria, num: true }; })),
        linhas: m.anos.slice().reverse().map(function (a, j) {
          var i = m.anos.length - 1 - j;
          return { celulas: [a].concat(m.medidas.map(function (med) { return med.fmt(med.valores[i]); })) };
        })
      };
    }
  });
})();
