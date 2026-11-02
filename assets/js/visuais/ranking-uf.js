/*
 * Ranking dos estados em barras horizontais, do maior para o menor, com o seu estado em destaque.
 * opcoes.semBrasil: não mostra a linha "Média do Brasil" (para totais, como população).
 * opcoes.area: mostra o nome da área pesquisada (ex.: "Bahia (Salvador e região)").
 */
(function () {
  "use strict";

  var BG = window.BG;
  var C = BG.visuaisComum;

  function itens(ctx) {
    var ests = C.ultimosPorEstado(ctx);
    var comDado = ests.filter(function (e) { return e.valor != null; }).sort(function (a, b) { return b.valor - a.valor; });
    var semDado = ests.filter(function (e) { return e.valor == null; });
    var br = ctx.dados.ultimo("BR");
    var lista = [];
    var brasilPosto = !!ctx.opcoes.semBrasil || !br;
    comDado.forEach(function (e) {
      if (!brasilPosto && e.valor < br.valor) {
        lista.push({ rotulo: "Média do Brasil", valor: br.valor, texto: ctx.formatar(br.valor), tipo: "brasil", uf: "BR" });
        brasilPosto = true;
      }
      var meu = e.uf === ctx.estado.uf;
      lista.push({ rotulo: C.rotuloLocal(ctx, e.uf) + (meu ? ", seu estado" : ""), valor: e.valor, texto: ctx.formatar(e.valor), tipo: meu ? "destaque" : "", uf: e.uf });
    });
    if (!brasilPosto) lista.push({ rotulo: "Média do Brasil", valor: br.valor, texto: ctx.formatar(br.valor), tipo: "brasil", uf: "BR" });
    semDado.forEach(function (e) {
      var meu = e.uf === ctx.estado.uf;
      lista.push({ rotulo: e.estado.nome + (meu ? ", seu estado" : ""), valor: null, texto: "sem dado", tipo: meu ? "sem-dado destaque" : "sem-dado", uf: e.uf });
    });
    return { lista: lista, comDado: comDado, semDado: semDado };
  }

  BG.visuais.registrar("ranking-uf", {
    escopo: "estado",

    resposta: function (ctx) {
      var it = itens(ctx);
      var m = ctx.marcadores;
      if (!ctx.temEstado) {
        return {
          pill: { texto: ctx.estado.nome + ": sem dado", icone: "estado", neutra: true },
          frase: ctx.dados.tem("BR") && !ctx.opcoes.semBrasil ? "A média do Brasil é " + m.valorBrasil + "." : "",
          aviso: BG.avisoSemCobertura(ctx)
        };
      }
      var posicao = it.comDado.map(function (e) { return e.uf; }).indexOf(ctx.estado.uf) + 1;
      var frase = ctx.opcoes.semBrasil
        ? ctx.estado.nome + " está em " + posicao + "º lugar entre os " + it.comDado.length + " estados."
        : BG.cap(m.naArea) + ", o valor é " + m.valorEstado + ", " + m.comparacao + ". A média do Brasil é " + m.valorBrasil + ".";
      return { pill: { texto: ctx.estado.nome + ": " + m.valorEstado, icone: "estado" }, frase: frase };
    },

    titulo: function (ctx) {
      return { texto: BG.cap(ctx.indicador.nome) + ", por estado", sub: "Do maior para o menor · o eixo começa no zero" };
    },

    legenda: function (ctx) {
      var it = itens(ctx);
      var l = [{ tipo: "destaque", rotulo: "Seu estado" }, { tipo: "dado", rotulo: "Outros estados" }];
      if (!ctx.opcoes.semBrasil) l.push({ tipo: "brasil", rotulo: "Média do Brasil" });
      if (it.semDado.length) l.push({ tipo: "sem-dado", rotulo: "Sem dado" });
      return l;
    },

    desenhar: function (el, ctx) {
      BG.graficos.barras(el, itens(ctx).lista);
    },

    tabela: function (ctx) {
      var pos = 0;
      var semBrasil = ctx.opcoes.semBrasil;
      var br = ctx.dados.ultimo("BR");
      return {
        legenda: BG.cap(ctx.indicador.nome) + ", por estado" + (ctx.dados.origem !== "api" ? " (dados ilustrativos)" : ""),
        colunas: [{ titulo: "Estado" }, { titulo: "Posição", num: true }, { titulo: "Valor", num: true }].concat(semBrasil ? [] : [{ titulo: "Comparado ao Brasil" }]),
        linhas: itens(ctx).lista.map(function (i) {
          var destaque = /destaque/.test(i.tipo) ? "linha-destaque" : "";
          if (i.uf === "BR") return { celulas: ["Média do Brasil", "—", i.texto, "Referência"], classe: "linha-brasil" };
          if (i.valor == null) return { celulas: [i.rotulo, "—", "sem dado"].concat(semBrasil ? [] : ["—"]), classe: destaque };
          pos++;
          return { celulas: [i.rotulo, pos + "º", i.texto].concat(semBrasil ? [] : [BG.cap(BG.comparaMedia(i.valor, br && br.valor))]), classe: destaque };
        })
      };
    }
  });
})();
