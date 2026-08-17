(() => {
  'use strict';

  const form = document.getElementById('gasForm');
  const clearBtn = document.getElementById('clearBtn');
  const copyBtn = document.getElementById('copyBtn');
  const validation = document.getElementById('validation');
  const emptyState = document.getElementById('emptyState');
  const results = document.getElementById('results');
  const summaryText = document.getElementById('summaryText');

  const refs = {
    primary: document.getElementById('primaryResult'),
    compSection: document.getElementById('compSection'),
    comp: document.getElementById('compResult'),
    agSection: document.getElementById('agSection'),
    ag: document.getElementById('agResult'),
    oxygenSection: document.getElementById('oxygenSection'),
    oxygen: document.getElementById('oxygenResult'),
    perfusionSection: document.getElementById('perfusionSection'),
    perfusion: document.getElementById('perfusionResult')
  };

  function parseValue(name) {
    const raw = form.elements[name]?.value?.trim();
    if (!raw) return null;
    const n = Number(raw.replace(',', '.'));
    return Number.isFinite(n) ? n : NaN;
  }

  function fmt(n, digits = 1) {
    if (n === null || n === undefined || !Number.isFinite(n)) return '';
    return n.toFixed(digits).replace('.', ',');
  }

  function between(v, min, max) { return v === null || (Number.isFinite(v) && v >= min && v <= max); }

  function collect() {
    return {
      ph: parseValue('ph'), paco2: parseValue('paco2'), hco3: parseValue('hco3'),
      pao2: parseValue('pao2'), sao2: parseValue('sao2'), be: parseValue('be'),
      lactate: parseValue('lactate'), fio2: parseValue('fio2'), na: parseValue('na'),
      cl: parseValue('cl'), albumin: parseValue('albumin'), pvco2: parseValue('pvco2'),
      scvo2: parseValue('scvo2')
    };
  }

  function validate(d) {
    const errors = [];
    const checks = [
      ['pH', d.ph, 6.5, 8.0], ['PaCO₂', d.paco2, 5, 150], ['HCO₃⁻', d.hco3, 2, 60],
      ['PaO₂', d.pao2, 10, 700], ['SaO₂', d.sao2, 0, 100], ['BE', d.be, -40, 40],
      ['Lactato', d.lactate, 0, 30], ['Na⁺', d.na, 90, 210], ['Cl⁻', d.cl, 50, 180],
      ['Albumina', d.albumin, 0.5, 6.5], ['PvCO₂', d.pvco2, 5, 150], ['ScvO₂', d.scvo2, 0, 100]
    ];
    checks.forEach(([label, v, min, max]) => {
      if (Number.isNaN(v)) errors.push(`${label}: valor inválido.`);
      else if (!between(v, min, max)) errors.push(`${label}: valor fora da faixa aceita pelo programa (${min}–${max}).`);
    });
    if (d.fio2 !== null) {
      if (Number.isNaN(d.fio2)) errors.push('FiO₂: valor inválido.');
      else if (!((d.fio2 >= 21 && d.fio2 <= 100) || (d.fio2 >= 0.21 && d.fio2 <= 1))) {
        errors.push('FiO₂: informe 21–100% (ou 0,21–1,0).');
      }
    }
    if ((d.na === null) !== (d.cl === null)) errors.push('Para calcular o Anion Gap, informe Na⁺ e Cl⁻ em conjunto.');
    return errors;
  }

  function classify(d) {
    const { ph, paco2, hco3 } = d;
    if (ph === null || paco2 === null || hco3 === null) {
      return { title: 'Dados insuficientes', detail: 'Preencha pH, PaCO₂ e HCO₃⁻ para interpretação ácido-básica completa.', tone: 'warn', type: 'incomplete' };
    }

    if (ph < 7.35) {
      if (hco3 < 24 && paco2 > 40) return { title: 'Acidose metabólica + acidose respiratória', detail: 'Acidemia com HCO₃⁻ reduzido e PaCO₂ elevada: distúrbio misto.', tone: 'alert', type: 'mixed_acidosis' };
      if (hco3 < 24) return { title: 'Acidose metabólica', detail: 'Acidemia com redução do bicarbonato. Avaliar compensação respiratória pela fórmula de Winter.', tone: 'warn', type: 'met_acid' };
      if (paco2 > 40) return { title: 'Acidose respiratória', detail: 'Acidemia com hipercapnia. Comparar HCO₃⁻ com compensação aguda e crônica.', tone: 'warn', type: 'resp_acid' };
      return { title: 'Acidemia sem padrão simples', detail: 'Os valores não definem um distúrbio simples pelo algoritmo. Correlacionar com contexto e repetir/confirmar dados.', tone: 'warn', type: 'unclear' };
    }

    if (ph > 7.45) {
      if (hco3 > 24 && paco2 < 40) return { title: 'Alcalose metabólica + alcalose respiratória', detail: 'Alcalemia com HCO₃⁻ elevado e PaCO₂ reduzida: distúrbio misto.', tone: 'alert', type: 'mixed_alkalosis' };
      if (hco3 > 24) return { title: 'Alcalose metabólica', detail: 'Alcalemia com aumento do bicarbonato. Avaliar compensação respiratória esperada.', tone: 'warn', type: 'met_alk' };
      if (paco2 < 40) return { title: 'Alcalose respiratória', detail: 'Alcalemia com hipocapnia. Comparar HCO₃⁻ com compensação aguda e crônica.', tone: 'warn', type: 'resp_alk' };
      return { title: 'Alcalemia sem padrão simples', detail: 'Os valores não definem um distúrbio simples pelo algoritmo. Correlacionar com contexto e repetir/confirmar dados.', tone: 'warn', type: 'unclear' };
    }

    if (hco3 < 24 && paco2 < 40) return { title: 'pH na faixa com HCO₃⁻ e PaCO₂ reduzidos', detail: 'Pode representar acidose metabólica compensada, alcalose respiratória compensada ou distúrbio misto. As regras de compensação ajudam a discriminar.', tone: 'warn', type: 'normal_low' };
    if (hco3 > 24 && paco2 > 40) return { title: 'pH na faixa com HCO₃⁻ e PaCO₂ elevados', detail: 'Pode representar acidose respiratória compensada, alcalose metabólica compensada ou distúrbio misto. As regras de compensação ajudam a discriminar.', tone: 'warn', type: 'normal_high' };
    if (hco3 < 24 && paco2 > 40) return { title: 'Distúrbio misto com tendência acidótica', detail: 'HCO₃⁻ reduzido e PaCO₂ elevada apesar de pH na faixa: considerar acidose metabólica + respiratória.', tone: 'alert', type: 'mixed_acidosis' };
    if (hco3 > 24 && paco2 < 40) return { title: 'Distúrbio misto com tendência alcalótica', detail: 'HCO₃⁻ elevado e PaCO₂ reduzida apesar de pH na faixa: considerar alcalose metabólica + respiratória.', tone: 'alert', type: 'mixed_alkalosis' };
    return { title: 'Sem distúrbio ácido-básico evidente', detail: 'pH, PaCO₂ e HCO₃⁻ próximos das referências práticas utilizadas.', tone: 'ok', type: 'normal' };
  }

  function compensation(d, classification) {
    if (d.paco2 === null || d.hco3 === null) return null;
    const out = [];
    const { paco2, hco3 } = d;

    const winter = () => {
      const center = 1.5 * hco3 + 8, lo = center - 2, hi = center + 2;
      let verdict = 'Compensação respiratória adequada.';
      let tone = 'ok';
      if (paco2 < lo) { verdict = 'PaCO₂ abaixo do esperado: alcalose respiratória associada.'; tone = 'alert'; }
      if (paco2 > hi) { verdict = 'PaCO₂ acima do esperado: acidose respiratória associada.'; tone = 'alert'; }
      return { html: `<strong>Winter:</strong> PaCO₂ esperada ${fmt(center)} ± 2 mmHg (${fmt(lo)}–${fmt(hi)}). ${verdict}<div class="calc">Conta: 1,5 × ${fmt(hco3)} + 8 ± 2.</div>`, text: `Winter: PaCO2 esperada ${fmt(center)} ± 2 mmHg; ${verdict}`, tone };
    };

    const metAlk = () => {
      const center = 40 + 0.7 * (hco3 - 24), lo = Math.max(0, center - 5), hi = Math.min(55, center + 5);
      let verdict = 'Compensação compatível com o esperado.';
      let tone = 'ok';
      if (paco2 < lo) { verdict = 'PaCO₂ abaixo do esperado: alcalose respiratória associada.'; tone = 'alert'; }
      if (paco2 > hi) { verdict = 'PaCO₂ acima do esperado: acidose respiratória associada.'; tone = 'alert'; }
      return { html: `<strong>Alcalose metabólica:</strong> PaCO₂ esperada ≈ ${fmt(center)} mmHg (faixa prática ${fmt(lo)}–${fmt(hi)}). ${verdict}<div class="calc">Regra prática: ~0,7 mmHg de aumento da PaCO₂ por 1 mEq/L de aumento do HCO₃⁻; compensação isolada geralmente não excede ~55 mmHg.</div>`, text: `PaCO2 esperada na alcalose metabólica ≈ ${fmt(center)} mmHg; ${verdict}`, tone };
    };

    const respAcid = () => {
      const delta = Math.max(0, (paco2 - 40) / 10);
      const acuteLo = 24 + 1 * delta, acuteHi = 24 + 2 * delta;
      const chronicLo = 24 + 3 * delta, chronicHi = 24 + 4 * delta;
      const acute = hco3 >= acuteLo - 1 && hco3 <= acuteHi + 1;
      const chronic = hco3 >= chronicLo - 1 && hco3 <= chronicHi + 1;
      let verdict = 'HCO₃⁻ fora das faixas esperadas para distúrbio respiratório simples: considerar componente metabólico associado.';
      let tone = 'alert';
      if (acute && !chronic) { verdict = 'Mais compatível com acidose respiratória aguda.'; tone = 'ok'; }
      else if (chronic && !acute) { verdict = 'Mais compatível com acidose respiratória crônica.'; tone = 'ok'; }
      else if (acute && chronic) { verdict = 'HCO₃⁻ compatível com faixa de compensação respiratória; tempo de evolução define agudo versus crônico.'; tone = 'ok'; }
      return { html: `<strong>Acidose respiratória:</strong> HCO₃⁻ esperado agudo ${fmt(acuteLo)}–${fmt(acuteHi)} mEq/L; crônico ${fmt(chronicLo)}–${fmt(chronicHi)} mEq/L. ${verdict}`, text: `HCO3 esperado: agudo ${fmt(acuteLo)}-${fmt(acuteHi)}, crônico ${fmt(chronicLo)}-${fmt(chronicHi)} mEq/L. ${verdict}`, tone };
    };

    const respAlk = () => {
      const delta = Math.max(0, (40 - paco2) / 10);
      const acuteLo = 24 - 2 * delta, acuteHi = 24 - 1 * delta;
      const chronicLo = 24 - 5 * delta, chronicHi = 24 - 4 * delta;
      const acute = hco3 >= acuteLo - 1 && hco3 <= acuteHi + 1;
      const chronic = hco3 >= chronicLo - 1 && hco3 <= chronicHi + 1;
      let verdict = 'HCO₃⁻ fora das faixas esperadas para distúrbio respiratório simples: considerar componente metabólico associado.';
      let tone = 'alert';
      if (acute && !chronic) { verdict = 'Mais compatível com alcalose respiratória aguda.'; tone = 'ok'; }
      else if (chronic && !acute) { verdict = 'Mais compatível com alcalose respiratória crônica.'; tone = 'ok'; }
      else if (acute && chronic) { verdict = 'HCO₃⁻ compatível com faixa de compensação respiratória; tempo de evolução define agudo versus crônico.'; tone = 'ok'; }
      return { html: `<strong>Alcalose respiratória:</strong> HCO₃⁻ esperado agudo ${fmt(acuteLo)}–${fmt(acuteHi)} mEq/L; crônico ${fmt(chronicLo)}–${fmt(chronicHi)} mEq/L. ${verdict}`, text: `HCO3 esperado: agudo ${fmt(acuteLo)}-${fmt(acuteHi)}, crônico ${fmt(chronicLo)}-${fmt(chronicHi)} mEq/L. ${verdict}`, tone };
    };

    switch (classification.type) {
      case 'met_acid': out.push(winter()); break;
      case 'met_alk': out.push(metAlk()); break;
      case 'resp_acid': out.push(respAcid()); break;
      case 'resp_alk': out.push(respAlk()); break;
      case 'normal_low': out.push(winter(), respAlk()); break;
      case 'normal_high': out.push(metAlk(), respAcid()); break;
      case 'mixed_acidosis': out.push(winter()); break;
      case 'mixed_alkalosis': out.push(metAlk()); break;
    }
    return out.length ? out : null;
  }

  function anionGap(d, classification) {
    if (d.na === null || d.cl === null || d.hco3 === null) return null;
    const ag = d.na - (d.cl + d.hco3);
    const corrected = d.albumin !== null ? ag + 2.5 * (4 - d.albumin) : null;
    const used = corrected !== null ? corrected : ag;
    const elevated = used > 12;
    const items = [`<span class="metric">AG ${fmt(ag)} mEq/L</span>`];
    const text = [`AG ${fmt(ag)} mEq/L`];
    if (corrected !== null) {
      items.push(`<span class="metric">AG corrigido ${fmt(corrected)} mEq/L</span>`);
      text.push(`AG corrigido ${fmt(corrected)} mEq/L`);
    }
    items.push(elevated ? '<strong>Anion Gap elevado pelo ponto de referência de 12 mEq/L.</strong>' : 'Anion Gap não elevado pelo ponto de referência de 12 mEq/L.');
    text.push(elevated ? 'AG elevado.' : 'AG não elevado.');

    if (elevated && (classification.type === 'met_acid' || classification.type === 'mixed_acidosis' || d.hco3 < 24)) {
      const deltaGap = used - 12;
      const correctedHco3 = d.hco3 + deltaGap;
      let deltaText = 'Delta gap sem evidência clara de outro distúrbio metabólico pelo intervalo prático usado.';
      if (correctedHco3 > 29) deltaText = 'HCO₃⁻ corrigido elevado: sugere alcalose metabólica concomitante.';
      if (correctedHco3 < 22) deltaText = 'HCO₃⁻ corrigido baixo: sugere acidose metabólica sem AG concomitante.';
      items.push(`<div class="calc">ΔAG = ${fmt(deltaGap)}; HCO₃⁻ corrigido = ${fmt(correctedHco3)} mEq/L. ${deltaText}</div>`);
      text.push(`HCO3 corrigido pelo delta gap ${fmt(correctedHco3)} mEq/L. ${deltaText}`);
    }

    const eti = [];
    if (elevated) {
      if (d.lactate !== null && d.lactate > 2) eti.push('lactato elevado pode contribuir');
      eti.push('considerar cetoacidose, disfunção renal/uremia e intoxicações conforme contexto');
    } else if (d.hco3 < 24) {
      eti.push('considerar perdas gastrointestinais de bicarbonato, acidose tubular renal ou carga de cloreto conforme contexto');
    }
    if (eti.length) items.push(`<div class="calc"><strong>Possíveis etiologias:</strong> ${eti.join('; ')}.</div>`);

    return { html: items.join(' '), text: text.join(' '), tone: elevated ? 'warn' : 'ok' };
  }

  function oxygenation(d) {
    const parts = [], text = [];
    if (d.pao2 !== null) { parts.push(`<span class="metric">PaO₂ ${fmt(d.pao2)} mmHg</span>`); text.push(`PaO2 ${fmt(d.pao2)} mmHg`); }
    if (d.sao2 !== null) { parts.push(`<span class="metric">SaO₂ ${fmt(d.sao2)}%</span>`); text.push(`SaO2 ${fmt(d.sao2)}%`); }
    if (d.pao2 !== null && d.fio2 !== null) {
      const fioPct = d.fio2 <= 1 ? d.fio2 * 100 : d.fio2;
      const pf = d.pao2 / (fioPct / 100);
      parts.push(`<span class="metric">P/F ${fmt(pf,0)}</span>`);
      parts.push(`<div class="calc">Conta: PaO₂ ${fmt(d.pao2)} ÷ FiO₂ ${(fioPct/100).toFixed(2).replace('.', ',')} = ${fmt(pf,0)}. O P/F isolado não estabelece diagnóstico de SDRA.</div>`);
      text.push(`P/F ${fmt(pf,0)}`);
    }
    return parts.length ? { html: parts.join(' '), text: text.join(' | '), tone: 'ok' } : null;
  }

  function perfusion(d) {
    const parts = [], text = [];
    let tone = 'ok';
    if (d.lactate !== null) {
      parts.push(`<span class="metric">Lactato ${fmt(d.lactate)} mmol/L</span>`);
      text.push(`Lactato ${fmt(d.lactate)} mmol/L`);
      if (d.lactate > 2) { parts.push('<strong>Lactato elevado: correlacionar com perfusão, sepse, hipóxia, fármacos e outras causas.</strong>'); tone = 'warn'; }
    }
    if (d.scvo2 !== null) {
      parts.push(`<span class="metric">ScvO₂ ${fmt(d.scvo2)}%</span>`);
      text.push(`ScvO2 ${fmt(d.scvo2)}%`);
      if (d.scvo2 < 70) { parts.push('ScvO₂ baixa: pode indicar desequilíbrio entre oferta e consumo de O₂.'); tone = 'warn'; }
      else if (d.scvo2 > 80) parts.push('ScvO₂ elevada não exclui hipoperfusão; interpretar no contexto clínico.');
      else parts.push('ScvO₂ na faixa prática de 70–80%.');
    }
    if (d.pvco2 !== null && d.paco2 !== null) {
      const gap = d.pvco2 - d.paco2;
      parts.push(`<span class="metric">Gap CO₂ ${fmt(gap)} mmHg</span>`);
      text.push(`Gap CO2 ${fmt(gap)} mmHg`);
      if (gap > 6) { parts.push('Gap CO₂ > 6 mmHg: pode sugerir fluxo sanguíneo inadequado em relação à produção de CO₂; interpretar de forma integrada.'); tone = 'warn'; }
      else parts.push('Gap CO₂ ≤ 6 mmHg.');
      parts.push(`<div class="calc">Conta: PvCO₂ ${fmt(d.pvco2)} − PaCO₂ ${fmt(d.paco2)} = ${fmt(gap)} mmHg.</div>`);
    }
    return parts.length ? { html: parts.join(' '), text: text.join(' | '), tone } : null;
  }

  function renderBox(el, data) {
    el.className = `result-box ${data.tone || ''}`;
    el.innerHTML = data.html;
  }

  function analyze() {
    const d = collect();
    const errors = validate(d);
    validation.classList.toggle('hidden', !errors.length);
    validation.innerHTML = errors.map(e => `• ${e}`).join('<br>');
    if (errors.length) return;

    const classification = classify(d);
    emptyState.classList.add('hidden');
    results.classList.remove('hidden');

    renderBox(refs.primary, {
      html: `<strong>${classification.title}</strong><br>${classification.detail}<div class="calc">Dados: pH ${d.ph !== null ? fmt(d.ph,2) : '—'} | PaCO₂ ${d.paco2 !== null ? fmt(d.paco2) : '—'} mmHg | HCO₃⁻ ${d.hco3 !== null ? fmt(d.hco3) : '—'} mEq/L.</div>`,
      tone: classification.tone
    });

    const comp = compensation(d, classification);
    refs.compSection.classList.toggle('hidden', !comp);
    if (comp) {
      const tone = comp.some(x => x.tone === 'alert') ? 'alert' : comp.some(x => x.tone === 'warn') ? 'warn' : 'ok';
      renderBox(refs.comp, { html: comp.map(x => x.html).join('<br><br>'), tone });
    }

    const ag = anionGap(d, classification);
    refs.agSection.classList.toggle('hidden', !ag);
    if (ag) renderBox(refs.ag, ag);

    const oxy = oxygenation(d);
    refs.oxygenSection.classList.toggle('hidden', !oxy);
    if (oxy) renderBox(refs.oxygen, oxy);

    const perf = perfusion(d);
    refs.perfusionSection.classList.toggle('hidden', !perf);
    if (perf) renderBox(refs.perfusion, perf);

    // Texto curto destinado à transcrição rápida para o prontuário.
    // Mantém um formato fixo e não inclui interpretação clínica, que permanece acima.
    const shortFmt = (v, digits = 1) => {
      if (v === null || v === undefined || !Number.isFinite(v)) return '—';
      if (digits === 0) return String(Math.round(v));
      if (digits === 2) return v.toFixed(2).replace('.', ',');
      const rounded = Math.round(v * 10) / 10;
      return Number.isInteger(rounded) ? String(rounded) : String(rounded).replace('.', ',');
    };

    const agShort = (d.na !== null && d.cl !== null && d.hco3 !== null)
      ? d.na - (d.cl + d.hco3)
      : null;

    let pfShort = null;
    if (d.pao2 !== null && d.fio2 !== null) {
      const fioPct = d.fio2 <= 1 ? d.fio2 * 100 : d.fio2;
      if (fioPct > 0) pfShort = d.pao2 / (fioPct / 100);
    }

    const shortParts = [
      `Ph ${shortFmt(d.ph, 2)}`,
      `Po2 ${shortFmt(d.pao2)}`,
      `Pco2 ${shortFmt(d.paco2)}`,
      `Bic ${shortFmt(d.hco3)}`,
      `So2 ${shortFmt(d.sao2)}`
    ];

    // Só exibe o Anion Gap no texto curto quando ele puder ser calculado.
    if (agShort !== null) shortParts.push(`AG ${shortFmt(agShort)}`);

    shortParts.push(
      `Be ${shortFmt(d.be)}`,
      `PaO2/Fio2 ${shortFmt(pfShort, 0)}`,
      `Lac ${shortFmt(d.lactate)}`
    );

    summaryText.value = shortParts.join('  ');
    copyBtn.disabled = false;
  }

  form.addEventListener('submit', e => { e.preventDefault(); analyze(); });

  clearBtn.addEventListener('click', () => {
    form.reset();
    validation.classList.add('hidden');
    results.classList.add('hidden');
    emptyState.classList.remove('hidden');
    summaryText.value = '';
    copyBtn.disabled = true;
  });

  copyBtn.addEventListener('click', async () => {
    if (!summaryText.value) return;
    try {
      await navigator.clipboard.writeText(summaryText.value);
      const old = copyBtn.textContent;
      copyBtn.textContent = 'Copiado';
      setTimeout(() => copyBtn.textContent = old, 1200);
    } catch {
      summaryText.focus();
      summaryText.select();
      document.execCommand('copy');
    }
  });
})();
