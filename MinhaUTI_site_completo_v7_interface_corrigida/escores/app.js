"use strict";

const STORAGE_BEDS="uti_portatil_v7";
const STORAGE_ACTIVE="minhauti_active_bed_v1";
const STORAGE_CONTEXT="minhauti_score_context_v1";

const SOURCES={
  news2:{label:"Royal College of Physicians — NEWS2",url:"https://www.rcp.ac.uk/resources/national-early-warning-score-news-2/"},
  sepsis3:{label:"Singer et al. — Sepsis-3 (JAMA, 2016)",url:"https://pubmed.ncbi.nlm.nih.gov/26903338/"},
  sofa:{label:"Vincent et al. — SOFA (Intensive Care Med, 1996)",url:"https://pubmed.ncbi.nlm.nih.gov/8844239/"},
  curb65:{label:"Lim et al. — CURB-65 (Thorax, 2003)",url:"https://pubmed.ncbi.nlm.nih.gov/12728155/"},
  spesi:{label:"Jiménez et al. — sPESI (Arch Intern Med, 2010)",url:"https://pubmed.ncbi.nlm.nih.gov/20696966/"},
  wellsPe:{label:"Wells et al. — modelo clínico para TEP (Ann Intern Med, 1998)",url:"https://pubmed.ncbi.nlm.nih.gov/9867786/"},
  heart:{label:"Six et al. — HEART (Neth Heart J, 2008)",url:"https://pubmed.ncbi.nlm.nih.gov/18665203/"},
  timi:{label:"Antman et al. — TIMI UA/NSTEMI (JAMA, 2000)",url:"https://pubmed.ncbi.nlm.nih.gov/10938172/"},
  bisap:{label:"Wu et al. — BISAP (Gut, 2008)",url:"https://pubmed.ncbi.nlm.nih.gov/18519429/"},
  perc:{label:"Kline et al. — avaliação multicêntrica PERC (J Thromb Haemost, 2008)",url:"https://pubmed.ncbi.nlm.nih.gov/18318689/"},
  gcs:{label:"Teasdale & Jennett — Glasgow Coma Scale (Lancet, 1974)",url:"https://pubmed.ncbi.nlm.nih.gov/4136544/"},
  sirs:{label:"Bone et al. — consenso ACCP/SCCM sobre SIRS (1992)",url:"https://pubmed.ncbi.nlm.nih.gov/1303622/"}
};

const CATALOG=[
  {id:"news2",name:"NEWS2",area:"Emergência / enfermaria",description:"Deterioração clínica aguda por sinais vitais.",keywords:["news","news2","deterioracao","sinais vitais","emergencia","sepse","pneumonia","dispneia","hipoxemia"],source:"news2"},
  {id:"qsofa",name:"qSOFA",area:"Sepse",description:"Rastreio prognóstico rápido em suspeita de infecção.",keywords:["qsofa","sepse","sepsis","infeccao","choque septico","rr","pressao","glasgow"],source:"sepsis3"},
  {id:"sofa",name:"SOFA",area:"UTI / sepse",description:"Disfunção orgânica em seis sistemas.",keywords:["sofa","sepse","sepsis","uti","falencia organica","disfuncao organica","choque","dva","p/f","plaquetas","bilirrubina","creatinina"],source:"sofa"},
  {id:"curb65",name:"CURB-65",area:"Pneumonia",description:"Estratificação de gravidade na pneumonia adquirida na comunidade.",keywords:["curb","curb65","pneumonia","pac","infeccao respiratoria"],source:"curb65"},
  {id:"spesi",name:"sPESI",area:"TEP",description:"Prognóstico de 30 dias após TEP confirmado.",keywords:["spesi","pesi","tep","embolia pulmonar","tromboembolismo pulmonar"],source:"spesi"},
  {id:"wells_pe",name:"Wells para TEP",area:"TEP",description:"Probabilidade clínica pré-teste de embolia pulmonar.",keywords:["wells","tep","embolia pulmonar","tromboembolismo pulmonar","dispneia","hemoptise"],source:"wellsPe"},
  {id:"perc",name:"PERC",area:"TEP",description:"Regra de exclusão de TEP somente em paciente de baixa probabilidade pré-teste.",keywords:["perc","tep","embolia pulmonar","tromboembolismo pulmonar","baixissimo risco"],source:"perc"},
  {id:"heart",name:"HEART",area:"Dor torácica",description:"Estratificação inicial de dor torácica / suspeita de SCA.",keywords:["heart","dor toracica","sca","sindrome coronariana","iam","infarto","troponina","ecg"],source:"heart"},
  {id:"timi_nstemi",name:"TIMI UA/NSTEMI",area:"SCA",description:"Risco isquêmico em angina instável / NSTEMI.",keywords:["timi","nstemi","iam","sca","angina instavel","sindrome coronariana"],source:"timi"},
  {id:"bisap",name:"BISAP",area:"Pancreatite",description:"Estratificação precoce de gravidade na pancreatite aguda.",keywords:["bisap","pancreatite","pancreatite aguda","bun","derrame pleural"],source:"bisap"},
  {id:"gcs",name:"Glasgow (GCS)",area:"Neurológico",description:"Nível de consciência por abertura ocular, resposta verbal e motora.",keywords:["glasgow","gcs","coma","neurologico","trauma craniano","tce","consciencia"],source:"gcs"},
  {id:"sirs",name:"SIRS",area:"Inflamação sistêmica",description:"Critérios clássicos de resposta inflamatória sistêmica.",keywords:["sirs","sepse","inflamacao","infeccao","temperatura","leucocitos"],source:"sirs"}
];

const byId=id=>CATALOG.find(x=>x.id===id);
const $=id=>document.getElementById(id);

function normalizeText(s){
  return String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
}
function n(v){
  if(v===null||v===undefined||v==="")return null;
  const x=Number(v);
  return Number.isFinite(x)?x:null;
}
function yes(v){return v===true||v==="true"||v==="1"||v===1||v==="on";}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}

function readLocalContext(){
  if(typeof localStorage==="undefined")return {active:1,bed:{},ctx:{}};
  let beds={},ctx={};
  try{beds=JSON.parse(localStorage.getItem(STORAGE_BEDS)||"{}")||{};}catch{}
  try{ctx=JSON.parse(localStorage.getItem(STORAGE_CONTEXT)||"{}")||{};}catch{}
  const active=Number(localStorage.getItem(STORAGE_ACTIVE)||ctx.bed||1)||1;
  return {active,bed:beds[active]||{},ctx};
}

function calcDvaFromBed(d){
  const weight=n(d.weight);
  function weighted(prefix,amountKey,factor=1000){
    const amp=n(d[prefix+"_ampoules"]),amount=n(d[amountKey]),vol=n(d[prefix+"_volume"]),rate=n(d[prefix+"_rate"]);
    if(!(amp>0&&amount>0&&vol>0&&rate>0&&weight>0))return null;
    return ((amp*amount*factor/vol)*rate/60)/weight;
  }
  return {
    norepi:weighted("norepi","norepi_mg_ampoule"),
    epi:weighted("adren","adren_mg_ampoule"),
    dobut:weighted("dobut","dobut_mg_ampoule")
  };
}

function bedPrefill(scoreId,bed){
  const d=bed||{};
  const oxygen=!!d.resp_support && !["spontaneous","trach_aa"].includes(d.resp_support);
  const ventSupport=["vni","iot","trach"].includes(d.resp_support);
  const dva=calcDvaFromBed(d);
  const common={
    age:n(d.age),rr:n(d.rr),spo2:n(d.spo2),sbp:n(d.sbp),dbp:n(d.dbp),hr:n(d.hr),
    gcs:n(d.gcs),map:n(d.map),platelets:n(d.platelets_now),bilirubin:n(d.bilirubin_now),
    creatinine:n(d.creatinine_now),urea:n(d.urea_now),wbc:n(d.wbc_now),
    pf:n(d.abg_pf),pao2:n(d.abg_pao2),fio2:n(d.fio2),paco2:n(d.abg_paco2),
    oxygen,ventSupport,norepi:dva.norepi,epi:dva.epi,dobut:dva.dobut
  };
  if(common.map===null&&common.sbp!==null&&common.dbp!==null)common.map=(common.sbp+2*common.dbp)/3;

  const hours=n(d.urine_hours),volume=n(d.urine_volume);
  common.urine24=(hours===24&&volume!==null)?volume:null;
  common.temp=n(d.fever_temp);

  const map={
    news2:{rr:common.rr,spo2:common.spo2,o2:common.oxygen,temp:common.temp,sbp:common.sbp,hr:common.hr,conscious:common.gcs!==null&&common.gcs<15},
    qsofa:{rr:common.rr,sbp:common.sbp,altered:common.gcs!==null&&common.gcs<15},
    sofa:{pf:common.pf,resp_support:common.ventSupport,platelets:common.platelets,bilirubin:common.bilirubin,map:common.map,norepi:common.norepi,epi:common.epi,dobut:common.dobut,gcs:common.gcs,creatinine:common.creatinine,urine24:common.urine24},
    curb65:{age:common.age,rr:common.rr,sbp:common.sbp,dbp:common.dbp,urea:common.urea,confusion:common.gcs!==null&&common.gcs<15},
    spesi:{age:common.age,hr:common.hr,sbp:common.sbp,spo2:common.spo2},
    wells_pe:{hr:common.hr},
    perc:{age:common.age,hr:common.hr,spo2:common.spo2},
    heart:{age:common.age},
    timi_nstemi:{age65:common.age!==null&&common.age>=65},
    bisap:{age:common.age,altered:common.gcs!==null&&common.gcs<15},
    sirs:{temp:common.temp,hr:common.hr,rr:common.rr,paco2:common.paco2,wbc:common.wbc}
  };
  return map[scoreId]||{};
}


function sourceBox(sourceKey){
  const s=SOURCES[sourceKey];
  if(!s)return "";
  return `<div class="source-box"><strong>Fonte:</strong> <a href="${s.url}" target="_blank" rel="noopener">${esc(s.label)}</a>. O escore é ferramenta de apoio e deve ser aplicado apenas à população/contexto para o qual foi validado.</div>`;
}

function inputField(name,label,type="number",opts={}){
  const attrs=[
    `data-field="${name}"`,
    `type="${type}"`,
    opts.step!==undefined?`step="${opts.step}"`:"",
    opts.min!==undefined?`min="${opts.min}"`:"",
    opts.max!==undefined?`max="${opts.max}"`:"",
    opts.placeholder?`placeholder="${esc(opts.placeholder)}"`:""
  ].filter(Boolean).join(" ");
  const help=opts.help?`<small class="field-help">${opts.help}</small>`:"";
  return `<label class="field ${opts.className||""}">${esc(label)}<input ${attrs}>${help}</label>`;
}
function selectField(name,label,options,opts={}){
  return `<label class="field ${opts.className||""}">${esc(label)}<select data-field="${name}">${options.map(([v,l])=>`<option value="${esc(v)}">${esc(l)}</option>`).join("")}</select></label>`;
}
function checkField(name,label,opts={}){
  const help=opts.help?`<small class="field-help check-help">${opts.help}</small>`:"";
  return `<label class="check-field ${opts.className||""}"><input data-field="${name}" type="checkbox"><span>${esc(label)}${help}</span></label>`;
}

function scoreTemplate(id){
  switch(id){
    case "news2": return `
      ${inputField("rr","Frequência respiratória (irpm)")}
      ${inputField("spo2","SpO₂ (%)")}
      ${checkField("o2","Oxigênio suplementar em uso")}
      ${inputField("temp","Temperatura (°C)","number",{step:"0.1"})}
      ${inputField("sbp","PAS (mmHg)")}
      ${inputField("hr","Frequência cardíaca (bpm)")}
      ${checkField("conscious","Confusão nova / não alerta (C/V/P/U)")}
      <div class="prefill-note span-all">Nesta versão, o NEWS2 usa a <strong>Escala de SpO₂ 1</strong>. A Escala 2 é reservada a situações específicas de insuficiência respiratória hipercápnica documentada e não é aplicada automaticamente.</div>`;
    case "qsofa": return `
      ${inputField("rr","Frequência respiratória (irpm)")}
      ${inputField("sbp","PAS (mmHg)")}
      ${checkField("altered","Alteração do estado mental / Glasgow <15")}`;
    case "sofa": return `
      ${inputField("pf","PaO₂/FiO₂")}
      ${checkField("resp_support","Suporte respiratório (VM/VNI)",{className:""})}
      ${inputField("platelets","Plaquetas (×10³/mm³)")}
      ${inputField("bilirubin","Bilirrubina (mg/dL)","number",{step:"0.1"})}
      ${inputField("map","PAM (mmHg)","number",{step:"0.1"})}
      ${inputField("dopamine","Dopamina (mcg/kg/min)","number",{step:"0.01"})}
      ${inputField("dobut","Dobutamina (mcg/kg/min)","number",{step:"0.01"})}
      ${inputField("epi","Adrenalina (mcg/kg/min)","number",{step:"0.001"})}
      ${inputField("norepi","Noradrenalina (mcg/kg/min)","number",{step:"0.001"})}
      ${inputField("gcs","Glasgow","number",{min:3,max:15})}
      ${inputField("creatinine","Creatinina (mg/dL)","number",{step:"0.1"})}
      ${inputField("urine24","Diurese em 24 h (mL)")}
      <div class="prefill-note span-all">O SOFA usa o pior grau de disfunção de cada sistema. Vasopressina não faz parte do componente cardiovascular do SOFA original. Se creatinina e diurese estiverem preenchidas, prevalece o critério de maior pontuação.</div>`;
    case "curb65": return `
      ${checkField("confusion","Confusão mental")}
      ${inputField("urea","Ureia (mg/dL)","number",{step:"0.1"})}
      ${inputField("rr","FR (irpm)")}
      ${inputField("sbp","PAS (mmHg)")}
      ${inputField("dbp","PAD (mmHg)")}
      ${inputField("age","Idade (anos)")}
      <div class="prefill-note span-all">O critério original usa ureia &gt;7 mmol/L; aqui é apresentada ureia em mg/dL, equivalente aproximadamente a &gt;42 mg/dL.</div>`;
    case "spesi": return `
      ${inputField("age","Idade (anos)")}
      ${checkField("cancer","Câncer ativo")}
      ${checkField("cardiopulm","Doença cardiopulmonar crônica")}
      ${inputField("hr","FC (bpm)")}
      ${inputField("sbp","PAS (mmHg)")}
      ${inputField("spo2","SpO₂ (%)")}`;
    case "wells_pe": return `
      ${checkField("dvt_signs","Sinais clínicos de TVP")}
      ${checkField("pe_more_likely","TEP mais provável que diagnóstico alternativo")}
      ${inputField("hr","FC (bpm)")}
      ${checkField("immob_surgery","Imobilização ≥3 dias ou cirurgia nas últimas 4 semanas")}
      ${checkField("prior_vte","TEP/TVP prévio")}
      ${checkField("hemoptysis","Hemoptise")}
      ${checkField("malignancy","Neoplasia ativa / tratamento recente")}`;
    case "perc": return `
      ${checkField("low_pretest","Probabilidade clínica pré-teste baixa — condição obrigatória para aplicar PERC")}
      ${inputField("age","Idade (anos)")}
      ${inputField("hr","FC (bpm)")}
      ${inputField("spo2","SpO₂ (%)")}
      ${checkField("unilateral_swelling","Edema unilateral de membro inferior")}
      ${checkField("hemoptysis","Hemoptise")}
      ${checkField("recent_trauma_surgery","Cirurgia/trauma recente com hospitalização")}
      ${checkField("prior_vte","TEP/TVP prévio")}
      ${checkField("estrogen","Uso de estrogênio")}`;
    case "heart": return `
      ${selectField("history","História clínica",[["0","Pouco suspeita (0)"],["1","Moderadamente suspeita (1)"],["2","Altamente suspeita (2)"]])}
      ${selectField("ecg","ECG",[["0","Normal (0)"],["1","Distúrbio de repolarização inespecífico (1)"],["2","Depressão significativa de ST (2)"]])}
      ${inputField("age","Idade (anos)")}
      ${inputField("risk_count","Número de fatores de risco coronariano","number",{
        min:0,max:6,
        help:"Conte: hipertensão arterial, hipercolesterolemia, diabetes mellitus, tabagismo, história familiar de doença arterial coronariana/aterosclerótica e obesidade (IMC &gt;30 kg/m²)."
      })}
      ${checkField("known_athero","Doença aterosclerótica conhecida",{
        help:"No HEART, doença aterosclerótica conhecida é considerada separadamente e leva o componente de fatores de risco à pontuação máxima (2 pontos)."
      })}
      ${inputField("troponin_ratio","Troponina / limite superior da normalidade","number",{step:"0.1",placeholder:"Ex.: 2,5"})}`;
    case "timi_nstemi": return `
      ${checkField("age65","Idade ≥65 anos")}
      ${checkField("risk3","≥3 fatores de risco para DAC",{
        help:"Fatores considerados pelo TIMI: diabetes mellitus, hipertensão arterial, hipercolesterolemia, tabagismo atual e história familiar de doença arterial coronariana. Marque quando pelo menos 3 estiverem presentes."
      })}
      ${checkField("known_cad","DAC conhecida com estenose ≥50%")}
      ${checkField("asa7","Uso de AAS nos últimos 7 dias")}
      ${checkField("angina2","≥2 episódios de angina nas últimas 24 h")}
      ${checkField("st_dev","Desvio de ST ≥0,5 mm")}
      ${checkField("markers","Marcadores cardíacos elevados")}`;
    case "bisap": return `
      ${inputField("bun","BUN (mg/dL)","number",{step:"0.1"})}
      ${checkField("altered","Alteração do estado mental")}
      ${checkField("sirs","SIRS ≥2 critérios")}
      ${inputField("age","Idade (anos)")}
      ${checkField("pleural_effusion","Derrame pleural em imagem")}
      <div class="prefill-note span-all">BISAP usa <strong>BUN &gt;25 mg/dL</strong>, não ureia total. Se você dispõe apenas de ureia, não substitua automaticamente sem conversão adequada.</div>`;
    case "gcs": return `
      ${selectField("eye","Abertura ocular",[["4","Espontânea (4)"],["3","Ao som (3)"],["2","À pressão/dor (2)"],["1","Nenhuma (1)"]])}
      ${selectField("verbal","Resposta verbal",[["5","Orientada (5)"],["4","Confusa (4)"],["3","Palavras (3)"],["2","Sons (2)"],["1","Nenhuma (1)"]])}
      ${selectField("motor","Resposta motora",[["6","Obedece comandos (6)"],["5","Localiza estímulo (5)"],["4","Flexão normal/retirada (4)"],["3","Flexão anormal (3)"],["2","Extensão (2)"],["1","Nenhuma (1)"]])}
      <div class="prefill-note span-all">Documente preferencialmente os componentes (E/V/M), especialmente quando alguma resposta não puder ser testada por intubação, sedação ou outro impedimento.</div>`;
    case "sirs": return `
      ${inputField("temp","Temperatura (°C)","number",{step:"0.1"})}
      ${inputField("hr","FC (bpm)")}
      ${inputField("rr","FR (irpm)")}
      ${inputField("paco2","PaCO₂ (mmHg)","number",{step:"0.1"})}
      ${inputField("wbc","Leucócitos (/mm³)")}
      ${inputField("bands","Bastões (%)","number",{step:"0.1"})}
      <div class="prefill-note span-all">SIRS é uma definição histórica de resposta inflamatória sistêmica. <strong>Não deve ser usado isoladamente para diagnosticar sepse</strong>.</div>`;
    default:return "";
  }
}

function getFormValues(container){
  const out={};
  container.querySelectorAll("[data-field]").forEach(el=>{
    out[el.dataset.field]=el.type==="checkbox"?el.checked:el.value;
  });
  return out;
}

function missingNumbers(v,names){
  return names.filter(k=>n(v[k])===null);
}

function calcNEWS2(v){
  const missing=missingNumbers(v,["rr","spo2","temp","sbp","hr"]);
  if(missing.length)return {error:"Preencha todos os sinais vitais do NEWS2."};
  const rr=n(v.rr),sp=n(v.spo2),t=n(v.temp),sbp=n(v.sbp),hr=n(v.hr);
  let score=0,components=[];
  const rrPts=rr<=8?3:rr<=11?1:rr<=20?0:rr<=24?2:3;
  const spPts=sp<=91?3:sp<=93?2:sp<=95?1:0;
  const o2Pts=yes(v.o2)?2:0;
  const tPts=t<=35?3:t<=36?1:t<=38?0:t<=39?1:2;
  const sbpPts=sbp<=90?3:sbp<=100?2:sbp<=110?1:sbp<=219?0:3;
  const hrPts=hr<=40?3:hr<=50?1:hr<=90?0:hr<=110?1:hr<=130?2:3;
  const cPts=yes(v.conscious)?3:0;
  score=rrPts+spPts+o2Pts+tPts+sbpPts+hrPts+cPts;
  components.push(`FR ${rrPts}`,`SpO₂ ${spPts}`,`O₂ ${o2Pts}`,`T ${tPts}`,`PAS ${sbpPts}`,`FC ${hrPts}`,`Consciência ${cPts}`);
  let cls="ok",interpret="Faixa baixa.";
  if(score>=7){cls="danger";interpret="Faixa alta de risco clínico pelo NEWS2.";}
  else if(score>=5){cls="warn";interpret="Faixa intermediária pelo NEWS2.";}
  else if([rrPts,spPts,tPts,sbpPts,hrPts,cPts].some(x=>x===3)){cls="warn";interpret="Total baixo, porém há parâmetro individual com 3 pontos.";}
  return {score,cls,interpret,components};
}
function calcQSOFA(v){
  const missing=missingNumbers(v,["rr","sbp"]);
  if(missing.length)return {error:"Preencha FR e PAS."};
  const pts=[n(v.rr)>=22,n(v.sbp)<=100,yes(v.altered)].map(Boolean);
  const score=pts.filter(Boolean).length;
  return {score,cls:score>=2?"warn":"ok",interpret:score>=2?"qSOFA ≥2: maior risco de desfechos desfavoráveis em paciente com suspeita de infecção; não é diagnóstico de sepse.":"qSOFA <2. Um valor baixo não exclui sepse.",components:[`FR≥22 ${pts[0]?1:0}`,`PAS≤100 ${pts[1]?1:0}`,`Alteração mental ${pts[2]?1:0}`]};
}
function calcSOFA(v){
  const vals=["pf","platelets","bilirubin","gcs","creatinine"];
  const missing=missingNumbers(v,vals);
  const hasUrine=n(v.urine24)!==null;
  if(missing.length && !(missing.length===1&&missing[0]==="creatinine"&&hasUrine))return {error:"Preencha P/F, plaquetas, bilirrubina, Glasgow e creatinina (ou diurese de 24 h)."};
  const pf=n(v.pf),plt=n(v.platelets),bil=n(v.bilirubin),map=n(v.map),gcs=n(v.gcs),cr=n(v.creatinine),ur=n(v.urine24);
  let resp=0;
  if(pf<100&&yes(v.resp_support))resp=4;
  else if(pf<200&&yes(v.resp_support))resp=3;
  else if(pf<300)resp=2;
  else if(pf<400)resp=1;
  let coag=plt<20?4:plt<50?3:plt<100?2:plt<150?1:0;
  let liver=bil>=12?4:bil>=6?3:bil>=2?2:bil>=1.2?1:0;
  const dopamine=n(v.dopamine)||0,dobut=n(v.dobut)||0,epi=n(v.epi)||0,norepi=n(v.norepi)||0;
  let cv=0;
  if(dopamine>15||epi>0.1||norepi>0.1)cv=4;
  else if(dopamine>5||epi>0||norepi>0)cv=3;
  else if((dopamine>0&&dopamine<=5)||dobut>0)cv=2;
  else if(map!==null&&map<70)cv=1;
  let cns=gcs<6?4:gcs<=9?3:gcs<=12?2:gcs<=14?1:0;
  let renalCr=cr===null?0:cr>=5?4:cr>=3.5?3:cr>=2?2:cr>=1.2?1:0;
  let renalUr=ur===null?0:ur<200?4:ur<500?3:0;
  let renal=Math.max(renalCr,renalUr);
  const score=resp+coag+liver+cv+cns+renal;
  return {score,cls:score>=10?"danger":score>=6?"warn":"ok",interpret:"SOFA descreve intensidade de disfunção orgânica; a tendência seriada também é clinicamente relevante.",components:[`Respiratório ${resp}`,`Coagulação ${coag}`,`Fígado ${liver}`,`Cardiovascular ${cv}`,`SNC ${cns}`,`Renal ${renal}`]};
}
function calcCURB65(v){
  const missing=missingNumbers(v,["urea","rr","sbp","dbp","age"]);
  if(missing.length)return {error:"Preencha ureia, FR, PAS, PAD e idade."};
  const criteria=[
    yes(v.confusion),
    n(v.urea)>42,
    n(v.rr)>=30,
    n(v.sbp)<90||n(v.dbp)<=60,
    n(v.age)>=65
  ];
  const score=criteria.filter(Boolean).length;
  let cls="ok",interpret="Baixa pontuação.";
  if(score===2){cls="warn";interpret="Pontuação intermediária: exige avaliação clínica cuidadosa da gravidade e do local de tratamento.";}
  if(score>=3){cls="danger";interpret="Pontuação alta: pneumonia potencialmente grave; considerar avaliação para manejo hospitalar/intensivo conforme o contexto.";}
  return {score,cls,interpret,components:["Confusão","Ureia >42","FR ≥30","PA baixa","Idade ≥65"].map((x,i)=>`${x} ${criteria[i]?1:0}`)};
}
function calcSPESI(v){
  const missing=missingNumbers(v,["age","hr","sbp","spo2"]);
  if(missing.length)return {error:"Preencha idade, FC, PAS e SpO₂."};
  const criteria=[n(v.age)>80,yes(v.cancer),yes(v.cardiopulm),n(v.hr)>=110,n(v.sbp)<100,n(v.spo2)<90];
  const score=criteria.filter(Boolean).length;
  return {score,cls:score===0?"ok":"warn",interpret:score===0?"sPESI = 0: categoria de baixo risco pelo modelo, em paciente com TEP agudo confirmado.":"sPESI ≥1: não pertence à categoria de baixo risco pelo modelo.",components:["Idade >80","Câncer","Doença cardiopulmonar","FC ≥110","PAS <100","SpO₂ <90"].map((x,i)=>`${x} ${criteria[i]?1:0}`)};
}
function calcWellsPE(v){
  if(n(v.hr)===null)return {error:"Preencha a frequência cardíaca."};
  let score=0,components=[];
  const add=(cond,pts,label)=>{if(cond)score+=pts;components.push(`${label} ${cond?`+${pts}`:"+0"}`);};
  add(yes(v.dvt_signs),3,"Sinais de TVP");
  add(yes(v.pe_more_likely),3,"TEP mais provável");
  add(n(v.hr)>100,1.5,"FC >100");
  add(yes(v.immob_surgery),1.5,"Imobilização/cirurgia");
  add(yes(v.prior_vte),1.5,"TEP/TVP prévio");
  add(yes(v.hemoptysis),1,"Hemoptise");
  add(yes(v.malignancy),1,"Neoplasia");
  return {score,cls:score>4?"warn":"ok",interpret:score>4?"Modelo de 2 níveis: TEP clinicamente provável (>4).":"Modelo de 2 níveis: TEP clinicamente improvável (≤4). A investigação subsequente depende do contexto e do D-dímero/imagem.",components};
}
function calcPERC(v){
  if(!yes(v.low_pretest))return {error:"PERC só deve ser aplicado quando o médico já considera a probabilidade clínica pré-teste baixa."};
  const missing=missingNumbers(v,["age","hr","spo2"]);
  if(missing.length)return {error:"Preencha idade, FC e SpO₂."};
  const positive=[
    n(v.age)>=50,n(v.hr)>=100,n(v.spo2)<95,yes(v.unilateral_swelling),
    yes(v.hemoptysis),yes(v.recent_trauma_surgery),yes(v.prior_vte),yes(v.estrogen)
  ];
  const score=positive.filter(Boolean).length;
  return {score,cls:score===0?"ok":"warn",interpret:score===0?"PERC negativo (0 critérios) no contexto explicitamente marcado como baixa probabilidade pré-teste.":"PERC positivo: a regra não permite excluir TEP sem investigação adicional.",components:["Idade ≥50","FC ≥100","SpO₂ <95","Edema unilateral","Hemoptise","Trauma/cirurgia recente","TEP/TVP prévio","Estrogênio"].map((x,i)=>`${x} ${positive[i]?1:0}`)};
}
function calcHEART(v){
  const age=n(v.age),risk=n(v.risk_count),tr=n(v.troponin_ratio);
  if(age===null||risk===null||tr===null)return {error:"Preencha idade, número de fatores de risco e razão da troponina pelo limite superior da normalidade."};
  const history=Number(v.history)||0,ecg=Number(v.ecg)||0;
  const agePts=age>=65?2:age>=45?1:0;
  const riskPts=yes(v.known_athero)||risk>=3?2:risk>=1?1:0;
  const tropPts=tr>3?2:tr>1?1:0;
  const score=history+ecg+agePts+riskPts+tropPts;
  return {score,cls:score>=7?"danger":score>=4?"warn":"ok",interpret:score<=3?"Faixa HEART baixa.":score<=6?"Faixa HEART intermediária.":"Faixa HEART alta.",components:[`História ${history}`,`ECG ${ecg}`,`Idade ${agePts}`,`Risco ${riskPts}`,`Troponina ${tropPts}`]};
}
function calcTIMI(v){
  const fields=["age65","risk3","known_cad","asa7","angina2","st_dev","markers"];
  const score=fields.filter(k=>yes(v[k])).length;
  const risks={0:"4,7%",1:"4,7%",2:"8,3%",3:"13,2%",4:"19,9%",5:"26,2%",6:"40,9%",7:"40,9%"};
  return {score,cls:score>=5?"danger":score>=3?"warn":"ok",interpret:`No estudo original de UA/NSTEMI, essa pontuação correspondeu a aproximadamente ${risks[score]} de eventos combinados em 14 dias.`,components:fields.map((k,i)=>`${["Idade≥65","≥3 fatores","DAC≥50%","AAS 7d","≥2 anginas","ST","Marcadores"][i]} ${yes(v[k])?1:0}`)};
}
function calcBISAP(v){
  if(n(v.bun)===null||n(v.age)===null)return {error:"Preencha BUN e idade."};
  const criteria=[n(v.bun)>25,yes(v.altered),yes(v.sirs),n(v.age)>60,yes(v.pleural_effusion)];
  const score=criteria.filter(Boolean).length;
  return {score,cls:score>=3?"danger":score===2?"warn":"ok",interpret:score>=3?"BISAP ≥3 identifica grupo de maior risco na pancreatite aguda.":"BISAP baixo; interpretar junto à evolução clínica e demais marcadores de gravidade.",components:["BUN >25","Estado mental","SIRS","Idade >60","Derrame pleural"].map((x,i)=>`${x} ${criteria[i]?1:0}`)};
}
function calcGCS(v){
  const e=Number(v.eye),ve=Number(v.verbal),m=Number(v.motor);
  const score=e+ve+m;
  return {score,cls:score<=8?"danger":score<=12?"warn":"ok",interpret:`Glasgow ${score} = E${e} V${ve} M${m}. Registre os componentes, não apenas o total.`,components:[`E${e}`,`V${ve}`,`M${m}`]};
}
function calcSIRS(v){
  const temp=n(v.temp),hr=n(v.hr),rr=n(v.rr),paco2=n(v.paco2),wbc=n(v.wbc),bands=n(v.bands);
  if(temp===null||hr===null||rr===null||wbc===null)return {error:"Preencha temperatura, FC, FR e leucócitos. PaCO₂ e bastões são opcionais quando disponíveis."};
  const criteria=[
    temp>38||temp<36,
    hr>90,
    rr>20||(paco2!==null&&paco2<32),
    wbc>12000||wbc<4000||(bands!==null&&bands>10)
  ];
  const score=criteria.filter(Boolean).length;
  return {score,cls:score>=2?"warn":"ok",interpret:score>=2?"Preenche ≥2 critérios clássicos de SIRS. Isso não equivale, isoladamente, a diagnóstico de sepse.":"Menos de 2 critérios clássicos de SIRS.",components:["Temperatura","FC","FR/PaCO₂","Leucócitos/bastões"].map((x,i)=>`${x} ${criteria[i]?1:0}`)};
}

const CALCULATORS={
  news2:calcNEWS2,qsofa:calcQSOFA,sofa:calcSOFA,curb65:calcCURB65,spesi:calcSPESI,
  wells_pe:calcWellsPE,perc:calcPERC,heart:calcHEART,timi_nstemi:calcTIMI,bisap:calcBISAP,
  gcs:calcGCS,sirs:calcSIRS
};

let selectedId=null;
let localCtx=readLocalContext();
let autocompleteIndex=-1;

function applyPrefill(container,prefill){
  const applied=[];
  for(const [key,val] of Object.entries(prefill||{})){
    if(val===null||val===undefined)continue;
    const el=container.querySelector(`[data-field="${CSS.escape(key)}"]`);
    if(!el)continue;
    if(el.type==="checkbox")el.checked=!!val;
    else el.value=val;
    applied.push(key);
  }
  return applied;
}

function renderScore(id){
  const meta=byId(id);
  if(!meta)return;
  selectedId=id;
  $("emptyCalculator").classList.add("hidden");
  const content=$("calculatorContent");
  content.classList.remove("hidden");
  const prefill=bedPrefill(id,localCtx.bed);
  content.innerHTML=`
    <div class="score-head">
      <div>
        <h2>${esc(meta.name)}</h2>
        <p>${esc(meta.description)}</p>
        <div class="score-meta"><span class="meta-pill">${esc(meta.area)}</span><span class="meta-pill">Cálculo local</span></div>
      </div>
      <button type="button" class="ghost" id="closeCalcBtn">Fechar</button>
    </div>
    <div id="prefillMessage" class="prefill-note hidden"></div>
    <div class="score-form" id="activeScoreForm">${scoreTemplate(id)}</div>
    <div class="calc-actions">
      <button type="button" class="primary" id="runCalcBtn">Calcular ${esc(meta.name)}</button>
      <button type="button" class="secondary" id="clearCalcBtn">Limpar</button>
    </div>
    <div id="activeScoreResult" class="result muted">Preencha os campos e clique em calcular.</div>
    ${sourceBox(meta.source)}
  `;
  const form=$("activeScoreForm");
  const applied=applyPrefill(form,prefill)||[];
  if(applied.length){
    const msg=$("prefillMessage");
    msg.classList.remove("hidden");
    msg.innerHTML=`Alguns campos foram pré-preenchidos a partir do <strong>Leito ${localCtx.active}</strong> salvo localmente. Confira todos os valores antes de calcular.`;
  }
  $("runCalcBtn").addEventListener("click",()=>runSelected());
  $("clearCalcBtn").addEventListener("click",()=>{
    form.querySelectorAll("[data-field]").forEach(el=>{
      if(el.type==="checkbox")el.checked=false;
      else if(el.tagName==="SELECT")el.selectedIndex=0;
      else el.value="";
    });
    $("activeScoreResult").className="result muted";
    $("activeScoreResult").textContent="Campos limpos.";
  });
  $("closeCalcBtn").addEventListener("click",()=>{
    selectedId=null;content.classList.add("hidden");$("emptyCalculator").classList.remove("hidden");
  });
  $("scoreSearch").value=meta.name;
  hideAutocomplete();
  $("calculatorCard").scrollIntoView({behavior:"smooth",block:"start"});
}

function runSelected(){
  if(!selectedId)return;
  const form=$("activeScoreForm");
  const values=getFormValues(form);
  const calc=CALCULATORS[selectedId];
  const res=calc(values);
  const out=$("activeScoreResult");
  if(res.error){
    out.className="result warn";
    out.innerHTML=`<strong>${esc(res.error)}</strong>`;
    return;
  }
  const scoreText=Number.isInteger(res.score)?String(res.score):Number(res.score).toFixed(1);
  out.className=`result ${res.cls||"ok"}`;
  out.innerHTML=`<strong class="score-number">${scoreText}</strong><div>${esc(res.interpret||"")}</div>${res.components?.length?`<div class="component-line">${res.components.map(esc).join(" · ")}</div>`:""}`;
}


function searchCatalog(query){
  const q=normalizeText(query).trim();
  if(!q)return CATALOG.slice(0,8);
  return CATALOG.map(s=>{
    const hay=normalizeText([s.name,s.area,s.description,...s.keywords].join(" "));
    let rank=0;
    if(normalizeText(s.name).startsWith(q))rank+=10;
    if(normalizeText(s.name).includes(q))rank+=6;
    if(hay.includes(q))rank+=3;
    for(const term of q.split(/\s+/))if(term&&hay.includes(term))rank+=1;
    return {s,rank};
  }).filter(x=>x.rank>0).sort((a,b)=>b.rank-a.rank||a.s.name.localeCompare(b.s.name)).slice(0,8).map(x=>x.s);
}
function showAutocomplete(items){
  const box=$("scoreSuggestions");
  autocompleteIndex=-1;
  if(!items.length){
    box.innerHTML=`<div class="autocomplete-item"><div><strong>Nenhum escore encontrado</strong><small>Tente outra sigla ou situação clínica.</small></div></div>`;
  }else{
    box.innerHTML=items.map((s,i)=>`<button type="button" class="autocomplete-item" data-score="${s.id}" role="option"><div><strong>${esc(s.name)}</strong><small>${esc(s.description)}</small></div><span class="area-tag">${esc(s.area)}</span></button>`).join("");
    box.querySelectorAll("[data-score]").forEach(b=>b.addEventListener("click",()=>renderScore(b.dataset.score)));
  }
  box.classList.remove("hidden");
}
function hideAutocomplete(){$("scoreSuggestions").classList.add("hidden");autocompleteIndex=-1;}


function setupSearch(){
  const input=$("scoreSearch");
  input.addEventListener("input",()=>showAutocomplete(searchCatalog(input.value)));
  input.addEventListener("focus",()=>showAutocomplete(searchCatalog(input.value)));
  input.addEventListener("keydown",ev=>{
    const items=[...$("scoreSuggestions").querySelectorAll("[data-score]")];
    if(!items.length)return;
    if(ev.key==="ArrowDown"){ev.preventDefault();autocompleteIndex=Math.min(items.length-1,autocompleteIndex+1);}
    else if(ev.key==="ArrowUp"){ev.preventDefault();autocompleteIndex=Math.max(0,autocompleteIndex-1);}
    else if(ev.key==="Enter"&&autocompleteIndex>=0){ev.preventDefault();items[autocompleteIndex].click();return;}
    else if(ev.key==="Escape"){hideAutocomplete();return;}
    else return;
    items.forEach((x,i)=>x.classList.toggle("active",i===autocompleteIndex));
    items[autocompleteIndex]?.scrollIntoView({block:"nearest"});
  });
  document.addEventListener("click",ev=>{
    if(!ev.target.closest(".search-box"))hideAutocomplete();
  });
}

function setup(){
  localCtx=readLocalContext();
  setupSearch();
}
if(typeof document!=="undefined")document.addEventListener("DOMContentLoaded",setup);

if(typeof module!=="undefined"&&module.exports){
  module.exports={calcNEWS2,calcQSOFA,calcSOFA,calcCURB65,calcSPESI,calcWellsPE,calcPERC,calcHEART,calcTIMI,calcBISAP,calcGCS,calcSIRS};
}
