/* Ajudantes compartilhados pelos visuais */
(function () {
  "use strict";

  var BG = window.BG;

  BG.visuaisComum = {
    /* Nome do lugar como aparece nos gráficos ("Bahia" ou "Salvador e região" quando opcoes.area). */
    rotuloLocal: function (ctx, uf) {
      if (uf === "BR") return "Brasil";
      var e = BG.locais.porUf[uf];
      if (!e) return uf;
      return ctx.opcoes.area && e.areaIpca ? e.nome + " (" + e.areaIpca + ")" : e.nome;
    },

    /* Formato curto para os eixos, sem casas decimais quando o passo é inteiro. */
    formatoEixo: function (ctx, passo) {
      var casas = passo >= 1 || passo === 0 ? 0 : passo >= 0.1 ? 1 : 2;
      return function (v) {
        return BG.formatar(ctx.indicador, v, { casas: casas, curto: true });
      };
    },

    /* Último valor de cada estado (e do Brasil), já com o rótulo. */
    ultimosPorEstado: function (ctx) {
      return BG.locais.estados.map(function (e) {
        var obs = ctx.dados.ultimo(e.uf);
        return { uf: e.uf, estado: e, valor: obs ? obs.valor : null, periodo: obs ? obs.periodo : null };
      });
    },

    textoComparadoBrasil: function (ctx, valor) {
      var br = ctx.dados.ultimo("BR");
      if (!br || valor == null) return "";
      var d = BG.textoDiferenca(ctx.indicador, valor, br.valor);
      if (d.igual) return "Igual à média do Brasil";
      return BG.cap(d.texto) + (ctx.indicador.formato === "pct" ? " da média do Brasil" : " que a média do Brasil");
    },

    rotuloPeriodo: function (ctx, periodo) {
      var parcial = ctx.dados.notas && ctx.dados.notas.anoParcialAte;
      if (parcial && parcial.slice(0, 4) === periodo) return periodo + " (até " + BG.periodo.longo(parcial).replace(/ de \d{4}$/, "") + ")";
      return BG.periodo.longo(periodo);
    }
  };
})();
