/*
 * Bandeira tarifária: a bandeira do mês, o custo extra de cada uma e o histórico recente.
 * Lê dados.extras.tabela ([{categoria, valor}]) quando o coletor fornece; senão, usa os valores observados.
 */
(function () {
  "use strict";

  var BG = window.BG;

  var AMOSTRAS = [
    [/verde/i, "#3E7D5A"],
    [/amarela/i, "#D9A23A"],
    [/vermelha.*2|patamar 2/i, "#8E2F22"],
    [/vermelha/i, "#C0533A"],
    [/escassez/i, "#5A1F18"]
  ];

  function amostra(nome) {
    for (var i = 0; i < AMOSTRAS.length; i++) if (AMOSTRAS[i][0].test(nome)) return AMOSTRAS[i][1];
    return "#8C7F6F";
  }

  function tabelaBandeiras(ctx) {
    var t = (ctx.dados.extras || {}).tabela;
    if (t && t.length) return t;
    var vistas = {};
    ctx.dados.serie("BR").forEach(function (o) { if (o.categoria) vistas[o.categoria] = o.valor; });
    return Object.keys(vistas).map(function (c) { return { categoria: c, valor: vistas[c] }; })
      .sort(function (a, b) { return a.valor - b.valor; });
  }

  function atual(ctx) {
    var s = ctx.dados.observacoes.filter(function (o) { return o.local === "BR"; })
      .sort(function (a, b) { return a.periodo < b.periodo ? -1 : 1; });
    return s[s.length - 1];
  }

  function historico(ctx, n) {
    return ctx.dados.observacoes.filter(function (o) { return o.local === "BR"; })
      .sort(function (a, b) { return a.periodo < b.periodo ? -1 : 1; }).slice(-n);
  }

  BG.visuais.registrar("bandeira", {
    marcadores: function (ctx) {
      var a = atual(ctx);
      return a ? { valor: a.categoria, valorBrasil: a.categoria, periodo: BG.periodo.longo(a.periodo) } : {};
    },

    resposta: function (ctx) {
      var a = atual(ctx);
      if (!a) return null;
      var frase;
      if (ctx.estado.foraDoSistema) {
        frase = ctx.estado.nome + " não está ligado ao sistema elétrico nacional. Por isso, a bandeira não muda a sua conta.";
      } else if (a.valor > 0) {
        frase = "Neste mês, a conta tem " + BG.fmt.real(a.valor) + " a mais a cada 100 quilowatts-hora gastos.";
      } else {
        frase = "Neste mês, não há cobrança extra na conta de luz.";
      }
      return { numero: "Bandeira " + a.categoria, medio: true, icone: "bandeira", unidade: "em " + BG.periodo.longo(a.periodo), frase: frase };
    },

    titulo: function () {
      return { texto: "As bandeiras da conta de luz", sub: "Custo extra a cada 100 kWh" };
    },

    desenhar: function (el, ctx) {
      var a = atual(ctx);
      var lista = tabelaBandeiras(ctx);
      var hist = historico(ctx, 12);
      el.innerHTML =
        '<ul class="bandeiras">' + lista.map(function (b) {
          var esta = a && b.categoria === a.categoria;
          return '<li class="bandeira' + (esta ? " bandeira--ativa" : "") + '"' + (esta ? ' aria-current="true"' : "") + ">" +
            '<span class="bandeira__nome"><span class="bandeira__amostra" style="--amostra:' + amostra(b.categoria) + '" aria-hidden="true"></span>' + BG.escapar(b.categoria) + "</span>" +
            "<span>" + (b.valor ? "+ " + BG.fmt.real(b.valor) : "Sem extra") + "</span>" +
            (esta ? '<span class="bandeira__selo">Em vigor</span>' : "") + "</li>";
        }).join("") + "</ul>" +
        (hist.length > 1 ? '<p class="texto-suave" style="margin-top:1rem;font-size:1rem">Últimos meses: ' +
          hist.map(function (o) { return BG.periodo.curto(o.periodo) + " " + o.categoria.toLowerCase(); }).join(" · ") + ".</p>" : "") +
        (ctx.estado.distribuidora ? '<p class="texto-suave" style="margin-top:0.5rem;font-size:1rem">Empresa de energia ' +
          BG.escapar(BG.emNome(ctx.estado)) + ": " + BG.escapar(ctx.estado.distribuidora) + ".</p>" : "");
    },

    tabela: function (ctx) {
      return {
        legenda: "Bandeira tarifária mês a mês",
        colunas: [{ titulo: "Mês" }, { titulo: "Bandeira" }, { titulo: "Custo extra a cada 100 kWh", num: true }],
        linhas: historico(ctx, 24).reverse().map(function (o) {
          return { celulas: [BG.cap(BG.periodo.longo(o.periodo)), o.categoria, BG.fmt.real(o.valor || 0)] };
        })
      };
    }
  });
})();
