/* Desenhos de baixo nível em HTML/SVG, usados pelos visuais */
(function () {
  "use strict";

  var BG = (window.BG = window.BG || {});
  var esc = function (t) { return BG.escapar(t); };

  /*
   * itens: [{ rotulo, valor, texto, tipo }]
   * tipo: "destaque" (seu estado), "brasil" (média), "contexto" (outros), "sem-dado" ou vazio (o dado);
   * aceita mais de um, separados por espaço ("sem-dado destaque").
   * O eixo sempre começa no zero.
   */
  function barras(el, itens, opcoes) {
    opcoes = opcoes || {};
    var max = opcoes.max || Math.max.apply(null, itens.map(function (i) { return Math.abs(i.valor || 0); })) || 1;
    var html = '<ul class="barras">';
    itens.forEach(function (item) {
      var largura = item.valor == null ? 100 : Math.max(1, (Math.abs(item.valor) / max) * 100);
      var classe = (item.tipo || "").split(" ").filter(Boolean).map(function (t) { return " barra--" + t; }).join("");
      html +=
        '<li class="barra' + classe + '">' +
        '<div class="barra__topo"><span>' + esc(item.rotulo) + "</span>" +
        '<span class="barra__valor">' + esc(item.texto) + "</span></div>" +
        '<div class="barra__trilho" aria-hidden="true"><div class="barra__preenchimento" style="--largura:' +
        largura.toFixed(1) + '%"></div></div></li>';
    });
    html += "</ul>";
    el.innerHTML = html;
  }

  var CORES_SERIE = {
    dado: "var(--cor-azulejo)",
    destaque: "var(--cor-destaque)",
    brasil: "var(--cor-texto)",
    contexto: "var(--cor-contexto)"
  };

  /*
   * config: { rotulos, series: [{ nome, valores, tipo, tracejada }], max, passo, formato, formatoEixo, descricao, altura }
   * No máximo 2 linhas de dado (mais as referências); o valor é escrito no último ponto de cada uma.
   */
  function linha(el, config) {
    function desenhar() {
      var largura = Math.max(280, el.clientWidth || 600);
      var altura = config.altura || 240;
      var esq = 52;
      var dir = 72;
      var topo = 20;
      var base = 36;
      var w = largura - esq - dir;
      var h = altura - topo - base;
      var max = config.max;
      var min = Math.min(0, config.min || 0);
      var passo = config.passo || (max - min) / 5;
      var n = config.rotulos.length;
      var formato = config.formato;
      var formatoEixo = config.formatoEixo || formato;
      var comPontos = n <= 40;

      function x(i) {
        return esq + (n === 1 ? w / 2 : (i / (n - 1)) * w);
      }
      function y(v) {
        return topo + h - ((v - min) / (max - min)) * h;
      }

      var partes = [];
      for (var t = min; t <= max + passo / 1000; t += passo) {
        if (Math.abs(t) < passo / 1000) t = 0;
        var yy = y(t).toFixed(1);
        partes.push('<line class="grade-linha' + (t === 0 && min < 0 ? " grade-linha--zero" : "") + '" x1="' + esq + '" x2="' + (esq + w) + '" y1="' + yy + '" y2="' + yy + '"/>');
        partes.push('<text class="eixo-texto" x="' + (esq - 8) + '" y="' + yy + '" text-anchor="end" dominant-baseline="middle">' +
          esc(formatoEixo(t)) + "</text>");
      }

      var saltos = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(w / 64))));
      config.rotulos.forEach(function (r, i) {
        if (i % saltos !== 0 && i !== n - 1) return;
        if (i !== n - 1 && n - 1 - i < saltos * 0.6) return;
        partes.push('<text class="eixo-texto" x="' + x(i).toFixed(1) + '" y="' + (altura - 10) + '" text-anchor="middle">' + esc(r) + "</text>");
      });

      var rotulosFinais = [];
      config.series.forEach(function (s) {
        var cor = CORES_SERIE[s.tipo || "dado"];
        var d = "";
        var ultimoI = -1;
        s.valores.forEach(function (v, i) {
          if (v == null) return;
          d += (d && ultimoI === i - 1 ? "L" : "M") + x(i).toFixed(1) + " " + y(v).toFixed(1);
          ultimoI = i;
        });
        if (!d) return;
        partes.push('<path d="' + d + '" fill="none" style="stroke:' + cor + '" stroke-width="' + (s.tracejada ? 2 : 3) +
          '" stroke-linejoin="round" stroke-linecap="round"' + (s.tracejada ? ' stroke-dasharray="7 5"' : "") + "/>");
        if (!s.tracejada) {
          s.valores.forEach(function (v, i) {
            if (v == null) return;
            var ultimo = i === ultimoI;
            if (!comPontos && !ultimo) return;
            partes.push('<circle cx="' + x(i).toFixed(1) + '" cy="' + y(v).toFixed(1) + '" r="' + (ultimo ? 6 : 3.5) +
              '" style="fill:' + (ultimo ? cor : "var(--cor-fundo)") + ";stroke:" + cor + '" stroke-width="2"/>');
          });
        }
        if (ultimoI >= 0) rotulosFinais.push({ y: y(s.valores[ultimoI]), texto: formato(s.valores[ultimoI]) });
      });

      rotulosFinais.sort(function (a, b) { return a.y - b.y; });
      for (var k = 1; k < rotulosFinais.length; k++) {
        if (rotulosFinais[k].y - rotulosFinais[k - 1].y < 18) rotulosFinais[k].y = rotulosFinais[k - 1].y + 18;
      }
      rotulosFinais.forEach(function (r) {
        partes.push('<text class="rotulo-final" x="' + (esq + w + 10) + '" y="' + r.y.toFixed(1) + '" dominant-baseline="middle">' + esc(r.texto) + "</text>");
      });

      el.innerHTML = '<svg role="img" aria-label="' + esc(config.descricao) + '" width="' + largura + '" height="' + altura +
        '" viewBox="0 0 ' + largura + " " + altura + '">' + partes.join("") + "</svg>";
    }

    desenhar();
    if (el._observador) el._observador.disconnect();
    if ("ResizeObserver" in window) {
      var ultimaLargura = el.clientWidth;
      el._observador = new ResizeObserver(function () {
        if (Math.abs(el.clientWidth - ultimaLargura) > 8) {
          ultimaLargura = el.clientWidth;
          desenhar();
        }
      });
      el._observador.observe(el);
    }
  }

  /* Pictograma: 100 pontos, "destaque" deles em urucum. */
  function pontos(el, destaque, descricao) {
    var html = "";
    for (var i = 0; i < 100; i++) {
      html += '<span class="ponto' + (i < destaque ? " ponto--destaque" : "") + '"></span>';
    }
    el.className = "pontos";
    el.setAttribute("role", "img");
    el.setAttribute("aria-label", descricao);
    el.innerHTML = html;
  }

  /*
   * config: { legenda, colunas: [{ titulo, num }], linhas: [{ celulas: [], classe }] }
   * Guarda o conteúdo em data-csv para o botão "Baixar os dados".
   */
  function tabela(el, config) {
    var html = '<table class="tabela"><caption>' + esc(config.legenda) + "</caption><thead><tr>";
    config.colunas.forEach(function (c) {
      html += '<th scope="col"' + (c.num ? ' class="num"' : "") + ">" + esc(c.titulo) + "</th>";
    });
    html += "</tr></thead><tbody>";
    config.linhas.forEach(function (l) {
      html += "<tr" + (l.classe ? ' class="' + l.classe + '"' : "") + ">";
      l.celulas.forEach(function (cel, i) {
        var num = config.colunas[i] && config.colunas[i].num;
        var tag = i === 0 ? "th" : "td";
        html += "<" + tag + (i === 0 ? ' scope="row"' : "") + (num ? ' class="num"' : "") + ">" + esc(cel) + "</" + tag + ">";
      });
      html += "</tr>";
    });
    html += "</tbody></table>";
    el.innerHTML = html;
    el.dataset.csv = JSON.stringify([config.colunas.map(function (c) { return c.titulo; })].concat(
      config.linhas.map(function (l) { return l.celulas; })
    ));
  }

  BG.graficos = { barras: barras, linha: linha, pontos: pontos, tabela: tabela };
})();
