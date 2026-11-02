/* Cartão padrão: Pergunta → Resposta → Gráfico → Detalhes, montado a partir do catálogo */
(function () {
  "use strict";

  var BG = window.BG;
  var esc = BG.escapar;
  var icone = BG.icone;
  var contador = 0;

  /* ---------- Contexto e marcadores de texto ---------- */

  function valorTexto(indicador, obs) {
    if (!obs) return "sem dado";
    if (indicador.formato === "categoria") return obs.categoria;
    return BG.formatar(indicador, obs.valor);
  }

  function textoVariacao(indicador, atual, anterior) {
    if (!atual || !anterior) return "";
    var d = BG.textoDiferenca(indicador, atual.valor, anterior.valor);
    if (d.igual) return "Ficou igual";
    var verbo = d.sinal > 0 ? "Subiu" : "Caiu";
    if (indicador.formato === "pct") {
      return verbo + " de " + BG.formatar(indicador, anterior.valor) + " para " + BG.formatar(indicador, atual.valor);
    }
    return verbo + " " + d.texto.replace(/ a (mais|menos)$/, "");
  }

  /*
   * Monta o contexto entregue aos visuais.
   * ctx.local é o lugar "do cartão": o estado escolhido (se o visual for de estado e houver dado) ou o Brasil.
   */
  BG.contexto = function (config, indicador, dados, visual) {
    var estado = BG.estado.atual();
    var opcoes = config.opcoes || {};
    var escopoVisual = visual && (typeof visual.escopo === "function" ? visual.escopo(config) : visual.escopo);
    var escopo = config.escopo || escopoVisual || "brasil";
    var temEstado = dados.tem(estado.uf);
    var ultBR = dados.ultimo("BR");
    var ultEstado = temEstado ? dados.ultimo(estado.uf) : null;
    var local = escopo === "estado" && temEstado ? estado.uf : "BR";
    var serieLocal = dados.serie(local);
    var atual = serieLocal[serieLocal.length - 1];
    var anterior = serieLocal[serieLocal.length - 2];

    var m = {
      estado: estado.nome,
      uf: estado.uf,
      noEstado: BG.emNome(estado),
      doEstado: BG.deNome(estado),
      naArea: temEstado ? BG.emArea(estado) : BG.emNome(estado),
      area: estado.areaIpca || estado.nome,
      gentilico: estado.gentilico,
      valorBrasil: valorTexto(indicador, ultBR),
      valorEstado: valorTexto(indicador, ultEstado),
      valor: valorTexto(indicador, atual),
      periodo: BG.periodo.longo(atual ? atual.periodo : dados.ultimoPeriodo),
      periodoAnterior: anterior ? BG.periodo.longo(anterior.periodo) : "",
      variacao: textoVariacao(indicador, atual, anterior),
      emCada100: atual ? String(Math.round(atual.valor)) : "",
      r100: indicador.formato === "pct" && atual ? BG.fmt.real(100 * (1 + atual.valor / 100)) : "",
      comparacao: ultEstado && ultBR ? BG.comparaMedia(ultEstado.valor, ultBR.valor) : "",
      diferenca: ultEstado && ultBR ? BG.textoDiferenca(indicador, ultEstado.valor, ultBR.valor).texto : ""
    };

    var ctx = {
      cartao: config,
      opcoes: opcoes,
      indicador: indicador,
      dados: dados,
      estado: estado,
      temEstado: temEstado,
      local: local,
      marcadores: m,
      formatar: function (v, o) { return BG.formatar(indicador, v, o); },
      texto: function (modelo) { return BG.preencherTexto(modelo, m); }
    };
    if (visual && visual.marcadores) {
      var extras = visual.marcadores(ctx) || {};
      Object.keys(extras).forEach(function (k) { m[k] = extras[k]; });
    }
    return ctx;
  };

  /* Aviso padrão quando o estado escolhido não tem esse dado. */
  BG.avisoSemCobertura = function (ctx) {
    var e = ctx.estado;
    var texto = ctx.indicador.fonte.orgao + " não mede este número " + BG.emNome(e) + ".";
    if (ctx.indicador.cobertura) texto += " " + ctx.indicador.cobertura;
    var proximo = e.ipcaProximo && ctx.dados.tem(e.ipcaProximo) ? BG.locais.porUf[e.ipcaProximo] : null;
    if (!proximo) {
      proximo = (e.vizinhos || []).map(function (uf) { return BG.locais.porUf[uf]; })
        .filter(function (v) { return v && ctx.dados.tem(v.uf); })[0];
    }
    var aviso = { titulo: BG.cap(e.nome) + " não tem esse dado.", texto: texto };
    if (proximo) {
      var obs = ctx.dados.ultimo(proximo.uf);
      aviso.texto += " O lugar mais próximo com esse dado é " + (proximo.areaIpca || proximo.nome) + " (" + proximo.nome + "): " +
        ctx.formatar(obs.valor) + ".";
      aviso.proximo = proximo;
    }
    return aviso;
  };

  /* ---------- Marcação ---------- */

  function botoesAcoes(idTabela, temTabela) {
    return '<button type="button" class="btn btn--secundario btn--compacto" data-ouvir aria-pressed="false">' + icone("som", "icone--sm") + '<span class="rotulo">Ouvir</span></button>' +
      (temTabela ? '<button type="button" class="btn btn--secundario btn--compacto" data-tabela="' + idTabela + '" aria-controls="' + idTabela + '" aria-expanded="false">' + icone("tabela", "icone--sm") + '<span class="rotulo">Ver em tabela</span></button>' : "") +
      '<button type="button" class="btn btn--secundario btn--compacto" data-compartilhar>' + icone("compartilhar", "icone--sm") + '<span class="rotulo">Compartilhar</span></button>';
  }

  function linhaFonte(ctx) {
    var ind = ctx.indicador;
    var d = ctx.dados;
    var quando = "Dados de " + BG.periodo.longo(d.ultimoPeriodo);
    if (d.geradoEm) quando += " · atualizado em " + BG.periodo.data(d.geradoEm);
    if (d.origem !== "api") quando += " · dados ilustrativos";
    return '<div class="fonte"><span class="fonte__item">' + icone("livro", "icone--sm") + "Fonte: " + esc(ind.fonte.orgao) + " · " + esc(ind.fonte.nome) + "</span>" +
      '<span class="fonte__item">' + icone("calendario", "icone--sm") + esc(quando) + "</span></div>";
  }

  function blocoResposta(r, frase) {
    if (!r) return "";
    var numero = r.numero
      ? '<p class="resposta__numero" data-falar>' + (r.rotulo ? '<span class="numero__unidade">' + esc(r.rotulo) + "</span>" : "") +
        '<span class="numero' + (r.destaque ? " numero--destaque" : "") + (r.medio ? " numero--medio" : "") + '">' + (r.icone ? icone(r.icone) + " " : "") + esc(r.numero) + "</span>" +
        (r.unidade ? '<span class="numero__unidade">' + esc(r.unidade) + "</span>" : "") + "</p>"
      : "";
    var pill = r.pill
      ? '<p class="comparacao-pill' + (r.pill.neutra ? " comparacao-pill--neutra" : "") + '" data-falar>' + icone(r.pill.icone || "info", "icone--sm") + "<span>" + esc(r.pill.texto) + "</span></p>"
      : "";
    return '<div class="resposta">' + numero + '<div class="resposta__frase">' + pill +
      (frase ? '<p data-falar' + (pill ? ' style="margin-top:0.75rem"' : "") + ">" + esc(frase) + "</p>" : "") + "</div></div>";
  }

  function blocoAviso(aviso) {
    if (!aviso) return "";
    return '<div class="aviso-cobertura">' + icone("info") + '<p data-falar><strong>' + esc(aviso.titulo) + "</strong>" + esc(aviso.texto) +
      (aviso.proximo ? ' <a href="meu-estado.html?uf=' + aviso.proximo.uf + '">Ver ' + esc(BG.deNome(aviso.proximo)) + "</a>" : "") + "</p></div>";
  }

  function blocoPainel(ctx, visual) {
    if (visual.semGrafico) return "";
    var titulo = visual.titulo ? visual.titulo(ctx) : null;
    var legenda = visual.legenda ? visual.legenda(ctx) : [];
    return '<div class="painel-grafico">' +
      (titulo ? '<div class="painel-grafico__titulo"><h3>' + esc(titulo.texto || titulo) + "</h3>" + (titulo.sub ? "<p>" + esc(titulo.sub) + "</p>" : "") + "</div>" : "") +
      (legenda.length ? '<ul class="legenda">' + legenda.map(function (l) {
        return '<li><span class="legenda__amostra' + (l.tipo && l.tipo !== "dado" ? " legenda__amostra--" + l.tipo : "") + '" aria-hidden="true"></span>' + esc(l.rotulo) + "</li>";
      }).join("") + "</ul>" : "") +
      '<div data-visual></div></div>';
  }

  function blocoDetalhes(ctx, idTabela, temTabela) {
    var c = ctx.cartao;
    var ind = ctx.indicador;
    var paragrafos = (c.detalhes || []).map(function (p) { return "<p>" + esc(ctx.texto(p)) + "</p>"; }).join("");
    if (ind.cobertura && !(c.detalhes || []).length) paragrafos += "<p>" + esc(ind.cobertura) + "</p>";
    paragrafos += "<p class=\"texto-suave\">Nome técnico: " + esc(ind.nomeTecnico || ind.nome) + ".</p>";
    return '<details class="detalhes"><summary><span>Entenda este número e baixe os dados</span><span class="detalhes__dica">Toque para abrir</span></summary>' +
      '<div class="detalhes__conteudo">' + paragrafos + '<div class="detalhes__links">' +
      (temTabela ? '<button type="button" class="btn btn--secundario btn--compacto" data-baixar="' + idTabela + '" data-arquivo="' + esc(ind.id) + '.csv">' + icone("baixar", "icone--sm") + "Baixar os dados (planilha)</button>" : "") +
      (BG.urlSegura(ind.fonte.url) ? '<a class="btn btn--secundario btn--compacto" href="' + esc(BG.urlSegura(ind.fonte.url)) + '" rel="noopener noreferrer">Ver no site do ' + esc(ind.fonte.orgao) + icone("abrir", "icone--sm") + "</a>" : "") +
      "</div></div></details>";
  }

  function montar(artigo, ctx, visual, modo) {
    var c = ctx.cartao;
    var idTabela = artigo.id + "-tabela";
    var temTabela = !!visual.tabela;
    var pergunta = ctx.texto(c.pergunta || ctx.indicador.nome);
    var r = visual.resposta ? visual.resposta(ctx) : null;
    var frase = c.frase ? ctx.texto(c.frase) : r && r.frase;
    var aviso = r && r.aviso;
    var etiqueta = c.etiqueta ? '<span class="grafico-card__etiqueta' + (modo === "grande" && !c.etiquetaDestaque ? " grafico-card__etiqueta--neutra" : "") + '">' + esc(ctx.texto(c.etiqueta)) + "</span>" : "";

    var html;
    if (modo === "mini") {
      html = '<div class="grafico-card__topo">' + etiqueta + '<span class="mini-card__periodo">' + esc(BG.periodo.curto(ctx.dados.ultimoPeriodo)) + "</span></div>" +
        "<h3 data-falar>" + esc(pergunta) + "</h3>" + blocoResposta(r, frase) + blocoAviso(aviso) + blocoPainel(ctx, visual) +
        '<div class="tabela-envoltorio" id="' + idTabela + '" tabindex="-1" hidden></div>' + linhaFonte(ctx) +
        '<div class="mini-card__acoes">' + botoesAcoes(idTabela, temTabela) + "</div>";
    } else {
      html = '<div class="grafico-card__topo"><div>' + etiqueta + "<h2 data-falar>" + esc(pergunta) + "</h2></div>" +
        '<div class="grafico-card__acoes">' + botoesAcoes(idTabela, temTabela) + "</div></div>" +
        blocoResposta(r, frase) + blocoAviso(aviso) + blocoPainel(ctx, visual) +
        '<div class="tabela-envoltorio" id="' + idTabela + '" tabindex="-1" hidden></div>' +
        linhaFonte(ctx) + blocoDetalhes(ctx, idTabela, temTabela);
    }
    artigo.innerHTML = html;

    var alvo = BG.$("[data-visual]", artigo);
    if (alvo && visual.desenhar) visual.desenhar(alvo, ctx);
    if (temTabela) {
      var t = visual.tabela(ctx);
      if (t) BG.graficos.tabela(BG.$("#" + idTabela, artigo), t);
    }
  }

  function mostrarErro(artigo, config, erro) {
    console.error(erro);
    artigo.innerHTML = '<div class="estado-vazio" role="alert">' + icone("info") +
      "<p><strong>" + esc(config.pergunta || "Este gráfico") + "</strong><br>Não conseguimos mostrar este gráfico agora. Tente de novo em alguns minutos.</p></div>";
  }

  /*
   * Coloca um cartão dentro de `container`.
   * modo: "grande" (páginas de tema) ou "mini" (grade da página Meu estado).
   * O cartão se redesenha sozinho quando a pessoa troca de estado.
   */
  BG.cartao = function (container, config, modo) {
    modo = modo || "grande";
    var artigo = document.createElement("article");
    artigo.className = "card " + (modo === "mini" ? "mini-card" : "grafico-card") + " surgir";
    artigo.id = config.id || "cartao-" + (++contador);
    artigo.setAttribute("data-card", "");
    artigo.innerHTML = '<div class="carregando" role="status"><span class="sr-only">Carregando o gráfico…</span></div>';
    container.appendChild(artigo);

    var pronto = Promise.all([BG.catalogo.completo(config.indicador), BG.visuais.obter(config.visual)]);

    function desenhar() {
      return pronto.then(function (r) {
        var visual = r[1];
        montar(artigo, BG.contexto(config, r[0].indicador, r[0].dados, visual), visual, modo);
      }).catch(function (erro) { mostrarErro(artigo, config, erro); });
    }

    document.addEventListener("bg:estado", desenhar);
    document.addEventListener("bg:tema", function () {
      pronto.then(function (r) { if (r[1].redesenharNoTema) desenhar(); });
    });
    return desenhar();
  };
})();
