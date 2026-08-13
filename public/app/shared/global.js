(function(){
const frameWrap=()=>document.getElementById('moduleFrameWrap');
const frame=()=>document.getElementById('moduleFrame');
const content=()=>document.querySelector('main.content');
let frameResizeObserver=null;

function getIni(){try{return JSON.parse(localStorage.getItem('minhauti_bed_initials_v1')||'{}')}catch(e){return {}}}
function setIni(x){localStorage.setItem('minhauti_bed_initials_v1',JSON.stringify(x))}
function bedContext(){
  const n=Number(window.currentBed||localStorage.getItem('minhauti_active_bed_v1')||1);
  return {type:'minhauti-bed-context',bed:n,initials:getIni()[n]||''};
}
function sendBedContext(){try{frame()?.contentWindow?.postMessage(bedContext(),'*')}catch(e){}}

function resizeFrame(){
  const f=frame(); if(!f||frameWrap()?.hidden) return;
  try{
    const doc=f.contentDocument;
    if(!doc) return;
    const h=Math.max(
      doc.documentElement?.scrollHeight||0,
      doc.body?.scrollHeight||0,
      620
    );
    f.style.height=(h+8)+'px';
  }catch(e){}
}
function attachFrameResize(){
  const f=frame(); if(!f) return;
  if(frameResizeObserver){try{frameResizeObserver.disconnect()}catch(e){}}
  try{
    const doc=f.contentDocument;
    if(doc && window.ResizeObserver){
      frameResizeObserver=new ResizeObserver(()=>resizeFrame());
      if(doc.documentElement) frameResizeObserver.observe(doc.documentElement);
      if(doc.body) frameResizeObserver.observe(doc.body);
    }
  }catch(e){}
  resizeFrame(); sendBedContext();
}

window.openClinicalModule=function(btn,path){
  try{if(typeof saveCurrent==='function')saveCurrent(false)}catch(e){}
  document.querySelectorAll('.module-nav-item').forEach(x=>x.classList.remove('active'));
  if(btn)btn.classList.add('active');
  const fw=frameWrap(), f=frame(), pv=document.getElementById('patientView'), pt=document.getElementById('patientToolbar'), banner=document.querySelector('.active-bed-banner');
  if(!path){
    if(fw)fw.hidden=true;
    if(f)f.src='about:blank';
    if(pv)pv.hidden=false;
    if(pt)pt.hidden=false;
    if(banner)banner.hidden=false;
    content()?.classList.remove('module-open');
    return;
  }
  if(pv)pv.hidden=true;
  if(pt)pt.hidden=true;
  /* O leito ativo continua visível e ocupa espaço próprio acima do módulo. */
  if(banner)banner.hidden=false;
  if(fw)fw.hidden=false;
  content()?.classList.add('module-open');
  if(f){
    f.style.height='720px';
    f.src=path;
  }
};

function options(sel){if(!sel)return;sel.innerHTML=Array.from({length:10},(_,i)=>`<option value="${i+1}">Leito ${i+1}</option>`).join('')}
window.openBedSwap=function(){options(swapBedA);options(swapBedB);swapBedA.value=currentBed;swapBedB.value=currentBed===10?9:currentBed+1;bedSwapModal.hidden=false}
window.openBedEdit=function(){options(editBedSelect);editBedSelect.value=currentBed;loadInitial();bedEditModal.hidden=false}
window.closeBedModal=id=>document.getElementById(id).hidden=true;
function loadInitial(){editBedInitials.value=getIni()[editBedSelect.value]||''}
editBedSelect?.addEventListener('change',loadInitial);
window.saveBedInitials=function(){let x=getIni(),v=(editBedInitials.value||'').toUpperCase().replace(/[^A-ZÀ-Ú.]/g,'').slice(0,8);x[editBedSelect.value]=v;setIni(x);updateLabels();sendBedContext();closeBedModal('bedEditModal')}
window.confirmBedSwap=function(){let a=+swapBedA.value,b=+swapBedB.value;if(a===b)return;try{if(typeof saveCurrent==='function')saveCurrent(false)}catch(e){}let tmp=beds[a]||{};beds[a]=beds[b]||{};beds[b]=tmp;localStorage.setItem('uti_portatil_v7',JSON.stringify(beds));let ini=getIni(),ti=ini[a]||'';ini[a]=ini[b]||'';ini[b]=ti;setIni(ini);if(currentBed===a)currentBed=b;else if(currentBed===b)currentBed=a;localStorage.setItem('minhauti_active_bed_v1',String(currentBed));closeBedModal('bedSwapModal');updateLabels();switchBed(currentBed,false);sendBedContext()}
function updateLabels(){let ini=getIni();for(let i=1;i<=10;i++){let btn=document.getElementById('bedBtn'+i);if(!btn)continue;let t=btn.querySelector('span:last-child');if(t)t.textContent=ini[i]?`Leito ${i} · ${ini[i]}`:`Leito ${i}`}}

document.addEventListener('DOMContentLoaded',()=>{
  setTimeout(updateLabels,50);
  const f=frame(); if(f)f.addEventListener('load',()=>setTimeout(attachFrameResize,30));
  const lbl=document.getElementById('currentBedLabel');
  if(lbl&&window.MutationObserver)new MutationObserver(()=>{sendBedContext();setTimeout(resizeFrame,30)}).observe(lbl,{childList:true,subtree:true,characterData:true});
});
window.addEventListener('resize',()=>setTimeout(resizeFrame,60));
})();
/* MinhaUTI auth user bar */
document.addEventListener('minhauti:auth-ready',function(e){
  const header=document.querySelector('.muti-main-header'); if(!header||document.getElementById('authUserBar')) return;
  const u=e.detail?.user||{}; const plan=(u.app_metadata?.plan||u.user_metadata?.plan||'beta').toString();
  const wrap=document.createElement('div');wrap.id='authUserBar';wrap.className='auth-userbar';
  const meta=document.createElement('div');meta.className='auth-user-meta';
  const b=document.createElement('b');b.textContent=u.email||'Usuário'; const s=document.createElement('small');s.textContent='Plano: '+plan;
  meta.append(b,s); const out=document.createElement('button');out.type='button';out.className='auth-signout';out.textContent='Sair';out.addEventListener('click',()=>window.MinhaUTIAuth?.signOut?.());
  wrap.append(meta,out);header.append(wrap);
});


/* Desktop compacto em tela física estreita (ex.: "site para computador" no celular) */
(function(){
  function detectCompactDesktop(){
    try{
      const physicalWidth = Math.min(screen.width || 9999, screen.height || 9999);
      const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
      const narrowPhysical = physicalWidth <= 900;
      const desktopViewport = window.innerWidth >= 900;
      const compact = coarse && narrowPhysical && desktopViewport;
      document.documentElement.classList.toggle('compact-desktop', compact);
      document.body?.classList.toggle('compact-desktop', compact);
    }catch(e){}
  }
  window.addEventListener('resize', detectCompactDesktop);
  window.addEventListener('orientationchange', ()=>setTimeout(detectCompactDesktop,80));
  document.addEventListener('DOMContentLoaded', detectCompactDesktop);
  detectCompactDesktop();
})();
