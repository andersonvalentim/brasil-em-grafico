/*
 * Medidas: várias medidas do mesmo assunto lado a lado (ex.: desemprego, subutilização e desalento).
 * Cada medida mostra a pergunta que responde, o valor mais recente e os períodos anteriores.
 * Lê uma `categoria` por medida.
 * opcoes.ordem: as categorias mostradas, na ordem (a primeira é o número principal).
 * opcoes.perguntas: { categoria: "a pergunta que essa medida responde" }.
 * opcoes.formatos: { categoria: { "formato": "...", "casas": n } } quando a medida tem outra unidade.
 * opcoes.contagens: { categoria: "categoria com o número de pessoas" }, mostrado junto da taxa.
 * opcoes.mesmoPeriodo: em dados trimestrais, compara e mostra o mesmo trimestre de cada ano.
 * opcoes.periodos: quantos períodos mostrar em cada medida (padrão 4).
 * opcoes.subtitulo: texto abaixo do título do gráfico.
 * Marcadores para os textos do cartão: {ano}, {medida1}, {medida2}..., {contagem1}, {contagem2}...
 */
(function () {
  "use strict";

  var BG = window.BG;

  function noPeriodo(p) {
    return (/T\d$/.test(p) ? "no " : "em ") + BG.periodo.longo(p);
  }

  function localDoCartao(ctx) {
    var uf = ctx.estado.uf;
    return ctx.dados.observacoes.some(function (o) { return o.local === uf; }) ? uf : "BR";
  }

  function anoAntes(p) {
    return String(Number(p.slice(0, 4)) - 1) + p.slice(4);
  }

  function montar(ctx) {
    var op = ctx.opcoes;
    var local = localDoCartao(ctx);
    var ordem = op.ordem || ctx.dados.categorias("BR");
    var formatos = op.formatos || {};
    var contagens = op.contagens || {};
    var todos = ctx.dados.periodos(function (o) { return o.local === local && ordem.indexOf(o.categoria) !== -1; });
    var ultimo = todos[todos.length - 1];
    var n = op.periodos || op.anos || 4;
    var periodos = op.mesmoPeriodo
      ? todos.filter(function (p) { return p.slice(4) === ultimo.slice(4); }).slice(-n)
      : todos.slice(-n);
    var referencia = op.mesmoPeriodo ? anoAntes(ultimo) : todos[todos.length - 2];
    var pessoas = Object.assign({}, ctx.indicador, { formato: "pessoas", casas: 1 });

    var medidas = ordem.map(function (cat) {
      var ind = Object.assign({}, ctx.indicador, formatos[cat] || {});
      var valor = function (p, c) { var o = p && ctx.dados.noPeriodo(local, p, c || cat); return o ? o.valor : null; };
      var br = local !== "BR" ? ctx.dados.noPeriodo("BR", ultimo, cat) : null;
      return {
        categoria: cat,
        pergunta: (op.perguntas || {})[cat] || "",
        fmt: function (v, o) { return BG.formatar(ind, v, o); },
        valores: periodos.map(function (p) { return valor(p); }),
        atual: valor(ultimo),
        anterior: valor(referencia),
        contagem: contagens[cat] ? valor(ultimo, contagens[cat]) : null,
        contagens: contagens[cat] ? periodos.map(function (p) { return valor(p, contagens[cat]); }) : null,
        brasil: br ? br.valor : null
      };
    });
    return { local: local, periodos: periodos, ultimo: ultimo, referencia: referencia, medidas: medidas, pessoas: pessoas };
  }

  function comparacao(m, med) {
    if (med.atual == null || med.anterior == null) return null;
    var quando = noPeriodo(m.referencia);
    if (med.atual === med.anterior) return { texto: "Igual " + quando, icone: "info" };
    return {
      texto: (med.atual < med.anterior ? "Menor" : "Maior") + " que " + quando + " (" + med.fmt(med.anterior) + ")",
      icone: med.atual < med.anterior ? "caiu" : "subiu"
    };
  }

  function minuscula(t) {
    return t.charAt(0).toLowerCase() + t.slice(1);
  }

  BG.visuais.registrar("medidas", {
    escopo: "estado",

    marcadores: function (ctx) {
      var m = montar(ctx);
      var extras = { ano: BG.periodo.longo(m.ultimo || "") };
      var k = 0;
      m.medidas.forEach(function (med, i) {
        extras["medida" + (i + 1)] = med.fmt(med.atual);
        if (med.contagem != null) extras["contagem" + (++k)] = BG.formatar(m.pessoas, med.contagem);
      });
      return extras;
    },

    resposta: function (ctx) {
      var m = montar(ctx);
      var principal = m.medidas[0];
      if (!principal || principal.atual == null) return null;
      var r = {
        numero: principal.fmt(principal.atual),
        unidade: (ctx.cartao.unidade ? ctx.texto(ctx.cartao.unidade) + " " : "") + noPeriodo(m.ultimo),
        destaque: m.local !== "BR"
      };
      var c = comparacao(m, principal);
      if (c) r.pill = { texto: c.texto, icone: c.icone, neutra: true };
      return r;
    },

    titulo: function (ctx) {
      var m = montar(ctx);
      var lugar = m.local === "BR" ? "Brasil" : ctx.estado.nome;
      var curto = function (p) { return /T\d$/.test(p) ? BG.periodo.curto(p) : p; };
      return {
        texto: (ctx.cartao.tituloGrafico || BG.cap(ctx.indicador.nome)) + ": " + lugar +
          (m.periodos.length ? ", de " + curto(m.periodos[0]) + " a " + curto(m.ultimo) : ""),
        sub: ctx.opcoes.subtitulo || "Cada medida responde a uma pergunta diferente"
      };
    },

    legenda: function (ctx) {
      var m = montar(ctx);
      return [{ tipo: "destaque", rotulo: BG.cap(BG.periodo.longo(m.ultimo)) }, { tipo: "dado", rotulo: "Anteriores" }];
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
          (med.contagem != null ? '<span class="numero__unidade medida__contagem">cerca de ' + BG.escapar(BG.formatar(m.pessoas, med.contagem)) + "</span>" : "") +
          '<span class="numero__unidade">' + BG.escapar(noPeriodo(m.ultimo)) + (c ? " · " + BG.escapar(minuscula(c.texto)) : "") + "</span>" +
          (med.brasil != null ? '<span class="numero__unidade">No Brasil: ' + BG.escapar(med.fmt(med.brasil)) + "</span>" : "") + "</p>" +
          '<div class="medida__anos" data-anos="' + i + '"></div></section>';
      }).join("") + "</div>";
      m.medidas.forEach(function (med, i) {
        var max = 0;
        med.valores.forEach(function (v) { if (v != null && Math.abs(v) > max) max = Math.abs(v); });
        var itens = m.periodos.slice().reverse().map(function (p, j) {
          var v = med.valores[m.periodos.length - 1 - j];
          return {
            rotulo: /T\d$/.test(p) ? BG.periodo.curto(p) : p,
            valor: v,
            texto: v == null ? "sem dado" : med.fmt(v, { curto: true }),
            tipo: v == null ? "sem-dado" : p === m.ultimo ? "destaque" : ""
          };
        });
        BG.graficos.barras(BG.$('[data-anos="' + i + '"]', el), itens, { max: max || 1 });
      });
    },

    tabela: function (ctx) {
      var m = montar(ctx);
      var colunas = [{ titulo: "Período" }];
      m.medidas.forEach(function (med) {
        colunas.push({ titulo: med.categoria, num: true });
        if (med.contagens) colunas.push({ titulo: med.categoria + " (pessoas)", num: true });
      });
      return {
        legenda: BG.cap(ctx.indicador.nome) + ", " + (m.local === "BR" ? "Brasil" : ctx.estado.nome) + (ctx.dados.origem !== "api" ? " (dados ilustrativos)" : ""),
        colunas: colunas,
        linhas: m.periodos.slice().reverse().map(function (p, j) {
          var i = m.periodos.length - 1 - j;
          var celulas = [BG.cap(BG.periodo.longo(p))];
          m.medidas.forEach(function (med) {
            celulas.push(med.fmt(med.valores[i]));
            if (med.contagens) celulas.push(BG.formatar(m.pessoas, med.contagens[i]));
          });
          return { celulas: celulas };
        })
      };
    }
  });
})();
