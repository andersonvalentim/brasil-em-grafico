/*
 * Ranking de países em barras, do maior para o menor, com o Brasil em destaque e médias como referência.
 * Lê uma `categoria` por país e um período por ano; usa o ano mais recente de cada país.
 * opcoes.paises: as categorias que entram no ranking (o Brasil incluído).
 * opcoes.referencias: médias mostradas entre as barras (ex.: ["América Latina e Caribe"]).
 * opcoes.idadeMaxima: quantos anos de defasagem se aceitam em relação ao ano do Brasil (padrão 10).
 */
(function () {
  "use strict";

  var BG = window.BG;

  function ultimo(ctx, nome) {
    var s = ctx.dados.observacoes.filter(function (o) { return o.categoria === nome && !o.projecao; })
      .sort(function (a, b) { return a.periodo < b.periodo ? -1 : 1; });
    return s[s.length - 1] || null;
  }

  function nomeDaMedia(nome) {
    return ({ "Mundo": "Média do mundo", "América Latina e Caribe": "Média da América Latina e Caribe" })[nome] || "Média: " + nome;
  }

  function montar(ctx) {
    var brasil = ultimo(ctx, "Brasil");
    var anoRef = brasil ? Number(brasil.periodo) : null;
    var idade = ctx.opcoes.idadeMaxima != null ? ctx.opcoes.idadeMaxima : 10;
    var fora = [];
    var paises = (ctx.opcoes.paises || []).map(function (nome) {
      var o = ultimo(ctx, nome);
      if (!o || (anoRef && anoRef - Number(o.periodo) > idade)) { fora.push(nome); return null; }
      return { nome: nome, obs: o };
    }).filter(Boolean).sort(function (a, b) { return b.obs.valor - a.obs.valor; });

    var refs = (ctx.opcoes.referencias || []).map(function (nome) {
      var o = ultimo(ctx, nome);
      return o ? { nome: nome, obs: o } : null;
    }).filter(Boolean);

    var lista = [];
    var postas = {};
    paises.forEach(function (p) {
      refs.forEach(function (r) {
        if (!postas[r.nome] && r.obs.valor > p.obs.valor) {
          lista.push({ rotulo: nomeDaMedia(r.nome) + (Number(r.obs.periodo) !== anoRef ? " (" + r.obs.periodo + ")" : ""), valor: r.obs.valor, texto: ctx.formatar(r.obs.valor), tipo: "brasil", referencia: true });
          postas[r.nome] = true;
        }
      });
      var eBrasil = p.nome === "Brasil";
      lista.push({
        rotulo: p.nome + (Number(p.obs.periodo) !== anoRef ? " (" + p.obs.periodo + ")" : ""),
        valor: p.obs.valor,
        texto: ctx.formatar(p.obs.valor),
        tipo: eBrasil ? "destaque" : "",
        nome: p.nome
      });
    });
    refs.forEach(function (r) {
      if (!postas[r.nome]) lista.push({ rotulo: nomeDaMedia(r.nome), valor: r.obs.valor, texto: ctx.formatar(r.obs.valor), tipo: "brasil", referencia: true });
    });

    var posicao = paises.map(function (p) { return p.nome; }).indexOf("Brasil") + 1;
    return { brasil: brasil, anoRef: anoRef, paises: paises, refs: refs, lista: lista, posicao: posicao, fora: fora };
  }

  BG.visuais.registrar("ranking-paises", {
    resposta: function (ctx) {
      var m = montar(ctx);
      if (!m.brasil) return null;
      var r = {
        numero: ctx.formatar(m.brasil.valor),
        unidade: (ctx.cartao.unidade ? ctx.texto(ctx.cartao.unidade) + " " : "") + "no Brasil, em " + m.brasil.periodo,
        destaque: true,
        pill: { texto: "Brasil: " + m.posicao + "º lugar entre " + m.paises.length + " países", icone: "comparar", neutra: true }
      };
      var frases = m.refs.map(function (ref) { return nomeDaMedia(ref.nome) + ": " + ctx.formatar(ref.obs.valor) + "."; });
      if (m.fora.length) frases.push("Ficam de fora os países sem dado nos últimos " + (ctx.opcoes.idadeMaxima != null ? ctx.opcoes.idadeMaxima : 10) + " anos: " + m.fora.join(", ") + ".");
      r.frase = frases.join(" ");
      return r;
    },

    titulo: function (ctx) {
      return { texto: BG.cap(ctx.indicador.nome) + ", por país", sub: "Do maior para o menor · ano mais recente de cada país" };
    },

    legenda: function (ctx) {
      var m = montar(ctx);
      var l = [{ tipo: "destaque", rotulo: "Brasil" }, { tipo: "dado", rotulo: "Outros países" }];
      if (m.refs.length) l.push({ tipo: "brasil", rotulo: m.refs.length > 1 ? "Médias" : nomeDaMedia(m.refs[0].nome) });
      return l;
    },

    desenhar: function (el, ctx) {
      BG.graficos.barras(el, montar(ctx).lista);
    },

    tabela: function (ctx) {
      var m = montar(ctx);
      var pos = 0;
      return {
        legenda: BG.cap(ctx.indicador.nome) + ", por país" + (ctx.dados.origem !== "api" ? " (dados ilustrativos)" : ""),
        colunas: [{ titulo: "País" }, { titulo: "Posição", num: true }, { titulo: "Valor", num: true }],
        linhas: m.lista.map(function (i) {
          if (i.referencia) return { celulas: [i.rotulo, "—", i.texto], classe: "linha-brasil" };
          pos++;
          return { celulas: [i.rotulo, pos + "º", i.texto], classe: i.tipo === "destaque" ? "linha-destaque" : "" };
        })
      };
    }
  });
})();
