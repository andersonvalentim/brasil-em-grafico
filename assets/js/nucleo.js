/* Brasil em Gráfico — núcleo: catálogo, dados, formatação, estado escolhido e ações comuns */
(function () {
  "use strict";

  var BG = (window.BG = window.BG || {});

  /* Versão carimbada no endereço deste arquivo (?v=...), repassada aos visuais carregados depois. */
  BG.versao = ((document.currentScript && /[?&]v=([\w-]+)/.exec(document.currentScript.src)) || [])[1] || "";

  /* ---------- Utilidades ---------- */

  BG.$ = function (sel, raiz) {
    return (raiz || document).querySelector(sel);
  };

  BG.$$ = function (sel, raiz) {
    return Array.prototype.slice.call((raiz || document).querySelectorAll(sel));
  };

  BG.escapar = function (texto) {
    return String(texto == null ? "" : texto)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  };

  BG.urlSegura = function (url) {
    return /^https?:\/\//i.test(String(url || "")) ? String(url) : "";
  };

  BG.siteDe = function (orgao) {
    return (/^(ANP|ANEEL|ANS|ANATEL)$/i.test(String(orgao)) ? "da " : "do ") + orgao;
  };

  BG.cap = function (texto) {
    texto = String(texto || "");
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  };

  BG.guardar = function (chave, valor) {
    try {
      localStorage.setItem(chave, valor);
    } catch (e) {
      /* navegação privada: segue sem salvar */
    }
  };

  BG.ler = function (chave) {
    try {
      return localStorage.getItem(chave);
    } catch (e) {
      return null;
    }
  };

  BG.parametro = function (nome) {
    var m = new RegExp("[?&]" + nome + "=([^&#]*)").exec(location.search);
    return m ? decodeURIComponent(m[1].replace(/\+/g, " ")) : null;
  };

  BG.preencherTexto = function (modelo, marcadores) {
    return String(modelo || "").replace(/\{(\w+)\}/g, function (todo, nome) {
      var v = marcadores[nome];
      return v == null ? "" : v;
    }).replace(/\s+([.,])/g, "$1").replace(/\s{2,}/g, " ").trim();
  };

  /* ---------- Números ---------- */

  var formatadores = {};

  function nf(casas) {
    if (!formatadores[casas]) {
      formatadores[casas] = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });
    }
    return formatadores[casas];
  }

  BG.nf = nf;

  BG.fmt = {
    real: function (v, casas) {
      return "R$ " + nf(casas == null ? 2 : casas).format(v);
    },
    pct: function (v, casas) {
      return nf(casas == null ? 1 : casas).format(v) + "%";
    },
    num: function (v, casas) {
      return nf(casas || 0).format(v);
    },
    centavos: function (diferenca) {
      var c = Math.round(Math.abs(diferenca) * 100);
      return c === 1 ? "1 centavo" : c + " centavos";
    }
  };

  /* Formata um valor conforme o formato do indicador no catálogo. */
  BG.formatar = function (indicador, valor, opcoes) {
    if (valor == null || isNaN(valor)) return "sem dado";
    opcoes = opcoes || {};
    var casas = opcoes.casas != null ? opcoes.casas : indicador.casas;
    switch (indicador.formato) {
      case "pct":
        return BG.fmt.pct(valor, casas);
      case "real":
        return BG.fmt.real(valor, casas);
      case "milhoes":
        return nf(1).format(valor / 1e6) + (opcoes.curto ? " mi" : " milhões");
      case "bilhoes":
        return nf(1).format(valor / 1e9) + (opcoes.curto ? " bi" : " bilhões");
      case "pessoas":
        if (Math.abs(valor) >= 1e6) return nf(1).format(valor / 1e6) + (opcoes.curto ? " mi" : " milhões de pessoas");
        if (Math.abs(valor) >= 1e3) return nf(0).format(valor / 1e3) + (opcoes.curto ? " mil" : " mil pessoas");
        return nf(0).format(valor) + (opcoes.curto ? "" : " pessoas");
      default:
        return nf(casas || 0).format(valor);
    }
  };

  /* Texto de diferença entre dois valores, em palavras do dia a dia. */
  BG.textoDiferenca = function (indicador, a, b) {
    var d = a - b;
    if (indicador.formato === "real" && indicador.casas === 2 && Math.abs(d) < 1) {
      if (Math.round(Math.abs(d) * 100) === 0) return { igual: true, texto: "o mesmo valor" };
      return { sinal: d > 0 ? 1 : -1, texto: BG.fmt.centavos(d) + (d > 0 ? " a mais" : " a menos") };
    }
    var casas = indicador.casas == null ? 1 : indicador.casas;
    if (Number(nf(casas).format(Math.abs(d)).replace(/\./g, "").replace(",", ".")) === 0) {
      return { igual: true, texto: "o mesmo valor" };
    }
    if (indicador.formato === "pct") {
      var pontos = nf(casas).format(Math.abs(d));
      return { sinal: d > 0 ? 1 : -1, texto: pontos + (Math.abs(d) === 1 ? " ponto" : " pontos") + (d > 0 ? " acima" : " abaixo") };
    }
    return { sinal: d > 0 ? 1 : -1, texto: BG.formatar(indicador, Math.abs(d)) + (d > 0 ? " a mais" : " a menos") };
  };

  BG.comparaMedia = function (valor, media) {
    if (valor == null || media == null) return "";
    var rel = media === 0 ? 0 : (valor - media) / Math.abs(media);
    if (Math.abs(rel) < 0.005) return "igual à média do Brasil";
    if (Math.abs(rel) <= 0.06) return rel > 0 ? "um pouco acima da média do Brasil" : "um pouco abaixo da média do Brasil";
    return rel > 0 ? "acima da média do Brasil" : "abaixo da média do Brasil";
  };

  /* Escala "redonda" para eixos que começam no zero. */
  BG.escala = function (maximo) {
    if (!(maximo > 0)) return { max: 1, passo: 0.2 };
    var bruto = maximo / 5;
    var potencia = Math.pow(10, Math.floor(Math.log10(bruto)));
    var passo = [1, 2, 2.5, 5, 10].map(function (m) { return m * potencia; }).filter(function (p) { return p >= bruto; })[0];
    return { max: Math.ceil(maximo / passo) * passo, passo: passo };
  };

  /* ---------- Períodos ---------- */

  var MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
  var MESES_CURTOS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

  BG.periodo = {
    longo: function (p) {
      if (!p) return "";
      var m;
      if ((m = /^(\d{4})-T(\d)$/.exec(p))) return m[2] + "º trimestre de " + m[1];
      if ((m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(p))) return Number(m[3]) + " de " + MESES[Number(m[2]) - 1] + " de " + m[1];
      if ((m = /^(\d{4})-(\d{2})$/.exec(p))) return MESES[Number(m[2]) - 1] + " de " + m[1];
      return p;
    },
    curto: function (p) {
      if (!p) return "";
      var m;
      if ((m = /^(\d{4})-T(\d)$/.exec(p))) return m[2] + "º tri/" + m[1].slice(2);
      if ((m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(p))) return m[3] + "/" + m[2];
      if ((m = /^(\d{4})-(\d{2})$/.exec(p))) return MESES_CURTOS[Number(m[2]) - 1] + "/" + m[1].slice(2);
      return p;
    },
    data: function (iso) {
      if (!iso) return "";
      var d = new Date(iso);
      if (isNaN(d)) return "";
      return d.getDate() + " de " + MESES[d.getMonth()] + " de " + d.getFullYear();
    }
  };

  /* ---------- Carregamento do catálogo e dos dados ---------- */

  var cache = {};

  BG.carregarJson = function (url) {
    if (!cache[url]) {
      cache[url] = fetch(url, { cache: "no-cache" }).then(function (r) {
        if (!r.ok) throw new Error("Não foi possível carregar " + url + " (" + r.status + ")");
        return r.json();
      });
    }
    return cache[url];
  };

  function Dados(json) {
    this.id = json.id;
    this.geradoEm = json.geradoEm;
    this.origem = json.origem;
    this.ultimoPeriodo = json.ultimoPeriodo;
    this.extras = json.extras || {};
    this.notas = json.notas || {};
    this.observacoes = json.observacoes || [];
    var grupos = (this._grupos = {});
    this.observacoes.forEach(function (o) {
      var chave = o.local + "|" + (o.categoria || "");
      (grupos[chave] = grupos[chave] || []).push(o);
    });
    Object.keys(grupos).forEach(function (k) {
      grupos[k].sort(function (a, b) { return a.periodo < b.periodo ? -1 : a.periodo > b.periodo ? 1 : 0; });
    });
  }

  Dados.prototype.serie = function (local, categoria) {
    return this._grupos[local + "|" + (categoria || "")] || [];
  };

  Dados.prototype.ultimo = function (local, categoria) {
    var s = this.serie(local, categoria);
    return s.length ? s[s.length - 1] : null;
  };

  Dados.prototype.tem = function (local, categoria) {
    return this.serie(local, categoria).length > 0;
  };

  Dados.prototype.noPeriodo = function (local, periodo, categoria) {
    var s = this.serie(local, categoria);
    for (var i = s.length - 1; i >= 0; i--) if (s[i].periodo === periodo) return s[i];
    return null;
  };

  Dados.prototype.categorias = function (local) {
    var vistas = {};
    var lista = [];
    this.observacoes.forEach(function (o) {
      if (o.categoria && (!local || o.local === local) && !vistas[o.categoria]) {
        vistas[o.categoria] = true;
        lista.push(o.categoria);
      }
    });
    return lista;
  };

  Dados.prototype.periodos = function (filtro) {
    var vistos = {};
    this.observacoes.forEach(function (o) {
      if (!filtro || filtro(o)) vistos[o.periodo] = true;
    });
    return Object.keys(vistos).sort();
  };

  BG.Dados = Dados;

  BG.catalogo = {
    site: function () {
      return BG.carregarJson("catalogo/site.json");
    },
    tema: function (id) {
      return BG.carregarJson("catalogo/temas/" + id + ".json");
    },
    indicador: function (id) {
      return BG.carregarJson("catalogo/indicadores/" + id + ".json");
    },
    dados: function (id) {
      var chave = "dados:" + id;
      if (!cache[chave]) {
        cache[chave] = BG.carregarJson("dados/" + id + ".json").then(function (j) { return new Dados(j); });
      }
      return cache[chave];
    },
    /* Indicador + dados juntos, que é o que quase todo cartão precisa. */
    completo: function (id) {
      return Promise.all([BG.catalogo.indicador(id), BG.catalogo.dados(id)]).then(function (r) {
        return { indicador: r[0], dados: r[1] };
      });
    },
    temasAtivos: function () {
      return BG.catalogo.site().then(function (site) {
        return Promise.all(site.temas.map(function (id) {
          return BG.catalogo.tema(id).catch(function () { return null; });
        }));
      }).then(function (temas) {
        return temas.filter(function (t) { return t && t.status === "ativo"; })
          .sort(function (a, b) { return (a.ordem || 0) - (b.ordem || 0); });
      });
    }
  };

  /* ---------- Locais (Brasil e estados) ---------- */

  BG.locais = { estados: [], porUf: {}, brasil: null };

  BG.carregarLocais = function () {
    return BG.carregarJson("catalogo/locais.json").then(function (j) {
      BG.locais.brasil = j.brasil;
      BG.locais.estados = j.estados.slice().sort(function (a, b) { return a.nome.localeCompare(b.nome, "pt-BR"); });
      BG.locais.porUf = { BR: j.brasil };
      j.estados.forEach(function (e) { BG.locais.porUf[e.uf] = e; });
    });
  };

  BG.emNome = function (e) {
    return e.prep + " " + e.nome;
  };

  BG.deNome = function (e) {
    return { na: "da", no: "do", em: "de" }[e.prep] + " " + e.nome;
  };

  BG.emArea = function (e) {
    if (!e.areaIpca) return BG.emNome(e);
    return (e.areaPrep || "em") + " " + e.areaIpca;
  };

  /* ---------- Estado escolhido ---------- */

  var CHAVE_ESTADO = "bg-estado";
  var ESTADO_PADRAO = "BA";

  BG.estado = {
    atual: function () {
      return BG.locais.porUf[BG.ler(CHAVE_ESTADO)] || BG.locais.porUf[ESTADO_PADRAO];
    },
    escolher: function (uf) {
      if (!BG.locais.porUf[uf] || uf === "BR") return;
      BG.guardar(CHAVE_ESTADO, uf);
      BG.$$("select[data-seletor-estado]").forEach(function (s) { s.value = uf; });
      document.dispatchEvent(new CustomEvent("bg:estado", { detail: BG.locais.porUf[uf] }));
    }
  };

  function prepararSeletores() {
    var opcoes = BG.locais.estados.map(function (e) {
      return '<option value="' + e.uf + '">' + BG.escapar(e.nome) + " (" + e.uf + ")</option>";
    }).join("");
    BG.$$("select[data-seletor-estado]").forEach(function (select) {
      select.innerHTML = opcoes;
      select.value = BG.estado.atual().uf;
      select.addEventListener("change", function () {
        BG.estado.escolher(select.value);
        BG.avisar("Pronto! " + BG.estado.atual().nome + " agora aparece em destaque em todo o site.");
      });
    });
  }

  /* ---------- Cabeçalho e rodapé ---------- */

  var NAV = [
    { id: "inicio", rotulo: "Início", icone: "inicio", url: "index.html" },
    { id: "temas", rotulo: "Temas", icone: "temas", url: "index.html#temas" },
    { id: "estado", rotulo: "Meu estado", icone: "estado", url: "meu-estado.html" },
    { id: "perguntas", rotulo: "Perguntas", icone: "pergunta", url: "index.html#perguntas" }
  ];

  function icone(nome, classe) {
    return '<svg class="icone' + (classe ? " " + BG.escapar(classe) : "") + '" aria-hidden="true"><use href="#i-' + BG.escapar(nome) + '"/></svg>';
  }

  BG.icone = icone;

  function montarLayout() {
    var ativo = document.body.dataset.nav;
    var topo = BG.$('[data-layout="topo"]');
    if (topo) {
      topo.outerHTML =
        '<a class="pular" href="#conteudo">Pular para o conteúdo</a>' +
        '<header class="topo"><div class="container topo__linha">' +
        '<a class="marca" href="index.html" aria-label="Brasil em Gráfico, página inicial">' +
        '<img class="marca__logo marca__logo--claro" src="assets/img/logo-horizontal.svg" alt="" width="240" height="44">' +
        '<img class="marca__logo marca__logo--escuro" src="assets/img/logo-horizontal-escuro.svg" alt="" width="240" height="44"></a>' +
        '<nav class="nav-principal" aria-label="Principal"><ul>' +
        NAV.map(function (n) {
          return '<li><a href="' + n.url + '"' + (n.id === ativo ? ' aria-current="page"' : "") + ">" + icone(n.icone) + n.rotulo + "</a></li>";
        }).join("") +
        "</ul></nav>" +
        '<div class="topo__acoes">' +
        '<button type="button" class="btn-ferramenta" data-acao="texto" aria-pressed="false" aria-label="Texto maior">' +
        '<span class="btn-ferramenta__aa" aria-hidden="true">Aa</span><span class="btn-ferramenta__rotulo" aria-hidden="true">Texto maior</span></button>' +
        '<button type="button" class="btn-ferramenta btn-ferramenta--icone" data-acao="tema" aria-pressed="false" aria-label="Modo escuro">' + icone("lua") + "</button>" +
        "</div></div>" +
        '<div class="faixa-estado"><div class="container faixa-estado__linha">' +
        '<label class="faixa-estado__rotulo" for="estado-topo">' + icone("estado", "icone--sm") + "<span>Vendo os dados de</span></label>" +
        '<select id="estado-topo" class="faixa-estado__seletor" data-seletor-estado><option value="BA">Bahia (BA)</option></select>' +
        '<a class="faixa-estado__link" href="meu-estado.html">Resumo do estado</a>' +
        "</div></div></header>";
    }

    var rodape = BG.$('[data-layout="rodape"]');
    if (rodape) {
      rodape.outerHTML =
        '<footer class="rodape"><div class="container rodape__conteudo"><div>' +
        "<h2>" + icone("escudo") + "Transparência e dados abertos</h2>" +
        "<p>O Brasil em Gráfico reúne números públicos oficiais e explica cada um em linguagem simples. É gratuito e apartidário.</p>" +
        '<p style="margin-top:0.75rem">Os números são atualizados automaticamente a partir das fontes oficiais.</p>' +
        "</div><div><h3>Fontes oficiais</h3>" +
        '<ul class="rodape__fontes"><li>IBGE</li><li>Banco Central do Brasil</li><li>ANP (Agência Nacional do Petróleo)</li><li>ANEEL (Agência Nacional de Energia Elétrica)</li></ul>' +
        '</div></div><div class="container rodape__base"><p>© ' + new Date().getFullYear() + " Brasil em Gráfico · Dados de acesso público</p>" +
        '<p><a href="sobre.html">Sobre os dados</a> · <a href="sobre.html#acessibilidade">Declaração de acessibilidade</a></p></div></footer>' +
        '<div id="aviso" class="aviso-flutuante" role="status" aria-live="polite" hidden></div>';
    }
  }

  /* ---------- Preferências: modo escuro e texto maior ---------- */

  function prepararPreferencias() {
    var raiz = document.documentElement;
    var botaoTema = BG.$('[data-acao="tema"]');
    var botaoTexto = BG.$('[data-acao="texto"]');

    function atualizar() {
      var escuro = raiz.dataset.tema === "escuro";
      if (botaoTema) {
        botaoTema.setAttribute("aria-pressed", String(escuro));
        BG.$("use", botaoTema).setAttribute("href", escuro ? "#i-sol" : "#i-lua");
      }
      if (botaoTexto) botaoTexto.setAttribute("aria-pressed", String(raiz.dataset.texto === "maior"));
    }

    if (botaoTema) {
      botaoTema.addEventListener("click", function () {
        var novo = raiz.dataset.tema === "escuro" ? "claro" : "escuro";
        raiz.dataset.tema = novo;
        BG.guardar("bg-tema", novo);
        atualizar();
        document.dispatchEvent(new CustomEvent("bg:tema"));
      });
    }

    if (botaoTexto) {
      botaoTexto.addEventListener("click", function () {
        var maior = raiz.dataset.texto !== "maior";
        if (maior) raiz.dataset.texto = "maior";
        else delete raiz.dataset.texto;
        BG.guardar("bg-texto", maior ? "maior" : "normal");
        atualizar();
      });
    }

    atualizar();
  }

  /* ---------- Aviso temporário ---------- */

  var temporizadorAviso;

  BG.avisar = function (texto) {
    var el = BG.$("#aviso");
    if (!el) return;
    el.hidden = false;
    el.textContent = "";
    setTimeout(function () { el.textContent = texto; }, 50);
    clearTimeout(temporizadorAviso);
    temporizadorAviso = setTimeout(function () { el.hidden = true; }, 5000);
  };

  /* ---------- Ouvir (Web Speech API em pt-BR) ---------- */

  var botaoFalando = null;

  function rotuloOuvir(botao, falando) {
    var texto = BG.$(".rotulo", botao);
    var uso = BG.$("use", botao);
    if (texto) texto.textContent = falando ? "Parar" : botao.dataset.rotulo || "Ouvir";
    if (uso) uso.setAttribute("href", falando ? "#i-parar" : "#i-som");
    botao.setAttribute("aria-pressed", String(falando));
  }

  BG.rotuloOuvir = rotuloOuvir;

  BG.pararFala = function () {
    if ("speechSynthesis" in window) speechSynthesis.cancel();
    if (botaoFalando) rotuloOuvir(botaoFalando, false);
    botaoFalando = null;
  };

  function textoParaFalar(botao) {
    var alvo = botao.dataset.ouvir ? document.getElementById(botao.dataset.ouvir) : botao.closest("[data-card]");
    if (!alvo) return "";
    var partes = BG.$$("[data-falar]", alvo).filter(function (el) {
      return !el.closest("[hidden]") && el.offsetParent !== null && el.textContent.trim();
    });
    if (!partes.length) partes = BG.$$("h2, h3", alvo);
    return partes.map(function (el) {
      return el.textContent.replace(/[▲▼]/g, "").replace(/\s+/g, " ").trim();
    }).join(". ");
  }

  function falar(botao) {
    if (!("speechSynthesis" in window)) {
      BG.avisar("Seu navegador não consegue ler em voz alta. Tente pelo Chrome ou Safari.");
      return;
    }
    if (botaoFalando === botao) {
      BG.pararFala();
      return;
    }
    BG.pararFala();
    var fala = new SpeechSynthesisUtterance(textoParaFalar(botao));
    fala.lang = "pt-BR";
    fala.rate = 0.95;
    var voz = speechSynthesis.getVoices().filter(function (v) { return /^pt(-|_)BR/i.test(v.lang); })[0];
    if (voz) fala.voice = voz;
    fala.onend = fala.onerror = function () {
      if (botaoFalando === botao) BG.pararFala();
    };
    botaoFalando = botao;
    rotuloOuvir(botao, true);
    speechSynthesis.speak(fala);
  }

  /* ---------- Planilha, compartilhar e tabelas ---------- */

  BG.baixarCsv = function (linhas, nomeArquivo) {
    var csv = linhas.map(function (l) {
      return l.map(function (c) { return '"' + String(c == null ? "" : c).replace(/"/g, '""') + '"'; }).join(";");
    }).join("\r\n");
    var blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = nomeArquivo || "brasil-em-grafico.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    BG.avisar("Pronto! O arquivo com os dados foi baixado.");
  };

  function compartilhar(botao) {
    var card = botao.closest("[data-card]");
    var titulo = card ? (BG.$("h2, h3", card) || {}).textContent : document.title;
    var url = location.href.split("#")[0] + (card && card.id ? "#" + card.id : "");
    if (navigator.share) {
      navigator.share({ title: titulo, text: titulo + " — Brasil em Gráfico", url: url }).catch(function () {});
      return;
    }
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(function () {
        BG.avisar("Link copiado. Agora é só colar onde quiser.");
      }, function () {
        BG.avisar("Não deu para copiar. Copie o endereço na barra do navegador.");
      });
    } else {
      BG.avisar("Copie o endereço na barra do navegador para compartilhar.");
    }
  }

  function prepararAcoes() {
    document.addEventListener("click", function (ev) {
      var botao = ev.target.closest("button, a");
      if (!botao) return;

      if (botao.hasAttribute("data-ouvir")) {
        falar(botao);
      } else if (botao.dataset.tabela) {
        var tabela = document.getElementById(botao.dataset.tabela);
        if (!tabela) return;
        var abrir = tabela.hidden;
        tabela.hidden = !abrir;
        botao.setAttribute("aria-expanded", String(abrir));
        BG.$(".rotulo", botao).textContent = abrir ? "Esconder tabela" : "Ver em tabela";
        if (abrir) tabela.focus();
      } else if (botao.hasAttribute("data-compartilhar")) {
        compartilhar(botao);
      } else if (botao.dataset.baixar) {
        ev.preventDefault();
        var alvo = document.getElementById(botao.dataset.baixar);
        if (alvo && alvo.dataset.csv) BG.baixarCsv(JSON.parse(alvo.dataset.csv), botao.dataset.arquivo);
      } else if (botao.dataset.feedback) {
        var caixa = botao.closest(".feedback");
        BG.$(".feedback__botoes", caixa).innerHTML = '<p role="status">' + (botao.dataset.feedback === "sim"
          ? "Que bom! Obrigado por avisar."
          : "Obrigado por avisar. Vamos simplificar esta explicação.") + "</p>";
      }
    });

    window.addEventListener("pagehide", BG.pararFala);
  }

  /* ---------- Visuais (carregados sob demanda) ---------- */

  var visuais = {};
  var esperando = {};

  BG.visuais = {
    registrar: function (nome, definicao) {
      definicao.nome = nome;
      visuais[nome] = definicao;
      if (esperando[nome]) esperando[nome].resolver(definicao);
    },
    obter: function (nome) {
      if (visuais[nome]) return Promise.resolve(visuais[nome]);
      if (!/^[a-z0-9-]+$/.test(String(nome))) {
        return Promise.reject(new Error('Nome de visual inválido: "' + nome + '"'));
      }
      if (!esperando[nome]) {
        var p = {};
        p.promessa = new Promise(function (resolver, rejeitar) {
          p.resolver = resolver;
          var s = document.createElement("script");
          s.src = "assets/js/visuais/" + nome + ".js" + (BG.versao ? "?v=" + BG.versao : "");
          s.onerror = function () { rejeitar(new Error('Visual "' + nome + '" não encontrado em assets/js/visuais/')); };
          document.head.appendChild(s);
        });
        esperando[nome] = p;
      }
      return esperando[nome].promessa;
    }
  };

  /* ---------- Páginas ---------- */

  BG.paginas = BG.paginas || {};

  function iniciar() {
    montarLayout();
    prepararPreferencias();
    prepararAcoes();
    BG.carregarLocais().then(function () {
      var uf = BG.parametro("uf");
      if (uf && BG.locais.porUf[uf.toUpperCase()]) BG.guardar(CHAVE_ESTADO, uf.toUpperCase());
      prepararSeletores();
      var pagina = BG.paginas[document.body.dataset.pagina];
      if (pagina) pagina();
    }).catch(function (erro) {
      console.error(erro);
      var principal = BG.$("#conteudo");
      if (principal) {
        principal.insertAdjacentHTML("afterbegin", '<div class="container"><p class="estado-vazio" role="alert">' +
          "Não conseguimos carregar os dados agora. Tente de novo em alguns minutos.</p></div>");
      }
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();
})();
