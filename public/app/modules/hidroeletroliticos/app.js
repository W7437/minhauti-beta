const clinicalIds=["peso","renal","acesso","na","k","mg","p","ca","cai","alb","glu"];
const HYKEY="minhauti_hydro_beds_v2";
function activeBed(){let n=parseInt(localStorage.getItem("minhauti_active_bed_v1")||"1",10);return Number.isFinite(n)?n:1}
function hydroAll(){try{return JSON.parse(localStorage.getItem(HYKEY)||"{}")||{}}catch(e){return {}}}
function saveActiveClinical(){let all=hydroAll(),c={};clinicalIds.forEach(id=>c[id]=document.getElementById(id)?.value||"");all[activeBed()]=c;localStorage.setItem(HYKEY,JSON.stringify(all));}
function loadClinical(){let c=hydroAll()[activeBed()]||{};clinicalIds.forEach(id=>{let e=document.getElementById(id);if(e)e.value=c[id]??""});let ap=document.getElementById("activePatient");if(ap)ap.textContent=`Leito ${String(activeBed()).padStart(2,"0")}`;}
document.addEventListener("DOMContentLoaded",loadClinical);
function val(id){const x=parseFloat((document.getElementById(id).value||"").replace(",", "."));return Number.isFinite(x)?x:null}
function pill(t,s){return `<span class="pill ${s}">${t}</span>`}
function box(t,c=""){return `<div class="box ${c}">${t}</div>`}
function result(title,value,sub,severity,body){return `<div class="result"><div class="resulthead"><div><div class="resulttitle">${title} — ${value}</div><div class="resultsub">${sub}</div></div><span class="badge ${severity}">${severity==="danger"?"ATENÇÃO":"ALTERADO"}</span></div><details open><summary>Conduta sugerida</summary><div class="body">${body}</div></details></div>`}
function renalWarn(){return document.getElementById("renal").value==="normal"?"":box("<b>Função renal reduzida/diálise:</b> individualize reposições de K, Mg e fósforo, reduza cargas quando apropriado e reavalie com maior frequência.","dangerbox")}
function kAmp(mEq){return (mEq/24).toFixed(2).replace(".",",")}
function analisar(){
 let na=val("na"),k=val("k"),mg=val("mg"),p=val("p"),ca=val("ca"),cai=val("cai"),alb=val("alb"),glu=val("glu"),peso=val("peso");
 let chips=[],out=[];
 if(k!==null){
   const confirm=box("<b>Confirmar:</b> solicitar nova dosagem de K em amostra sem hemólise quando o resultado for inesperado ou houver possibilidade de pseudohipercalemia. <b>Em hipercalemia grave ou ECG alterado, não atrasar tratamento enquanto aguarda confirmação.</b>");
   const flow=`<div class="kflow"><div class="step"><span>1</span>CONFIRMAR</div><div class="step"><span>2</span>ECG</div><div class="step"><span>3</span>CORRIGIR</div><div class="step"><span>4</span>MONITORAR</div><div class="step"><span>5</span>NOVO K</div></div>`;
   if(k>=6.5){
     chips.push(pill("Hipercalemia grave","danger"));
     out.push(result("Potássio",k.toFixed(1)+" mEq/L","Hipercalemia grave","danger",
       flow+confirm+
       box("<b>ECG imediato + monitorização cardíaca.</b> ECG normal não exclui risco.","dangerbox")+
       box("<b>Se alterações eletrocardiográficas:</b> administrar cálcio EV conforme apresentação e protocolo do serviço para estabilização de membrana. O cálcio não reduz o K corporal.","rx")+
       box("<b>Deslocar K para intracelular:</b> insulina regular 10 U + 25 g de glicose EV é um regime amplamente utilizado; monitorar glicemia seriada. Beta-2 agonista pode ser adjuvante conforme contexto.","rx")+
       box("<b>Remover K do organismo:</b> considerar diurético se houver diurese, quelante conforme indicação e diálise quando apropriado.","rx")+
       box("<b>Bicarbonato:</b> não usar rotineiramente apenas para hipercalemia. Se houver acidemia metabólica relevante e indicação clínica, a apresentação local informada é NaHCO₃ 8,4% 10 mL = 10 mEq.")+
       box("<b>Reavaliar:</b> repetir K após intervenção e acompanhar tendência; após insulina-glicose, monitorar glicemia por risco de hipoglicemia.","dangerbox")
     ));
   } else if(k>=5.5){
     chips.push(pill("Hipercalemia","warn"));
     out.push(result("Potássio",k.toFixed(1)+" mEq/L","Hipercalemia","warn",
       flow+confirm+box("<b>ECG:</b> especialmente se K ≥6,0 mEq/L, sintomas, rápida elevação ou contexto de alto risco.")+
       box("<b>Revisar causas:</b> função renal, acidose, drogas, hemólise e aporte de K.")+
       box("<b>Nova coleta:</b> sugerida para confirmação e acompanhamento; a urgência do tratamento depende do valor, ECG e contexto clínico.","rx")
     ));
   } else if(k<2.5){
     chips.push(pill("Hipocalemia grave","danger"));
     const dose=40;
     out.push(result("Potássio",k.toFixed(1)+" mEq/L","Hipocalemia grave","danger",
       flow+confirm+
       box("<b>ECG + magnésio.</b> Avaliar fraqueza, arritmia, perdas GI, diuréticos, alcalose e redistribuição.","dangerbox")+
       box(`<b>Exemplo de reposição inicial EV:</b> 40 mEq de K correspondem a aproximadamente <b>${kAmp(dose)} ampola(s)</b> de KCl 19,1% (24 mEq/ampola). Em acesso periférico, utilizar diluição/concentração e velocidade permitidas pelo protocolo institucional; uma referência didática conservadora é até 10 mEq/h em periférico. Não administrar KCl EV em bolus.`,"rx")+
       renalWarn()+
       box("<b>Nova dosagem:</b> repetir K após a reposição inicial e antes de cargas adicionais importantes. Se Mg estiver baixo, corrigir concomitantemente.")
     ));
   } else if(k<3.0){
     chips.push(pill("Hipocalemia moderada","warn"));
     const dose=24;
     out.push(result("Potássio",k.toFixed(1)+" mEq/L","Hipocalemia moderada","warn",
       flow+confirm+
       box(`<b>Exemplo prático:</b> KCl 19,1% <b>1 ampola = 24 mEq</b>. Se EV for indicada, diluir em solução compatível e respeitar via/velocidade do protocolo local. Via oral é preferível quando o paciente estável e o trato GI funciona.`,"rx")+
       renalWarn()+box("<b>Nova dosagem:</b> reavaliar K após reposição e checar Mg.")
     ));
   } else if(k<3.5){
     chips.push(pill("Hipocalemia leve","warn"));
     out.push(result("Potássio",k.toFixed(1)+" mEq/L","Hipocalemia leve","warn",
       confirm+box("<b>Se estável e via oral disponível:</b> preferir reposição oral, corrigindo a causa. Se EV for necessária, a apresentação local é KCl 19,1% 24 mEq/ampola.","rx")+box("<b>Reavaliar:</b> nova dosagem de K conforme magnitude da reposição, evolução e função renal.")
     ));
   }
 }
 if(mg!==null && mg<1.7){
   chips.push(pill(mg<1.2?"Hipomagnesemia importante":"Hipomagnesemia",mg<1.2?"danger":"warn"));
   out.push(result("Magnésio",mg.toFixed(1)+" mg/dL",mg<1.2?"Hipomagnesemia importante":"Hipomagnesemia",mg<1.2?"danger":"warn",
     box("<b>Corrigir especialmente se houver hipocalemia, arritmia ou QT prolongado.</b> A dose/diluição final depende da apresentação de MgSO₄ disponível, que ainda não foi cadastrada neste protótipo.","rx")+renalWarn()+box("<b>Nova coleta:</b> reavaliar Mg após reposição relevante, especialmente em disfunção renal.")
   ));
 }
 if(p!==null && p<2.5){
   chips.push(pill(p<1?"Hipofosfatemia grave":"Hipofosfatemia",p<1?"danger":"warn"));
   let dose="";
   if(peso){
     const mmol=p<1?0.16*peso:0.08*peso;
     dose=`<b>Estimativa didática baseada em peso:</b> ${mmol.toFixed(1)} mmol de fósforo. `;
   }
   out.push(result("Fósforo",p.toFixed(1)+" mg/dL",p<1?"Hipofosfatemia grave":"Hipofosfatemia",p<1?"danger":"warn",
     box(`${dose}<b>Apresentação local:</b> fosfato de K 2 mEq/mL, ampola de 10 mL = 20 mEq. A carga de potássio deve ser considerada antes de escolher essa formulação.`,"rx")+renalWarn()+box("<b>Nova coleta:</b> repetir fósforo após reposição EV significativa e acompanhar K/Ca.")
   ));
 }
 if(cai!==null && cai<1.0){
   chips.push(pill("Hipocalcemia ionizada","danger"));
   out.push(result("Cálcio ionizado",cai.toFixed(2)+" mmol/L","Hipocalcemia","danger",box("<b>Se sintomática, QT prolongado ou instabilidade:</b> considerar cálcio EV conforme apresentação local e protocolo. Cadastrar a ampola antes de gerar uma prescrição automática.","rx")+box("<b>Checar Mg</b> e repetir cálcio ionizado após reposição relevante.")));
 } else if(ca!==null && cai===null){
   let corr=alb!==null?ca+0.8*(4-alb):null;
   if((corr??ca)<8.5){
     chips.push(pill("Hipocalcemia","warn"));
     out.push(result("Cálcio total",ca.toFixed(1)+" mg/dL","Hipocalcemia pelo cálcio total","warn",(corr!==null?box(`<b>Cálcio corrigido estimado:</b> ${corr.toFixed(1)} mg/dL.`):"")+box("<b>Paciente crítico:</b> prefira cálcio ionizado quando disponível antes de decidir reposição.")));
   }
 }
 if(na!==null){
   let corr=glu!==null&&glu>100?na+1.6*((glu-100)/100):null;
   if(na<125){
     chips.push(pill("Hiponatremia importante","danger"));
     out.push(result("Sódio",na.toFixed(0)+" mEq/L","Hiponatremia importante","danger",
       (corr!==null?box(`<b>Na corrigido pela glicemia (estimativa):</b> ${corr.toFixed(1)} mEq/L.`):"")+
       box("<b>Defina sintomas, osmolaridade e duração.</b> Se houver sintomas neurológicos graves, solução salina hipertônica 3% pode ser necessária conforme protocolo, com Na seriado e meta inicial de melhora dos sintomas, não normalização imediata.","dangerbox")+
       box("<b>Nova coleta:</b> monitorização seriada do Na é obrigatória durante correção ativa.")
     ));
   } else if(na<135){
     chips.push(pill("Hiponatremia","warn"));
     out.push(result("Sódio",na.toFixed(0)+" mEq/L","Hiponatremia","warn",(corr!==null?box(`<b>Na corrigido pela glicemia:</b> ~${corr.toFixed(1)} mEq/L.`):"")+box("Avaliar osmolaridade, volemia, sintomas e duração antes de escolher a estratégia.")));
   } else if(na>145){
     chips.push(pill(na>155?"Hipernatremia importante":"Hipernatremia",na>155?"danger":"warn"));
     let d="";
     if(peso){const act=.5*peso;d=box(`<b>Déficit de água livre estimado até Na 140:</b> ${(act*(na/140-1)).toFixed(1)} L, usando ACT ≈ 0,5 × peso. Ajustar por idade/sexo, volemia e perdas em curso.`)}
     out.push(result("Sódio",na.toFixed(0)+" mEq/L",na>155?"Hipernatremia importante":"Hipernatremia",na>155?"danger":"warn",d+box("<b>Opções de água livre:</b> água enteral ou SG5% conforme contexto. Se hipovolêmico/instável, restaurar perfusão primeiro.")+box("<b>Nova coleta:</b> acompanhar Na seriado durante correção.")));
   }
 }
 if(!chips.length)chips.push(pill("Sem distúrbio identificado","ok"));
 document.getElementById("summarytxt").innerHTML=chips.join("");
 document.getElementById("results").innerHTML=out.join("");
 saveActiveClinical();
}
const cases=[
 {name:"Perdas gastrointestinais",desc:"Vômitos/diarreia com baixa ingesta.",vals:()=>({na:r(131,140),k:rd(2.2,3.2),mg:rd(.9,1.6),p:rd(1.8,3.0),ca:rd(7.8,9.0),alb:rd(2.8,3.8),glu:r(75,130),peso:r(48,95),renal:"normal"})},
 {name:"DRC + hipercalemia",desc:"Função renal reduzida com retenção de K.",vals:()=>({na:r(134,142),k:rd(5.7,7.1),mg:rd(1.8,2.6),p:rd(4.8,7),ca:rd(7.5,9),alb:rd(2.7,4),glu:r(85,190),peso:r(55,105),renal:Math.random()<.3?"dialysis":"reduced"})},
 {name:"Realimentação",desc:"Após reinício de aporte calórico em paciente desnutrido.",vals:()=>({na:r(134,142),k:rd(2.5,3.5),mg:rd(.9,1.5),p:rd(.4,1.4),ca:rd(7.6,8.8),alb:rd(2,3.1),glu:r(110,220),peso:r(42,75),renal:"normal"})},
 {name:"Hiperglicemia importante",desc:"Hiponatremia medida associada a hiperglicemia.",vals:()=>({na:r(124,132),k:rd(3.6,5.3),mg:rd(1.5,2.2),p:rd(1.5,3.5),ca:rd(8,9.4),alb:rd(3,4),glu:r(380,760),peso:r(55,105),renal:"normal"})},
 {name:"Hipernatremia por perda de água",desc:"Acesso reduzido à água e perdas em curso.",vals:()=>({na:r(150,170),k:rd(3.4,4.8),mg:rd(1.6,2.3),p:rd(2.4,4.1),ca:rd(8.1,9.8),alb:rd(2.8,4.2),glu:r(80,170),peso:r(50,100),renal:"normal"})},
 {name:"Hiponatremia importante",desc:"Necessidade de avaliar sintomas, duração e osmolaridade.",vals:()=>({na:r(112,124),k:rd(3.2,4.7),mg:rd(1.5,2.2),p:rd(2.1,4),ca:rd(7.8,9.2),alb:rd(2.8,4),glu:r(75,145),peso:r(48,95),renal:"normal"})},
 {name:"Diurético de alça",desc:"Perdas de K e Mg associadas ao uso de diurético.",vals:()=>({na:r(130,142),k:rd(2.4,3.3),mg:rd(.9,1.5),p:rd(2,3.8),ca:rd(7.8,9.2),alb:rd(2.8,4),glu:r(80,150),peso:r(52,100),renal:"normal"})},
 {name:"Controle",desc:"Paciente sem distúrbio relevante.",vals:()=>({na:r(136,143),k:rd(3.6,4.8),mg:rd(1.8,2.3),p:rd(2.7,4.2),ca:rd(8.6,9.8),alb:rd(3.2,4.4),glu:r(80,145),peso:r(50,100),renal:"normal"})}
];
function r(a,b){return Math.round(a+Math.random()*(b-a))}
function rd(a,b){return +(a+Math.random()*(b-a)).toFixed(1)}
function gerarCaso(){const c=cases[Math.floor(Math.random()*cases.length)],v=c.vals();Object.entries(v).forEach(([id,x])=>{if(document.getElementById(id))document.getElementById(id).value=x});document.getElementById("cai").value="";document.getElementById("casebox").style.display="block";document.getElementById("casebox").innerHTML=`<b>🎲 ${c.name}</b><br>${c.desc}<br><small>Tente interpretar antes de abrir a conduta.</small>`;analisar()}



function hydroInitials(){try{const x=JSON.parse(localStorage.getItem('minhauti_bed_initials_v1')||'{}');return x[activeBed()]||''}catch(e){return ''}}
function updateHydroPatientContext(){
  const ap=document.getElementById('activePatient');
  if(ap){const ini=hydroInitials();ap.textContent=`Leito ${String(activeBed()).padStart(2,'0')}${ini?' · '+ini:''}`;}
}
document.addEventListener('DOMContentLoaded',()=>{loadClinical();updateHydroPatientContext();});
window.addEventListener('storage',e=>{
  if(e.key==='minhauti_active_bed_v1'||e.key==='minhauti_bed_initials_v1'){loadClinical();updateHydroPatientContext();}
});
window.addEventListener('message',e=>{
  if(e.data&&e.data.type==='minhauti-bed-context'){loadClinical();updateHydroPatientContext();}
});
