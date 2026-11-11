/*
 * Comparação entre países: o Brasil e uma ou mais médias (ex.: América Latina e Caribe, Mundo), em linhas.
 * Lê uma `categoria` por país ou média e um período por ano.
 * opcoes.series: as categorias, o Brasil primeiro (padrão ["Brasil", "América Latina e Caribe", "Mundo"]).
 * opcoes.anos: quantos anos mostrar (padrão 12).
 * opcoes.unidadeDiferenca: unidade escrita na diferença (ex.: "mortes por mil nascidos vivos").
 * Observações com "projecao": true ficam fora do gráfico e aparecem no texto e na tabela.
 * Marcadores para os textos do cartão: {ano}, {valor1}, {valor2}..., {projecao}, {anoProjecao}.
 */
(function () {
  "use strict";

  var BG = window.BG;
  var C = BG.visuaisComum;
  var TIPOS = ["destaque", "dado", "brasil"];

  function deNome(nome) {
    return ({ "Mundo": "do mundo", "América Latina e Caribe": "da América Latina e Caribe", "OCDE": "dos países da OCDE", "Américas": "das Américas" })[nome] || "de " + nome;
  }

  function emNome(nome) {
    return ({ "Mundo": "no mundo", "América Latina e Caribe": "na América Latina e Caribe", "OCDE": "nos países da OCDE", "Américas": "nas Américas" })[nome] || "em " + nome;
  }

  function montar(ctx) {
    var nomes = ctx.opcoes.series || ["Brasil", "América Latina e Caribe", "Mundo"];
    var reais = ctx.dados.observacoes.filter(function (o) { return !o.projecao && nomes.indexOf(o.categoria) !== -1; });
    var anos = ctx.dados.periodos(function (o) { return !o.projecao && o.categoria === nomes[0]; }).slice(-(ctx.opcoes.anos || 12));
    var series = nomes.map(function (nome, i) {
      return {
        nome: nome,
        tipo: TIPOS[i] || "contexto",
        tracejada: i === 2,
        valores: anos.map(function (a) {
          for (var k = 0; k < reais.length; k++) if (reais[k].categoria === nome && reais[k].periodo === a) return reais[k].valor;
          return null;
        })
      };
    });
    var projecoes = ctx.dados.observacoes.filter(function (o) { return o.projecao && o.categoria === nomes[0]; })
      .sort(function (a, b) { return a.periodo < b.periodo ? -1 : 1; });
    return { anos: anos, series: series, projecao: projecoes[0] || null, ultimo: anos[anos.length - 1] };
  }

  function ultimoValor(s) {
    return s.valores[s.valores.length - 1];
  }

  BG.visuais.registrar("comparacao-paises", {
    marcadores: function (ctx) {
      var m = montar(ctx);
      var extras = { ano: m.ultimo || "" };
      m.series.forEach(function (s, i) { extras["valor" + (i + 1)] = ctx.formatar(ultimoValor(s)); });
      if (m.projecao) {
        extras.projecao = ctx.formatar(m.projecao.valor);
        extras.anoProjecao = m.projecao.periodo;
      }
      return extras;
    },

    resposta: function (ctx) {
      var m = montar(ctx);
      var brasil = m.series[0];
      var v = ultimoValor(brasil);
      if (v == null) return null;
      var r = {
        numero: ctx.formatar(v),
        unidade: (ctx.cartao.unidade ? ctx.texto(ctx.cartao.unidade) + " " : "") + "em " + m.ultimo,
        destaque: true
      };
      var ref = m.series[1];
      if (ref && ultimoValor(ref) != null) {
        var d = BG.textoDiferenca(ctx.indicador, v, ultimoValor(ref));
        var dif = ctx.opcoes.unidadeDiferenca ? d.texto.replace(/^(\S+)/, "$1 " + ctx.opcoes.unidadeDiferenca) : d.texto;
        r.pill = {
          texto: d.igual ? "Igual à média " + deNome(ref.nome) : BG.cap(dif) + (ctx.indicador.formato === "pct" ? " da média " : " que a média ") + deNome(ref.nome),
          icone: "comparar",
          neutra: true
        };
      }
      var frases = m.series.slice(1).map(function (s) {
        return BG.cap(emNome(s.nome)) + ": " + ctx.formatar(ultimoValor(s)) + ".";
      });
      if (m.projecao) frases.push("Projeção do " + ctx.indicador.fonte.orgao + " para o Brasil em " + m.projecao.periodo + ": " + ctx.formatar(m.projecao.valor) + ".");
      r.frase = frases.join(" ");
      return r;
    },

    titulo: function (ctx) {
      var m = montar(ctx);
      var minimo = 0;
      m.series.forEach(function (s) { s.valores.forEach(function (v) { if (v != null && v < minimo) minimo = v; }); });
      return {
        texto: BG.cap(ctx.indicador.nome) + (m.anos.length ? ", de " + m.anos[0] + " a " + m.ultimo : ""),
        sub: minimo < 0 ? "A linha mais escura marca o zero" : "O eixo começa no zero"
      };
    },

    legenda: function (ctx) {
      return montar(ctx).series.map(function (s) { return { tipo: s.tipo, rotulo: s.nome }; });
    },

    desenhar: function (el, ctx) {
      var m = montar(ctx);
      var maior = 0;
      var menor = 0;
      m.series.forEach(function (s) {
        s.valores.forEach(function (v) {
          if (v == null) return;
          if (v > maior) maior = v;
          if (v < menor) menor = v;
        });
      });
      var esc = BG.escala((maior - menor) * 1.05 || 1);
      var min = menor < 0 ? -Math.ceil(-menor / esc.passo) * esc.passo : 0;
      var max = Math.max(esc.passo, Math.ceil((maior * 1.05) / esc.passo) * esc.passo);
      el.className = "grafico-linha";
      BG.graficos.linha(el, {
        rotulos: m.anos,
        series: m.series,
        min: min,
        max: max,
        passo: esc.passo,
        formato: ctx.formatar,
        formatoEixo: C.formatoEixo(ctx, esc.passo),
        descricao: "Gráfico de linha: " + ctx.indicador.nome + ". " + m.series.map(function (s) {
          return s.nome + ": " + ctx.formatar(ultimoValor(s));
        }).join("; ") + ", em " + m.ultimo + "."
      });
    },

    tabela: function (ctx) {
      var m = montar(ctx);
      var linhas = m.anos.slice().reverse().map(function (a, j) {
        var i = m.anos.length - 1 - j;
        return { celulas: [a].concat(m.series.map(function (s) { return ctx.formatar(s.valores[i]); })) };
      });
      var nomes = m.series.map(function (s) { return s.nome; });
      ctx.dados.periodos(function (o) { return o.projecao; }).reverse().forEach(function (a) {
        linhas.unshift({
          celulas: [a + " (projeção)"].concat(nomes.map(function (n) {
            var o = ctx.dados.observacoes.filter(function (x) { return x.projecao && x.periodo === a && x.categoria === n; })[0];
            return o ? ctx.formatar(o.valor) : "sem dado";
          }))
        });
      });
      return {
        legenda: BG.cap(ctx.indicador.nome) + (ctx.dados.origem !== "api" ? " (dados ilustrativos)" : ""),
        colunas: [{ titulo: "Ano" }].concat(m.series.map(function (s) { return { titulo: s.nome, num: true }; })),
        linhas: linhas
      };
    }
  });
})();
