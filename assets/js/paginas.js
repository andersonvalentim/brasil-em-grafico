/* Páginas montadas a partir do catálogo: início, tema, meu estado e sobre os dados */
(function () {
  "use strict";

  var BG = window.BG;
  var esc = BG.escapar;
  var icone = BG.icone;

  /* ---------- "O que você quer saber?": perguntas prontas, por assunto ---------- */

  function marcadoresDoEstado(e) {
    return {
      estado: e.nome, uf: e.uf, gentilico: e.gentilico,
      noEstado: BG.emNome(e), doEstado: BG.deNome(e),
      naArea: BG.emArea(e), area: e.areaIpca || e.nome
    };
  }

  function assuntosDasPerguntas(temas, site) {
    var lista = temas.map(function (t) {
      return {
        id: t.id, rotulo: t.nomeCurto || t.titulo, icone: t.icone || "temas",
        perguntas: t.cartoes.map(function (c, i) {
          return { texto: c.pergunta, url: "tema.html?id=" + encodeURIComponent(t.id) + "#pergunta-" + (i + 1) };
        })
      };
    });
    var cartoesEstado = (site.estado && site.estado.cartoes) || [];
    if (cartoesEstado.length) {
      lista.push({
        id: "meu-estado", rotulo: "Meu estado", icone: "estado",
        perguntas: cartoesEstado.map(function (c) {
          return { texto: c.pergunta, url: "meu-estado.html" + (c.id ? "#" + encodeURIComponent(c.id) : "") };
        })
      });
    }
    return lista;
  }

  function prepararPerguntas(temas, site) {
    var areaAssuntos = BG.$("#assuntos");
    var areaLista = BG.$("#lista-perguntas");
    if (!areaAssuntos || !areaLista) return;
    var assuntos = assuntosDasPerguntas(temas, site);
    var escolhido = assuntos[0] && assuntos[0].id;

    function desenharLista() {
      var a = assuntos.filter(function (x) { return x.id === escolhido; })[0];
      if (!a) return;
      var m = marcadoresDoEstado(BG.estado.atual());
      var vistas = {};
      areaLista.innerHTML = a.perguntas.map(function (p) {
        var texto = BG.preencherTexto(p.texto, m);
        if (vistas[texto]) return "";
        vistas[texto] = true;
        return '<li><a class="pergunta" href="' + esc(p.url) + '"><span>' + esc(texto) + "</span>" + icone("seta") + "</a></li>";
      }).join("");
    }

    areaAssuntos.innerHTML = assuntos.map(function (a) {
      return '<button type="button" class="chip" data-assunto="' + esc(a.id) + '" aria-pressed="' + (a.id === escolhido) + '" aria-controls="lista-perguntas">' +
        icone(a.icone, "icone--sm") + esc(a.rotulo) + "</button>";
    }).join("");

    areaAssuntos.addEventListener("click", function (ev) {
      var botao = ev.target.closest("[data-assunto]");
      if (!botao) return;
      escolhido = botao.dataset.assunto;
      BG.$$("[data-assunto]", areaAssuntos).forEach(function (b) { b.setAttribute("aria-pressed", String(b === botao)); });
      desenharLista();
    });
    document.addEventListener("bg:estado", desenharLista);
    desenharLista();
  }

  /* ---------- Início ---------- */

  function destaque(container, cfg) {
    var artigo = document.createElement("article");
    artigo.className = "card indicador";
    artigo.innerHTML = '<div class="carregando" role="status"><span class="sr-only">Carregando…</span></div>';
    container.appendChild(artigo);
    BG.catalogo.completo(cfg.indicador).then(function (r) {
      var ctx = BG.contexto(cfg, r.indicador, r.dados, null);
      var v = ctx.marcadores.variacao;
      artigo.innerHTML =
        '<div class="indicador__topo"><span>' + esc(cfg.rotulo) + "</span>" + icone(cfg.icone || "info") + "</div>" +
        "<h3>" + esc(cfg.pergunta) + "</h3>" +
        '<p><span class="numero">' + esc(ctx.marcadores.valor) + '</span><span class="numero__unidade">' + esc(ctx.texto(cfg.unidade || "")) + "</span></p>" +
        '<p class="indicador__frase">' + icone(/^Subiu/.test(v) ? "subiu" : /^Caiu/.test(v) ? "caiu" : "info", "icone--sm") + "<span>" + esc(ctx.texto(cfg.frase || "")) + "</span></p>" +
        '<p class="indicador__fonte">' + esc(r.indicador.fonte.orgao) + " · " + esc(ctx.marcadores.periodo) + (r.dados.origem !== "api" ? " · dados ilustrativos" : "") + "</p>";
    }).catch(function (erro) {
      console.error(erro);
      artigo.innerHTML = "<h3>" + esc(cfg.pergunta) + '</h3><p class="texto-suave">Esse número não está disponível agora. Tente de novo em alguns minutos.</p>';
    });
  }

  function azulejoTema(t) {
    return '<span class="azulejo' + (t.azulejo && t.azulejo !== "azulejo" ? " azulejo--" + t.azulejo : "") + '" aria-hidden="true">' + icone(t.icone || "temas") + "</span>";
  }

  function blocoTema(container, t) {
    var artigo = document.createElement("article");
    artigo.className = "card tema";
    artigo.innerHTML = azulejoTema(t) + '<h3><a href="tema.html?id=' + esc(t.id) + '">' + esc(t.nomeCurto || t.titulo) + '</a></h3><p data-resumo class="texto-suave">' + esc(t.descricao) + "</p>" +
      '<span class="tema__rodape" aria-hidden="true">Ver o tema' + icone("seta", "icone--sm") + "</span>";
    container.appendChild(artigo);
    if (!t.resumo) return;
    BG.catalogo.completo(t.resumo.indicador).then(function (r) {
      var ctx = BG.contexto(t.resumo, r.indicador, r.dados, null);
      var p = BG.$("[data-resumo]", artigo);
      p.classList.remove("texto-suave");
      p.textContent = ctx.texto(t.resumo.texto);
    }).catch(function () {});
  }

  BG.paginas.inicio = function () {
    BG.catalogo.site().then(function (site) {
      var grade = BG.$("#destaques");
      site.inicio.destaques.forEach(function (d) { destaque(grade, d); });
      var foco = Object.assign({ id: "foco-estado", etiquetaDestaque: true }, site.inicio.foco);
      BG.cartao(BG.$("#foco"), foco, "grande");
    });

    Promise.all([BG.catalogo.temasAtivos(), BG.catalogo.site()]).then(function (r) {
      var grade = BG.$("#lista-temas");
      r[0].forEach(function (t) { blocoTema(grade, t); });
      prepararPerguntas(r[0], r[1]);
    });
  };

  function irParaPergunta() {
    var alvo = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (!alvo) return;
    var rolar = function () { alvo.scrollIntoView({ block: "start" }); };
    requestAnimationFrame(rolar);
    setTimeout(rolar, 700);
  }

  /* ---------- Tema: cartões separados entre o seu estado, o Brasil e a comparação entre estados ---------- */

  var SECOES = [
    {
      id: "estado",
      titulo: function (e) { return BG.cap(BG.emNome(e)); },
      texto: function (e) { return "Os números " + BG.deNome(e) + ", comparados com a média do Brasil."; }
    },
    {
      id: "brasil",
      titulo: function () { return "No Brasil como um todo"; },
      texto: function (e, faltou) {
        return "Números do país inteiro." + (faltou ? " Alguns deles o órgão oficial não mede " + BG.emNome(e) + ", por isso aparecem só para o Brasil." : "");
      }
    },
    {
      id: "estados",
      titulo: function () { return "Comparando os estados"; },
      texto: function (e) { return "Todos os estados lado a lado, com " + ({ no: "o ", na: "a " }[e.prep] || "") + e.nome + " em destaque."; }
    }
  ];

  function escopoDoVisual(visual, c) {
    return typeof visual.escopo === "function" ? visual.escopo(c) : visual.escopo;
  }

  function secaoDoCartao(c, r, visual, estado) {
    if (c.secao) return { id: c.secao };
    if (visual.comparaEstados) return { id: "estados" };
    var temEstado = r.dados.observacoes.some(function (o) { return o.local === estado.uf; });
    var doEstado = (c.escopo || escopoDoVisual(visual, c)) === "estado";
    return { id: doEstado && temEstado ? "estado" : "brasil", faltou: doEstado && !temEstado };
  }

  function montarSecoesDoTema(lista, cartoes) {
    lista.innerHTML = "";
    var blocos = {};
    SECOES.forEach(function (s) {
      var bloco = document.createElement("section");
      bloco.className = "bloco-tema";
      bloco.setAttribute("aria-labelledby", "secao-" + s.id);
      bloco.hidden = true;
      bloco.innerHTML = '<header class="bloco-tema__cabecalho"><h2 class="titulo-secao" id="secao-' + s.id + '"></h2><p class="texto-suave"></p></header>' +
        '<div class="bloco-tema__cartoes"></div>';
      lista.appendChild(bloco);
      blocos[s.id] = bloco;
    });

    var itens = cartoes.map(function (c, i) {
      return {
        cfg: Object.assign({ id: "pergunta-" + (i + 1), nivel: 3 }, c),
        pronto: Promise.all([BG.catalogo.completo(c.indicador), BG.visuais.obter(c.visual)]).catch(function () { return null; })
      };
    });

    function organizar() {
      var estado = BG.estado.atual();
      return Promise.all(itens.map(function (it) { return it.pronto; })).then(function (rs) {
        var usadas = {};
        var faltou = false;
        itens.forEach(function (it, i) {
          var s = rs[i] ? secaoDoCartao(it.cfg, rs[i][0], rs[i][1], estado) : { id: "brasil" };
          usadas[s.id] = true;
          if (s.faltou) faltou = true;
          var destino = BG.$(".bloco-tema__cartoes", blocos[s.id]);
          if (!it.artigo) {
            BG.cartao(destino, it.cfg, "grande");
            it.artigo = document.getElementById(it.cfg.id);
          } else {
            destino.appendChild(it.artigo);
          }
        });
        SECOES.forEach(function (s) {
          var bloco = blocos[s.id];
          bloco.hidden = !usadas[s.id];
          BG.$("h2", bloco).textContent = s.titulo(estado);
          BG.$("p", bloco).textContent = s.texto(estado, faltou);
        });
      });
    }

    document.addEventListener("bg:estado", organizar);
    return organizar();
  }

  BG.paginas.tema = function () {
    var id = BG.parametro("id") || "precos";
    var cabecalho = BG.$("#cabecalho-tema");
    BG.catalogo.tema(id).then(function (t) {
      if (t.status !== "ativo") throw new Error("Tema inativo");
      document.title = t.titulo + " — Brasil em Gráfico";
      BG.$("[data-tema-titulo]").textContent = t.titulo;
      BG.$("[data-tema-descricao]").textContent = t.descricao;
      BG.$("[data-tema-migalha]").textContent = t.nomeCurto || t.titulo;
      return montarSecoesDoTema(BG.$("#cartoes"), t.cartoes).then(irParaPergunta);
    }).catch(function (erro) {
      console.error(erro);
      cabecalho.innerHTML = '<div><h1>Tema não encontrado</h1><p>Esse tema ainda não existe ou está em preparação. <a href="index.html#temas">Ver todos os temas</a>.</p></div>';
    });
  };

  /* ---------- Meu estado ---------- */

  function valorParaComparar(r, e) {
    var obs = r.dados.ultimo(e.uf);
    if (!obs) return { texto: "sem dado", nota: r.indicador.fonte.orgao + " não pesquisa", obs: null };
    var nota = r.indicador.cobertura && e.areaIpca ? e.areaIpca : BG.periodo.longo(obs.periodo);
    var br = r.dados.ultimo("BR");
    if (br && r.indicador.formato !== "milhoes" && r.indicador.formato !== "bilhoes") {
      var d = BG.textoDiferenca(r.indicador, obs.valor, br.valor);
      nota = d.igual ? "igual ao Brasil" : d.texto + (r.indicador.formato === "pct" ? " do Brasil" : " que o Brasil");
    }
    return { texto: BG.formatar(r.indicador, obs.valor), nota: nota, obs: obs };
  }

  function colunaComparacao(e, papel, base, itens) {
    return '<div class="card comparar__coluna' + (base ? " comparar__coluna--base" : "") + '">' +
      '<span class="comparar__papel">' + papel + "</span>" +
      "<h3><span>" + esc(e.nome) + '</span><span class="estado-cabecalho__sigla">' + e.uf + "</span></h3>" +
      '<dl class="comparar__lista">' + itens.map(function (r) {
        var v = valorParaComparar(r, e);
        return "<div><dt>" + esc(BG.cap(r.indicador.nome)) + "</dt><dd>" + esc(v.texto) + "<small>" + esc(v.nota) + "</small></dd></div>";
      }).join("") + "</dl></div>";
  }

  function resumoComparacao(a, b, itens) {
    var frases = [];
    itens.forEach(function (r) {
      var oa = r.dados.ultimo(a.uf);
      var ob = r.dados.ultimo(b.uf);
      if (!oa || !ob) return;
      var d = BG.textoDiferenca(r.indicador, oa.valor, ob.valor);
      var nome = r.indicador.nome.charAt(0).toLowerCase() + r.indicador.nome.slice(1);
      if (d.igual) frases.push(BG.cap(nome) + ": igual nos dois estados.");
      else frases.push(BG.cap(nome) + ": " + BG.formatar(r.indicador, oa.valor) + " " + BG.emNome(a) + " e " + BG.formatar(r.indicador, ob.valor) + " " + BG.emNome(b) + ".");
    });
    return frases.join(" ");
  }

  BG.paginas.estado = function () {
    var seletorComparar = BG.$("#comparar-com");
    var escolhido = null;

    BG.catalogo.site().then(function (site) {
      var grade = BG.$("#painel-estado");
      site.estado.cartoes.forEach(function (c) { BG.cartao(grade, c, "mini"); });
      irParaPergunta();

      Promise.all(site.estado.comparar.map(function (id) { return BG.catalogo.completo(id).catch(function () { return null; }); })).then(function (lista) {
        var itens = lista.filter(Boolean);

        function desenhar() {
          var e = BG.estado.atual();
          var outros = BG.locais.estados.filter(function (x) { return x.uf !== e.uf; });
          seletorComparar.innerHTML = outros.map(function (x) {
            return '<option value="' + x.uf + '">' + esc(x.nome) + " (" + x.uf + ")</option>";
          }).join("");
          seletorComparar.value = escolhido && escolhido !== e.uf ? escolhido : e.vizinhos[0];
          var outro = BG.locais.porUf[seletorComparar.value];
          BG.$("#comparar-colunas").innerHTML = colunaComparacao(e, "Seu estado", true, itens) + colunaComparacao(outro, "Comparando com", false, itens);
          BG.$("#resumo-comparacao").innerHTML = "<strong>Resumo da comparação:</strong> " + esc(resumoComparacao(e, outro, itens));

          var csv = [["Indicador", e.nome, "Brasil", "Período", "Fonte", "Origem"]];
          itens.forEach(function (r) {
            var oe = r.dados.ultimo(e.uf);
            var ob = r.dados.ultimo("BR");
            csv.push([BG.cap(r.indicador.nome) + " (" + r.indicador.unidade + ")", oe ? BG.formatar(r.indicador, oe.valor) : "sem dado",
              ob ? BG.formatar(r.indicador, ob.valor) : "", BG.periodo.longo((oe || ob || {}).periodo), r.indicador.fonte.orgao + " · " + r.indicador.fonte.nome,
              r.dados.origem === "api" ? "fonte oficial" : "dados ilustrativos"]);
          });
          BG.$("#dados-estado").dataset.csv = JSON.stringify(csv);
          BG.$("[data-baixar='dados-estado']").dataset.arquivo = "brasil-em-grafico-" + e.uf.toLowerCase() + ".csv";
        }

        seletorComparar.addEventListener("change", function () {
          escolhido = seletorComparar.value;
          desenhar();
        });
        document.addEventListener("bg:estado", desenhar);
        desenhar();
      });
    });

    function cabecalho() {
      var e = BG.estado.atual();
      document.title = "Meu estado: " + e.nome + " — Brasil em Gráfico";
      BG.$("[data-estado-nome]").textContent = e.nome;
      BG.$("[data-estado-uf]").textContent = e.uf;
      BG.$("[data-estado-regiao]").textContent = "Região " + e.regiao;
      BG.$("[data-estado-apoio]").textContent = "Os números que mais pesam no bolso de quem vive " + BG.emNome(e) + ", explicados sem complicação.";
      BG.$("[data-estado-baixar]").textContent = "Baixar os dados " + BG.deNome(e);
      var panorama = BG.$("#ouvir-panorama");
      panorama.dataset.rotulo = "Ouvir o resumo " + BG.deNome(e);
      BG.rotuloOuvir(panorama, false);
      if (history.replaceState) history.replaceState(null, "", "meu-estado.html?uf=" + e.uf + location.hash);
    }

    cabecalho();
    document.addEventListener("bg:estado", function () {
      BG.pararFala();
      cabecalho();
    });
  };

  /* ---------- Sobre os dados ---------- */

  var PERIODICIDADE = { diaria: "Todo dia útil", semanal: "Toda semana", mensal: "Todo mês", trimestral: "A cada 3 meses", anual: "Todo ano" };

  BG.paginas.sobre = function () {
    var lista = BG.$("#lista-fontes");
    BG.catalogo.temasAtivos().then(function (temas) {
      var vistos = {};
      var pares = [];
      temas.forEach(function (t) {
        t.cartoes.forEach(function (c) {
          if (!vistos[c.indicador]) {
            vistos[c.indicador] = true;
            pares.push({ tema: t, id: c.indicador });
          }
        });
      });
      return Promise.all(pares.map(function (p) {
        return BG.catalogo.completo(p.id).then(function (r) { r.tema = p.tema; return r; }).catch(function () { return null; });
      }));
    }).then(function (itens) {
      lista.innerHTML = itens.filter(Boolean).map(function (r) {
        var ind = r.indicador;
        var d = r.dados;
        return '<article class="card fonte-card">' + azulejoTema(r.tema).replace('aria-hidden="true"', 'aria-hidden="true" style="margin-bottom:1rem"') +
          "<h2>" + esc(BG.cap(ind.nome)) + "</h2><p>" + esc(ind.nomeTecnico || "") + "</p><dl>" +
          "<dt>Quem mede</dt><dd>" + esc(ind.fonte.orgao) + " · " + esc(ind.fonte.nome) + "</dd>" +
          "<dt>De quanto em quanto tempo</dt><dd>" + esc(PERIODICIDADE[ind.periodicidade] || ind.periodicidade) + "</dd>" +
          "<dt>Último dado</dt><dd>" + esc(BG.cap(BG.periodo.longo(d.ultimoPeriodo))) + "</dd>" +
          "<dt>Atualizado no site em</dt><dd>" + esc(BG.periodo.data(d.geradoEm) || "—") + (d.origem !== "api" ? " · <strong>dados ilustrativos</strong>" : "") + "</dd>" +
          (ind.cobertura ? "<dt>Cobertura</dt><dd>" + esc(ind.cobertura) + "</dd>" : "") +
          "</dl>" + (BG.urlSegura(ind.fonte.url) ? '<a class="btn-link" href="' + esc(BG.urlSegura(ind.fonte.url)) + '" rel="noopener noreferrer">Ver no site ' + esc(BG.siteDe(ind.fonte.orgao)) + icone("abrir", "icone--sm") + "</a>" : "") +
          "</article>";
      }).join("");
    });
  };
})();
