/*
 * Histograma: quantos estados ficam em cada faixa de valor. A faixa do seu estado fica em destaque.
 * opcoes.faixa: largura de cada faixa na unidade do indicador (padrão: automático).
 */
(function () {
  "use strict";

  var BG = window.BG;
  var C = BG.visuaisComum;

  function faixas(ctx) {
    var ests = C.ultimosPorEstado(ctx).filter(function (e) { return e.valor != null; });
    if (!ests.length) return { lista: [] };
    var min = Math.min.apply(null, ests.map(function (e) { return e.valor; }));
    var max = Math.max.apply(null, ests.map(function (e) { return e.valor; }));
    var largura = ctx.opcoes.faixa || BG.escala((max - min) || 1).passo;
    var inicio = Math.floor(min / largura) * largura;
    var lista = [];
    for (var a = inicio; a <= max; a += largura) {
      var b = a + largura;
      var dentro = ests.filter(function (e) { return e.valor >= a - 1e-9 && e.valor < b - 1e-9; });
      lista.push({
        de: a,
        ate: b,
        rotulo: "De " + ctx.formatar(a, { casas: largura >= 1 ? 0 : 1 }) + " a " + ctx.formatar(b, { casas: largura >= 1 ? 0 : 1 }),
        estados: dentro,
        meu: dentro.some(function (e) { return e.uf === ctx.estado.uf; })
      });
    }
    return { lista: lista, total: ests.length };
  }

  BG.visuais.registrar("histograma", {
    escopo: "estado",
    comparaEstados: true,

    resposta: function (ctx) {
      var f = faixas(ctx);
      var comum = f.lista.slice().sort(function (a, b) { return b.estados.length - a.estados.length; })[0];
      if (!comum) return null;
      var meu = f.lista.filter(function (x) { return x.meu; })[0];
      var frase = "";
      if (meu) {
        var outros = meu.estados.length - 1;
        frase = ctx.estado.nome + " está na faixa " + meu.rotulo.toLowerCase().replace(/^de /, "de ") + (outros ? ", junto com mais " + outros + (outros === 1 ? " estado" : " estados") : ", sozinho") + ". ";
      }
      frase += "A faixa mais comum é " + comum.rotulo.toLowerCase() + ", com " + comum.estados.length + " estados.";
      var r = {
        numero: meu ? ctx.marcadores.valorEstado : comum.estados.length + " estados",
        unidade: meu ? "em " + ctx.marcadores.periodo : "na faixa mais comum",
        destaque: !!meu,
        frase: frase
      };
      if (!ctx.temEstado) r.aviso = BG.avisoSemCobertura(ctx);
      return r;
    },

    titulo: function (ctx) {
      return { texto: "Quantos estados há em cada faixa", sub: BG.cap(ctx.indicador.nome) };
    },

    legenda: function () {
      return [{ tipo: "destaque", rotulo: "Faixa do seu estado" }, { tipo: "dado", rotulo: "Outras faixas" }];
    },

    desenhar: function (el, ctx) {
      var f = faixas(ctx);
      var max = Math.max.apply(null, f.lista.map(function (x) { return x.estados.length; }).concat([1]));
      el.innerHTML = '<ul class="barras">' + f.lista.map(function (x) {
        var n = x.estados.length;
        return '<li class="barra' + (x.meu ? " barra--destaque" : "") + '">' +
          '<div class="barra__topo"><span>' + BG.escapar(x.rotulo) + '</span><span class="barra__valor">' + n + (n === 1 ? " estado" : " estados") + "</span></div>" +
          '<div class="barra__trilho" aria-hidden="true"><div class="barra__preenchimento" style="--largura:' + (n ? Math.max(2, (n / max) * 100) : 0).toFixed(1) + '%"></div></div>' +
          (n ? '<p class="barra__nomes">' + x.estados.map(function (e) { return BG.escapar(e.estado.nome); }).join(", ") + "</p>" : "") + "</li>";
      }).join("") + "</ul>";
    },

    tabela: function (ctx) {
      return {
        legenda: "Estados por faixa: " + ctx.indicador.nome,
        colunas: [{ titulo: "Faixa" }, { titulo: "Quantidade", num: true }, { titulo: "Estados" }],
        linhas: faixas(ctx).lista.map(function (x) {
          return {
            celulas: [x.rotulo, String(x.estados.length), x.estados.map(function (e) { return e.estado.nome + " (" + ctx.formatar(e.valor) + ")"; }).join(", ") || "—"],
            classe: x.meu ? "linha-destaque" : ""
          };
        })
      };
    }
  });
})();
