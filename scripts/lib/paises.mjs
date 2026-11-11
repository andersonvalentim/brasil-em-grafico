/** Países e grupos usados no tema "Brasil e o mundo", com o código ISO3 e o nome em português. */

export const NOMES = {
  BRA: 'Brasil',
  ARG: 'Argentina',
  BOL: 'Bolívia',
  CHL: 'Chile',
  COL: 'Colômbia',
  CRI: 'Costa Rica',
  DOM: 'República Dominicana',
  ECU: 'Equador',
  SLV: 'El Salvador',
  GTM: 'Guatemala',
  HND: 'Honduras',
  MEX: 'México',
  NIC: 'Nicarágua',
  PAN: 'Panamá',
  PRY: 'Paraguai',
  PER: 'Peru',
  URY: 'Uruguai',
  VEN: 'Venezuela',
  USA: 'Estados Unidos',
  CHN: 'China',
  IND: 'Índia',
  DEU: 'Alemanha',
  JPN: 'Japão',
  GBR: 'Reino Unido',
  FRA: 'França',
  ITA: 'Itália',
  CAN: 'Canadá',
  KOR: 'Coreia do Sul',
  AUS: 'Austrália',
  RUS: 'Rússia',
  IDN: 'Indonésia',
  TUR: 'Turquia',
  SAU: 'Arábia Saudita',
  ZAF: 'África do Sul',
};

export const AMERICA_LATINA = ['BRA', 'ARG', 'BOL', 'CHL', 'COL', 'CRI', 'DOM', 'ECU', 'SLV', 'GTM', 'HND', 'MEX', 'NIC', 'PAN', 'PRY', 'PER', 'URY', 'VEN'];

/** Países do G20 (a União Europeia e a União Africana entram como blocos e ficam de fora). */
export const G20 = ['BRA', 'ARG', 'AUS', 'CAN', 'CHN', 'FRA', 'DEU', 'IND', 'IDN', 'ITA', 'JPN', 'KOR', 'MEX', 'RUS', 'SAU', 'ZAF', 'TUR', 'GBR', 'USA'];

export const MEDIA_AMERICA_LATINA = 'América Latina e Caribe';
export const MEDIA_MUNDO = 'Mundo';
export const MEDIA_OCDE = 'OCDE';
export const MEDIA_AMERICAS = 'Américas';

/** Códigos numéricos da ONU (M49), usados pela base dos Objetivos de Desenvolvimento Sustentável. */
export const M49 = {
  BRA: 76, ARG: 32, BOL: 68, CHL: 152, COL: 170, CRI: 188, DOM: 214, ECU: 218, SLV: 222, GTM: 320,
  HND: 340, MEX: 484, NIC: 558, PAN: 591, PRY: 600, PER: 604, URY: 858, VEN: 862, USA: 840, CHN: 156,
  IND: 356, DEU: 276, JPN: 392, GBR: 826, FRA: 250, ITA: 380, CAN: 124, KOR: 410, AUS: 36, RUS: 643,
  IDN: 360, TUR: 792, SAU: 682, ZAF: 710,
};

/** Códigos de duas letras (ISO 3166-1), usados pelo BIS. */
export const ISO2 = {
  BRA: 'BR', ARG: 'AR', BOL: 'BO', CHL: 'CL', COL: 'CO', CRI: 'CR', DOM: 'DO', ECU: 'EC', SLV: 'SV', GTM: 'GT',
  HND: 'HN', MEX: 'MX', NIC: 'NI', PAN: 'PA', PRY: 'PY', PER: 'PE', URY: 'UY', VEN: 'VE', USA: 'US', CHN: 'CN',
  IND: 'IN', DEU: 'DE', JPN: 'JP', GBR: 'GB', FRA: 'FR', ITA: 'IT', CAN: 'CA', KOR: 'KR', AUS: 'AU', RUS: 'RU',
  IDN: 'ID', TUR: 'TR', SAU: 'SA', ZAF: 'ZA',
};

export function paisesDosGrupos(grupos = ['america-latina', 'g20']) {
  const lista = new Set();
  if (grupos.includes('america-latina')) AMERICA_LATINA.forEach((c) => lista.add(c));
  if (grupos.includes('g20')) G20.forEach((c) => lista.add(c));
  return [...lista];
}
