/* Páginas montadas a partir do catálogo: início, tema, meu estado e sobre os dados */
(function () {
  "use strict";

  var BG = window.BG;
  var esc = BG.escapar;
  var icone = BG.icone;

  /* ---------- Busca em linguagem do dia a dia ---------- */

  var PALAVRAS_VAZIAS = ["o", "a", "os", "as", "de", "da", "do", "das", "dos", "e", "em", "na", "no", "nas", "nos", "um", "uma",
    "que", "qual", "quanto", "quanta", "quantos", "ta", "esta", "hoje", "agora", "meu", "minha", "pra", "para", "por", "com", "como"];
  var UFS_AMBIGUAS = ["se", "to", "es", "ma", "al", "pa", "ap", "pe"];

  function normalizar(texto) {
    return texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s-]/g, " ");
  }

  function distancia(a, b) {
    if (Math.abs(a.length - b.length) > 2) return 3;
    var anterior = [];
    for (var j = 0; j <= b.length; j++) anterior[j] = j;
    for (var i = 1; i <= a.length; i++) {
      var atual = [i];
      for (var k = 1; k <= b.length; k++) {
        atual[k] = Math.min(anterior[k] + 1, atual[k - 1] + 1, anterior[k - 1] + (a[i - 1] === b[k - 1] ? 0 : 1));
      }
      anterior = atual;
    }
    return anterior[b.length];
  }

  function parecido(palavra, termo) {
    if (palavra === termo) return true;
    if (palavra.length >= 5 && termo.indexOf(palavra) === 0) return true;
    var limite = termo.length >= 7 ? 2 : termo.length >= 4 ? 1 : 0;
    return limite > 0 && distancia(palavra, termo) <= limite;
  }

  function encontrarEstado(original, normalizado) {
    var palavras = normalizado.split(/\s+/).filter(Boolean);
    var achado = null;
    BG.locais.estados.forEach(function (e) {
      if (achado) return;
      var nome = normalizar(e.nome);
      if (normalizado.indexOf(nome) !== -1) achado = e;
      else if (nome.indexOf(" ") === -1 && palavras.some(function (p) { return p.length >= 4 && distancia(p, nome) <= 1; })) achado = e;
    });
    if (achado) return achado;
    original.split(/\s+/).forEach(function (p) {
      if (achado || p.length !== 2) return;
      var uf = p.toUpperCase();
      if (!BG.locais.porUf[uf] || uf === "BR") return;
      if (UFS_AMBIGUAS.indexOf(p.toLowerCase()) !== -1 && p !== uf) return;
      achado = BG.locais.porUf[uf];
    });
    return achado;
  }

  function topicosDaBusca(temas) {
    var lista = temas.map(function (t) {
      return { titulo: t.nomeCurto || t.titulo, descricao: t.descricao, url: "tema.html?id=" + t.id, termos: (t.palavras || []).map(normalizar), porEstado: true };
    });
    lista.push({ titulo: "Resumo do seu estado", descricao: "Os números mais importantes do seu estado", url: "meu-estado.html", termos: ["estado", "resumo", "comparar"], porEstado: true });
    lista.push({ titulo: "De onde vêm os dados", descricao: "Fontes oficiais e como cada número é calculado", url: "sobre.html", termos: ["fonte", "fontes", "dados", "metodologia", "sobre", "oficial", "baixar"] });
    return lista;
  }

  function comEstado(url, estado) {
    var partes = url.split("#");
    return partes[0] + (partes[0].indexOf("?") === -1 ? "?" : "&") + "uf=" + estado.uf + (partes[1] ? "#" + partes[1] : "");
  }

  function buscar(topicos, consulta) {
    var normalizado = normalizar(consulta);
    var estado = encontrarEstado(consulta, normalizado);
    var nomeEstado = estado ? normalizar(estado.nome).split(" ") : [];
    var palavras = normalizado.split(/\s+/).filter(function (p) {
      return p && PALAVRAS_VAZIAS.indexOf(p) === -1 && nomeEstado.indexOf(p) === -1;
    });
    var resultados = topicos.map(function (t) {
      var pontos = 0;
      palavras.forEach(function (p) { if (t.termos.some(function (termo) { return parecido(p, termo); })) pontos++; });
      return { topico: t, pontos: pontos };
    }).filter(function (r) { return r.pontos > 0; })
      .sort(function (a, b) { return b.pontos - a.pontos; })
      .slice(0, 4)
      .map(function (r) {
        var t = r.topico;
        return {
          titulo: t.porEstado && estado ? t.titulo + " " + BG.emNome(estado) : t.titulo,
          descricao: t.descricao,
          url: t.porEstado && estado ? comEstado(t.url, estado) : t.url
        };
      });
    if (estado) resultados.push({ titulo: "Resumo " + BG.deNome(estado), descricao: "Os números mais importantes do estado", url: "meu-estado.html?uf=" + estado.uf });
    return resultados;
  }

  function prepararBusca(temas) {
    var form = BG.$("#form-busca");
    if (!form) return;
    var topicos = topicosDaBusca(temas);
    var campo = BG.$("#campo-busca");
    var lista = BG.$("#resultados-busca");
    var status = BG.$("#status-busca");
    var espera;

    function mostrar(consulta) {
      var texto = consulta.trim();
      if (!texto) {
        lista.innerHTML = "";
        status.textContent = "";
        return [];
      }
      var resultados = buscar(topicos, texto);
      if (!resultados.length) {
        lista.innerHTML = '<li class="resultados__vazio">Não encontramos nada para “' + esc(texto) +
          "”. Tente palavras do dia a dia, como <strong>gasolina</strong>, <strong>desemprego</strong> ou <strong>conta de luz</strong>.</li>";
        status.textContent = "Nenhum resultado.";
        return [];
      }
      lista.innerHTML = resultados.map(function (r) {
        return '<li><a class="resultado" href="' + r.url + '"><span><strong>' + esc(r.titulo) + "</strong><span>" + esc(r.descricao) + "</span></span>" + icone("seta") + "</a></li>";
      }).join("");
      status.textContent = resultados.length === 1 ? "1 resultado encontrado." : resultados.length + " resultados encontrados.";
      return resultados;
    }

    campo.addEventListener("input", function () {
      clearTimeout(espera);
      espera = setTimeout(function () { mostrar(campo.value); }, 250);
    });
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var r = mostrar(campo.value);
      if (r.length) location.href = r[0].url;
    });
    BG.$$("[data-sugestao]").forEach(function (b) {
      b.addEventListener("click", function () {
        campo.value = b.dataset.sugestao;
        var r = mostrar(campo.value);
        if (r.length) location.href = r[0].url;
      });
    });
    if (location.hash === "#busca") campo.focus();
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

    BG.catalogo.temasAtivos().then(function (temas) {
      var grade = BG.$("#lista-temas");
      temas.forEach(function (t) { blocoTema(grade, t); });
      prepararBusca(temas);
    });

    document.addEventListener("bg:estado", function (ev) {
      var conf = BG.$("#confirmacao-estado");
      if (conf) {
        conf.innerHTML = '<span role="status">Pronto! ' + esc(ev.detail.nome) + ' agora aparece destacado em todo o site. <a href="meu-estado.html">Ver meu estado</a></span>';
      }
    });
  };

  /* ---------- Tema ---------- */

  BG.paginas.tema = function () {
    var id = BG.parametro("id") || "precos";
    var cabecalho = BG.$("#cabecalho-tema");
    BG.catalogo.tema(id).then(function (t) {
      if (t.status !== "ativo") throw new Error("Tema inativo");
      document.title = t.titulo + " — Brasil em Gráfico";
      BG.$("[data-tema-titulo]").textContent = t.titulo;
      BG.$("[data-tema-descricao]").textContent = t.descricao;
      BG.$("[data-tema-migalha]").textContent = t.nomeCurto || t.titulo;
      var lista = BG.$("#cartoes");
      t.cartoes.forEach(function (c, i) {
        var cfg = Object.assign({ id: "pergunta-" + (i + 1), etiqueta: "Pergunta " + (i + 1) }, c);
        BG.cartao(lista, cfg, "grande");
      });
      atualizarMostrando();
    }).catch(function (erro) {
      console.error(erro);
      cabecalho.innerHTML = '<div><h1>Tema não encontrado</h1><p>Esse tema ainda não existe ou está em preparação. <a href="index.html#temas">Ver todos os temas</a>.</p></div>';
    });

    function atualizarMostrando() {
      var e = BG.estado.atual();
      var alvo = BG.$("[data-estado-ativo]");
      if (alvo) alvo.textContent = e.nome;
    }
    document.addEventListener("bg:estado", atualizarMostrando);
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
          "</dl>" + (ind.fonte.url ? '<a class="btn-link" href="' + esc(ind.fonte.url) + '" rel="noopener">Ver no site do ' + esc(ind.fonte.orgao) + icone("abrir", "icone--sm") + "</a>" : "") +
          "</article>";
      }).join("");
    });
  };
})();
