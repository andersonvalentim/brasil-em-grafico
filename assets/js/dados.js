/*
 * Brasil em Gráfico — dados ilustrativos.
 * Valores plausíveis, mas NÃO são os números oficiais. Substitua pelas bases
 * do IBGE, ANP, Banco Central e ANEEL antes de publicar.
 */
(function () {
  "use strict";

  var BRASIL = {
    gasolina: 6.09,
    gasolinaMesPassado: 5.94,
    postosPesquisados: 4890,
    desemprego: 6.6,
    ipca: 3.9,
    metaInflacao: 3.0,
    dolar: 5.72,
    dolarOntem: 5.70,
    selic: 11.25,
    rendaMedia: 3210,
    populacao: 212.6,
    etanol: 4.05,
    diesel: 6.15,
    arrecadacao: 203,
    pibTrimestre: 0.9,
    ipcaTrimestres: [4.3, 3.9, 4.0, 3.9],
    bandeira: "verde"
  };

  var ATUALIZACAO = {
    anp: "semana de 26/10/2026",
    ibgeIpca: "outubro de 2026",
    ibgePnad: "trimestre até setembro de 2026",
    bcb: "2 de novembro de 2026",
    aneel: "novembro de 2026",
    proximoIpca: "10 de dezembro de 2026"
  };

  var IPCA_12_MESES = [
    { mes: "nov/25", nome: "novembro de 2025", valor: 4.2 },
    { mes: "dez/25", nome: "dezembro de 2025", valor: 4.3 },
    { mes: "jan/26", nome: "janeiro de 2026", valor: 4.1 },
    { mes: "fev/26", nome: "fevereiro de 2026", valor: 3.9 },
    { mes: "mar/26", nome: "março de 2026", valor: 3.8 },
    { mes: "abr/26", nome: "abril de 2026", valor: 4.0 },
    { mes: "mai/26", nome: "maio de 2026", valor: 4.1 },
    { mes: "jun/26", nome: "junho de 2026", valor: 4.0 },
    { mes: "jul/26", nome: "julho de 2026", valor: 3.7 },
    { mes: "ago/26", nome: "agosto de 2026", valor: 3.8 },
    { mes: "set/26", nome: "setembro de 2026", valor: 3.9 },
    { mes: "out/26", nome: "outubro de 2026", valor: 3.9 }
  ];

  var ALIMENTOS = {
    subiram: [
      { nome: "Azeite de oliva", valor: 24.8, motivo: "Importação mais cara e safra ruim lá fora" },
      { nome: "Carne bovina (acém)", valor: 17.5, motivo: "Menos bois indo para o abate" },
      { nome: "Café moído", valor: 14.6, motivo: "Muita procura no mundo todo" },
      { nome: "Leite integral", valor: 11.2, motivo: "Pasto mais fraco na entressafra" },
      { nome: "Pão francês", valor: 8.4, motivo: "Farinha e energia mais caras" }
    ],
    cairam: [
      { nome: "Tomate", valor: -16.4, motivo: "Colheita farta e clima bom" },
      { nome: "Feijão-carioca", valor: -13.1, motivo: "Mais área plantada" },
      { nome: "Cebola", valor: -10.7, motivo: "Oferta regular do Sul e do Nordeste" },
      { nome: "Batata-inglesa", valor: -8.6, motivo: "Pico da colheita de inverno" },
      { nome: "Ovo de galinha", valor: -5.2, motivo: "Ração (milho e soja) mais barata" }
    ]
  };

  var BANDEIRAS = [
    { id: "verde", nome: "Verde", extra: 0, amostra: "#3E7D5A" },
    { id: "amarela", nome: "Amarela", extra: 1.88, amostra: "#D9A23A" },
    { id: "vermelha1", nome: "Vermelha 1", extra: 4.46, amostra: "#C0533A" },
    { id: "vermelha2", nome: "Vermelha 2", extra: 7.87, amostra: "#8E2F22" }
  ];

  /*
   * prep: preposição usada antes do nome ("na Bahia", "no Ceará", "em Goiás").
   * ipca: só existe nas 16 áreas pesquisadas pelo IBGE; null nas demais.
   * ipcaProximo: área pesquisada mais próxima, para o aviso de "sem cobertura".
 * areaPrep: preposição antes da área do IPCA, quando não for "em" ("no Grande Rio").
   */
  var ESTADOS = [
    { uf: "AC", nome: "Acre", prep: "no", gentilico: "acreanos", regiao: "Norte", capital: "Rio Branco", gasolina: 7.20, postos: 38, desemprego: 7.6, ipca: 4.4, areaIpca: "Rio Branco", populacao: 0.83, distribuidora: "Energisa Acre", vizinhos: ["AM", "RO"] },
    { uf: "AL", nome: "Alagoas", prep: "em", gentilico: "alagoanos", regiao: "Nordeste", capital: "Maceió", gasolina: 6.15, postos: 96, desemprego: 8.6, ipca: null, ipcaProximo: "PE", populacao: 3.13, distribuidora: "Equatorial Alagoas", vizinhos: ["PE", "SE", "BA"] },
    { uf: "AP", nome: "Amapá", prep: "no", gentilico: "amapaenses", regiao: "Norte", capital: "Macapá", gasolina: 6.05, postos: 22, desemprego: 9.5, ipca: null, ipcaProximo: "PA", populacao: 0.73, distribuidora: "CEA Equatorial", vizinhos: ["PA"] },
    { uf: "AM", nome: "Amazonas", prep: "no", gentilico: "amazonenses", regiao: "Norte", capital: "Manaus", gasolina: 6.55, postos: 74, desemprego: 8.2, ipca: null, ipcaProximo: "PA", populacao: 3.94, distribuidora: "Amazonas Energia", vizinhos: ["PA", "RR", "AC", "RO"] },
    { uf: "BA", nome: "Bahia", prep: "na", gentilico: "baianos", regiao: "Nordeste", capital: "Salvador", gasolina: 6.29, postos: 412, desemprego: 9.8, ipca: 4.1, areaIpca: "Salvador e região", populacao: 14.14, distribuidora: "Neoenergia Coelba", vizinhos: ["SE", "PE", "MG"] },
    { uf: "CE", nome: "Ceará", prep: "no", gentilico: "cearenses", regiao: "Nordeste", capital: "Fortaleza", gasolina: 6.05, postos: 210, desemprego: 7.8, ipca: 4.5, areaIpca: "Fortaleza e região", populacao: 8.79, distribuidora: "Enel Ceará", vizinhos: ["PI", "RN", "PB", "PE"] },
    { uf: "DF", nome: "Distrito Federal", prep: "no", gentilico: "brasilienses", regiao: "Centro-Oeste", capital: "Brasília", gasolina: 6.10, postos: 120, desemprego: 8.6, ipca: 3.6, areaIpca: "Brasília", populacao: 2.82, distribuidora: "Neoenergia Brasília", vizinhos: ["GO", "MG"] },
    { uf: "ES", nome: "Espírito Santo", prep: "no", gentilico: "capixabas", regiao: "Sudeste", capital: "Vitória", gasolina: 6.20, postos: 140, desemprego: 4.6, ipca: 3.9, areaIpca: "Vitória e região", populacao: 3.83, distribuidora: "EDP Espírito Santo", vizinhos: ["MG", "RJ", "BA"] },
    { uf: "GO", nome: "Goiás", prep: "em", gentilico: "goianos", regiao: "Centro-Oeste", capital: "Goiânia", gasolina: 6.12, postos: 260, desemprego: 5.3, ipca: 3.1, areaIpca: "Goiânia", populacao: 7.06, distribuidora: "Equatorial Goiás", vizinhos: ["DF", "MG", "MT", "TO"] },
    { uf: "MA", nome: "Maranhão", prep: "no", gentilico: "maranhenses", regiao: "Nordeste", capital: "São Luís", gasolina: 5.95, postos: 150, desemprego: 7.0, ipca: 4.8, areaIpca: "São Luís", populacao: 6.78, distribuidora: "Equatorial Maranhão", vizinhos: ["PI", "PA", "TO"] },
    { uf: "MT", nome: "Mato Grosso", prep: "em", gentilico: "mato-grossenses", regiao: "Centro-Oeste", capital: "Cuiabá", gasolina: 6.18, postos: 160, desemprego: 3.3, ipca: null, ipcaProximo: "MS", populacao: 3.66, distribuidora: "Energisa Mato Grosso", vizinhos: ["MS", "GO", "RO"] },
    { uf: "MS", nome: "Mato Grosso do Sul", prep: "em", gentilico: "sul-mato-grossenses", regiao: "Centro-Oeste", capital: "Campo Grande", gasolina: 5.99, postos: 110, desemprego: 3.9, ipca: 3.4, areaIpca: "Campo Grande", populacao: 2.76, distribuidora: "Energisa Mato Grosso do Sul", vizinhos: ["MT", "PR", "SP"] },
    { uf: "MG", nome: "Minas Gerais", prep: "em", gentilico: "mineiros", regiao: "Sudeste", capital: "Belo Horizonte", gasolina: 6.04, postos: 730, desemprego: 5.1, ipca: 3.7, areaIpca: "Belo Horizonte e região", populacao: 20.54, distribuidora: "Cemig", vizinhos: ["SP", "RJ", "ES", "BA"] },
    { uf: "PA", nome: "Pará", prep: "no", gentilico: "paraenses", regiao: "Norte", capital: "Belém", gasolina: 6.08, postos: 160, desemprego: 7.4, ipca: 4.3, areaIpca: "Belém e região", populacao: 8.12, distribuidora: "Equatorial Pará", vizinhos: ["AP", "AM", "MA", "TO"] },
    { uf: "PB", nome: "Paraíba", prep: "na", gentilico: "paraibanos", regiao: "Nordeste", capital: "João Pessoa", gasolina: 5.92, postos: 104, desemprego: 8.1, ipca: null, ipcaProximo: "PE", populacao: 3.97, distribuidora: "Energisa Paraíba", vizinhos: ["PE", "RN", "CE"] },
    { uf: "PR", nome: "Paraná", prep: "no", gentilico: "paranaenses", regiao: "Sul", capital: "Curitiba", gasolina: 6.01, postos: 420, desemprego: 4.1, ipca: 3.5, areaIpca: "Curitiba e região", populacao: 11.44, distribuidora: "Copel", vizinhos: ["SP", "SC", "MS"] },
    { uf: "PE", nome: "Pernambuco", prep: "em", gentilico: "pernambucanos", regiao: "Nordeste", capital: "Recife", gasolina: 5.98, postos: 298, desemprego: 10.2, ipca: 4.0, areaIpca: "Recife e região", populacao: 9.06, distribuidora: "Neoenergia Pernambuco", vizinhos: ["PB", "AL", "BA", "CE"] },
    { uf: "PI", nome: "Piauí", prep: "no", gentilico: "piauienses", regiao: "Nordeste", capital: "Teresina", gasolina: 5.97, postos: 90, desemprego: 8.0, ipca: null, ipcaProximo: "MA", populacao: 3.27, distribuidora: "Equatorial Piauí", vizinhos: ["MA", "CE", "BA"] },
    { uf: "RJ", nome: "Rio de Janeiro", prep: "no", gentilico: "fluminenses", regiao: "Sudeste", capital: "Rio de Janeiro", gasolina: 6.22, postos: 520, desemprego: 8.3, ipca: 4.0, areaIpca: "Grande Rio", areaPrep: "no", populacao: 16.05, distribuidora: "Light e Enel Rio", vizinhos: ["SP", "MG", "ES"] },
    { uf: "RN", nome: "Rio Grande do Norte", prep: "no", gentilico: "potiguares", regiao: "Nordeste", capital: "Natal", gasolina: 6.25, postos: 98, desemprego: 8.4, ipca: null, ipcaProximo: "PE", populacao: 3.30, distribuidora: "Neoenergia Cosern", vizinhos: ["PB", "CE"] },
    { uf: "RS", nome: "Rio Grande do Sul", prep: "no", gentilico: "gaúchos", regiao: "Sul", capital: "Porto Alegre", gasolina: 6.07, postos: 450, desemprego: 5.0, ipca: 3.3, areaIpca: "Porto Alegre e região", populacao: 10.88, distribuidora: "CEEE Equatorial e RGE", vizinhos: ["SC", "PR"] },
    { uf: "RO", nome: "Rondônia", prep: "em", gentilico: "rondonienses", regiao: "Norte", capital: "Porto Velho", gasolina: 6.70, postos: 60, desemprego: 4.0, ipca: null, ipcaProximo: "AC", populacao: 1.58, distribuidora: "Energisa Rondônia", vizinhos: ["AC", "AM", "MT"] },
    { uf: "RR", nome: "Roraima", prep: "em", gentilico: "roraimenses", regiao: "Norte", capital: "Boa Vista", gasolina: 6.30, postos: 20, desemprego: 6.9, ipca: null, ipcaProximo: "PA", populacao: 0.64, distribuidora: "Roraima Energia", foraDoSistema: true, vizinhos: ["AM", "PA"] },
    { uf: "SC", nome: "Santa Catarina", prep: "em", gentilico: "catarinenses", regiao: "Sul", capital: "Florianópolis", gasolina: 6.11, postos: 310, desemprego: 3.0, ipca: null, ipcaProximo: "PR", populacao: 7.61, distribuidora: "Celesc", vizinhos: ["PR", "RS"] },
    { uf: "SP", nome: "São Paulo", prep: "em", gentilico: "paulistas", regiao: "Sudeste", capital: "São Paulo", gasolina: 5.89, postos: 1250, desemprego: 6.0, ipca: 3.8, areaIpca: "São Paulo e região", populacao: 44.41, distribuidora: "Enel São Paulo e outras", vizinhos: ["RJ", "MG", "PR"] },
    { uf: "SE", nome: "Sergipe", prep: "em", gentilico: "sergipanos", regiao: "Nordeste", capital: "Aracaju", gasolina: 6.12, postos: 115, desemprego: 8.9, ipca: 4.2, areaIpca: "Aracaju", populacao: 2.21, distribuidora: "Energisa Sergipe", vizinhos: ["BA", "AL"] },
    { uf: "TO", nome: "Tocantins", prep: "no", gentilico: "tocantinenses", regiao: "Norte", capital: "Palmas", gasolina: 6.35, postos: 62, desemprego: 5.6, ipca: null, ipcaProximo: "GO", populacao: 1.51, distribuidora: "Energisa Tocantins", vizinhos: ["GO", "PA", "MA"] }
  ];

  var POR_UF = {};
  ESTADOS.forEach(function (e) {
    POR_UF[e.uf] = e;
  });

  /* Variação do IPCA em 4 trimestres, relativa ao valor atual do estado. */
  var DESVIOS_TRIMESTRE = [0.3, -0.1, 0.1, 0];

  window.BG_DADOS = {
    brasil: BRASIL,
    atualizacao: ATUALIZACAO,
    ipca12Meses: IPCA_12_MESES,
    alimentos: ALIMENTOS,
    bandeiras: BANDEIRAS,
    estados: ESTADOS,
    porUf: POR_UF,
    ipcaTrimestresEstado: function (estado) {
      if (estado.ipca == null) return null;
      return DESVIOS_TRIMESTRE.map(function (d) {
        return Math.round((estado.ipca + d) * 10) / 10;
      });
    },
    trimestres: ["1º tri", "2º tri", "3º tri", "Atual"]
  };
})();
