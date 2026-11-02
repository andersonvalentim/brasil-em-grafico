/*
 * Comparativo ano a ano por categoria (ex.: preço de cada alimento em cada ano).
 * Cada linha é uma categoria; cada coluna, um ano. A barra cresce do zero para a direita (subiu)
 * ou para a esquerda (caiu). O ano mais recente fica em destaque.
 * opcoes.anos: quantos anos mostrar (padrão 5). opcoes.local: "BR" (padrão).
 */
(function () {
  "use strict";

  var BG = window.BG;
  var C = BG.visuaisComum;

  function montar(ctx, ordem) {
    var local = ctx.opcoes.local || "BR";
    var anos = ctx.dados.periodos(function (o) { return o.local === local && o.categoria; }).slice(-(ctx.opcoes.anos || 5));
    var ultimo = anos[anos.length - 1];
    var linhas = ctx.dados.categorias(local).map(function (c) {
      return {
        categoria: c,
        valores: anos.map(function (a) {
          var o = ctx.dados.noPeriodo(local, a, c);
          return o ? o.valor : null;
        })
      };
    });
    var iu = anos.length - 1;
    var porValor = function (a, b) { return (b.valores[iu] == null ? -1e9 : b.valores[iu]) - (a.valores[iu] == null ? -1e9 : a.valores[iu]); };
    if (ordem === "queda") linhas.sort(function (a, b) { return -porValor(a, b); });
    else if (ordem === "nome") linhas.sort(function (a, b) { return a.categoria.localeCompare(b.categoria, "pt-BR"); });
    else linhas.sort(porValor);
    var max = 0;
    linhas.forEach(function (l) { l.valores.forEach(function (v) { if (v != null && Math.abs(v) > max) max = Math.abs(v); }); });
    return { anos: anos, ultimo: ultimo, linhas: linhas, max: max || 1 };
  }

  function contar(m, i) {
    return m.linhas.filter(function (l) { return l.valores[i] != null && l.valores[i] > 0; }).length;
  }

  function comValor(m, i) {
    return m.linhas.filter(function (l) { return l.valores[i] != null; }).length;
  }

  function celula(ctx, m, valor, i) {
    var atual = i === m.anos.length - 1;
    var texto = valor == null ? "sem dado"
      : valor === 0 ? "0" : (valor > 0 ? "▲ " : "▼ ") + ctx.formatar(Math.abs(valor));
    var tamanho = valor == null ? 0 : (Math.abs(valor) / m.max) * 50;
    return '<span class="aa__celula' + (atual ? " aa__celula--atual" : "") + '" role="cell">' +
      '<span class="aa__ano" aria-hidden="true">' + BG.escapar(m.anos[i]) + "</span>" +
      '<span class="aa__barra" aria-hidden="true">' + (valor ? '<span class="aa__preenchimento' + (valor < 0 ? " aa__preenchimento--negativo" : "") +
      '" style="--tamanho:' + tamanho.toFixed(1) + '%"></span>' : "") + "</span>" +
      '<span class="aa__valor"><span class="sr-only">' + BG.escapar(m.anos[i]) + ": " + (valor > 0 ? "subiu " : valor < 0 ? "caiu " : "") + "</span>" + BG.escapar(texto) + "</span></span>";
  }

  function desenharGrade(alvo, ctx, ordem) {
    var m = montar(ctx, ordem);
    var nomeCategoria = ctx.cartao.rotuloCategoria || "Item";
    alvo.innerHTML =
      '<div class="aa__linha aa__linha--cabecalho" role="row"><span role="columnheader">' + BG.escapar(nomeCategoria) + "</span>" +
      m.anos.map(function (a, i) {
        return '<span role="columnheader"' + (i === m.anos.length - 1 ? ' class="destaque-texto"' : "") + ">" + BG.escapar(i === m.anos.length - 1 ? C.rotuloPeriodo(ctx, a) : a) + "</span>";
      }).join("") + "</div>" +
      m.linhas.map(function (l) {
        return '<div class="aa__linha" role="row"><span class="aa__nome" role="rowheader">' + BG.escapar(l.categoria) + "</span>" +
          l.valores.map(function (v, i) { return celula(ctx, m, v, i); }).join("") + "</div>";
      }).join("");
    alvo.style.setProperty("--anos", m.anos.length);
  }

  BG.visuais.registrar("ano-a-ano", {
    resposta: function (ctx) {
      var m = montar(ctx);
      var iu = m.anos.length - 1;
      if (iu < 0) return null;
      var r = {
        numero: contar(m, iu) + " de " + comValor(m, iu),
        unidade: (ctx.cartao.unidade ? ctx.texto(ctx.cartao.unidade) : "itens ficaram mais caros") + " em " + C.rotuloPeriodo(ctx, m.ultimo),
        destaque: true
      };
      if (iu > 0) r.frase = "Em " + m.anos[iu - 1] + ", foram " + contar(m, iu - 1) + " de " + comValor(m, iu - 1) + ".";
      return r;
    },

    titulo: function (ctx) {
      var m = montar(ctx);
      return { texto: "Quanto cada item subiu ou caiu em cada ano", sub: m.anos.length ? "De " + m.anos[0] + " a " + C.rotuloPeriodo(ctx, m.ultimo) : "" };
    },

    legenda: function (ctx) {
      var m = montar(ctx);
      return [{ tipo: "destaque", rotulo: C.rotuloPeriodo(ctx, m.ultimo) }, { tipo: "dado", rotulo: "Anos anteriores" },
        { tipo: "sem-dado", rotulo: "Para a direita: subiu · para a esquerda: caiu" }];
    },

    desenhar: function (el, ctx) {
      var m = montar(ctx);
      var id = "ordem-" + Math.random().toString(36).slice(2, 8);
      el.innerHTML =
        '<div class="aa__controles"><label class="seletor" for="' + id + '"><span class="seletor__rotulo">Ordenar por</span>' +
        '<select id="' + id + '"><option value="alta">Maior alta em ' + BG.escapar(m.ultimo) + "</option>" +
        '<option value="queda">Maior queda em ' + BG.escapar(m.ultimo) + "</option>" +
        '<option value="nome">Nome, de A a Z</option></select></label></div>' +
        '<div class="aa__grade" role="table" aria-label="' + BG.escapar(BG.cap(ctx.indicador.nome)) + ', ano a ano"></div>';
      var grade = BG.$(".aa__grade", el);
      var select = BG.$("select", el);
      desenharGrade(grade, ctx, "alta");
      select.addEventListener("change", function () { desenharGrade(grade, ctx, select.value); });
    },

    tabela: function (ctx) {
      var m = montar(ctx, "nome");
      return {
        legenda: BG.cap(ctx.indicador.nome) + ", ano a ano",
        colunas: [{ titulo: ctx.cartao.rotuloCategoria || "Item" }].concat(m.anos.map(function (a) { return { titulo: C.rotuloPeriodo(ctx, a), num: true }; })),
        linhas: m.linhas.map(function (l) {
          return { celulas: [l.categoria].concat(l.valores.map(function (v) { return v == null ? "sem dado" : (v > 0 ? "+" : "") + ctx.formatar(v); })) };
        })
      };
    }
  });
})();
