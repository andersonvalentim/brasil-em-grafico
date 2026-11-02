/* Número grande: só a resposta, sem gráfico. Útil para indicadores novos ou de valor único. */
(function () {
  "use strict";

  var BG = window.BG;
  var C = BG.visuaisComum;

  BG.visuais.registrar("numero", {
    semGrafico: true,

    resposta: function (ctx) {
      return {
        numero: ctx.marcadores.valor,
        unidade: ctx.cartao.unidade ? ctx.texto(ctx.cartao.unidade) : "em " + ctx.marcadores.periodo,
        destaque: ctx.local !== "BR",
        frase: ctx.marcadores.variacao ? ctx.marcadores.variacao + " desde " + ctx.marcadores.periodoAnterior + "." : ""
      };
    },

    tabela: function (ctx) {
      var linhas = [];
      var br = ctx.dados.ultimo("BR");
      if (br) linhas.push({ celulas: ["Brasil", ctx.formatar(br.valor), BG.cap(BG.periodo.longo(br.periodo))], classe: "linha-brasil" });
      C.ultimosPorEstado(ctx).forEach(function (e) {
        if (e.valor != null) linhas.push({ celulas: [e.estado.nome, ctx.formatar(e.valor), BG.cap(BG.periodo.longo(e.periodo))], classe: e.uf === ctx.estado.uf ? "linha-destaque" : "" });
      });
      return { legenda: BG.cap(ctx.indicador.nome), colunas: [{ titulo: "Lugar" }, { titulo: "Valor", num: true }, { titulo: "Período" }], linhas: linhas };
    }
  });
})();
