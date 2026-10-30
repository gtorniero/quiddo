// Desenho dos personagens em SVG. As regras (lista de bichos, itens, validação) ficam em shared/avatar.ts.
import { AVATAR_PADRAO, avatarName, parseAvatar } from '../../shared/avatar';
import type { Avatar, Bicho, ItemCabeca, ItemRosto } from '../../shared/avatar';

const INK = '#0E2A22';

const ARTE_BICHOS: Record<Bicho, { ht: number; ey: number; svg: string }> = {
  tucano: { ht: 24, ey: 50, svg:
    `<circle cx="60" cy="62" r="38" fill="#1B1B1B"/><ellipse cx="60" cy="90" rx="22" ry="12" fill="#FFF3D6"/>
     <path d="M46 62 Q60 55 74 62 Q98 74 102 102 Q82 88 60 82 Q47 77 46 62Z" fill="#FF8A00"/>
     <path d="M60 64 Q84 76 100 100" stroke="#D94E00" stroke-width="3" fill="none" stroke-linecap="round"/>
     <circle cx="45" cy="50" r="9" fill="#5BC0EB"/><circle cx="75" cy="50" r="9" fill="#5BC0EB"/>
     <circle cx="45" cy="50" r="5.5" fill="#fff"/><circle cx="75" cy="50" r="5.5" fill="#fff"/>
     <circle cx="46" cy="51" r="3.2" fill="${INK}"/><circle cx="76" cy="51" r="3.2" fill="${INK}"/>` },
  capivara: { ht: 30, ey: 56, svg:
    `<circle cx="36" cy="34" r="8" fill="#7A4B2A"/><circle cx="84" cy="34" r="8" fill="#7A4B2A"/>
     <rect x="22" y="30" width="76" height="78" rx="33" fill="#A86B3C"/>
     <rect x="32" y="70" width="56" height="34" rx="17" fill="#8A5530"/>
     <circle cx="52" cy="83" r="3" fill="#3B2314"/><circle cx="68" cy="83" r="3" fill="#3B2314"/>
     <circle cx="46" cy="56" r="4.5" fill="${INK}"/><circle cx="74" cy="56" r="4.5" fill="${INK}"/>` },
  onca: { ht: 26, ey: 62, svg:
    `<circle cx="34" cy="34" r="12" fill="#F2A33A"/><circle cx="86" cy="34" r="12" fill="#F2A33A"/>
     <circle cx="34" cy="34" r="6" fill="#3B2314"/><circle cx="86" cy="34" r="6" fill="#3B2314"/>
     <circle cx="60" cy="66" r="40" fill="#F2A33A"/><ellipse cx="60" cy="86" rx="20" ry="14" fill="#FFF3D6"/>
     <circle cx="30" cy="66" r="4" fill="#3B2314"/><circle cx="90" cy="66" r="4" fill="#3B2314"/>
     <circle cx="60" cy="36" r="4" fill="#3B2314"/><circle cx="44" cy="42" r="3" fill="#3B2314"/><circle cx="76" cy="42" r="3" fill="#3B2314"/>
     <circle cx="38" cy="82" r="3" fill="#3B2314"/><circle cx="82" cy="82" r="3" fill="#3B2314"/>
     <circle cx="47" cy="62" r="7" fill="#fff"/><circle cx="73" cy="62" r="7" fill="#fff"/>
     <circle cx="48" cy="63" r="4" fill="${INK}"/><circle cx="74" cy="63" r="4" fill="${INK}"/>
     <path d="M54 77 h12 l-6 6 z" fill="#3B2314"/>` },
  preguica: { ht: 20, ey: 62, svg:
    `<circle cx="60" cy="62" r="42" fill="#9C7B5B"/><ellipse cx="60" cy="68" rx="32" ry="28" fill="#E8D5B5"/>
     <ellipse cx="45" cy="62" rx="11" ry="7" fill="#4A3426" transform="rotate(20 45 62)"/>
     <ellipse cx="75" cy="62" rx="11" ry="7" fill="#4A3426" transform="rotate(-20 75 62)"/>
     <path d="M40 62 q5 4 10 0" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round"/>
     <path d="M70 62 q5 4 10 0" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round"/>
     <ellipse cx="60" cy="75" rx="6" ry="4" fill="#3B2314"/>
     <path d="M50 85 q10 8 20 0" stroke="#3B2314" stroke-width="3" fill="none" stroke-linecap="round"/>` },
  arara: { ht: 26, ey: 58, svg:
    `<path d="M52 30 Q50 10 60 4 Q62 18 60 30Z" fill="#1E7FD6"/><path d="M60 30 Q66 12 78 10 Q74 24 66 32Z" fill="#FFC83D"/>
     <circle cx="60" cy="64" r="38" fill="#E5383B"/>
     <ellipse cx="44" cy="58" rx="12" ry="14" fill="#fff"/><ellipse cx="76" cy="58" rx="12" ry="14" fill="#fff"/>
     <path d="M36 52 h8 M36 58 h6 M84 52 h-8 M84 58 h-6" stroke="#E5383B" stroke-width="1.5" opacity=".5"/>
     <circle cx="45" cy="57" r="5" fill="#FFC83D"/><circle cx="75" cy="57" r="5" fill="#FFC83D"/>
     <circle cx="45" cy="57" r="3" fill="${INK}"/><circle cx="75" cy="57" r="3" fill="${INK}"/>
     <path d="M48 70 Q60 62 72 70 Q74 92 60 98 Q64 84 48 76Z" fill="#2B2B2B"/>
     <path d="M52 80 Q60 84 66 82 Q64 92 58 94Z" fill="#555"/>` },
  mico: { ht: 18, ey: 60, svg:
    `<circle cx="60" cy="62" r="44" fill="#F28C28"/>
     <circle cx="28" cy="40" r="12" fill="#F7A440"/><circle cx="92" cy="40" r="12" fill="#F7A440"/><circle cx="60" cy="24" r="14" fill="#F7A440"/>
     <circle cx="22" cy="72" r="11" fill="#F7A440"/><circle cx="98" cy="72" r="11" fill="#F7A440"/>
     <ellipse cx="60" cy="68" rx="24" ry="28" fill="#B8784A"/>
     <circle cx="49" cy="60" r="5" fill="#fff"/><circle cx="71" cy="60" r="5" fill="#fff"/>
     <circle cx="50" cy="61" r="3" fill="${INK}"/><circle cx="72" cy="61" r="3" fill="${INK}"/>
     <ellipse cx="60" cy="74" rx="5" ry="3" fill="#5A3518"/>
     <path d="M53 84 q7 5 14 0" stroke="#5A3518" stroke-width="2.5" fill="none" stroke-linecap="round"/>` },
  tamandua: { ht: 30, ey: 56, svg:
    `<circle cx="36" cy="38" r="7" fill="#6E6E66"/><circle cx="72" cy="34" r="7" fill="#6E6E66"/>
     <ellipse cx="54" cy="62" rx="32" ry="30" fill="#8C8C84"/>
     <path d="M62 66 Q90 80 108 102 Q104 108 98 104 Q80 88 56 82Z" fill="#8C8C84"/>
     <circle cx="104" cy="104" r="5" fill="${INK}"/>
     <path d="M24 78 Q50 70 66 88" stroke="${INK}" stroke-width="7" fill="none" stroke-linecap="round"/>
     <path d="M26 84 Q48 78 60 92" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round"/>
     <circle cx="45" cy="56" r="4" fill="${INK}"/><circle cx="67" cy="56" r="4" fill="${INK}"/>` },
  tatu: { ht: 36, ey: 64, svg:
    `<ellipse cx="40" cy="30" rx="8" ry="15" fill="#B08D68"/><ellipse cx="80" cy="30" rx="8" ry="15" fill="#B08D68"/>
     <ellipse cx="40" cy="31" rx="4" ry="9" fill="#E8C9A6"/><ellipse cx="80" cy="31" rx="4" ry="9" fill="#E8C9A6"/>
     <ellipse cx="60" cy="68" rx="36" ry="34" fill="#C9A27A"/>
     <path d="M28 54 Q60 30 92 54 M30 46 Q60 24 90 46" stroke="#A9825C" stroke-width="4" fill="none"/>
     <ellipse cx="60" cy="88" rx="16" ry="12" fill="#B08D68"/><ellipse cx="60" cy="88" rx="5" ry="3.5" fill="${INK}"/>
     <circle cx="46" cy="66" r="4" fill="${INK}"/><circle cx="74" cy="66" r="4" fill="${INK}"/>` },
  boto: { ht: 26, ey: 60, svg:
    `<circle cx="60" cy="62" r="38" fill="#F4A3B8"/><ellipse cx="54" cy="40" rx="12" ry="7" fill="#F9C6D3"/>
     <rect x="50" y="72" width="20" height="36" rx="10" fill="#EE8AA4"/>
     <path d="M52 100 q8 4 16 0" stroke="#C9627E" stroke-width="2.5" fill="none" stroke-linecap="round"/>
     <circle cx="44" cy="60" r="4.5" fill="${INK}"/><circle cx="76" cy="60" r="4.5" fill="${INK}"/>
     <circle cx="36" cy="72" r="5" fill="#F07C9A" opacity=".6"/><circle cx="84" cy="72" r="5" fill="#F07C9A" opacity=".6"/>` },
  jacare: { ht: 28, ey: 42, svg:
    `<circle cx="42" cy="42" r="14" fill="#3E8E41"/><circle cx="78" cy="42" r="14" fill="#3E8E41"/>
     <rect x="16" y="44" width="88" height="62" rx="26" fill="#3E8E41"/>
     <circle cx="34" cy="62" r="3" fill="#2F6E32"/><circle cx="86" cy="64" r="3.5" fill="#2F6E32"/><circle cx="30" cy="80" r="2.5" fill="#2F6E32"/>
     <path d="M26 90 Q60 102 94 90" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>
     <path d="M36 93 l3 6 l3 -5 M50 96 l3 6 l3 -6 M64 96 l3 6 l3 -6 M78 93 l3 5 l3 -6" fill="#fff" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>
     <circle cx="52" cy="70" r="2.5" fill="${INK}"/><circle cx="68" cy="70" r="2.5" fill="${INK}"/>
     <circle cx="42" cy="42" r="8" fill="#FFD54A"/><circle cx="78" cy="42" r="8" fill="#FFD54A"/>
     <ellipse cx="42" cy="42" rx="2.5" ry="6" fill="${INK}"/><ellipse cx="78" cy="42" rx="2.5" ry="6" fill="${INK}"/>` },
  loboguara: { ht: 16, ey: 60, svg:
    `<path d="M24 54 L36 8 L56 40Z" fill="#E0662B"/><path d="M96 54 L84 8 L64 40Z" fill="#E0662B"/>
     <path d="M32 22 L36 8 L42 18Z" fill="#2B2B2B"/><path d="M88 22 L84 8 L78 18Z" fill="#2B2B2B"/>
     <circle cx="60" cy="66" r="34" fill="#E0662B"/>
     <ellipse cx="60" cy="86" rx="18" ry="16" fill="#FFF3D6"/>
     <path d="M42 92 Q60 108 78 92 Q74 104 60 104 Q46 104 42 92Z" fill="#2B2B2B"/>
     <ellipse cx="60" cy="80" rx="7" ry="5" fill="${INK}"/>
     <circle cx="47" cy="60" r="4.5" fill="${INK}"/><circle cx="73" cy="60" r="4.5" fill="${INK}"/>` },
  quati: { ht: 32, ey: 60, svg:
    `<circle cx="38" cy="36" r="8" fill="#7A5232"/><circle cx="82" cy="36" r="8" fill="#7A5232"/>
     <ellipse cx="60" cy="64" rx="34" ry="32" fill="#9C6B43"/>
     <ellipse cx="46" cy="52" rx="8" ry="4" fill="#F3E3CC"/><ellipse cx="74" cy="52" rx="8" ry="4" fill="#F3E3CC"/>
     <rect x="51" y="68" width="18" height="34" rx="9" fill="#7A5232"/><circle cx="60" cy="101" r="5" fill="${INK}"/>
     <ellipse cx="46" cy="62" rx="7" ry="6" fill="#4A2F1C"/><ellipse cx="74" cy="62" rx="7" ry="6" fill="#4A2F1C"/>
     <circle cx="46" cy="61" r="3.5" fill="#fff"/><circle cx="74" cy="61" r="3.5" fill="#fff"/>
     <circle cx="46.5" cy="61.5" r="2" fill="${INK}"/><circle cx="74.5" cy="61.5" r="2" fill="${INK}"/>` },
  perereca: { ht: 26, ey: 40, svg:
    `<circle cx="40" cy="42" r="15" fill="#4CAF50"/><circle cx="80" cy="42" r="15" fill="#4CAF50"/>
     <ellipse cx="60" cy="74" rx="46" ry="32" fill="#4CAF50"/>
     <ellipse cx="60" cy="90" rx="30" ry="14" fill="#B6E388"/>
     <circle cx="40" cy="40" r="10" fill="#fff"/><circle cx="80" cy="40" r="10" fill="#fff"/>
     <circle cx="41" cy="41" r="5.5" fill="${INK}"/><circle cx="81" cy="41" r="5.5" fill="${INK}"/>
     <path d="M34 74 Q60 92 86 74" stroke="${INK}" stroke-width="3.5" fill="none" stroke-linecap="round"/>
     <circle cx="28" cy="72" r="5" fill="#FF7A7A" opacity=".6"/><circle cx="92" cy="72" r="5" fill="#FF7A7A" opacity=".6"/>` },
  coruja: { ht: 24, ey: 60, svg:
    `<path d="M26 44 L28 16 L46 32Z" fill="#8A6038"/><path d="M94 44 L92 16 L74 32Z" fill="#8A6038"/>
     <circle cx="60" cy="64" r="40" fill="#A0744B"/>
     <circle cx="30" cy="84" r="3" fill="#E8D5B5"/><circle cx="90" cy="84" r="3" fill="#E8D5B5"/><circle cx="60" cy="96" r="3" fill="#E8D5B5"/><circle cx="44" cy="94" r="2.5" fill="#E8D5B5"/><circle cx="76" cy="94" r="2.5" fill="#E8D5B5"/>
     <circle cx="45" cy="60" r="16" fill="#E8D5B5"/><circle cx="75" cy="60" r="16" fill="#E8D5B5"/>
     <circle cx="45" cy="60" r="11" fill="#FFC83D"/><circle cx="75" cy="60" r="11" fill="#FFC83D"/>
     <circle cx="45" cy="60" r="6" fill="${INK}"/><circle cx="75" cy="60" r="6" fill="${INK}"/>
     <path d="M54 70 h12 l-6 10z" fill="#FF9F1C"/>` },
  jabuti: { ht: 30, ey: 58, svg:
    `<ellipse cx="60" cy="116" rx="56" ry="24" fill="#5B4A2E"/>
     <path d="M30 104 l10 -6 l12 6 l-2 10 M58 100 l12 -4 l10 8 M86 104 l10 0" stroke="#C98B2E" stroke-width="3" fill="none"/>
     <ellipse cx="60" cy="64" rx="30" ry="36" fill="#7D8B3A"/>
     <circle cx="46" cy="40" r="4" fill="#E8A33A"/><circle cx="72" cy="36" r="3" fill="#E8A33A"/><circle cx="62" cy="44" r="3" fill="#E8A33A"/>
     <circle cx="47" cy="58" r="4.5" fill="${INK}"/><circle cx="73" cy="58" r="4.5" fill="${INK}"/>
     <path d="M48 78 Q60 86 72 78" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>` },
  papagaio: { ht: 26, ey: 58, svg:
    `<circle cx="60" cy="64" r="38" fill="#2EAD4B"/><ellipse cx="60" cy="34" rx="20" ry="10" fill="#1E7FD6"/>
     <ellipse cx="44" cy="58" rx="13" ry="13" fill="#FFD23F"/><ellipse cx="76" cy="58" rx="13" ry="13" fill="#FFD23F"/>
     <circle cx="44" cy="58" r="6" fill="#fff"/><circle cx="76" cy="58" r="6" fill="#fff"/>
     <circle cx="45" cy="58" r="3.5" fill="${INK}"/><circle cx="77" cy="58" r="3.5" fill="${INK}"/>
     <path d="M48 70 Q60 62 72 70 Q74 92 60 98 Q64 84 48 76Z" fill="#3A3A3A"/>` },
  bemtevi: { ht: 26, ey: 60, svg:
    `<circle cx="60" cy="64" r="38" fill="#3B3B3B"/>
     <path d="M24 74 Q60 64 96 74 Q92 100 60 102 Q28 100 24 74Z" fill="#FFD23F"/>
     <path d="M24 52 Q60 36 96 52" stroke="#fff" stroke-width="9" fill="none" stroke-linecap="round"/>
     <ellipse cx="60" cy="30" rx="8" ry="4" fill="#FFC83D"/>
     <circle cx="45" cy="62" r="5" fill="#fff"/><circle cx="75" cy="62" r="5" fill="#fff"/>
     <circle cx="45.5" cy="62.5" r="3" fill="${INK}"/><circle cx="75.5" cy="62.5" r="3" fill="${INK}"/>
     <path d="M52 68 h16 l-8 10z" fill="#1B1B1B"/>` },
  caramelo: { ht: 28, ey: 58, svg:
    `<ellipse cx="30" cy="58" rx="12" ry="24" fill="#B9732F" transform="rotate(18 30 58)"/>
     <ellipse cx="90" cy="58" rx="12" ry="24" fill="#B9732F" transform="rotate(-18 90 58)"/>
     <circle cx="60" cy="62" r="34" fill="#D99A4E"/>
     <ellipse cx="60" cy="84" rx="19" ry="14" fill="#F4DDB5"/>
     <ellipse cx="60" cy="77" rx="7.5" ry="5.5" fill="${INK}"/>
     <path d="M56 92 q4 8 8 0z" fill="#FF7A8A"/>
     <path d="M60 82 v6" stroke="${INK}" stroke-width="2.5"/>
     <circle cx="47" cy="58" r="4.5" fill="${INK}"/><circle cx="73" cy="58" r="4.5" fill="${INK}"/>` },
  gato: { ht: 20, ey: 62, svg:
    `<path d="M24 52 L30 14 L54 32Z" fill="#F2A04A"/><path d="M96 52 L90 14 L66 32Z" fill="#F2A04A"/>
     <path d="M30 40 L32 24 L44 32Z" fill="#FFB8B8"/><path d="M90 40 L88 24 L76 32Z" fill="#FFB8B8"/>
     <circle cx="60" cy="66" r="36" fill="#F2A04A"/>
     <path d="M54 32 v12 M60 30 v14 M66 32 v12" stroke="#D9822B" stroke-width="4" stroke-linecap="round"/>
     <ellipse cx="53" cy="82" rx="9" ry="7" fill="#FFF3D6"/><ellipse cx="67" cy="82" rx="9" ry="7" fill="#FFF3D6"/>
     <path d="M56 75 h8 l-4 5z" fill="#FF7A8A"/>
     <path d="M40 80 h-14 M40 85 l-13 4 M80 80 h14 M80 85 l13 4" stroke="${INK}" stroke-width="1.5" stroke-linecap="round"/>
     <ellipse cx="47" cy="62" rx="6" ry="7" fill="#8BC34A"/><ellipse cx="73" cy="62" rx="6" ry="7" fill="#8BC34A"/>
     <ellipse cx="47" cy="62" rx="2" ry="5" fill="${INK}"/><ellipse cx="73" cy="62" rx="2" ry="5" fill="${INK}"/>` },
  peixeboi: { ht: 28, ey: 56, svg:
    `<ellipse cx="60" cy="66" rx="40" ry="38" fill="#8E9AA6"/>
     <ellipse cx="60" cy="88" rx="26" ry="17" fill="#A9B4BE"/>
     <circle cx="50" cy="86" r="1.6" fill="${INK}"/><circle cx="56" cy="90" r="1.6" fill="${INK}"/><circle cx="64" cy="90" r="1.6" fill="${INK}"/><circle cx="70" cy="86" r="1.6" fill="${INK}"/>
     <path d="M54 80 q-2 3 0 5 M66 80 q2 3 0 5" stroke="${INK}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
     <circle cx="46" cy="56" r="3.8" fill="${INK}"/><circle cx="74" cy="56" r="3.8" fill="${INK}"/>
     <circle cx="34" cy="70" r="5" fill="#F4A3B8" opacity=".5"/><circle cx="86" cy="70" r="5" fill="#F4A3B8" opacity=".5"/>` },
};

// Itens de cabeça: desenhados a partir do topo da cabeça (t)
const ARTE_CABECA: Record<ItemCabeca, { draw: (t: number, e: number) => string }> = {
  bone:     { draw: (t) => `<path d="M34 ${t+12} Q34 ${t-14} 60 ${t-14} Q86 ${t-14} 86 ${t+12}Z" fill="#1E7FD6"/><path d="M70 ${t+8} h32 q5 0 2 6 h-34z" fill="#155FA3"/><circle cx="60" cy="${t-13}" r="3" fill="#155FA3"/>` },
  palha:    { draw: (t) => `<ellipse cx="60" cy="${t+6}" rx="44" ry="9" fill="#E9C46A"/><rect x="40" y="${t-16}" width="40" height="22" rx="9" fill="#E9C46A"/><rect x="40" y="${t-1}" width="40" height="6" fill="#E5383B"/>` },
  coroa:    { draw: (t) => `<path d="M38 ${t+8} L36 ${t-16} L48 ${t-4} L60 ${t-20} L72 ${t-4} L84 ${t-16} L82 ${t+8}Z" fill="#FFC83D" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/><circle cx="60" cy="${t}" r="3.5" fill="#E5383B"/><circle cx="47" cy="${t+2}" r="2.5" fill="#1E7FD6"/><circle cx="73" cy="${t+2}" r="2.5" fill="#13A07A"/>` },
  laranja:  { draw: (t) => `<circle cx="60" cy="${t-6}" r="12" fill="#FF8A00"/><path d="M60 ${t-18} q5 -7 13 -4" stroke="#2E7D32" stroke-width="4" fill="none" stroke-linecap="round"/>` },
  flor:     { draw: (t) => { const x=82,y=t+6; return `<g fill="#FF5C8A"><circle cx="${x}" cy="${y-8}" r="7"/><circle cx="${x+8}" cy="${y-2}" r="7"/><circle cx="${x+5}" cy="${y+7}" r="7"/><circle cx="${x-5}" cy="${y+7}" r="7"/><circle cx="${x-8}" cy="${y-2}" r="7"/></g><circle cx="${x}" cy="${y}" r="4" fill="#FFC83D"/>`; } },
  fone:     { draw: (t, e) => `<path d="M24 ${e+8} Q24 ${t-14} 60 ${t-14} Q96 ${t-14} 96 ${e+8}" stroke="${INK}" stroke-width="6" fill="none" stroke-linecap="round"/><rect x="14" y="${e-6}" width="16" height="26" rx="7" fill="#E5383B"/><rect x="90" y="${e-6}" width="16" height="26" rx="7" fill="#E5383B"/>` },
  festa:    { draw: (t) => `<path d="M46 ${t+6} L60 ${t-28} L74 ${t+6}Z" fill="#13A07A"/><path d="M50 ${t-4} L70 ${t-4} M54 ${t-14} L66 ${t-14}" stroke="#FFC83D" stroke-width="4"/><circle cx="60" cy="${t-29}" r="5" fill="#FF7A1A"/>` },
  gorro:    { draw: (t) => `<path d="M32 ${t+12} Q32 ${t-20} 60 ${t-20} Q88 ${t-20} 88 ${t+12}Z" fill="#E5383B"/><rect x="30" y="${t+4}" width="60" height="11" rx="5.5" fill="#FFF6E6"/><circle cx="60" cy="${t-21}" r="7" fill="#FFF6E6"/>` },
  faixa:    { draw: (t) => `<rect x="26" y="${t+10}" width="68" height="9" rx="4.5" fill="#1E7FD6"/><path d="M90 ${t+14} l12 -6 l-2 10z M90 ${t+14} l12 6 l-6 4z" fill="#1E7FD6"/>` },
  cartola:  { draw: (t) => `<ellipse cx="60" cy="${t+4}" rx="32" ry="6" fill="#1B1B1B"/><rect x="42" y="${t-26}" width="36" height="30" rx="4" fill="#1B1B1B"/><rect x="42" y="${t-6}" width="36" height="6" fill="#E5383B"/>` },
};

// Itens de rosto: desenhados na altura dos olhos (e)
const ARTE_ROSTO: Record<ItemRosto, { draw: (e: number) => string }> = {
  escuros:  { draw: (e) => `<rect x="33" y="${e-7}" width="24" height="15" rx="6" fill="${INK}"/><rect x="63" y="${e-7}" width="24" height="15" rx="6" fill="${INK}"/><path d="M57 ${e-2} h6" stroke="${INK}" stroke-width="3"/><path d="M37 ${e-4} l6 0" stroke="#fff" stroke-width="2" opacity=".6" stroke-linecap="round"/>` },
  redondos: { draw: (e) => `<circle cx="45" cy="${e}" r="10" fill="#fff" fill-opacity=".25" stroke="${INK}" stroke-width="3"/><circle cx="75" cy="${e}" r="10" fill="#fff" fill-opacity=".25" stroke="${INK}" stroke-width="3"/><path d="M55 ${e} h10" stroke="${INK}" stroke-width="3"/>` },
  coracao:  { draw: (e) => { const h = (x: number) =>`<path d="M${x} ${e+8} l-10 -10 a5.5 5.5 0 0 1 10 -6 a5.5 5.5 0 0 1 10 6z" fill="#E5383B" stroke="${INK}" stroke-width="2"/>`; return h(45)+h(75)+`<path d="M55 ${e-3} h10" stroke="${INK}" stroke-width="2.5"/>`; } },
  bigode:   { draw: (e) => `<path d="M60 ${e+20} q-8 -6 -18 0 q8 8 18 2 q10 6 18 -2 q-10 -6 -18 0z" fill="#3B2314"/>` },
  estrela:  { draw: (e) => `<path d="M88 ${e+8} l3 7 l7 1 l-5 5 l1 7 l-6 -3 l-6 3 l1 -7 l-5 -5 l7 -1z" fill="#FFC83D" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>` },
};

export const CORES_AVATAR = ['#DDF5EC', '#FCE7D2', '#FFF0CC', '#EFE6D8', '#FDE2E1', '#DCEBFA', '#E9E2FB', '#E3F2C8', '#FFE3D1', '#D7F0F7'];

let seq = 0;

/** SVG do avatar num círculo com fundo e contorno. Aceita o texto curto ou o objeto.
 *  Por padrão é decorativo (o apelido aparece ao lado); `label: true` lê o nome do visual. */
export function avatarSvg(v: Avatar | string, size = 48, label = false): string {
  const o = typeof v === 'string' ? parseAvatar(v) || parseAvatar(AVATAR_PADRAO)! : v;
  const A = ARTE_BICHOS[o.a];
  const head = o.h ? ARTE_CABECA[o.h].draw(A.ht, A.ey) : '';
  const face = o.f ? ARTE_ROSTO[o.f].draw(A.ey) : '';
  const id = 'av' + ++seq;
  const a11y = label ? `role="img" aria-label="${avatarName(o)}"` : 'aria-hidden="true"';
  return `<svg class="av" viewBox="0 0 120 120" width="${size}" height="${size}" ${a11y} focusable="false"><defs><clipPath id="${id}"><circle cx="60" cy="60" r="55"/></clipPath></defs><circle cx="60" cy="60" r="57" fill="${CORES_AVATAR[o.c]}"/><g clip-path="url(#${id})"><g transform="translate(12 18) scale(0.8)">${A.svg}${face}${head}</g></g><circle cx="60" cy="60" r="57" fill="none" stroke="${INK}" stroke-width="4"/></svg>`;
}
