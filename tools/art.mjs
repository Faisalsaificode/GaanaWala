// Flat scene illustrations, one per station. Inlined into the pages at build
// time so nothing is fetched at runtime. Colours come in from the station's
// accent pair; ink and sky are CSS variables so the art follows dark mode.

const INK = 'var(--art-ink)';
const SKY = 'var(--art-sky)';
const HAZE = 'var(--art-haze)';

const wrap = (inner) =>
  `<svg class="scene" viewBox="0 0 400 260" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true" preserveAspectRatio="xMidYMid slice">${inner}</svg>`;

const bg = () => `<rect width="400" height="260" fill="${SKY}"/>`;
const sun = (x, y, r, c) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" opacity=".9"/>`;
const floor = (y, c) => `<rect y="${y}" width="400" height="${260 - y}" fill="${c}"/>`;

export const art = {
  saloon: (a, b) =>
    wrap(`${bg()}
      <rect x="0" y="0" width="400" height="150" fill="${b}" opacity=".22"/>
      ${floor(196, HAZE)}
      <!-- mirror -->
      <rect x="46" y="34" width="128" height="128" rx="6" fill="${SKY}" stroke="${INK}" stroke-width="6"/>
      <path d="M56 150 L120 56 L150 150 Z" fill="${b}" opacity=".35"/>
      <!-- barber pole -->
      <rect x="318" y="40" width="26" height="120" rx="13" fill="${SKY}" stroke="${INK}" stroke-width="5"/>
      <path d="M320 60 h22 M320 84 h22 M320 108 h22 M320 132 h22" stroke="${a}" stroke-width="9" stroke-linecap="round"/>
      <!-- chair -->
      <rect x="196" y="92" width="86" height="72" rx="10" fill="${a}" stroke="${INK}" stroke-width="6"/>
      <rect x="186" y="120" width="18" height="40" rx="8" fill="${INK}"/>
      <rect x="230" y="164" width="18" height="34" fill="${INK}"/>
      <rect x="196" y="196" width="86" height="14" rx="7" fill="${INK}"/>
      <!-- scissors -->
      <g stroke="${INK}" stroke-width="5" fill="none" stroke-linecap="round">
        <path d="M74 208 L118 178 M74 178 L118 208"/>
        <circle cx="68" cy="212" r="7"/><circle cx="68" cy="174" r="7"/>
      </g>
      <!-- fan -->
      <g stroke="${INK}" stroke-width="5" fill="${INK}">
        <path d="M200 0 v18" stroke-linecap="round"/>
        <circle cx="200" cy="24" r="8"/>
        <path d="M192 24 L136 14 L136 34 Z" opacity=".85"/>
        <path d="M208 24 L264 14 L264 34 Z" opacity=".85"/>
      </g>`),

  truck: (a, b) =>
    wrap(`${bg()}
      ${sun(330, 62, 40, b)}
      ${floor(190, HAZE)}
      <path d="M0 190 h400" stroke="${INK}" stroke-width="4"/>
      <path d="M20 214 h60 M120 214 h60 M220 214 h60 M320 214 h60" stroke="${INK}" stroke-width="6" opacity=".5" stroke-linecap="round"/>
      <!-- cab -->
      <rect x="58" y="60" width="180" height="96" rx="8" fill="${a}" stroke="${INK}" stroke-width="6"/>
      <rect x="78" y="78" width="64" height="46" rx="4" fill="${SKY}" stroke="${INK}" stroke-width="5"/>
      <rect x="156" y="78" width="64" height="46" rx="4" fill="${SKY}" stroke="${INK}" stroke-width="5"/>
      <rect x="58" y="34" width="180" height="28" rx="8" fill="${b}" stroke="${INK}" stroke-width="6"/>
      <path d="M70 48 h20 M104 48 h20 M138 48 h20 M172 48 h20 M206 48 h20" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>
      <!-- bed -->
      <rect x="238" y="86" width="112" height="70" rx="6" fill="${b}" stroke="${INK}" stroke-width="6"/>
      <path d="M252 100 v42 M276 100 v42 M300 100 v42 M324 100 v42" stroke="${INK}" stroke-width="4" opacity=".55"/>
      <!-- lights + wheels -->
      <circle cx="70" cy="140" r="9" fill="${SKY}" stroke="${INK}" stroke-width="4"/>
      <circle cx="104" cy="182" r="24" fill="${INK}"/><circle cx="104" cy="182" r="9" fill="${HAZE}"/>
      <circle cx="292" cy="182" r="24" fill="${INK}"/><circle cx="292" cy="182" r="9" fill="${HAZE}"/>`),

  bus: (a, b) =>
    wrap(`${bg()}
      <path d="M0 130 L70 78 L130 122 L200 62 L280 126 L340 92 L400 130 V190 H0 Z" fill="${b}" opacity=".3"/>
      ${floor(188, HAZE)}
      <path d="M0 188 h400" stroke="${INK}" stroke-width="4"/>
      <rect x="34" y="72" width="316" height="104" rx="14" fill="${a}" stroke="${INK}" stroke-width="6"/>
      <rect x="34" y="72" width="316" height="22" rx="11" fill="${b}"/>
      <g fill="${SKY}" stroke="${INK}" stroke-width="5">
        <rect x="54" y="104" width="52" height="40" rx="4"/>
        <rect x="118" y="104" width="52" height="40" rx="4"/>
        <rect x="182" y="104" width="52" height="40" rx="4"/>
        <rect x="246" y="104" width="52" height="40" rx="4"/>
      </g>
      <rect x="308" y="104" width="30" height="60" rx="4" fill="${SKY}" stroke="${INK}" stroke-width="5"/>
      <circle cx="96" cy="180" r="22" fill="${INK}"/><circle cx="96" cy="180" r="8" fill="${HAZE}"/>
      <circle cx="286" cy="180" r="22" fill="${INK}"/><circle cx="286" cy="180" r="8" fill="${HAZE}"/>`),

  auto: (a, b) =>
    wrap(`${bg()}
      ${floor(192, HAZE)}
      <path d="M0 192 h400" stroke="${INK}" stroke-width="4"/>
      <path d="M96 152 V88 q0-34 40-34 h84 q40 0 40 40 v58 Z" fill="${b}" stroke="${INK}" stroke-width="6"/>
      <rect x="88" y="146" width="188" height="42" rx="10" fill="${a}" stroke="${INK}" stroke-width="6"/>
      <path d="M140 66 h72" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>
      <rect x="116" y="96" width="60" height="46" rx="6" fill="${SKY}" stroke="${INK}" stroke-width="5"/>
      <path d="M276 150 l38 -22 v34 Z" fill="${INK}"/>
      <circle cx="304" cy="112" r="10" fill="${SKY}" stroke="${INK}" stroke-width="5"/>
      <circle cx="132" cy="192" r="22" fill="${INK}"/><circle cx="132" cy="192" r="8" fill="${HAZE}"/>
      <circle cx="252" cy="192" r="22" fill="${INK}"/><circle cx="252" cy="192" r="8" fill="${HAZE}"/>
      <!-- speaker -->
      <rect x="196" y="100" width="52" height="42" rx="5" fill="${INK}"/>
      <circle cx="222" cy="121" r="13" fill="${a}"/><circle cx="222" cy="121" r="5" fill="${INK}"/>
      <g stroke="${a}" stroke-width="5" fill="none" stroke-linecap="round" opacity=".9">
        <path d="M330 92 q14 26 0 52"/><path d="M352 78 q22 40 0 80"/>
      </g>`),

  chai: (a, b) =>
    wrap(`${bg()}
      ${sun(316, 74, 46, b)}
      ${floor(186, HAZE)}
      <path d="M0 186 h400" stroke="${INK}" stroke-width="4"/>
      <!-- kettle -->
      <path d="M96 186 V126 q0-20 22-20 h56 q22 0 22 20 v60 Z" fill="${a}" stroke="${INK}" stroke-width="6"/>
      <path d="M196 132 q34 4 30 32 t-30 22" fill="none" stroke="${INK}" stroke-width="6"/>
      <path d="M96 140 q-30 -6 -30 -26" fill="none" stroke="${INK}" stroke-width="6"/>
      <rect x="118" y="90" width="56" height="16" rx="8" fill="${INK}"/>
      <!-- glass -->
      <path d="M244 186 L236 122 h56 l-8 64 Z" fill="${SKY}" stroke="${INK}" stroke-width="6"/>
      <path d="M240 148 h48 l-4 34 h-40 Z" fill="${a}" opacity=".75"/>
      <!-- steam -->
      <g stroke="${INK}" stroke-width="5" fill="none" stroke-linecap="round" opacity=".55">
        <path d="M136 78 q-12 -18 0 -34 t0 -28"/>
        <path d="M264 100 q-12 -16 0 -30 t0 -22"/>
      </g>
      <!-- stool -->
      <rect x="308" y="150" width="60" height="12" rx="6" fill="${INK}"/>
      <path d="M316 162 l-6 24 M360 162 l6 24" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>`),

  gym: (a, b) =>
    wrap(`${bg()}
      <rect x="0" y="0" width="400" height="260" fill="${b}" opacity=".18"/>
      ${floor(196, HAZE)}
      <!-- barbell -->
      <rect x="86" y="112" width="228" height="16" rx="8" fill="${INK}"/>
      <g fill="${a}" stroke="${INK}" stroke-width="6">
        <rect x="62" y="70" width="30" height="100" rx="8"/>
        <rect x="100" y="86" width="24" height="68" rx="7"/>
        <rect x="276" y="86" width="24" height="68" rx="7"/>
        <rect x="308" y="70" width="30" height="100" rx="8"/>
      </g>
      <!-- dumbbell -->
      <rect x="140" y="196" width="120" height="10" rx="5" fill="${INK}"/>
      <g fill="${b}" stroke="${INK}" stroke-width="5">
        <rect x="124" y="180" width="20" height="42" rx="6"/>
        <rect x="256" y="180" width="20" height="42" rx="6"/>
      </g>
      <path d="M40 40 l14 30 h-18 l14 30" fill="none" stroke="${a}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M348 34 l14 30 h-18 l14 30" fill="none" stroke="${a}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`),

  shaadi: (a, b) =>
    wrap(`${bg()}
      <path d="M40 172 V96 q60 -58 160 -58 t160 58 v76" fill="none" stroke="${INK}" stroke-width="7"/>
      <g fill="${b}">
        <circle cx="72" cy="74" r="7"/><circle cx="118" cy="52" r="7"/><circle cx="168" cy="40" r="7"/>
        <circle cx="232" cy="40" r="7"/><circle cx="282" cy="52" r="7"/><circle cx="328" cy="74" r="7"/>
      </g>
      ${floor(196, HAZE)}
      <!-- dhol -->
      <rect x="128" y="120" width="144" height="76" rx="14" fill="${a}" stroke="${INK}" stroke-width="6"/>
      <ellipse cx="128" cy="158" rx="18" ry="40" fill="${SKY}" stroke="${INK}" stroke-width="6"/>
      <ellipse cx="272" cy="158" rx="18" ry="40" fill="${SKY}" stroke="${INK}" stroke-width="6"/>
      <path d="M146 130 l108 56 M146 186 l108 -56" stroke="${INK}" stroke-width="4" opacity=".5"/>
      <path d="M92 106 l24 34 M308 106 l-24 34" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>
      <g fill="${b}"><circle cx="88" cy="100" r="9"/><circle cx="312" cy="100" r="9"/></g>`),

  dhaba: (a, b) =>
    wrap(`${bg()}
      <path d="M0 60 q40 -22 80 0 t80 0 t80 0 t80 0 t80 0" fill="none" stroke="${INK}" stroke-width="4" opacity=".6"/>
      <g fill="${b}">
        <circle cx="40" cy="66" r="7"/><circle cx="120" cy="66" r="7"/><circle cx="200" cy="66" r="7"/>
        <circle cx="280" cy="66" r="7"/><circle cx="360" cy="66" r="7"/>
      </g>
      ${floor(198, HAZE)}
      <!-- charpai -->
      <rect x="44" y="132" width="196" height="34" rx="6" fill="${a}" stroke="${INK}" stroke-width="6"/>
      <path d="M60 132 v34 M92 132 v34 M124 132 v34 M156 132 v34 M188 132 v34 M220 132 v34" stroke="${INK}" stroke-width="3" opacity=".55"/>
      <path d="M56 166 v34 M228 166 v34" stroke="${INK}" stroke-width="8" stroke-linecap="round"/>
      <!-- tandoor -->
      <path d="M280 198 V140 q0-26 30-26 t30 26 v58 Z" fill="${INK}"/>
      <ellipse cx="310" cy="140" rx="30" ry="12" fill="${a}"/>
      <g stroke="${a}" stroke-width="5" fill="none" stroke-linecap="round">
        <path d="M300 122 q-8 -18 4 -30"/><path d="M320 120 q-8 -16 2 -26"/>
      </g>`),

  paan: (a, b) =>
    wrap(`${bg()}
      ${floor(190, HAZE)}
      <!-- leaf -->
      <path d="M200 42 q78 46 62 108 q-14 54 -62 62 q-48 -8 -62 -62 q-16 -62 62 -108 Z" fill="${a}" stroke="${INK}" stroke-width="6"/>
      <path d="M200 60 V208" stroke="${INK}" stroke-width="5"/>
      <path d="M200 96 l-34 -14 M200 96 l34 -14 M200 134 l-40 -16 M200 134 l40 -16 M200 170 l-34 -14 M200 170 l34 -14" stroke="${INK}" stroke-width="4" opacity=".6"/>
      <!-- jars -->
      <g fill="${b}" stroke="${INK}" stroke-width="5">
        <rect x="34" y="126" width="52" height="64" rx="8"/>
        <rect x="314" y="126" width="52" height="64" rx="8"/>
      </g>
      <rect x="28" y="112" width="64" height="16" rx="8" fill="${INK}"/>
      <rect x="308" y="112" width="64" height="16" rx="8" fill="${INK}"/>`),

  mandir: (a, b) =>
    wrap(`${bg()}
      ${sun(200, 96, 62, b)}
      ${floor(196, HAZE)}
      <path d="M112 196 V128 h176 v68 Z" fill="${a}" stroke="${INK}" stroke-width="6"/>
      <path d="M200 26 L296 128 H104 Z" fill="${a}" stroke="${INK}" stroke-width="6"/>
      <path d="M200 56 L252 112 H148 Z" fill="${SKY}" opacity=".45"/>
      <path d="M176 196 v-42 q24 -26 48 0 v42 Z" fill="${INK}"/>
      <path d="M200 26 v-16" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>
      <circle cx="200" cy="6" r="7" fill="${b}"/>
      <!-- bell -->
      <path d="M56 92 v14 q-18 8 -18 30 h36 q0 -22 -18 -30 Z" fill="${b}" stroke="${INK}" stroke-width="5"/>
      <path d="M56 92 v-24" stroke="${INK}" stroke-width="5"/>
      <!-- diya -->
      <path d="M318 176 q26 0 26 12 h-52 q0 -12 26 -12 Z" fill="${INK}"/>
      <path d="M318 176 q-8 -14 0 -24 q8 10 0 24 Z" fill="${b}"/>`),

  qawwali: (a, b) =>
    wrap(`${bg()}
      <path d="M200 22 q52 34 52 84 h-104 q0 -50 52 -84 Z" fill="${b}" opacity=".28"/>
      ${floor(196, HAZE)}
      <!-- harmonium -->
      <rect x="52" y="124" width="164" height="60" rx="8" fill="${a}" stroke="${INK}" stroke-width="6"/>
      <rect x="66" y="112" width="136" height="14" rx="5" fill="${INK}"/>
      <g fill="${SKY}" stroke="${INK}" stroke-width="3">
        <rect x="70" y="140" width="14" height="34"/><rect x="90" y="140" width="14" height="34"/>
        <rect x="110" y="140" width="14" height="34"/><rect x="130" y="140" width="14" height="34"/>
        <rect x="150" y="140" width="14" height="34"/><rect x="170" y="140" width="14" height="34"/>
      </g>
      <!-- tabla -->
      <path d="M248 196 V152 q0-20 24-20 t24 20 v44 Z" fill="${b}" stroke="${INK}" stroke-width="6"/>
      <ellipse cx="272" cy="150" rx="24" ry="10" fill="${SKY}" stroke="${INK}" stroke-width="5"/>
      <path d="M312 196 V160 q0-18 20-18 t20 18 v36 Z" fill="${a}" stroke="${INK}" stroke-width="6"/>
      <ellipse cx="332" cy="158" rx="20" ry="9" fill="${SKY}" stroke="${INK}" stroke-width="5"/>
      <circle cx="272" cy="150" r="8" fill="${INK}"/><circle cx="332" cy="158" r="7" fill="${INK}"/>`),

  train: (a, b) =>
    wrap(`${bg()}
      <g fill="${b}" opacity=".8">
        <circle cx="52" cy="46" r="3"/><circle cx="118" cy="30" r="2.5"/><circle cx="186" cy="52" r="3"/>
        <circle cx="268" cy="34" r="2.5"/><circle cx="344" cy="56" r="3"/>
      </g>
      ${floor(196, HAZE)}
      <rect x="24" y="82" width="352" height="90" rx="12" fill="${a}" stroke="${INK}" stroke-width="6"/>
      <rect x="24" y="82" width="352" height="20" rx="10" fill="${INK}" opacity=".35"/>
      <g fill="${SKY}" stroke="${INK}" stroke-width="5">
        <rect x="48" y="112" width="54" height="38" rx="4"/>
        <rect x="118" y="112" width="54" height="38" rx="4"/>
        <rect x="188" y="112" width="54" height="38" rx="4"/>
        <rect x="258" y="112" width="54" height="38" rx="4"/>
      </g>
      <path d="M48 131 h54 M118 131 h54 M188 131 h54 M258 131 h54" stroke="${INK}" stroke-width="4" opacity=".45"/>
      <rect x="326" y="112" width="30" height="38" rx="4" fill="${b}" stroke="${INK}" stroke-width="5"/>
      <g fill="${INK}"><circle cx="86" cy="178" r="13"/><circle cx="140" cy="178" r="13"/><circle cx="262" cy="178" r="13"/><circle cx="316" cy="178" r="13"/></g>
      <path d="M0 200 h400 M0 214 h400" stroke="${INK}" stroke-width="5"/>
      <path d="M30 196 v22 M110 196 v22 M190 196 v22 M270 196 v22 M350 196 v22" stroke="${INK}" stroke-width="5" opacity=".5"/>`),

  barish: (a, b) =>
    wrap(`${bg()}
      <path d="M40 44 q22 -26 52 -12 q26 -28 60 -6 q34 -12 44 14 q26 4 20 26 H36 q-8 -18 4 -22 Z" fill="${b}" opacity=".55"/>
      <path d="M232 78 q18 -22 44 -10 q22 -22 50 -4 q28 -8 34 14 q20 6 12 22 H228 q-8 -16 4 -22 Z" fill="${b}" opacity=".4"/>
      ${floor(212, HAZE)}
      <g stroke="${a}" stroke-width="5" stroke-linecap="round" opacity=".85">
        <path d="M44 116 l-12 34"/><path d="M92 128 l-12 34"/><path d="M140 112 l-12 34"/>
        <path d="M188 132 l-12 34"/><path d="M236 118 l-12 34"/><path d="M284 134 l-12 34"/>
        <path d="M332 116 l-12 34"/><path d="M372 136 l-12 34"/>
        <path d="M68 168 l-10 28"/><path d="M164 172 l-10 28"/><path d="M260 166 l-10 28"/><path d="M356 174 l-10 28"/>
      </g>
      <!-- umbrella -->
      <path d="M120 156 q40 -58 80 0 Z" fill="${a}" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>
      <path d="M160 156 v46 q0 14 16 14 t16 -16" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>
      <path d="M160 112 v-12" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>
      <g stroke="${INK}" stroke-width="4" opacity=".45" fill="none"><path d="M133 152 q13 -30 27 -30 q14 0 27 30"/></g>`),

  padhai: (a, b) =>
    wrap(`${bg()}
      <rect x="0" y="0" width="400" height="260" fill="${INK}" opacity=".08"/>
      <path d="M118 44 q46 -6 46 44 t-46 44" fill="none" stroke="${INK}" stroke-width="0"/>
      <!-- lamp glow -->
      <path d="M132 108 L52 214 h160 Z" fill="${b}" opacity=".28"/>
      ${floor(206, HAZE)}
      <path d="M0 206 h400" stroke="${INK}" stroke-width="4"/>
      <!-- lamp -->
      <path d="M96 96 q36 -34 72 0 Z" fill="${a}" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>
      <path d="M132 96 v-30 q0 -20 -34 -20" fill="none" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>
      <rect x="74" y="38" width="48" height="10" rx="5" fill="${INK}"/>
      <!-- books -->
      <g stroke="${INK}" stroke-width="5">
        <rect x="228" y="176" width="128" height="16" rx="4" fill="${a}"/>
        <rect x="238" y="158" width="112" height="16" rx="4" fill="${b}"/>
        <rect x="248" y="140" width="96" height="16" rx="4" fill="${a}"/>
      </g>
      <!-- cup -->
      <path d="M152 206 V180 h44 v26 Z" fill="${b}" stroke="${INK}" stroke-width="5"/>
      <path d="M196 186 q16 0 16 10 t-16 10" fill="none" stroke="${INK}" stroke-width="5"/>
      <g stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round" opacity=".5">
        <path d="M168 172 q-8 -12 0 -22"/><path d="M184 172 q-8 -12 0 -22"/>
      </g>`),
};

export const artKeys = Object.keys(art);
