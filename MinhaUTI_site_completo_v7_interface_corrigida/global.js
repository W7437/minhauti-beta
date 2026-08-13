(function(){
const frameWrap=()=>document.getElementById('moduleFrameWrap'), frame=()=>document.getElementById('moduleFrame');
window.openClinicalModule=function(btn,path){
  try{ if(typeof saveCurrent==='function') saveCurrent(false); }catch(e){}
  document.querySelectorAll('.module-nav-item').forEach(x=>x.classList.remove('active'));btn.classList.add('active');
  if(!path){frameWrap().hidden=true;frame().src='about:blank';document.getElementById('patientView').hidden=false;document.getElementById('patientToolbar').hidden=false;document.querySelector('.active-bed-banner').hidden=false;return}
  document.getElementById('patientView').hidden=true;document.getElementById('patientToolbar').hidden=true;document.querySelector('.active-bed-banner').hidden=true;frameWrap().hidden=false;frame().src=path;
};
function options(sel){sel.innerHTML=Array.from({length:10},(_,i)=>`<option value="${i+1}">Leito ${i+1}</option>`).join('')}
window.openBedSwap=function(){options(swapBedA);options(swapBedB);swapBedA.value=currentBed;swapBedB.value=currentBed===10?9:currentBed+1;bedSwapModal.hidden=false}
window.openBedEdit=function(){options(editBedSelect);editBedSelect.value=currentBed;loadInitial();bedEditModal.hidden=false}
window.closeBedModal=id=>document.getElementById(id).hidden=true;
const iniKey='minhauti_bed_initials_v1';function getIni(){try{return JSON.parse(localStorage.getItem(iniKey)||'{}')}catch(e){return {}}}function setIni(x){localStorage.setItem(iniKey,JSON.stringify(x))}
function loadInitial(){editBedInitials.value=getIni()[editBedSelect.value]||''}editBedSelect?.addEventListener('change',loadInitial);
window.saveBedInitials=function(){let x=getIni(),v=(editBedInitials.value||'').toUpperCase().replace(/[^A-ZÀ-Ú.]/g,'').slice(0,8);x[editBedSelect.value]=v;setIni(x);updateLabels();closeBedModal('bedEditModal')}
window.confirmBedSwap=function(){let a=+swapBedA.value,b=+swapBedB.value;if(a===b)return;try{if(typeof saveCurrent==='function')saveCurrent(false)}catch(e){}let tmp=beds[a]||{};beds[a]=beds[b]||{};beds[b]=tmp;localStorage.setItem('uti_portatil_v7',JSON.stringify(beds));let ini=getIni(),ti=ini[a]||'';ini[a]=ini[b]||'';ini[b]=ti;setIni(ini);if(currentBed===a)currentBed=b;else if(currentBed===b)currentBed=a;localStorage.setItem('minhauti_active_bed_v1',String(currentBed));closeBedModal('bedSwapModal');updateLabels();switchBed(currentBed,false)}
function updateLabels(){let ini=getIni();for(let i=1;i<=10;i++){let btn=document.getElementById('bedBtn'+i);if(!btn)continue;let t=btn.querySelector('span:last-child');t.textContent=ini[i]?`Leito ${i} · ${ini[i]}`:`Leito ${i}`}}
document.addEventListener('DOMContentLoaded',()=>setTimeout(updateLabels,50));
})();