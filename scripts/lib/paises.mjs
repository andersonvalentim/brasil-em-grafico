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

export function paisesDosGrupos(grupos = ['america-latina', 'g20']) {
  const lista = new Set();
  if (grupos.includes('america-latina')) AMERICA_LATINA.forEach((c) => lista.add(c));
  if (grupos.includes('g20')) G20.forEach((c) => lista.add(c));
  return [...lista];
}
