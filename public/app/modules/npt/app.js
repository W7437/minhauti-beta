const $=id=>document.getElementById(id);
const n=id=>parseFloat($(id).value);
const has=id=>Number.isFinite(n(id));
const fmt=(x,d=1)=>Number.isFinite(x)?x.toLocaleString('pt-BR',{maximumFractionDigits:d}):'—';
function clamp(x,a,b){return Math.max(a,Math.min(b,x))}
function addAlert(type,text){
 const d=document.createElement('div');d.className='alert '+type;d.textContent=text;$('alerts').appendChild(d);
}
function addRow(name,rec,conv,why){
 const tr=document.createElement('tr');
 tr.innerHTML=`<td><b>${name}</b></td><td class="qty">${rec}</td><td>${conv}</td><td class="why">${why}</td>`;
 $('tbody').appendChild(tr);
}


let autoSuggestionLocked = false;

function applySuggestedTargets(force=false){
  const fase=$('fase').value;

  // The values remain editable. They are reset automatically only when
  // the clinical profile changes, or on initial page load.
  if(fase==='uti'){
    if(force || !has('kcal')) $('kcal').value='25';
    if(force || !has('prot')) $('prot').value='1.3';
    $('kcalTipo').value='kg';
    $('kcalFonte').textContent='Fonte: ESPEN ICU 2023 — na ausência de calorimetria indireta, VO₂ ou VCO₂, podem ser usadas equações simples de 20–25 kcal/kg/d. O protótipo sugere 25 kcal/kg/d como necessidade estimada; na fase aguda, a oferta efetiva pode precisar ser menor.';
    $('protFonte').textContent='Fonte: ESPEN ICU 2023 — durante doença crítica, 1,3 g/kg/d de equivalentes proteicos podem ser ofertados progressivamente.';
  }else{
    if(force || !has('kcal')) $('kcal').value='25';
    if(force || !has('prot')) $('prot').value='1.0';
    $('kcalTipo').value='kg';
    $('kcalFonte').textContent='Fonte: ESPEN Hospital Nutrition — 25 kcal/kg/d de peso atual cobre a necessidade energética mínima da dieta hospitalar padrão; individualizar conforme condição clínica.';
    $('protFonte').textContent='Fonte: ESPEN Hospital Nutrition — 0,8–1,0 g/kg/d de proteína cobre a necessidade mínima da dieta hospitalar padrão; o protótipo sugere 1,0 g/kg/d.';
  }
}

$('fase').addEventListener('change',()=>applySuggestedTargets(true));
applySuggestedTargets(false);

function calculate(){
 const w=n('peso');
 if(!Number.isFinite(w)||w<=0){alert('Informe o peso para cálculo.');return}
 $('out').classList.remove('hidden');$('alertsCard').classList.remove('hidden');$('rxCard').classList.remove('hidden');
 $('tbody').innerHTML='';$('alerts').innerHTML='';

 let kcalGoal = $('kcalTipo').value==='kg' ? (has('kcal')?n('kcal'):25)*w : (has('kcal')?n('kcal'):25*w);
 const kcalPerKg=kcalGoal/w;
 const refeed=$('refeed').value;
 const dia=n('diaUti')||1;
 const fase=$('fase').value;

 // Refeeding safety ceiling recommendation.
 let kcalUsed=kcalGoal;
 if(refeed==='sim'){
   const cap=10*w;
   if(kcalGoal>cap){ addAlert('danger',`Risco de realimentação: a meta informada (${fmt(kcalGoal,0)} kcal/d) excede 10 kcal/kg/d (${fmt(cap,0)} kcal/d) como ponto inicial de cautela. O cálculo abaixo foi limitado a 10 kcal/kg/d para o primeiro passo.`); kcalUsed=cap; }
 }
 if(refeed==='extremo'){
   const cap=5*w;
   if(kcalGoal>cap){ addAlert('danger',`Risco extremo de realimentação: a meta informada excede 5 kcal/kg/d (${fmt(cap,0)} kcal/d). O cálculo inicial foi limitado a esse valor.`); kcalUsed=cap; }
 }
 if(fase==='uti' && dia<=7 && refeed==='nao'){
   const estimated=0.70*kcalGoal;
   addAlert('warn',`Fase aguda de UTI com meta derivada por estimativa: ESPEN recomenda evitar oferta isocalórica plena precoce; considere iniciar/avançar de forma hipocalórica. 70% da meta informada corresponde a ~${fmt(estimated,0)} kcal/d. O cálculo mantém a cota que você informou, mas destaca esse ponto para decisão médica.`);
 }

 // Protein
 let protG=(n('prot')||1.3)*w;
 let protKcal=protG*4;
 if(fase==='uti' && (n('prot')||1.3)>1.3){
   addAlert('warn','Proteína acima de 1,3 g/kg/d em paciente crítico: revisar indicação e fase clínica, especialmente se houver LRA.');
 }
 if($('renal').value==='aki'){
   addAlert('warn','LRA/DRC sem diálise: proteína e eletrólitos não devem ser definidos apenas pelo valor sérico isolado; revisar catabolismo, função renal, diurese e estratégia nefrológica.');
 }
 if($('renal').value==='ihd'||$('renal').value==='crrt'){
   addAlert('warn','Paciente em terapia renal substitutiva: perdas e necessidades de proteína, fósforo, potássio e magnésio podem diferir substancialmente. O programa mantém valores gerais apenas como ponto de partida.');
 }

 // Propofol
 const propMlDay=(n('propofol')||0)*24;
 const propKcal=propMlDay*1.1;
 const propFat=propMlDay*0.1;
 if(propKcal>0) addAlert('warn',`Propofol fornece aproximadamente ${fmt(propKcal,0)} kcal/d e ${fmt(propFat,1)} g/d de lipídio; isso foi descontado da energia a ser fornecida pela NPT e contabilizado no limite de lipídios.`);

 // Lipid around 25% total kcal, cap usual 1 g/kg NPT+propofol
 let lipKcalTarget=kcalUsed*0.25;
 let lipG=Math.max(0,lipKcalTarget/10);
 const usualCap=Math.max(0,1.0*w-propFat);
 const tolerantCap=Math.max(0,1.5*w-propFat);
 if(lipG>usualCap){
   addAlert('warn',`A proposta de lipídio excederia 1 g/kg/d somando fontes não nutricionais. Foi limitada a ${fmt(usualCap,1)} g/d na emulsão da NPT.`);
   lipG=usualCap;
 }
 if(propFat+lipG>1.5*w) addAlert('danger','Lipídios totais acima de 1,5 g/kg/d: reduzir emulsão e revisar outras fontes de lipídio.');
 if(has('tg')){
   if(n('tg')>=400){ lipG=Math.min(lipG,0.5*w); addAlert('danger',`Triglicerídeos ${fmt(n('tg'),0)} mg/dL: hiperlipidemia relevante. A emulsão lipídica foi reduzida de forma conservadora no protótipo; revisar indicação, velocidade e outras causas antes de prescrever.`); }
   else if(n('tg')>=300) addAlert('warn',`Triglicerídeos ${fmt(n('tg'),0)} mg/dL: acompanhar tolerância à emulsão lipídica e considerar redução conforme contexto.`);
 }

 // Dextrose gets residual calories
 let dexKcal=Math.max(0,kcalUsed-protKcal-lipG*10-propKcal);
 let dexG=dexKcal/3.4;
 let gir=dexG*1000/(w*1440);
 if(gir>5){
   const maxDex=5*w*1440/1000;
   addAlert('danger',`GIR calculada ${fmt(gir,2)} mg/kg/min (>5). A dextrose foi limitada ao máximo correspondente a 5 mg/kg/min; a meta calórica não poderá ser atingida com esta distribuição sem revisar os macronutrientes.`);
   dexG=maxDex; dexKcal=dexG*3.4; gir=5;
 }
 if(has('glicemia') && n('glicemia')>180) addAlert('danger',`Glicemia ${fmt(n('glicemia'),0)} mg/dL: hiperglicemia significativa. Não aumentar carboidrato automaticamente; revisar controle glicêmico e aporte não nutricional.`);
 else if(has('glicemia') && n('glicemia')>150) addAlert('warn',`Glicemia ${fmt(n('glicemia'),0)} mg/dL: monitorar tolerância à dextrose e necessidade de insulina.`);

 // Volume
 const volMode=parseFloat($('volSug').value)||0;
 const congested=$('bh').value==='positivo';
 const onKRT=['ihd','crrt'].includes($('renal').value);
 let volume=null;
 let volumeReason='';

 if(has('volume') && n('volume')>0){
   volume=n('volume');
   volumeReason='volume informado pelo médico';
 }else if(volMode===0){
   volume=null;
   volumeReason='volume não estimado por escolha do usuário';
   addAlert('danger','Volume da NPT não definido: você selecionou “Não estimar”. A ferramenta manterá os cálculos de nutrientes, mas não calculará água q.s.p., vazão ou osmolaridade até que um volume final seja informado.');
 }else if(congested && !onKRT){
   volume=null;
   volumeReason='estimativa automática bloqueada por congestão sem terapia renal substitutiva';
   addAlert('danger','Congestão/BH positivo sem terapia renal substitutiva: a estimativa automática de volume por mL/kg foi desativada. Defina a meta hídrica global do paciente e informe quanto desse orçamento pode ser destinado à NPT; o programa então concentrará a formulação nesse volume.');
 }else{
   volume=volMode*w;
   volumeReason=`estimativa de ${fmt(volMode,0)} mL/kg/d`;
 }

 if(congested) addAlert('warn','Balanço positivo/congestão: contabilize NPT, drogas, diluentes, dieta/água enteral, hemoderivados e demais infusões dentro da estratégia hídrica total. Se necessário, concentrar a NPT em vez de assumir um volume padrão.');
 if($('gi').value==='sim') addAlert('warn','Perdas gastrointestinais importantes: necessidades de água, sódio, potássio, magnésio e bicarbonato/acetato podem ser maiores que as faixas de manutenção.');

 // Electrolytes: maintenance orientation, not correction
 let naTotal=clamp(1.5*w,70,100);
 if(has('na')){
   if(n('na')>145){naTotal=70;addAlert('warn',`Na ${fmt(n('na'),1)} mEq/L: hipernatremia. A concentração sérica reflete principalmente balanço de água; a NPT não deve ser usada como única estratégia de correção. O sódio foi colocado no limite inferior do ponto de partida.`)}
   if(n('na')<130){naTotal=100;addAlert('warn',`Na ${fmt(n('na'),1)} mEq/L: hiponatremia importante. Não interpretar como indicação automática de grande carga de sódio na NPT; avaliar volemia, água livre e etiologia. O programa usa apenas o limite superior da faixa de manutenção.`)}
 }
 let kTotal=60;
 if(has('k')){
   if(n('k')>=5.0){kTotal=0;addAlert('danger',`K ${fmt(n('k'),1)} mEq/L: não foi incluído potássio automaticamente na bolsa. Reavaliar função renal, ECG e tendência antes de adicionar.`)}
   else if(n('k')<3.0){kTotal=70;addAlert('danger',`K ${fmt(n('k'),1)} mEq/L: hipocalemia relevante. A NPT não substitui correção EV quando indicada; foi usada a parte alta da faixa de manutenção.`)}
   else if(n('k')<3.5){kTotal=70;addAlert('warn',`K ${fmt(n('k'),1)} mEq/L: foi usada a parte alta da faixa de manutenção; considerar reposição separada conforme gravidade e perdas.`)}
 }
 if($('renal').value==='aki' && (!has('k') || n('k')>=4.5)){kTotal=Math.min(kTotal,30);addAlert('warn','Disfunção renal sem diálise: potássio da bolsa foi reduzido no protótipo; ajuste deve seguir tendência do K, diurese e necessidade de reposição fora da NPT.')}
 if(has('diurese') && n('diurese')<400 && !['ihd','crrt'].includes($('renal').value)){kTotal=Math.min(kTotal,20);addAlert('danger',`Diurese ${fmt(n('diurese'),0)} mL/24 h: oligúria importante; potássio foi reduzido, e Mg/P também devem ser individualizados.`)}

 let caTotal=12;
 if(has('ca') && n('ca')>10.5){caTotal=0;addAlert('warn',`Ca total ${fmt(n('ca'),1)} mg/dL: cálcio não foi incluído automaticamente. Interpretar com albumina ou cálcio ionizado conforme o caso.`)}
 else if(has('ca') && n('ca')<8.0){caTotal=15;addAlert('warn',`Ca total ${fmt(n('ca'),1)} mg/dL: foi usada a parte alta da faixa de manutenção, mas Ca total deve ser interpretado com albumina/ionizado.`)}

 let mgTotal=12;
 if(refeed!=='nao') mgTotal=18;
 if(has('mg')){
   if(n('mg')>2.6){mgTotal=0;addAlert('warn',`Mg ${fmt(n('mg'),1)} mg/dL: magnésio não foi incluído automaticamente.`)}
   else if(n('mg')<1.5){mgTotal=Math.max(mgTotal,18);addAlert('danger',`Mg ${fmt(n('mg'),1)} mg/dL: hipomagnesemia. A NPT não substitui reposição EV quando necessária; foi escolhida a parte alta da faixa de manutenção.`)}
 }
 if($('renal').value==='aki' && (!has('mg') || n('mg')>=2.0)) mgTotal=Math.min(mgTotal,8);

 let pTotal=30; // mmol
 if(refeed!=='nao') pTotal=40;
 if(has('p')){
   if(n('p')>4.5){pTotal=0;addAlert('warn',`P ${fmt(n('p'),1)} mg/dL: fósforo não foi incluído automaticamente.`)}
   else if(n('p')<2.0){pTotal=40;addAlert('danger',`P ${fmt(n('p'),1)} mg/dL: hipofosfatemia. Reposição específica pode ser necessária; a bolsa foi colocada no limite superior da faixa inicial.`)}
 }
 if($('renal').value==='aki' && (!has('p') || n('p')>=3.5)) pTotal=Math.min(pTotal,20);

 // Phosphate product: convert mmol P to mL and account for the accompanying cation.
 let pMl=0, pNa=0, pK=0, pProductLabel='';
 if($('phosProduto').value==='organico'){
   pMl=pTotal/1.0;            // 1 mmol phosphorus per mL
   pNa=pMl*2.0;               // 2 mEq sodium per mL
   pProductLabel='Fósforo orgânico / glicerofosfato';
 }else{
   pMl=pTotal/1.1;            // ~1.1 mmol phosphorus per mL
   pK=pMl*2.0;                // 2 mEq potassium per mL
   pProductLabel='Fosfato de potássio';
 }

 // Do not double-count Na/K delivered by phosphate.
 const naBaseTarget=naTotal;
 const kBaseTarget=kTotal;
 let naToAdd=Math.max(0,naTotal-pNa);
 let kToAdd=Math.max(0,kTotal-pK);

 if(pNa>naTotal && pNa>0){
   addAlert('warn',`${pProductLabel} fornece ~${fmt(pNa,0)} mEq/d de sódio, acima da meta de Na escolhida (${fmt(naTotal,0)} mEq/d). Não foi acrescentado NaCl/acetato de Na; revisar a fonte de fósforo ou a meta de fósforo/sódio.`);
 }
 if(pK>kTotal && pK>0){
   addAlert('warn',`${pProductLabel} fornece ~${fmt(pK,0)} mEq/d de potássio, acima da meta de K escolhida (${fmt(kTotal,0)} mEq/d). Não foi acrescentado KCl/acetato de K; revisar a fonte de fósforo ou a meta de fósforo/potássio.`);
 }

 // chloride vs acetate split for the remaining Na/K.
 let acetateFrac=.5;
 let acidReason='equilíbrio inicial entre cloreto e acetato';
 if((has('bic') && n('bic')<22) || (has('ph') && n('ph')<7.35)){
   acetateFrac=.75; acidReason='HCO₃⁻/pH sugerem tendência acidótica: preferência por acetato';
 }
 if((has('bic') && n('bic')>28) || (has('ph') && n('ph')>7.45)){
   acetateFrac=.25; acidReason='HCO₃⁻/pH sugerem tendência alcalótica: preferência por cloreto';
 }
 if(has('cl') && n('cl')>110 && (!has('bic') || n('bic')<=24)){
   acetateFrac=.8; acidReason='hipercloremia com bicarbonato não elevado: maior preferência por acetato';
 }

 const naAc=naToAdd*acetateFrac, naCl=naToAdd-naAc;
 const kAc=kToAdd*acetateFrac, kCl=kToAdd-kAc;

 // Volumes by product concentrations from uploaded order form / selected products.
 const aaMl=protG/parseFloat($('aaConc').value);
 const dexMl=dexG/.50;
 const lipMl=lipG/.20;
 const naAcMl=naAc/2;
 const naClMl=naCl/3.42;
 const kAcMl=kAc/2;
 const kClMl=kCl/2.56;
 const caMl=caTotal/.5;
 const mgMl=mgTotal/4;
 const microMl=$('micro').value==='fruto'?12:15;
 const knownVolume=aaMl+dexMl+lipMl+naAcMl+naClMl+kAcMl+kClMl+caMl+mgMl+pMl+microMl;
 const volumeDefined=Number.isFinite(volume) && volume>0;
 const water=volumeDefined?Math.max(0,volume-knownVolume):null;

 if(volumeDefined && knownVolume>volume) addAlert('danger',`O volume desejado (${fmt(volume,0)} mL) é menor que o volume ocupado pelos componentes calculados (~${fmt(knownVolume,0)} mL). Aumentar o volume, rever metas ou usar apresentações mais concentradas.`);
 if(!volumeDefined) addAlert('warn',`Os componentes já calculados ocupam aproximadamente ${fmt(knownVolume,0)} mL, antes da água q.s.p. Esse é o volume mínimo físico aproximado desta composição com as apresentações selecionadas.`);

 if(caTotal>0 && pTotal>0) addAlert('warn','Compatibilidade cálcio–fósforo depende de concentração final, sais, aminoácidos, pH, temperatura e sequência de manipulação. O volume foi calculado, mas a ferramenta não valida precipitação Ca–P; a farmácia deve revisar compatibilidade/estabilidade.');

 // Peripheral
 const approxOsm = volumeDefined ? (protG*10 + dexG*5 + lipG*.28 + naTotal*2 + kTotal*2 + caTotal*.662 + mgTotal*1 + pTotal*2 + 41.1) / (volume/1000) : null;
 if($('via').value==='periferica'){
   if(!volumeDefined) addAlert('warn','Via periférica selecionada, mas não é possível estimar osmolaridade sem definir o volume final da bolsa.');
   else if(approxOsm>900) addAlert('danger',`Osmolaridade estimada ~${fmt(approxOsm,0)} mOsm/L, acima do limite de referência de 900 mOsm/L para acesso periférico. Preferir acesso central ou reformular.`);
   else addAlert('ok',`Osmolaridade estimada ~${fmt(approxOsm,0)} mOsm/L, abaixo de 900 mOsm/L. Ainda assim, confirmar a osmolaridade final da preparação.`);
 }

 // Refeeding monitoring
 if(refeed!=='nao') addAlert('danger','Realimentação: monitorar K, Mg e P estreitamente; corrigir déficits e usar tiamina conforme protocolo institucional antes/durante o avanço calórico.');

 // general monitoring
 if(!has('tg')) addAlert('warn','Triglicerídeos não informados: recomenda-se conhecê-los/monitorá-los ao iniciar emulsão lipídica.');
 if(!has('glicemia')) addAlert('warn','Glicemia não informada: monitorar glicose durante início e progressão da NPT.');

 // Display
 $('rKcal').textContent=fmt(kcalUsed,0)+' kcal/d';
 $('rProt').textContent=fmt(protG,1)+' g/d';
 $('rGir').textContent=fmt(gir,2)+' mg/kg/min';
 $('rVol').textContent=volumeDefined?fmt(volume,0)+' mL/d':'Não definido';

 addRow('Aminoácidos',`${fmt(protG,1)} g/d (${fmt(protG/w,2)} g/kg)`,`${fmt(aaMl,0)} mL de ${$('aaConc').selectedOptions[0].text}`,'Proteína definida primeiro; em paciente crítico, 1,3 g/kg/d é referência ESPEN e deve ser alcançada progressivamente.');
 addRow('Glicose',`${fmt(dexG,1)} g/d`,`${fmt(dexMl,0)} mL de glicose 50%`,`Completa a energia restante após proteína, lipídio e propofol. GIR = ${fmt(gir,2)} mg/kg/min.`);
 addRow('Lipídio',`${fmt(lipG,1)} g/d (${fmt((lipG+propFat)/w,2)} g/kg total c/ propofol)`,`${fmt(lipMl,0)} mL de ${$('lipTipo').value}`,'Ponto de partida de ~25% das kcal; limitado pela carga lipídica total e tolerância.');
 addRow('Sódio',`${fmt(naBaseTarget,0)} mEq/d no total`,`${pNa>0?`${fmt(pNa,0)} mEq (${fmt(pMl,1)} mL de ${pProductLabel}) + `:''}${fmt(naCl,0)} mEq em NaCl (${fmt(naClMl,1)} mL) + ${fmt(naAc,0)} mEq em acetato de Na (${fmt(naAcMl,1)} mL)`,'Faixa inicial de manutenção 1–2 mEq/kg/d, usualmente 70–100 mEq/d; o Na fornecido pelo fósforo orgânico é descontado do NaCl/acetato.');
 addRow('Potássio',`${fmt(kBaseTarget,0)} mEq/d no total`,`${pK>0?`${fmt(pK,0)} mEq (${fmt(pMl,1)} mL de ${pProductLabel}) + `:''}${fmt(kCl,0)} mEq em KCl (${fmt(kClMl,1)} mL) + ${fmt(kAc,0)} mEq em acetato de K (${fmt(kAcMl,1)} mL)`,'Ponto de partida 50–70 mEq/d, modificado por K sérico, função renal e diurese; o K fornecido pelo fosfato é descontado do KCl/acetato.');
 addRow('Cloreto / acetato','—',`${Math.round((1-acetateFrac)*100)}% cloreto / ${Math.round(acetateFrac*100)}% acetato`,acidReason+'. É uma orientação de composição, não tratamento isolado do distúrbio ácido-base.');
 addRow('Cálcio',`${fmt(caTotal,0)} mEq/d`,`${fmt(caMl,1)} mL de gluconato de cálcio 0,5 mEq/mL`,'Ponto de partida 10–15 mEq/d; interpretar cálcio sérico no contexto clínico.');
 addRow('Magnésio',`${fmt(mgTotal,0)} mEq/d`,`${fmt(mgMl,1)} mL de sulfato de magnésio 4 mEq/mL`,'Ponto de partida 8–20 mEq/d; usar faixa alta em risco de realimentação e ajustar por rim/laboratório.');
 addRow('Fósforo',`${fmt(pTotal,0)} mmol P/d`,`${fmt(pMl,1)} mL de ${pProductLabel}${pNa>0?` (fornece ~${fmt(pNa,0)} mEq Na)`:''}${pK>0?` (fornece ~${fmt(pK,0)} mEq K)`:''}`,'Ponto de partida 20–40 mmol/d. A conversão em mL usa a apresentação selecionada e contabiliza o cátion acompanhante.');
 addRow('Vitaminas / oligoelementos',$('micro').value==='fruto'?'1 ampola de cada':'1 ampola de cada',$('micro').value==='fruto'?'Frutovitan 10 mL + Oligo-Trat 2 mL':'Cerne 12 5 mL + Addaven 10 mL','Mantém micronutrientes diários conforme as apresentações da ficha enviada.');
 addRow('Água destilada',!volumeDefined?'A definir':(knownVolume<=volume?`${fmt(water,0)} mL`:'Volume insuficiente'),!volumeDefined?'Informe o volume final da bolsa':(knownVolume<=volume?`Água q.s.p. ${fmt(volume,0)} mL`:'—'),'Fecha o volume após contabilizar macronutrientes, eletrólitos, fósforo, vitaminas e oligoelementos. Não é possível calcular q.s.p. sem volume final.');

 // Rx
 const deliveredKcal=protG*4+dexG*3.4+lipG*10+propKcal;
 const rxLines=[
 'PROPOSTA INICIAL DE NPT — REVISAR ANTES DE PRESCREVER',
 '',
 `Peso de cálculo: ${fmt(w,1)} kg`,
 `Meta estimada/sugerida: ${fmt(kcalGoal,0)} kcal/d (${fmt(kcalPerKg,1)} kcal/kg/d)`,
 `Proteína sugerida/selecionada: ${fmt(protG,1)} g/d (${fmt(protG/w,2)} g/kg/d)`,
 `Energia usada nesta proposta: ${fmt(kcalUsed,0)} kcal/d`,
 `Energia total incluindo propofol: ~${fmt(deliveredKcal,0)} kcal/d`,
 volumeDefined?`Volume alvo: ${fmt(volume,0)} mL/24h | vazão ~${fmt(volume/24,1)} mL/h (${volumeReason})`:`Volume alvo: NÃO DEFINIDO — ${volumeReason}`,
 '',
 `Aminoácidos: ${fmt(protG,1)} g — ${fmt(aaMl,0)} mL de ${$('aaConc').selectedOptions[0].text}`,
 `Glicose: ${fmt(dexG,1)} g — ${fmt(dexMl,0)} mL de glicose 50% | GIR ${fmt(gir,2)} mg/kg/min`,
 `Lipídio: ${fmt(lipG,1)} g — ${fmt(lipMl,0)} mL de ${$('lipTipo').value}`,
 `Sódio total proposto: ${fmt(naBaseTarget,0)} mEq/d`,
 `Cloreto de sódio: ${fmt(naCl,0)} mEq — ${fmt(naClMl,1)} mL`,
 `Acetato de sódio: ${fmt(naAc,0)} mEq — ${fmt(naAcMl,1)} mL`,
 `Potássio total proposto: ${fmt(kBaseTarget,0)} mEq/d`,
 `Cloreto de potássio: ${fmt(kCl,0)} mEq — ${fmt(kClMl,1)} mL`,
 `Acetato de potássio: ${fmt(kAc,0)} mEq — ${fmt(kAcMl,1)} mL`,
 `Gluconato de cálcio: ${fmt(caTotal,0)} mEq — ${fmt(caMl,1)} mL`,
 `Sulfato de magnésio: ${fmt(mgTotal,0)} mEq — ${fmt(mgMl,1)} mL`,
 `${pProductLabel}: ${fmt(pTotal,0)} mmol P — ${fmt(pMl,1)} mL${pNa>0?` | acrescenta ~${fmt(pNa,0)} mEq Na`:''}${pK>0?` | acrescenta ~${fmt(pK,0)} mEq K`:''}`,
 $('micro').value==='fruto'?'Frutovitan: 10 mL (1 ampola)':'Cerne 12: 5 mL (1 ampola)',
 $('micro').value==='fruto'?'Oligo-Trat: 2 mL (1 ampola)':'Addaven: 10 mL (1 ampola)',
 !volumeDefined?`Água destilada: A DEFINIR — componentes calculados já ocupam ~${fmt(knownVolume,0)} mL`:(knownVolume<=volume?`Água destilada: ${fmt(water,0)} mL, q.s.p. ${fmt(volume,0)} mL`:'ATENÇÃO: volume alvo insuficiente para os componentes calculados.'),
 '',
 volumeDefined?`Estimativa de osmolaridade (aproximada): ${fmt(approxOsm,0)} mOsm/L`:'Estimativa de osmolaridade: indisponível até definir volume final',
 `Cloreto/acetato: ${Math.round((1-acetateFrac)*100)}/${Math.round(acetateFrac*100)} — ${acidReason}.`
 ];
 $('rx').textContent=rxLines.join('\n');
}

$('calc').addEventListener('click',calculate);
$('copiar').addEventListener('click',async()=>{
 try{await navigator.clipboard.writeText($('rx').textContent);$('copiar').textContent='Copiado';setTimeout(()=>$('copiar').textContent='Copiar resumo',1200)}
 catch(e){}
});
$('limpar').addEventListener('click',()=>{
 document.querySelectorAll('input').forEach(x=>x.value='');
 $('prot').value='1.3';$('diaUti').value='1';$('propofol').value='0';
 document.querySelectorAll('select').forEach(x=>x.selectedIndex=0);
 ['out','alertsCard','rxCard'].forEach(id=>$(id).classList.add('hidden'));
 applySuggestedTargets(true);
});
