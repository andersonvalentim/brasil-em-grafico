/*
 * Anual: quanto um número mudou em cada ano, de um ano para o outro (ex.: inflação de dezembro a dezembro).
 * Uma barra por ano, do mais recente para o mais antigo; o ano em andamento aparece como parcial.
 * opcoes.locais: ["BR"] (padrão) ou ["estado", "BR"]; opcoes.anos: quantos anos mostrar (padrão 6).
 */
(function () {
  "use strict";

  var BG = window.BG;
  var C = BG.visuaisComum;

  function montar(ctx) {
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

    var anos = ctx.dados.serie(locais[0]).map(function (o) { return o.periodo; }).slice(-(ctx.opcoes.anos || 6));
    var parcialAte = ctx.dados.notas.anoParcialAte || "";
    var anoParcial = parcialAte.slice(0, 4);
    var completos = anos.filter(function (a) { return a !== anoParcial; });

    var series = locais.map(function (uf, i) {
      var valores = {};
      anos.forEach(function (a) {
        var o = ctx.dados.noPeriodo(uf, a);
        valores[a] = o ? o.valor : null;
      });
      return { uf: uf, nome: C.rotuloLocal(ctx, uf), principal: i === 0, valores: valores };
    });

    return {
      anos: anos, series: series, anoParcial: anoParcial, parcialAte: parcialAte,
      ultimo: completos[completos.length - 1], anterior: completos[completos.length - 2],
      pediuEstado: pedidos.indexOf("estado") !== -1
    };
  }

  function rotuloAno(m, ano) {
    if (ano === m.anoParcial) return ano + ", até " + BG.periodo.longo(m.parcialAte).replace(/ de \d{4}$/, "");
    return "De " + (Number(ano) - 1) + " para " + ano;
  }

  function comSinal(ctx, v) {
    if (v == null) return "sem dado";
    if (v === 0) return "ficou igual";
    return (v > 0 ? "▲ subiu " : "▼ caiu ") + ctx.formatar(Math.abs(v));
  }

  BG.visuais.registrar("anual", {
    escopo: function (config) {
      return ((config.opcoes || {}).locais || []).indexOf("estado") !== -1 ? "estado" : "brasil";
    },

    resposta: function (ctx) {
      var m = montar(ctx);
      var s = m.series[0];
      var v = s.valores[m.ultimo];
      if (v == null) return null;
      var r = {
        numero: ctx.formatar(v),
        unidade: (ctx.cartao.unidade ? ctx.texto(ctx.cartao.unidade) + " " : "") + "de " + (Number(m.ultimo) - 1) + " para " + m.ultimo,
        destaque: true
      };

      var antes = s.valores[m.anterior];
      if (antes != null) {
        var mais = Math.abs(v) > Math.abs(antes);
        r.pill = {
          texto: (v === antes ? "Igual a" : (v >= 0 ? "Subiu " : "Caiu ") + (mais ? "mais que" : "menos que")) +
            " de " + (Number(m.anterior) - 1) + " para " + m.anterior + " (" + ctx.formatar(antes) + ")",
          icone: v > antes ? "subiu" : v < antes ? "caiu" : "info",
          neutra: true
        };
      }

      var frases = [];
      if (m.series.length > 1) {
        var br = m.series[1].valores[m.ultimo];
        if (br != null) frases.push("No Brasil, foi " + ctx.formatar(br) + ".");
      }
      var parcial = m.anoParcial && s.valores[m.anoParcial];
      if (parcial != null) {
        frases.push("Em " + m.anoParcial + ", até " + BG.periodo.longo(m.parcialAte).replace(/ de \d{4}$/, "") +
          ", " + (parcial >= 0 ? "já subiu " : "já caiu ") + ctx.formatar(Math.abs(parcial)) + ".");
      }
      if (frases.length) r.frase = frases.join(" ");
      if (m.pediuEstado && !ctx.temEstado) r.aviso = BG.avisoSemCobertura(ctx);
      return r;
    },

    titulo: function (ctx) {
      var m = montar(ctx);
      var refs = (ctx.indicador.referencias || []).map(function (r) { return r.rotulo + ": " + ctx.formatar(r.valor); });
      return {
        texto: BG.cap(ctx.indicador.nome) + (m.anos.length ? ", de " + m.anos[0] + " a " + m.anos[m.anos.length - 1] : ""),
        sub: ["Cada barra compara dezembro com o dezembro do ano anterior"].concat(refs).join(" · ")
      };
    },

    legenda: function (ctx) {
      var m = montar(ctx);
      if (m.series.length > 1) {
        return [{ tipo: "destaque", rotulo: m.series[0].nome }, { tipo: "brasil", rotulo: m.series[1].nome }];
      }
      var l = [{ tipo: "destaque", rotulo: "Último ano completo" }, { tipo: "dado", rotulo: "Anos anteriores" }];
      if (m.anoParcial && m.anos.indexOf(m.anoParcial) !== -1) l.push({ tipo: "contexto", rotulo: "Ano em andamento" });
      return l;
    },

    desenhar: function (el, ctx) {
      var m = montar(ctx);
      var duas = m.series.length > 1;
      var itens = [];
      m.anos.slice().reverse().forEach(function (ano) {
        m.series.forEach(function (s, i) {
          var v = s.valores[ano];
          var tipo = duas ? (i === 0 ? "destaque" : "brasil")
            : ano === m.anoParcial ? "contexto" : ano === m.ultimo ? "destaque" : "";
          itens.push({
            rotulo: rotuloAno(m, ano) + (duas ? " · " + s.nome : ""),
            valor: v,
            texto: v == null ? "sem dado" : comSinal(ctx, v),
            tipo: v == null ? "sem-dado" : tipo
          });
        });
      });
      BG.graficos.barras(el, itens);
    },

    tabela: function (ctx) {
      var m = montar(ctx);
      return {
        legenda: BG.cap(ctx.indicador.nome) + (ctx.dados.origem !== "api" ? " (dados ilustrativos)" : ""),
        colunas: [{ titulo: "Ano" }].concat(m.series.map(function (s) { return { titulo: s.nome, num: true }; })),
        linhas: m.anos.slice().reverse().map(function (ano) {
          return {
            celulas: [rotuloAno(m, ano)].concat(m.series.map(function (s) {
              var v = s.valores[ano];
              return v == null ? "sem dado" : (v > 0 ? "+" : "") + ctx.formatar(v);
            }))
          };
        })
      };
    }
  });
})();
