window.__LEITOR_VERSION__ = '0.6.0';
    console.info('Leitor de Dados de Enfermagem', window.__LEITOR_VERSION__);
(() => {
  'use strict';

  const pdfInput = document.getElementById('pdfInput');
  const fileName = document.getElementById('fileName');
  const periodSelect = document.getElementById('periodSelect');
  const generateBtn = document.getElementById('generateBtn');
  const clearBtn = document.getElementById('clearBtn');
  const copyBtn = document.getElementById('copyBtn');
  const resultEl = document.getElementById('result');
  const debugEl = document.getElementById('debug');
  const warningsEl = document.getElementById('warnings');
  const progressWrap = document.getElementById('progressWrap');
  const progressBar = document.getElementById('progressBar');
  const statusText = document.getElementById('statusText');
  const workCanvas = document.getElementById('workCanvas');
  const deviceRowsEl = document.getElementById('deviceRows');
  const tableEls = {
    T: document.getElementById('tableT'),
    DU: document.getElementById('tableDU'),
    BH: document.getElementById('tableBH'),
    FC: document.getElementById('tableFC'),
    FR: document.getElementById('tableFR'),
    SO2: document.getElementById('tableSO2'),
    PAS: document.getElementById('tablePAS'),
    PAD: document.getElementById('tablePAD'),
    PAM: document.getElementById('tablePAM'),
    HGT: document.getElementById('tableHGT'),
    EVAC: document.getElementById('tableEVAC')
  };

  let selectedFile = null;
  let ocrWorker = null;
  let busy = false;
  let debugLines = [];

  if (window.pdfjsLib) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }

  const FIELD_RULES = {
    FC:  { min: 20, max: 250, decimals: 0 },
    FR:  { min: 3, max: 60, decimals: 0, hardMax: 60 },
    PAS: { min: 50, max: 300, decimals: 0, hardMax: 300 },
    PAD: { min: 20, max: 300, decimals: 0, hardMax: 300 },
    PAM: { min: 20, max: 250, decimals: 0 },
    T:   { min: 25, max: 45, decimals: 1, hardMax: 45 },
    SO2: { min: 40, max: 100, decimals: 0, hardMax: 100 },
    HGT: { min: 10, max: 1000, decimals: 0 },
    DU:  { min: 0, max: 5000, decimals: 0 },
    DRENO: { min: 0, max: 5000, decimals: 0 },
    NEFROSTOMIA: { min: 0, max: 5000, decimals: 0 },
    UF: { min: 0, max: 10000, decimals: 0 },
    BH: { min: -20000, max: 20000, decimals: 0 }
  };

  pdfInput.addEventListener('change', () => {
    selectedFile = pdfInput.files && pdfInput.files[0] ? pdfInput.files[0] : null;
    fileName.textContent = selectedFile ? selectedFile.name : 'Nenhum arquivo selecionado';
    generateBtn.disabled = !selectedFile || busy;
    clearBtn.disabled = !selectedFile || busy;
    if (selectedFile) {
      resetSummaryTable();
      resultEl.textContent = 'PDF selecionado. Clique em “Ler PDF”.';
      copyBtn.disabled = true;
      hideWarnings();
    }
  });

  generateBtn.addEventListener('click', () => runExtraction());
  clearBtn.addEventListener('click', clearAll);
  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(resultEl.textContent);
      const old = copyBtn.textContent;
      copyBtn.textContent = 'Copiado';
      setTimeout(() => copyBtn.textContent = old, 1200);
    } catch {
      const range = document.createRange();
      range.selectNodeContents(resultEl);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      document.execCommand('copy');
      sel.removeAllRanges();
    }
  });

  function setBusy(value) {
    busy = value;
    generateBtn.disabled = value || !selectedFile;
    clearBtn.disabled = value || !selectedFile;
    pdfInput.disabled = value;
    periodSelect.disabled = value;
    progressWrap.classList.toggle('hidden', !value);
  }

  function setProgress(pct, text) {
    progressBar.style.width = `${Math.max(0, Math.min(100, pct))}%`;
    statusText.textContent = text;
  }

  function warn(message, error = false) {
    warningsEl.textContent = message;
    warningsEl.classList.remove('hidden');
    warningsEl.classList.toggle('error', error);
  }

  function hideWarnings() {
    warningsEl.classList.add('hidden');
    warningsEl.classList.remove('error');
    warningsEl.textContent = '';
  }

  function log(...parts) {
    debugLines.push(parts.join(' '));
    debugEl.textContent = debugLines.join('\n');
  }

  function clearAll() {
    selectedFile = null;
    pdfInput.value = '';
    fileName.textContent = 'Nenhum arquivo selecionado';
    resetSummaryTable();
    resultEl.textContent = 'Selecione um PDF para começar.';
    debugEl.textContent = '—';
    debugLines = [];
    copyBtn.disabled = true;
    generateBtn.disabled = true;
    clearBtn.disabled = true;
    hideWarnings();
    workCanvas.width = 1;
    workCanvas.height = 1;
  }

  async function runExtraction() {
    if (!selectedFile || busy) return;
    hideWarnings();
    debugLines = [];
    debugEl.textContent = '—';
    resetSummaryTable();
    resultEl.textContent = 'Lendo…';
    copyBtn.disabled = true;
    setBusy(true);

    try {
      if (!window.pdfjsLib) throw new Error('PDF.js não carregou. Verifique a conexão com a internet.');
      if (!window.Tesseract) throw new Error('Tesseract.js não carregou. Verifique a conexão com a internet.');

      setProgress(5, 'Lendo o PDF localmente…');
      const canvas = await renderFirstPage(selectedFile);
      log(`Página renderizada: ${canvas.width} × ${canvas.height}px`);

      setProgress(15, 'Localizando as tabelas…');
      const layout = detectLayout(canvas);
      log(`Linhas horizontais: ${layout.hLines.join(', ')}`);
      log(`Sinais vitais: y ${layout.vital.top}–${layout.vital.bottom}; ${layout.vital.dataRows.length} linhas de dados`);
      log(`Balanço: fim em y ${layout.balanceEnd}`);

      setProgress(22, 'Inicializando OCR no navegador…');
      await ensureOcrWorker();

      const period = periodSelect.value === '12' ? 12 : 24;
      const startHourIdx = 0; // 07:00
      const endHourIdx = period === 12 ? 11 : 23; // noturno: até 18:00; diurno: até 06:00 do dia seguinte

      const fields = {};
      const vitalRows = layout.vital.dataRows;
      const expectedOrder = ['FC', 'FR', 'PAS', 'PAD', 'T', 'SO2', 'HGT'];

      if (vitalRows.length < 7) {
        throw new Error('Não foi possível localizar todas as linhas de sinais vitais deste layout.');
      }

      // Layout padrão: 7 linhas. Se houver uma linha extra, tenta identificar PAM pelo rótulo.
      let rowMap = {};
      if (vitalRows.length === 7) {
        expectedOrder.forEach((name, i) => rowMap[name] = vitalRows[i]);
      } else {
        setProgress(28, 'Identificando linhas de sinais vitais…');
        const labels = [];
        for (let i = 0; i < vitalRows.length; i++) {
          const row = vitalRows[i];
          const label = await ocrLabel(canvas, layout.vital.left, row.y0, layout.vital.dataStart, row.y1);
          labels.push(label);
          const field = identifyVitalLabel(label);
          if (field) rowMap[field] = row;
          log(`SV linha ${i + 1}: “${label}” → ${field || '?'}`);
        }
        for (let i = 0; i < Math.min(7, vitalRows.length); i++) {
          if (!rowMap[expectedOrder[i]]) rowMap[expectedOrder[i]] = vitalRows[i];
        }
      }

      const readOrder = ['T', 'FC', 'FR', 'SO2', 'PAS', 'PAD', 'PAM', 'HGT'];
      let step = 34;
      for (const field of readOrder) {
        const row = rowMap[field];
        if (!row) {
          fields[field] = [];
          continue;
        }
        setProgress(step, `Lendo ${field}…`);
        const vals = await ocrNumericRow(canvas, layout.vital.xLines, layout.vital.dataStartIndex, row.y0, row.y1, startHourIdx, endHourIdx, field);
        fields[field] = vals;
        log(`${field}: ${vals.join(' | ') || '—'}`);
        step += 5;
      }

      setProgress(72, 'Lendo diurese e balanço…');
      const balance = await readBalance(canvas, layout, startHourIdx, endHourIdx, period);
      Object.assign(fields, balance.values);
      balance.debug.forEach(x => log(x));

      setProgress(92, 'Montando o resumo…');
      const summary = buildSummary(fields);
      renderSummaryTable(fields);
      resultEl.textContent = summary;
      copyBtn.disabled = false;

      const issues = [];
      if (!fields.DU || !fields.DU.length) issues.push('Diurese não reconhecida.');
      if (fields.BH == null || Number.isNaN(fields.BH)) issues.push('Balanço hídrico não reconhecido.');
      for (const f of ['T','FC','FR','SO2','PAS','PAD']) {
        if (!fields[f] || !fields[f].length) issues.push(`${f} sem valores reconhecidos.`);
      }
      if (issues.length) warn(`Confira antes de copiar: ${issues.join(' ')}`);

      setProgress(100, 'Concluído.');
      setTimeout(() => progressWrap.classList.add('hidden'), 900);
    } catch (err) {
      console.error(err);
      resultEl.textContent = `ERRO: ${err && err.message ? err.message : String(err)}`;
      warn('O leitor não conseguiu interpretar este PDF. Abra “Detalhes da leitura” e envie a mensagem ou um print para ajuste do leitor.', true);
      log(`ERRO: ${err && err.stack ? err.stack : err}`);
    } finally {
      setBusy(false);
    }
  }

  async function renderFirstPage(file) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const loadingTask = pdfjsLib.getDocument({ data: bytes });
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 2.0 });

    const raw = document.createElement('canvas');
    raw.width = Math.round(viewport.width);
    raw.height = Math.round(viewport.height);
    const ctx = raw.getContext('2d', { willReadFrequently: true });
    await page.render({ canvasContext: ctx, viewport }).promise;

    // O relatório testado vem em página retrato com a tabela girada. Mantemos a tabela em paisagem.
    if (raw.height > raw.width) {
      workCanvas.width = raw.height;
      workCanvas.height = raw.width;
      const out = workCanvas.getContext('2d', { willReadFrequently: true });
      out.save();
      out.translate(workCanvas.width, 0);
      out.rotate(Math.PI / 2);
      out.drawImage(raw, 0, 0);
      out.restore();
    } else {
      workCanvas.width = raw.width;
      workCanvas.height = raw.height;
      workCanvas.getContext('2d', { willReadFrequently: true }).drawImage(raw, 0, 0);
    }
    return workCanvas;
  }

  function detectLayout(canvas) {
    const { gray, dark } = grayscaleAndDark(canvas, 145);
    const w = canvas.width, h = canvas.height;
    const x0 = Math.floor(w * 0.02), x1 = Math.floor(w * 0.98);

    const yCandidates = [];
    for (let y = Math.floor(h * 0.16); y < Math.floor(h * 0.90); y++) {
      let n = 0;
      const row = y * w;
      for (let x = x0; x < x1; x++) n += dark[row + x];
      if (n / (x1 - x0) > 0.74) yCandidates.push(y);
    }
    const hLines = clusterCenters(yCandidates, 1);
    if (hLines.length < 15) throw new Error('Grade da tabela não localizada.');

    const intervals = [];
    for (let i = 0; i < hLines.length - 1; i++) {
      const a = hLines[i], b = hLines[i + 1], gap = b - a;
      let vCount = 0;
      if (gap >= Math.max(10, h * 0.008) && gap <= h * 0.05) {
        vCount = detectVerticalLines(dark, w, h, a, b, 0.58).length;
      }
      intervals.push({ i, a, b, gap, vCount });
    }

    // Sinais vitais: maior sequência próxima ao fim da folha com ~26 linhas verticais.
    const runs = [];
    let i = 0;
    while (i < intervals.length) {
      const ok = r => r.gap >= h * 0.012 && r.gap <= h * 0.045 && r.vCount >= 24 && r.vCount <= 28;
      if (ok(intervals[i])) {
        let j = i;
        while (j < intervals.length && ok(intervals[j])) j++;
        if (j - i >= 7) runs.push({ start: i, end: j, len: j - i });
        i = j;
      } else i++;
    }
    if (!runs.length) throw new Error('Tabela de sinais vitais não localizada.');
    runs.sort((a,b) => (b.len - a.len) || (b.start - a.start));
    const vr = runs[0];

    // Primeiro intervalo do run = cabeçalho dos horários; seguintes = dados.
    const hourHeader = intervals[vr.start];
    const vitalX = detectVerticalLines(dark, w, h, hourHeader.a, hourHeader.b, 0.58);
    const regVital = longestRegularRun(vitalX, 24);
    if (!regVital || regVital.run < 23) throw new Error('Colunas horárias dos sinais vitais não localizadas.');
    const vitalDataStartIndex = regVital.start;
    const vitalDataStart = vitalX[vitalDataStartIndex];
    const vitalLeft = vitalX[0];

    const dataRows = [];
    for (let k = vr.start + 1; k < vr.end; k++) {
      dataRows.push({ y0: intervals[k].a, y1: intervals[k].b });
    }

    const vitalTop = vr.start > 0 ? intervals[vr.start - 1].a : hourHeader.a;
    const vitalBottom = intervals[vr.end - 1].b;
    const balanceEnd = vr.start >= 2 ? hLines[vr.start - 2] : vitalTop;

    // Linhas significativas do balanço antes da tabela de SV.
    const balanceRows = [];
    for (const it of intervals) {
      if (it.b <= balanceEnd && it.a > h * 0.20 && it.gap >= h * 0.010 && it.gap <= h * 0.05) {
        balanceRows.push({ y0: it.a, y1: it.b, median: rowMedian(gray, w, it.a, it.b, Math.floor(w*0.025), Math.floor(w*0.975)) });
      }
    }
    if (balanceRows.length < 6) throw new Error('Tabela de balanço hídrico não localizada.');

    return {
      hLines,
      gray,
      dark,
      balanceEnd,
      balanceRows,
      vital: {
        top: vitalTop,
        bottom: vitalBottom,
        left: vitalLeft,
        dataStart: vitalDataStart,
        xLines: vitalX,
        dataStartIndex: vitalDataStartIndex,
        dataRows
      }
    };
  }

  async function readBalance(canvas, layout, startHourIdx, endHourIdx, period) {
    const rows = layout.balanceRows;
    const debug = [];
    const values = { DU: [], DEVICES: [], EVAC: null, BH: null };

    // Do fim para cima: EVOLUÇÃO, Total por hora, Total de perdas.
    const evolution = rows[rows.length - 1];
    const totalLoss = rows[rows.length - 3];
    if (!evolution || !totalLoss) throw new Error('Linhas finais do balanço não localizadas.');

    // Antes de Total de perdas: uma ou mais linhas brancas de perdas; a anterior cinza é o cabeçalho PERDAS.
    let idx = rows.length - 4;
    const lossItems = [];
    while (idx >= 0 && rows[idx].median > 235) {
      lossItems.unshift(rows[idx]);
      idx--;
    }
    if (!lossItems.length) {
      // fallback para o layout padrão: linha imediatamente acima de Total de perdas.
      lossItems.push(rows[rows.length - 4]);
    }

    const probe = lossItems[0];
    const balX = detectVerticalLines(layout.dark, canvas.width, canvas.height, probe.y0, probe.y1, 0.58);
    const regBal = longestRegularRun(balX, 24);
    if (!regBal || regBal.run < 24) throw new Error('Colunas horárias do balanço não localizadas.');
    const dataStartIndex = regBal.start;
    const labelLeft = balX[0];
    const labelRight = balX[Math.max(1, dataStartIndex - 2)];

    const mapped = [];
    for (let i = 0; i < lossItems.length; i++) {
      let kind = i === 0 ? 'DU' : null;
      let label = '';
      if (lossItems.length > 1) {
        label = await ocrLabel(canvas, labelLeft, lossItems[i].y0, labelRight, lossItems[i].y1);
        kind = identifyLossLabel(label) || kind;
      }
      mapped.push({ row: lossItems[i], kind, label });
      debug.push(`Perda ${i + 1}: “${label || (i === 0 ? 'DIURESE (posição padrão)' : '?')}” → ${kind || '?'}`);
    }

    const duRow = mapped.find(x => x.kind === 'DU') || mapped[0];
    values.DU = await ocrNumericRow(canvas, balX, dataStartIndex, duRow.row.y0, duRow.row.y1, startHourIdx, endHourIdx, 'DU');
    debug.push(`DU parcelas: ${values.DU.join(' | ') || '—'}`);

    // Mantém cada dreno/nefrostomia/UF separado. Somamos apenas os registros
    // horários pertencentes à mesma linha/dispositivo dentro do período escolhido.
    const deviceKinds = new Set(['DRENO', 'NEFROSTOMIA', 'UF']);
    const deviceRows = mapped.filter(x => deviceKinds.has(x.kind));
    const kindCounts = {};
    for (const d of deviceRows) kindCounts[d.kind] = (kindCounts[d.kind] || 0) + 1;
    const kindSeen = {};
    for (const d of deviceRows) {
      kindSeen[d.kind] = (kindSeen[d.kind] || 0) + 1;
      const canonical = canonicalDeviceLabel(d.label, d.kind, kindSeen[d.kind], kindCounts[d.kind]);
      const vals = await ocrNumericRow(canvas, balX, dataStartIndex, d.row.y0, d.row.y1, startHourIdx, endHourIdx, d.kind);
      const total = vals.length ? vals.reduce((a,b) => a + b, 0) : null;
      values.DEVICES.push({ kind: d.kind, label: canonical, values: vals, total });
      debug.push(`${canonical} parcelas: ${vals.join(' | ') || '—'}${total == null ? '' : ` → total ${total}`}`);
    }

    const evacRows = mapped.filter(x => x.kind === 'EVAC');
    if (evacRows.length) {
      let total = 0;
      for (const e of evacRows) {
        total += await ocrEvacRow(canvas, balX, dataStartIndex, e.row.y0, e.row.y1, startHourIdx, endHourIdx);
      }
      values.EVAC = total;
      debug.push(`EVAC: ${total}`);
    }

    // BH usa exclusivamente a linha EVOLUÇÃO (Ganhos-Perdas), conforme especificação.
    // O fundo desta linha pode ser cinza; por isso a leitura usa
    // binarização adaptativa (ver thresholdCanvas) e, no período de 24 h,
    // prioriza a coluna Total, que replica o fechamento das 06:00.
    if (period === 24) {
      let endVals = await ocrSpecificCells(canvas, balX, dataStartIndex, evolution.y0, evolution.y1, [24], 'BH'); // Total
      let source = 'Total';
      if (!endVals.length) {
        endVals = await ocrSpecificCells(canvas, balX, dataStartIndex, evolution.y0, evolution.y1, [23], 'BH'); // 06:00 fallback
        source = '06:00 (fallback)';
      }
      if (endVals.length) values.BH = endVals[0];
      debug.push(`BH (Evolução ${source}): ${endVals.join(' | ') || '—'}`);
    } else {
      // Plantão noturno: resume os dados registrados entre 07:00 e 18:00.
      // Como a linha EVOLUÇÃO é acumulada desde 07:00, o valor das 18:00 já representa o BH do período.
      const endVals = await ocrSpecificCells(canvas, balX, dataStartIndex, evolution.y0, evolution.y1, [11], 'BH');
      if (endVals.length) values.BH = endVals[0];
      debug.push(`BH (Evolução 18:00): ${endVals.join(' | ') || '—'}`);
    }

    return { values, debug };
  }

  function grayscaleAndDark(canvas, threshold) {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const n = canvas.width * canvas.height;
    const gray = new Uint8Array(n);
    const dark = new Uint8Array(n);
    for (let i = 0, p = 0; i < n; i++, p += 4) {
      const g = Math.round(data[p] * 0.299 + data[p + 1] * 0.587 + data[p + 2] * 0.114);
      gray[i] = g;
      dark[i] = g < threshold ? 1 : 0;
    }
    return { gray, dark };
  }

  function clusterCenters(values, maxGap = 1) {
    if (!values.length) return [];
    const out = [];
    let s = values[0], p = values[0];
    for (let i = 1; i < values.length; i++) {
      const v = values[i];
      if (v - p <= maxGap) p = v;
      else { out.push(Math.round((s + p) / 2)); s = p = v; }
    }
    out.push(Math.round((s + p) / 2));
    return out;
  }

  function detectVerticalLines(dark, w, h, y0, y1, threshold = 0.58) {
    y0 = Math.max(0, Math.floor(y0 + 1));
    y1 = Math.min(h, Math.ceil(y1 - 1));
    const denom = Math.max(1, y1 - y0);
    const candidates = [];
    for (let x = 0; x < w; x++) {
      let n = 0;
      for (let y = y0; y < y1; y++) n += dark[y * w + x];
      if (n / denom > threshold) candidates.push(x);
    }
    return clusterCenters(candidates, 1);
  }

  function longestRegularRun(xs, minimum = 10) {
    if (!xs || xs.length < minimum + 1) return null;
    let best = null;
    for (let i = 0; i < xs.length - 1; i++) {
      const base = xs[i + 1] - xs[i];
      if (base < 15 || base > 100) continue;
      let j = i;
      while (j < xs.length - 1) {
        const gap = xs[j + 1] - xs[j];
        if (Math.abs(gap - base) > Math.max(2.5, base * 0.09)) break;
        j++;
      }
      const run = j - i;
      if (!best || run > best.run) best = { start: i, end: j, run, gap: base };
    }
    return best && best.run >= minimum ? best : null;
  }

  function rowMedian(gray, w, y0, y1, x0, x1) {
    const vals = [];
    const ys = Math.max(1, Math.floor((y1 - y0) / 8));
    const xs = Math.max(1, Math.floor((x1 - x0) / 150));
    for (let y = y0 + 3; y < y1 - 3; y += ys) {
      for (let x = x0 + 3; x < x1 - 3; x += xs) vals.push(gray[y * w + x]);
    }
    vals.sort((a,b) => a-b);
    return vals.length ? vals[Math.floor(vals.length / 2)] : 255;
  }

  async function ensureOcrWorker() {
    if (ocrWorker) return;
    ocrWorker = await Tesseract.createWorker('por', 1, {
      langPath: 'https://tessdata.projectnaptha.com/4.0.0_fast',
      logger: m => {
        if (m.status === 'recognizing text' && Number.isFinite(m.progress)) {
          statusText.textContent = `OCR local: ${Math.round(m.progress * 100)}%`;
        }
      }
    });
  }

  async function ocrLabel(canvas, x0, y0, x1, y1) {
    const crop = cropCanvas(canvas, x0 + 2, y0 + 2, x1 - 2, y1 - 2, 3, true);
    await ocrWorker.setParameters({
      tessedit_pageseg_mode: '7',
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzÁÀÂÃÉÊÍÓÔÕÚÇáàâãéêíóôõúç0123456789()./%- '
    });
    const { data } = await ocrWorker.recognize(crop);
    return (data.text || '').replace(/\s+/g, ' ').trim();
  }

  async function ocrNumericRow(canvas, xLines, dataStartIndex, y0, y1, startHour, endHour, field) {
    const { strip, count } = makeNumericStrip(canvas, xLines, dataStartIndex, y0, y1, startHour, endHour);
    if (!count) return [];
    await setNumericParams();
    const { data } = await ocrWorker.recognize(strip);
    const raw = (data.text || '').trim();
    const nums = parseNumbers(raw).map(v => correctNumber(v, field)).filter(v => v != null);
    return nums;
  }

  async function ocrSpecificCells(canvas, xLines, dataStartIndex, y0, y1, hourIndexes, field) {
    const parts = [];
    for (const idx of hourIndexes) {
      const xa = xLines[dataStartIndex + idx];
      const xb = xLines[dataStartIndex + idx + 1];
      if (xa == null || xb == null) continue;
      const c = cropCanvas(canvas, xa + 3, y0 + 3, xb - 3, y1 - 3, 4, true);
      if (!hasInk(c)) continue;
      parts.push(c);
    }
    if (!parts.length) return [];
    const strip = joinCanvases(parts, 100);
    await setNumericParams();
    const { data } = await ocrWorker.recognize(strip);
    return parseNumbers(data.text || '').map(v => correctNumber(v, field)).filter(v => v != null);
  }

  async function ocrEvacRow(canvas, xLines, dataStartIndex, y0, y1, startHour, endHour) {
    const parts = [];
    for (let k = startHour; k <= endHour; k++) {
      const xa = xLines[dataStartIndex + k], xb = xLines[dataStartIndex + k + 1];
      if (xa == null || xb == null) continue;
      const c = cropCanvas(canvas, xa + 3, y0 + 3, xb - 3, y1 - 3, 4, true);
      if (hasInk(c)) parts.push(c);
    }
    if (!parts.length) return 0;
    const strip = joinCanvases(parts, 100);
    await ocrWorker.setParameters({ tessedit_pageseg_mode: '7', tessedit_char_whitelist: '0123456789XxSsIiMm' });
    const { data } = await ocrWorker.recognize(strip);
    const text = (data.text || '').trim();
    const nums = text.match(/\d+/g) || [];
    let total = nums.reduce((s, n) => s + Number(n), 0);
    total += (text.match(/[xX]/g) || []).length;
    if (!nums.length && /sim/i.test(text)) total += 1;
    return total;
  }

  async function setNumericParams() {
    await ocrWorker.setParameters({
      tessedit_pageseg_mode: '7',
      tessedit_char_whitelist: '0123456789.,+-'
    });
  }

  function makeNumericStrip(canvas, xLines, dataStartIndex, y0, y1, startHour, endHour) {
    const pieces = [];
    for (let k = startHour; k <= endHour; k++) {
      const xa = xLines[dataStartIndex + k], xb = xLines[dataStartIndex + k + 1];
      if (xa == null || xb == null) continue;
      const c = cropCanvas(canvas, xa + 3, y0 + 3, xb - 3, y1 - 3, 3, true);
      if (hasInk(c)) pieces.push(c);
    }
    if (!pieces.length) return { strip: document.createElement('canvas'), count: 0 };
    return { strip: joinCanvases(pieces, 90), count: pieces.length };
  }

  function cropCanvas(source, x0, y0, x1, y1, scale = 3, autocontrast = false) {
    x0 = Math.max(0, Math.floor(x0)); y0 = Math.max(0, Math.floor(y0));
    x1 = Math.min(source.width, Math.ceil(x1)); y1 = Math.min(source.height, Math.ceil(y1));
    const sw = Math.max(1, x1 - x0), sh = Math.max(1, y1 - y0);
    const out = document.createElement('canvas');
    out.width = sw * scale; out.height = sh * scale;
    const ctx = out.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, out.width, out.height);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(source, x0, y0, sw, sh, 0, 0, out.width, out.height);
    if (autocontrast) thresholdCanvas(out);
    return out;
  }

  function thresholdCanvas(canvas) {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // Estima a tonalidade do fundo da célula. Em alguns PDFs, algumas linhas
    // (incluindo EVOLUÇÃO) têm fundo cinza ~204; um limiar fixo de 205
    // transformava o fundo inteiro em preto e apagava os números do BH.
    const hist = new Uint32Array(256);
    let pixels = 0;
    for (let p = 0; p < img.data.length; p += 4) {
      const g = Math.max(0, Math.min(255, Math.round(img.data[p] * .299 + img.data[p+1] * .587 + img.data[p+2] * .114)));
      hist[g]++;
      pixels++;
    }
    const target = Math.floor(pixels * 0.85);
    let acc = 0, background = 255;
    for (let g = 0; g < 256; g++) {
      acc += hist[g];
      if (acc >= target) { background = g; break; }
    }
    const threshold = Math.max(135, Math.min(195, background - 30));

    for (let p = 0; p < img.data.length; p += 4) {
      const g = img.data[p] * .299 + img.data[p+1] * .587 + img.data[p+2] * .114;
      const v = g < threshold ? 0 : 255;
      img.data[p] = img.data[p+1] = img.data[p+2] = v;
      img.data[p+3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }

  function hasInk(canvas) {
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let dark = 0;
    for (let p = 0; p < data.length; p += 16) {
      if (data[p] < 120) dark++;
    }
    return dark / Math.max(1, data.length / 16) > 0.006;
  }

  function joinCanvases(parts, padding = 90) {
    const pad = padding;
    const h = Math.max(...parts.map(c => c.height)) + 20;
    const w = parts.reduce((s,c) => s + c.width, 0) + pad * (parts.length - 1) + 20;
    const out = document.createElement('canvas');
    out.width = w; out.height = h;
    const ctx = out.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0,0,w,h);
    let x = 10;
    for (const c of parts) {
      ctx.drawImage(c, x, Math.round((h - c.height) / 2));
      x += c.width + pad;
    }
    return out;
  }

  function parseNumbers(text) {
    const matches = String(text).replace(/,/g, '.').match(/[-+]?\d+(?:\.\d+)?/g) || [];
    return matches.map(Number).filter(Number.isFinite);
  }

  function correctNumber(value, field) {
    const r = FIELD_RULES[field] || { min: -Infinity, max: Infinity };
    let v = value;

    // Temperatura pode perder a vírgula no OCR (ex.: 36,4 → 364).
    // Corrige apenas esse padrão antes de aplicar o teto solicitado.
    if (field === 'T' && v >= 250 && v <= 450) v /= 10;

    // Acima destes tetos o dado é descartado, sem tentar inferir/corrigir o registro.
    if (r.hardMax != null && v > r.hardMax) {
      log(`${field}: valor ${value} ignorado (acima do limite de ${r.hardMax}).`);
      return null;
    }

    // Mantém a tolerância antiga de OCR apenas nos campos sem teto rígido.
    if (v > r.max) {
      if (v / 10 >= r.min && v / 10 <= r.max) v /= 10;
      else if (v / 100 >= r.min && v / 100 <= r.max) v /= 100;
    }
    if (v < r.min || v > r.max) return null;
    return v;
  }

  function normalizeText(text) {
    return String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  function identifyVitalLabel(label) {
    const s = normalizeText(label);
    if (s.includes('CARDIAC')) return 'FC';
    if (s.includes('RESPIR')) return 'FR';
    if (s.includes('SISTOL')) return 'PAS';
    if (s.includes('DIASTOL') || s.includes('DISTOL')) return 'PAD';
    if (s.includes('TEMPERAT')) return 'T';
    if (s.includes('SATURA')) return 'SO2';
    if (s.includes('GLICO') || s.includes('HGT')) return 'HGT';
    if (s.includes('PAM') || s.includes('PRESSAOMEDIA') || s.includes('ARTERIALMEDIA')) return 'PAM';
    return null;
  }

  function identifyLossLabel(label) {
    const s = normalizeText(label);
    if (s.includes('DIUR')) return 'DU';
    if (s.includes('NEFROST') || s.includes('NEFRO')) return 'NEFROSTOMIA';
    if (s === 'UF' || s.includes('ULTRAFILTR') || s.includes('ULTRAFILT')) return 'UF';
    if (s.includes('DRENO') || s.includes('DREN')) return 'DRENO';
    if (s.includes('EVAC')) return 'EVAC';
    return null;
  }

  function canonicalDeviceLabel(label, kind, ordinal, totalOfKind) {
    const raw = String(label || '').trim();
    const s = normalizeText(raw);
    if (kind === 'UF') return 'UF';

    const base = kind === 'NEFROSTOMIA' ? 'NEFROSTOMIA' : 'DRENO';
    const num = s.match(/(\d{1,2})/);
    if (num) return `${base} ${num[1]}`;

    if (/DIREIT|\bD\b/i.test(raw)) return `${base} D`;
    if (/ESQUER|\bE\b/i.test(raw)) return `${base} E`;

    return totalOfKind > 1 ? `${base} ${ordinal}` : base;
  }

  function resetSummaryTable() {
    Object.values(tableEls).forEach(el => { if (el) el.textContent = ''; });
    if (deviceRowsEl) deviceRowsEl.innerHTML = '';
  }

  function renderSummaryTable(f) {
    const rangeValue = (values, field, unit = '') => {
      if (!Array.isArray(values) || !values.length) return '';
      const min = Math.min(...values), max = Math.max(...values);
      const dec = FIELD_RULES[field]?.decimals ?? 0;
      const core = Math.abs(min - max) < 1e-9
        ? formatNumber(min, dec)
        : `${formatNumber(min, dec)} - ${formatNumber(max, dec)}`;
      return unit ? `${core} ${unit}` : core;
    };

    const duSum = Array.isArray(f.DU) && f.DU.length ? f.DU.reduce((a,b)=>a+b,0) : null;

    tableEls.T.textContent = rangeValue(f.T, 'T', '°C');
    tableEls.DU.textContent = duSum == null ? '' : `${formatNumber(duSum, 0)} mL`;
    tableEls.BH.textContent = f.BH == null || Number.isNaN(f.BH) ? '' : `${formatSigned(f.BH)} mL`;
    tableEls.FC.textContent = rangeValue(f.FC, 'FC', 'bpm');
    tableEls.FR.textContent = rangeValue(f.FR, 'FR', 'irpm');
    tableEls.SO2.textContent = rangeValue(f.SO2, 'SO2', '%');
    tableEls.PAS.textContent = rangeValue(f.PAS, 'PAS', 'mmHg');
    tableEls.PAD.textContent = rangeValue(f.PAD, 'PAD', 'mmHg');
    tableEls.PAM.textContent = rangeValue(f.PAM, 'PAM', 'mmHg');
    tableEls.HGT.textContent = Array.isArray(f.HGT) && f.HGT.length
      ? `${f.HGT.map(v => formatNumber(v, FIELD_RULES.HGT.decimals)).join('-')} mg/dL`
      : '';
    renderDeviceRows(f.DEVICES);
    tableEls.EVAC.textContent = f.EVAC == null ? 'Não registrado' : `${formatNumber(f.EVAC, 0)}x`;
  }

  function renderDeviceRows(devices) {
    if (!deviceRowsEl) return;
    deviceRowsEl.innerHTML = '';
    const valid = Array.isArray(devices) ? devices.filter(d => d && d.total != null) : [];
    const rows = valid.length ? valid : [{ label: 'DRENO', total: null }];
    for (const d of rows) {
      const row = document.createElement('tr');
      row.className = 'wide-row device-row';

      const label = document.createElement('th');
      label.scope = 'row';
      label.className = 'wide-label';
      label.textContent = d.label || d.kind || 'DRENO';

      const value = document.createElement('td');
      value.colSpan = 2;
      value.className = 'wide-value';
      value.textContent = d.total == null ? 'Não registrado' : `${formatNumber(d.total, 0)} mL`;

      row.append(label, value);
      deviceRowsEl.appendChild(row);
    }
  }

  function buildDeviceLines(devices) {
    const valid = Array.isArray(devices) ? devices.filter(d => d && d.total != null) : [];
    if (!valid.length) return ['DRENO Não registrado'];
    return valid.map(d => `${d.label || d.kind || 'DRENO'} ${formatNumber(d.total, 0)} mL`);
  }

  function buildSummary(f) {
    const t = rangeText(f.T, 'T');
    const fc = rangeText(f.FC, 'FC');
    const fr = rangeText(f.FR, 'FR');
    const so2 = rangeText(f.SO2, 'SO2');
    const pas = rangeText(f.PAS, 'PAS');
    const pad = rangeText(f.PAD, 'PAD');
    const pam = rangeText(f.PAM, 'PAM');
    const hgt = listText(f.HGT, 'HGT');

    const duSum = Array.isArray(f.DU) && f.DU.length ? f.DU.reduce((a,b)=>a+b,0) : null;
    const du = duSum == null ? 'DU' : `DU ${formatNumber(duSum, 0)} mL`;
    const bh = f.BH == null || Number.isNaN(f.BH) ? 'BH' : `BH ${formatSigned(f.BH)} mL`;
    const deviceLines = buildDeviceLines(f.DEVICES);
    const evac = f.EVAC == null ? 'EVAC Não registrado' : `EVAC ${formatNumber(f.EVAC, 0)}x`;

    return [
      `${t.padEnd(17)}${du.padEnd(19)}${bh}`,
      `${fc.padEnd(17)}${fr.padEnd(19)}${so2}`,
      `${pas.padEnd(17)}${pad.padEnd(19)}${pam}`,
      hgt,
      ...deviceLines,
      evac
    ].join('\n');
  }

  function rangeText(values, field) {
    if (!Array.isArray(values) || !values.length) return field;
    const min = Math.min(...values), max = Math.max(...values);
    const dec = FIELD_RULES[field]?.decimals ?? 0;
    const suffix = field === 'SO2' ? '%' : '';
    if (Math.abs(min - max) < 1e-9) return `${field} ${formatNumber(min, dec)}${suffix}`;
    return `${field} ${formatNumber(min, dec)}-${formatNumber(max, dec)}${suffix}`;
  }

  function listText(values, field) {
    if (!Array.isArray(values) || !values.length) return field;
    const dec = FIELD_RULES[field]?.decimals ?? 0;
    return `${field} ${values.map(v => formatNumber(v, dec)).join('-')}`;
  }

  function formatNumber(v, decimals = 0) {
    if (!Number.isFinite(v)) return '';
    const rounded = decimals === 0 ? Math.round(v) : Number(v.toFixed(decimals));
    return decimals === 0 ? String(rounded) : rounded.toFixed(decimals).replace('.', ',');
  }

  function formatSigned(v) {
    const n = Math.round(v);
    return n > 0 ? `+${n}` : String(n);
  }
})();
