/*
 * Pictograma de 100 pessoas: "em cada 100, X…". Serve para porcentagens entre 0 e 100.
 * opcoes.rotulos: ["sem trabalho", "trabalhando"] — o que são os pontos em destaque e os demais.
 */
(function () {
  "use strict";

  var BG = window.BG;

  function valor(ctx) {
    var o = ctx.dados.ultimo(ctx.local);
    return o ? o.valor : null;
  }

  BG.visuais.registrar("pictograma", {
    escopo: "estado",

    resposta: function (ctx) {
      var v = valor(ctx);
      var r = {
        numero: ctx.formatar(v),
        unidade: ctx.cartao.unidade ? ctx.texto(ctx.cartao.unidade) : "em " + ctx.marcadores.periodo,
        destaque: ctx.local !== "BR",
        frase: Math.round(v) + " em cada 100. A média do Brasil é " + ctx.marcadores.valorBrasil + "."
      };
      if (!ctx.temEstado) r.aviso = BG.avisoSemCobertura(ctx);
      return r;
    },

    titulo: function (ctx) {
      return { texto: ctx.cartao.tituloGrafico || "Em cada 100 pessoas" };
    },

    legenda: function (ctx) {
      var n = Math.round(valor(ctx));
      var rotulos = ctx.opcoes.rotulos || ["", ""];
      return [{ tipo: "destaque", rotulo: n + " " + rotulos[0] }, { tipo: "dado", rotulo: 100 - n + " " + rotulos[1] }];
    },

    desenhar: function (el, ctx) {
      var n = Math.round(valor(ctx));
      BG.graficos.pontos(el, n, "Em cada 100, " + n + " " + ((ctx.opcoes.rotulos || [""])[0] || "") + ".");
    },

    tabela: function (ctx) {
      var linhas = [];
      if (ctx.local !== "BR") {
        var e = ctx.dados.ultimo(ctx.local);
        linhas.push({ celulas: [ctx.estado.nome, ctx.formatar(e.valor), Math.round(e.valor) + " em cada 100"], classe: "linha-destaque" });
      }
      var br = ctx.dados.ultimo("BR");
      if (br) linhas.push({ celulas: ["Média do Brasil", ctx.formatar(br.valor), Math.round(br.valor) + " em cada 100"], classe: "linha-brasil" });
      return {
        legenda: BG.cap(ctx.indicador.nome) + " — " + ctx.marcadores.periodo,
        colunas: [{ titulo: "Lugar" }, { titulo: "Valor", num: true }, { titulo: "Em cada 100", num: true }],
        linhas: linhas
      };
    }
  });
})();
