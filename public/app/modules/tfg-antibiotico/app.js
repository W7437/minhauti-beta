"use strict";
const $=id=>document.getElementById(id);
const num=id=>{const v=$(id)?.value;if(v===undefined||v===null||v==="")return null;const x=Number(v);return Number.isFinite(x)?x:null};
const fmt=(x,d=1)=>Number.isFinite(x)?Number(x).toFixed(d):"—";
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
let renalState={method:null,indexed:null,drugValue:null,bsa:null,label:null};

function bsaDuBois(weight,height){return 0.007184*Math.pow(height,0.725)*Math.pow(weight,0.425)}
function renalClass(v){if(v>=90)return"G1 (≥90)";if(v>=60)return"G2 (60–89)";if(v>=45)return"G3a (45–59)";if(v>=30)return"G3b (30–44)";if(v>=15)return"G4 (15–29)";return"G5 (<15)"}

function calcCockcroft({age,sex,scr,weight}){
if(!(age>0&&scr>0&&weight>0))throw new Error("Preencha idade, creatinina e peso.");
const af=140-age,numer=af*weight,den=72*scr,raw=numer/den,sf=sex==="female"?0.85:1,crcl=raw*sf;
return{indexed:null,drugValue:crcl,bsa:null,formula:"CrCl = [(140 − idade) × peso] / (72 × creatinina) × 0,85 se feminino",steps:[
`1. Fator de idade: 140 − ${age} = ${fmt(af,1)}.`,
`2. Numerador: ${fmt(af,1)} × ${fmt(weight,1)} kg = ${fmt(numer,1)}.`,
`3. Denominador: 72 × ${fmt(scr,2)} = ${fmt(den,2)}.`,
`4. Razão: ${fmt(numer,1)} ÷ ${fmt(den,2)} = ${fmt(raw,2)} mL/min.`,
`5. Fator por sexo: ${sex==="female"?"× 0,85":"× 1,00"} = ${fmt(crcl,2)} mL/min.`]}
}
function calcCKDcr({age,sex,scr,weight,height}){
if(!(age>0&&scr>0))throw new Error("Preencha idade e creatinina.");
const k=sex==="female"?0.7:0.9,a=sex==="female"?-0.241:-0.302,sf=sex==="female"?1.012:1;
const ratio=scr/k,mn=Math.min(ratio,1),mx=Math.max(ratio,1),f1=Math.pow(mn,a),f2=Math.pow(mx,-1.2),f3=Math.pow(0.9938,age);
const egfr=142*f1*f2*f3*sf;let bsa=null,drugValue=null;
const steps=[
`1. κ = ${k}; α = ${a}; fator por sexo = ${sf}.`,
`2. SCr/κ: ${fmt(scr,2)} ÷ ${k} = ${fmt(ratio,4)}.`,
`3. min = ${fmt(mn,4)}; max = ${fmt(mx,4)}.`,
`4. Potências: min^α = ${fmt(f1,5)}; max^−1,200 = ${fmt(f2,5)}.`,
`5. Fator de idade: 0,9938^${age} = ${fmt(f3,5)}.`,
`6. eGFR = 142 × ${fmt(f1,5)} × ${fmt(f2,5)} × ${fmt(f3,5)} × ${sf} = ${fmt(egfr,2)} mL/min/1,73 m².`];
if(weight>0&&height>0){bsa=bsaDuBois(weight,height);drugValue=egfr*bsa/1.73;steps.push(`7. SC (Du Bois) = ${fmt(bsa,3)} m².`);steps.push(`8. Desindexação: ${fmt(egfr,2)} × ${fmt(bsa,3)} ÷ 1,73 = ${fmt(drugValue,2)} mL/min.`)}
else steps.push("7. Sem peso + altura: não foi possível desindexar para mL/min.");
return{indexed:egfr,drugValue,bsa,formula:"eGFR = 142 × min(SCr/κ,1)^α × max(SCr/κ,1)^−1,200 × 0,9938^idade × 1,012 se feminino",steps}
}
function calcCKDcrCys({age,sex,scr,cys,weight,height}){
if(!(age>0&&scr>0&&cys>0))throw new Error("Preencha idade, creatinina e cistatina C.");
const k=sex==="female"?0.7:0.9,a=sex==="female"?-0.219:-0.144,sf=sex==="female"?0.963:1;
const cr=scr/k,cmn=Math.min(cr,1),cmx=Math.max(cr,1),cy=cys/0.8,ymn=Math.min(cy,1),ymx=Math.max(cy,1);
const f1=Math.pow(cmn,a),f2=Math.pow(cmx,-0.544),f3=Math.pow(ymn,-0.323),f4=Math.pow(ymx,-0.778),f5=Math.pow(0.9961,age);
const egfr=135*f1*f2*f3*f4*f5*sf;let bsa=null,drugValue=null;
const steps=[
`1. κ = ${k}; α = ${a}; fator por sexo = ${sf}.`,
`2. SCr/κ = ${fmt(cr,4)}; min = ${fmt(cmn,4)}; max = ${fmt(cmx,4)}.`,
`3. Cistatina C/0,8 = ${fmt(cy,4)}; min = ${fmt(ymn,4)}; max = ${fmt(ymx,4)}.`,
`4. Componentes da creatinina = ${fmt(f1,5)} e ${fmt(f2,5)}.`,
`5. Componentes da cistatina C = ${fmt(f3,5)} e ${fmt(f4,5)}.`,
`6. Fator de idade: 0,9961^${age} = ${fmt(f5,5)}.`,
`7. eGFR = 135 × ${fmt(f1,5)} × ${fmt(f2,5)} × ${fmt(f3,5)} × ${fmt(f4,5)} × ${fmt(f5,5)} × ${sf} = ${fmt(egfr,2)} mL/min/1,73 m².`];
if(weight>0&&height>0){bsa=bsaDuBois(weight,height);drugValue=egfr*bsa/1.73;steps.push(`8. SC (Du Bois) = ${fmt(bsa,3)} m².`);steps.push(`9. Desindexação: ${fmt(egfr,2)} × ${fmt(bsa,3)} ÷ 1,73 = ${fmt(drugValue,2)} mL/min.`)}
else steps.push("8. Sem peso + altura: não foi possível desindexar para mL/min.");
return{indexed:egfr,drugValue,bsa,formula:"eGFRcr-cys = 135 × min(SCr/κ,1)^α × max(SCr/κ,1)^−0,544 × min(Scys/0,8,1)^−0,323 × max(Scys/0,8,1)^−0,778 × 0,9961^idade × 0,963 se feminino",steps}
}

const DRUGS={
amp_sulb:{name:"Ampicilina/sulbactam",indications:{standard:{label:"Esquema padrão",nonhd:v=>v>30?"3 g IV q6h":v>=15?"3 g IV q12h":"3 g IV q24h",band:v=>v>30?">30 mL/min":v>=15?"15–30 mL/min":"<15 mL/min",hd:"3 g IV q12h",hdPost:"Sem dose suplementar pós-HD especificada na tabela UCSF."}}},
piptazo:{name:"Piperacilina/tazobactam",indications:{
nonpseudo:{label:"Sem Pseudomonas — infusão curta",nonhd:v=>v>50?"3,375 g IV q6h":v>=10?"3,375 g IV q8h":"2,25 g IV q8h",band:v=>v>50?">50 mL/min":v>=10?"10–50 mL/min":"<10 mL/min",hd:"2,25 g IV q8h (30 min)",hdPost:"Sem dose suplementar pós-HD especificada nesse esquema."},
pseudo:{label:"Pseudomonas — infusão curta",nonhd:v=>v>20?"4,5 g IV q6h":"3,375 g IV q8h",band:v=>v>20?">20 mL/min":"≤20 mL/min",hd:"2,25 g IV q8h (30 min)",hdPost:"Sem dose suplementar pós-HD especificada nesse esquema."}}},
cefazolin:{name:"Cefazolina",indications:{
simple:{label:"Gram-positiva não complicada",nonhd:v=>v>30?"1 g IV q8h":v>=10?"1 g IV q12h":"1 g IV q24h",band:v=>v>30?">30 mL/min":v>=10?"10–29 mL/min":"<10 mL/min",hd:"2 g IV agora e após HD",hdPost:"Sim. Em agenda estável, UCSF também descreve 2 g / 2 g / 3 g pós-HD, usando 3 g antes do intervalo interdialítico de 72 h."},
complicated:{label:"Gram-negativa ou Gram-positiva complicada",nonhd:v=>v>30?"2 g IV q8h":v>=10?"2 g IV q12h":"1 g IV q24h",band:v=>v>30?">30 mL/min":v>=10?"10–29 mL/min":"<10 mL/min",hd:"2 g IV agora e após HD",hdPost:"Sim. Opção 2 g / 2 g / 3 g pós-HD em agenda estável."}}},
cefepime:{name:"Cefepime",indications:{
nonsevere:{label:"Não grave / cistite",nonhd:v=>v>60?"2 g IV q12h":v>=30?"2 g IV q24h":v>=10?"1 g IV q24h":"500 mg IV q24h",band:v=>v>60?">60 mL/min":v>=30?"30–60 mL/min":v>=10?"10–29 mL/min":"<10 mL/min",hd:"2 g IV agora e após HD",hdPost:"Sim: repetir 2 g após HD. Alternativa UCSF se agenda instável: 1 g agora, depois qPM."},
severe:{label:"Grave / neutropenia febril / meningite / Pseudomonas",nonhd:v=>v>60?"2 g IV q8h":v>=30?"2 g IV q12h":v>=10?"2 g IV q24h":"1 g IV q24h",band:v=>v>60?">60 mL/min":v>=30?"30–60 mL/min":v>=10?"10–29 mL/min":"<10 mL/min",hd:"2 g IV agora e após HD",hdPost:"Sim: repetir 2 g após HD. Alternativa UCSF se agenda instável: 1 g agora, depois qPM."}}},
ceftazidime:{name:"Ceftazidima",indications:{standard:{label:"Todas as indicações — infusão curta",nonhd:v=>v>50?"2 g IV q8h":v>=31?"2 g IV q12h":v>=15?"2 g IV q24h":"1 g IV q24h",band:v=>v>50?">50 mL/min":v>=31?"31–50 mL/min":v>=15?"15–30 mL/min":"<15 mL/min",hd:"1 g IV agora e após HD",hdPost:"Sim: repetir 1 g após HD."}}},
ceftriaxone:{name:"Ceftriaxona",indications:{
standard:{label:"Esquema padrão",nonhd:v=>"2 g IV q24h",band:v=>"Sem ajuste renal",hd:"2 g IV q24h",hdPost:"Sem ajuste específico para HD."},
uti:{label:"Infecção urinária",nonhd:v=>"1 g IV q24h",band:v=>"Sem ajuste renal",hd:"1 g IV q24h",hdPost:"Sem ajuste específico para HD."},
meningitis:{label:"Meningite / endocardite enterocócica com ampicilina",nonhd:v=>"2 g IV q12h",band:v=>"Sem ajuste renal",hd:"2 g IV q12h",hdPost:"Sem ajuste específico para HD."}}},
meropenem:{name:"Meropenem",indications:{
standard:{label:"Esquema padrão",nonhd:v=>v>50?"1 g IV q8h":v>=26?"1 g IV q12h":v>=10?"500 mg IV q12h":"500 mg IV q24h",band:v=>v>50?">50 mL/min":v>=26?"26–50 mL/min":v>=10?"10–25 mL/min":"<10 mL/min",hd:"500 mg IV agora, depois qPM",hdPost:"A tabela usa dose qPM; não formula como dose suplementar pós-HD."},
meningitis:{label:"Meningite / fibrose cística",nonhd:v=>v>50?"2 g IV q8h":v>=26?"2 g IV q12h":v>=10?"1 g IV q12h":"1 g IV q24h",band:v=>v>50?">50 mL/min":v>=26?"26–50 mL/min":v>=10?"10–25 mL/min":"<10 mL/min",hd:"1 g IV agora, depois qPM",hdPost:"A tabela usa dose qPM; não formula como dose suplementar pós-HD."}}},
ciprofloxacin:{name:"Ciprofloxacino",indications:{
standard:{label:"Esquema padrão",nonhd:v=>v>=30?"400 mg IV q12h ou 500 mg VO 12/12h":"400 mg IV q24h ou 500 mg VO 1x/dia",band:v=>v>50?">50 mL/min (mesmo esquema de 30–50)":v>=30?"30–50 mL/min":"<30 mL/min",hd:"400 mg IV qPM ou 500 mg VO qPM",hdPost:"Sem dose suplementar pós-HD descrita; UCSF usa qPM."},
pseudo:{label:"Pseudomonas / bacteremia Gram-negativa / hardware estafilocócico",nonhd:v=>v>50?"400 mg IV q8h ou 750 mg VO 12/12h":v>=30?"400 mg IV q12h ou 500 mg VO 12/12h":"400 mg IV q24h ou 500 mg VO 1x/dia",band:v=>v>50?">50 mL/min":v>=30?"30–50 mL/min":"<30 mL/min",hd:"400 mg IV qPM ou 500 mg VO qPM",hdPost:"Sem dose suplementar pós-HD descrita; UCSF usa qPM."}}},
levofloxacin:{name:"Levofloxacino",indications:{
uti:{label:"Infecção urinária",nonhd:v=>v>50?"500 mg IV/VO q24h":v>=20?"500 mg x1, depois 250 mg IV/VO q24h":"500 mg x1, depois 250 mg IV/VO q48h",band:v=>v>50?">50 mL/min":v>=20?"20–49 mL/min":"<20 mL/min",hd:"500 mg x1, depois 250 mg IV/VO q48h",hdPost:"Sem dose suplementar pós-HD especificada."},
other:{label:"Outras / bacteremia Gram-negativa / pneumonia / Pseudomonas",nonhd:v=>v>50?"750 mg IV/VO q24h":v>=20?"750 mg IV/VO q48h":"750 mg x1, depois 500 mg IV/VO q48h",band:v=>v>50?">50 mL/min":v>=20?"20–49 mL/min":"<20 mL/min",hd:"750 mg x1, depois 500 mg IV/VO q48h",hdPost:"Sem dose suplementar pós-HD especificada."}}},
metronidazole:{name:"Metronidazol",indications:{
standard:{label:"Esquema padrão",nonhd:v=>v>10?"500 mg IV/VO q8h":"500 mg IV/VO q12h",band:v=>v>10?">10 mL/min":"<10 mL/min",hd:"500 mg IV/VO q8h",hdPost:"Sem dose suplementar pós-HD especificada."},
intraabdominal:{label:"Infecção intra-abdominal",nonhd:v=>"500 mg IV/VO q12h",band:v=>"Mesmo esquema em todas as faixas",hd:"500 mg IV/VO q12h",hdPost:"Sem dose suplementar pós-HD especificada."}}},
azithro:{name:"Azitromicina",indications:{
icu:{label:"PAC — UTI",nonhd:v=>"500 mg IV/VO q24h",band:v=>"Sem ajuste renal",hd:"500 mg IV/VO q24h",hdPost:"Sem ajuste para HD."},
nonicu:{label:"PAC — não UTI",nonhd:v=>"500 mg x1, depois 250 mg IV/VO q24h",band:v=>"Sem ajuste renal",hd:"500 mg x1, depois 250 mg IV/VO q24h",hdPost:"Sem ajuste para HD."}}},
clinda:{name:"Clindamicina",indications:{
simple:{label:"Infecção não complicada",nonhd:v=>"600 mg IV q8h ou 450 mg VO q8h",band:v=>"Sem ajuste renal",hd:"600 mg IV q8h ou 450 mg VO q8h",hdPost:"Sem ajuste para HD."},
nsti:{label:"Infecção necrosante / GAS / choque tóxico / DIP",nonhd:v=>"900 mg IV q8h",band:v=>"Sem ajuste renal",hd:"900 mg IV q8h",hdPost:"Sem ajuste para HD."}}},
linezolid:{name:"Linezolida",indications:{standard:{label:"Todas as indicações",nonhd:v=>"600 mg IV/VO q12h",band:v=>"Sem ajuste renal rotineiro",hd:"600 mg IV/VO q12h",hdPost:"Sem ajuste rotineiro para HD. Em curso >10 dias e CrCl <30, UCSF cita redução para 300 mg q12h após 72 h em alguns pacientes estáveis, idealmente com TDM."}}}
};

function setRenalVisibility(){const m=$("renalMethod").value;$("cysField").classList.toggle("hidden",m!=="ckdcr_cys");$("heightField").classList.toggle("hidden",m==="cg")}
function renderSteps(formula,steps){$("renalSteps").innerHTML=`<div class="step-line"><strong>Fórmula:</strong> ${esc(formula)}</div>`+steps.map(x=>`<div class="step-line">${esc(x)}</div>`).join("")}
function calculateRenal(){
const method=$("renalMethod").value,args={age:num("age"),sex:$("sex").value,scr:num("scr"),cys:num("cys"),weight:num("weight"),height:num("height")},out=$("renalResult");
try{
let r;if(method==="cg")r=calcCockcroft(args);else if(method==="ckdcr")r=calcCKDcr(args);else r=calcCKDcrCys(args);
renalState={method,indexed:r.indexed,drugValue:r.drugValue,bsa:r.bsa,label:method==="cg"?"CrCl Cockcroft–Gault":"eGFR desindexada"};
let html="",cls="ok";
if(method==="cg"){html=`<div class="big">${fmt(r.drugValue,1)} mL/min</div><strong>CrCl estimada por Cockcroft–Gault</strong>`}
else{html=`<div class="big">${fmt(r.indexed,1)} mL/min/1,73 m²</div><strong>eGFR indexada</strong><div class="subline">Categoria aproximada: ${renalClass(r.indexed)}</div>`;
if(r.drugValue!==null)html+=`<div class="subline"><strong>Para ajuste de fármacos:</strong> ${fmt(r.drugValue,1)} mL/min após desindexação pela SC (${fmt(r.bsa,2)} m²).</div>`;
else{cls="warn";html+=`<div class="warning-box">Informe peso e altura para desindexar a eGFR em mL/min, ou use função renal manual.</div>`}}
if($("unstableRenal").checked){cls="warn";html+=`<div class="warning-box"><strong>Função renal não estacionária:</strong> a estimativa pode não refletir a depuração atual durante LRA em evolução. Reavalie tendência, diurese, níveis terapêuticos e contexto clínico.</div>`}
out.className=`result ${cls}`;out.innerHTML=html;renderSteps(r.formula,r.steps)
}catch(err){renalState={method:null,indexed:null,drugValue:null,bsa:null,label:null};out.className="result warn";out.innerHTML=`<strong>${esc(err.message)}</strong>`;$("renalSteps").textContent="Corrija os dados e calcule novamente."}
}
function populateDrugs(){$("drugSelect").innerHTML=Object.entries(DRUGS).map(([id,d])=>`<option value="${id}">${esc(d.name)}</option>`).join("");populateIndications()}
function populateIndications(){const d=DRUGS[$("drugSelect").value];$("indicationSelect").innerHTML=Object.entries(d.indications).map(([id,x])=>`<option value="${id}">${esc(x.label)}</option>`).join("")}
function currentRenalForDose(){if($("renalSource").value==="manual"){const v=num("manualRenal");if(!(v>=0))throw new Error("Informe a função renal manual em mL/min.");return{value:v,label:"valor manual"}}if(!(renalState.drugValue>=0))throw new Error("Calcule uma função renal válida acima ou selecione entrada manual.");return{value:renalState.drugValue,label:renalState.label||"resultado calculado"}}
function calcDose(){
const drug=DRUGS[$("drugSelect").value],ind=drug.indications[$("indicationSelect").value],hd=$("onHD").checked,out=$("doseResult"),steps=$("doseSteps");
if(hd){out.className="result warn";out.innerHTML=`<strong>${esc(drug.name)}</strong><div class="big">${esc(ind.hd)}</div><div class="subline"><strong>HD:</strong> ${esc(ind.hdPost)}</div>`;steps.innerHTML=`<div class="step-line">1. HD intermitente marcada: usa-se a recomendação específica de HD.</div><div class="step-line">2. Esquema: ${esc(ind.hd)}.</div><div class="step-line">3. Pós-HD: ${esc(ind.hdPost)}</div>`;return}
try{const renal=currentRenalForDose(),dose=ind.nonhd(renal.value),band=ind.band(renal.value);let warn="";
if(renalState.method&&renalState.method!=="cg"&&$("renalSource").value==="calculated")warn=`<div class="warning-box">A tabela UCSF deste fármaco é apresentada em faixas de CrCl. Aqui foi usada eGFR desindexada (${fmt(renal.value,1)} mL/min) para selecionar a faixa. Confirme bula/protocolo local quando a decisão for crítica.</div>`;
out.className="result ok";out.innerHTML=`<strong>${esc(drug.name)} — ${esc(ind.label)}</strong><div class="big">${esc(dose)}</div><div class="subline">Função renal usada: ${fmt(renal.value,1)} mL/min (${esc(renal.label)}). Faixa: ${esc(band)}.</div>${warn}`;
steps.innerHTML=`<div class="step-line">1. Função renal usada: ${fmt(renal.value,1)} mL/min (${esc(renal.label)}).</div><div class="step-line">2. Faixa da tabela: ${esc(band)}.</div><div class="step-line">3. Esquema correspondente: ${esc(dose)}.</div><div class="step-line">4. HD não marcada: não foi aplicada regra dialítica.</div>`
}catch(err){out.className="result warn";out.innerHTML=`<strong>${esc(err.message)}</strong>`;steps.textContent="Defina a função renal e tente novamente."}
}
function syncManualVisibility(){$("manualRenalWrap").classList.toggle("hidden",$("renalSource").value!=="manual")}
function clearRenal(){["age","scr","cys","weight","height"].forEach(id=>$(id).value="");$("unstableRenal").checked=false;renalState={method:null,indexed:null,drugValue:null,bsa:null,label:null};$("renalResult").className="result muted";$("renalResult").textContent="Preencha os dados e calcule.";$("renalSteps").textContent="O passo a passo aparecerá após o cálculo."}
function setup(){setRenalVisibility();populateDrugs();syncManualVisibility();$("renalMethod").addEventListener("change",setRenalVisibility);$("calcRenalBtn").addEventListener("click",calculateRenal);$("clearRenalBtn").addEventListener("click",clearRenal);$("drugSelect").addEventListener("change",populateIndications);$("renalSource").addEventListener("change",syncManualVisibility);$("calcDoseBtn").addEventListener("click",calcDose)}
if(typeof document!=="undefined")document.addEventListener("DOMContentLoaded",setup);
if(typeof module!=="undefined"&&module.exports)module.exports={bsaDuBois,calcCockcroft,calcCKDcr,calcCKDcrCys,DRUGS};


/* Integração MinhaUTI: pré-preenche dados do leito ativo enviados pelo Main. */
(function(){
  let lastBed=null;
  function setIfAvailable(id,value,force){
    const el=document.getElementById(id);
    if(!el || value===undefined || value===null || value==='') return;
    if(force || !String(el.value||'').trim()){
      el.value=String(value);
      el.dispatchEvent(new Event('input',{bubbles:true}));
      el.dispatchEvent(new Event('change',{bubbles:true}));
    }
  }
  window.addEventListener('message',function(ev){
    const d=ev.data;
    if(!d || d.type!=='minhauti-bed-context') return;
    const bed=Number(d.bed||0)||null;
    const changed=lastBed!==null && bed!==lastBed;
    lastBed=bed;
    setIfAvailable('age',d.age,changed);
    setIfAvailable('weight',d.weight,changed);
    setIfAvailable('sex',d.sex,changed);
    setIfAvailable('scr',d.creatinine,changed);
  });
})();
