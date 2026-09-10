
const SUPABASE_URL='https://eaapffhepvbfcryayipx.supabase.co';
const SUPABASE_KEY='sb_publishable_TP0UobkURSjVgu5QU7neRA_dfBfVMrN';
const KEY='friskis-borg-passes';

const demo={id:'demo-local',name:'Spinning 45 – Intervall',parts:[
['5:00',10,'Uppvärmning','Hitta rytmen'],['4:00',12,'Tempo','Öka successivt'],['3:00',14,'Backe – sittande','Kontrollerat'],
['2:00',11,'Återhämtning','Lätt'],['4:00',15,'Backe – stående','Tryck'],['3:00',16,'Tempo','Jämnt hårt'],['2:00',12,'Återhämtning',''],
['4:00',17,'Intervall','Hårt'],['3:00',14,'Tempo',''],['2:00',11,'Återhämtning',''],['4:00',16,'Backe – sittande',''],
['3:00',14,'Tempo',''],['2:00',12,'Återhämtning',''],['4:00',10,'Nedvarvning','Lugnt']
].map((x,i)=>({id:i+1,time:x[0],borg:x[1],moment:x[2],instruction:x[3]}))};

const shortDemo={id:'demo-short',name:'Kort demo – 8 min',parts:[
['1:30',9,'Uppvärmning','Lätt och ledigt'],['1:30',12,'Tempo','Hitta rytmen'],['1:00',14,'Backe – sittande','Öka motstånd'],
['1:00',11,'Återhämtning','Släpp av'],['1:00',16,'Intervall','Kontrollerat hårt'],['1:00',12,'Återhämtning','Lugnt'],
['1:00',9,'Nedvarvning','Avsluta mjukt']
].map((x,i)=>({id:'s'+(i+1),time:x[0],borg:x[1],moment:x[2],instruction:x[3]}))};

let passes=[], active=null, elapsed=0, running=false, timer=null, online=true;
let liveView=localStorage.getItem('friskis-live-view')||'clean';
let cueKey='', prestartTimer=null;
const SESSION_KEY='friskis-active-session';
const app=document.querySelector('#app');
const brandTitle=document.querySelector('#brandTitle');
const brandSub=document.querySelector('#brandSub');
const homeBtn=document.querySelector('#home');

const sec=t=>{let [m,s]=String(t).split(':').map(Number);return (m||0)*60+(s||0)};
const fmt=s=>`${Math.floor(Math.max(0,s)/60)}:${String(Math.max(0,s)%60).padStart(2,'0')}`;
function color(b){b=+b;if(b<=9)return'#2868d8';if(b<=11)return'#38b978';if(b<=13)return'#b8d83c';if(b<=14)return'#ffd02d';if(b<=16)return'#ff8a27';return'#ef1738'}
function total(p){return p.parts.reduce((a,x)=>a+sec(x.time),0)}
function setBrand(title='MINA PASS',sub='VÄLJ ETT PASS ELLER SKAPA ETT NYTT'){brandTitle.textContent=title;brandSub.innerHTML=sub;brandSub.style.display=sub?'block':'none'}
function setHomeButton(show=true){homeBtn.style.display=show?'inline-block':'none'}
function cache(){localStorage.setItem(KEY,JSON.stringify(passes))}
function loadCache(){try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return[]}}

function headers(extra={}) {
  return {
    'apikey': SUPABASE_KEY,
    'Authorization': 'Bearer '+SUPABASE_KEY,
    'Content-Type':'application/json',
    ...extra
  };
}
async function api(path,opts={}) {
  const res=await fetch(SUPABASE_URL+'/rest/v1/'+path,{...opts,headers:headers(opts.headers||{})});
  if(!res.ok){throw new Error((await res.text())||('HTTP '+res.status))}
  const text=await res.text();
  return text?JSON.parse(text):null;
}
function setSync(state,msg){
  const el=document.querySelector('#syncState');
  if(!el)return;
  el.className='sync '+state;
  el.innerHTML=`<span class="sync-dot"></span>${msg}`;
}
async function loadPasses(){
  const cached=loadCache();
  passes=cached.length?cached:[shortDemo];
  if(!passes.some(p=>p.id==='demo-short')) passes.push(shortDemo);
  list();
  setSync('work','Synkar...');
  try{
    const rows=await api('passes?select=id,name,parts,updated_at&order=updated_at.desc');
    online=true;

    const remotePasses=(rows||[]).map(r=>({
      id:r.id,
      name:r.name,
      parts:r.parts||[],
      remote:true
    }));

    // Keep the 8-minute demo as a local-only pass, but use Supabase
    // as source of truth for all centrally stored passes.
    passes=[...remotePasses, shortDemo];

    cache();
    list();
    setSync('ok','Centralt sparat');
  }catch(e){
    online=false;
    if(!passes.some(p=>p.id==='demo-short')) passes.push(shortDemo);
    cache();
    list();
    setSync('err','Lokalt läge');
    console.error(e);
  }
}
async function upsertPass(p,isNew){
  if(!online){cache();return p}
  const body={name:p.name,parts:p.parts,updated_at:new Date().toISOString()};
  if(isNew || !p.remote){
    const rows=await api('passes?select=id,name,parts,updated_at',{
      method:'POST',
      headers:{'Prefer':'return=representation'},
      body:JSON.stringify(body)
    });
    const r=rows[0]; return {id:r.id,name:r.name,parts:r.parts||[],remote:true};
  }else{
    const rows=await api('passes?id=eq.'+encodeURIComponent(p.id)+'&select=id,name,parts,updated_at',{
      method:'PATCH',
      headers:{'Prefer':'return=representation'},
      body:JSON.stringify(body)
    });
    const r=rows[0]; return {id:r.id,name:r.name,parts:r.parts||[],remote:true};
  }
}
async function deleteRemote(p){
  if(!online || !p.remote)return;
  await api('passes?id=eq.'+encodeURIComponent(p.id),{method:'DELETE'});
}

function bars(p,cls='mini'){let T=total(p)||1;return `<div class="${cls}">${p.parts.map(x=>`<div class="bar" style="width:${sec(x.time)/T*100}%;height:${Math.max(15,(x.borg-6)/14*100)}%;background:${color(x.borg)}"></div>`).join('')}</div>`}

function list(){
  stop(); setBrand(); setHomeButton(false);
  app.innerHTML=`<div class="toprow"><div><h1>Mina pass</h1><div class="muted">Välj ett pass eller skapa ett nytt <span id="syncState" class="sync"><span class="sync-dot"></span></span></div></div><button class="primary" onclick="edit()">+ SKAPA NYTT PASS</button></div>
  <div class="cards">${passes.map((p,i)=>`<div class="card"><h2>${p.name}</h2><div class="muted">${fmt(total(p))} · ${p.parts.length} delar</div><div class="pass-storage ${p.remote?'remote':''}"><i></i>${p.remote?'Centralt sparat':'Endast lokalt'}</div>${bars(p)}
  <div class="actions"><button class="primary" onclick="run(${i})">▶ KÖR PASSET</button><button onclick="edit(${i})">REDIGERA</button><button onclick="duplicate(${i})">DUPLICERA</button><button onclick="del(${i})">RADERA</button></div></div>`).join('')}</div>`;
  setSync(online?'ok':'err',online?'Centralt sparat':'Lokalt läge');
}

function edit(i){
  stop(); setBrand('REDIGERA PASS','SKAPA ELLER ÄNDRA ETT PASS'); setHomeButton(true);
  let p=i==null?{id:null,name:'Nytt pass',parts:[{id:1,time:'5:00',borg:10,moment:'Uppvärmning',instruction:''}],remote:false}:structuredClone(passes[i]);
  active={p,i}; drawEdit();
}
function drawEdit(){
  let p=active.p;
  app.innerHTML=`<h1>Skapa / redigera pass</h1><div class="editor">
  <input class="name" id="pname" value="${p.name.replaceAll('"','&quot;')}">
  ${bars(p,'profile')}
  <div id="rows">${p.parts.map((x,j)=>`<div class="row"><b>${j+1}</b>
  <input value="${x.time}" onchange="chg(${j},'time',this.value)">
  <input class="borginput" type="number" min="6" max="20" value="${x.borg}" onchange="chg(${j},'borg',this.value)">
  <input value="${(x.moment||'').replaceAll('"','&quot;')}" placeholder="Moment" onchange="chg(${j},'moment',this.value)">
  <input class="instruction" value="${(x.instruction||'').replaceAll('"','&quot;')}" placeholder="Instruktion" onchange="chg(${j},'instruction',this.value)">
  <button onclick="removePart(${j})">×</button></div>`).join('')}</div>
  <p><b>Total tid: ${fmt(total(p))}</b></p>
  <div class="actions"><button onclick="addPart()">+ LÄGG TILL DEL</button><button class="primary" onclick="saveEdit()">SPARA PASS</button><button onclick="preview()">▶ PROVKÖR</button></div></div>`;
}
function chg(i,k,v){active.p.parts[i][k]=k==='borg'?Math.max(6,Math.min(20,+v)):v;drawEdit()}
function addPart(){active.p.parts.push({id:Date.now(),time:'2:00',borg:12,moment:'Ny del',instruction:''});drawEdit()}
function removePart(i){if(active.p.parts.length>1)active.p.parts.splice(i,1);drawEdit()}
async function saveEdit(){
  active.p.name=document.querySelector('#pname').value||'Namnlöst pass';
  try{
    const saved=await upsertPass(active.p,active.i==null);
    if(active.i==null)passes.unshift(saved);else passes[active.i]=saved;
    cache(); list(); setSync(online?'ok':'err',online?'Centralt sparat':'Sparat lokalt');
  }catch(e){
    online=false;
    if(active.i==null)passes.unshift(active.p);else passes[active.i]=active.p;
    cache(); list(); setSync('err','Sparat lokalt');
    console.error(e);
  }
}
function preview(){active.p.name=document.querySelector('#pname').value||active.p.name;startPlayer(active.p)}
async function duplicate(i){
  const p=structuredClone(passes[i]); p.id=null; p.remote=false; p.name+=' – kopia';
  try{const saved=await upsertPass(p,true);passes.unshift(saved)}catch(e){online=false;passes.unshift(p)}
  cache(); list();
}
async function del(i){
  if(!confirm('Radera passet?'))return;
  const p=passes[i];
  try{await deleteRemote(p)}catch(e){online=false;console.error(e)}
  passes.splice(i,1);cache();list();
}

function run(i){startPlayer(passes[i])}
function startPlayer(p){
 stop();setBrand(p.name,'');setHomeButton(false);active={p};elapsed=0;
 app.innerHTML=`<div class="start-choice"><h2>${p.name}</h2><p class="muted">Hur vill du starta passet?</p><div class="actions"><button class="primary" onclick="beginPass(10)">10 SEK FÖRSTART</button><button onclick="beginPass(0)">STARTA DIREKT</button><button onclick="list()">AVBRYT</button></div></div>`;
}
function beginPass(n){if(n)runPrestart(n);else{saveSession();drawLive()}}
function runPrestart(n){
 let left=n;
 const render=()=>app.innerHTML=`<div class="overlay"><div><h2>PASS STARTAR OM</h2><div class="prestart-number">${left}</div><div class="prestart-hint">${left<=3?'STARTA MUSIKEN NU':'GÖR DIG REDO'}</div></div></div>`;
 render();
 prestartTimer=setInterval(()=>{left--;if(left<=0){clearInterval(prestartTimer);prestartTimer=null;running=true;saveSession();startTicker();drawLive()}else render()},1000);
}
function state(){let p=active.p,c=0;for(let i=0;i<p.parts.length;i++){let d=sec(p.parts[i].time);if(elapsed<c+d)return{i,part:p.parts[i],into:elapsed-c,left:d-(elapsed-c)};c+=d}return{i:p.parts.length-1,part:p.parts.at(-1),into:sec(p.parts.at(-1).time),left:0}}
function switchView(){liveView=liveView==='clean'?'dashboard':'clean';localStorage.setItem('friskis-live-view',liveView);drawLive()}
function finishScreen(){stop();clearSession();setBrand(active.p.name,'');setHomeButton(true);app.innerHTML=`<div class="finish"><div><img class="finish-logo" src="friskis-logo.png" alt=""><h1>PASS KLART!</h1><p>Bra jobbat</p><div class="actions" style="justify-content:center;margin-top:30px"><button class="primary" onclick="restartPass()">▶ KÖR IGEN</button><button onclick="list()">MINA PASS</button></div></div></div>`}
function restartPass(){elapsed=0;running=false;drawLive()}
function controls(){return `<div class="controls"><button onclick="prev()">◀ FÖREGÅENDE</button><button class="primary" onclick="toggle()">${running?'Ⅱ PAUS':'▶ START'}</button><button onclick="confirmFinish()">■ AVSLUTA</button><button onclick="next()">NÄSTA ▶</button></div>`}



function trainingActions(){return `<div class="training-actions"><button onclick="switchView()">▣ BYT VY</button><button onclick="toggleFullscreen()">⛶ HELSKÄRM</button><button onclick="goHome()">MINA PASS</button></div>`}
async function toggleFullscreen(){try{if(!document.fullscreenElement)await document.documentElement.requestFullscreen();else await document.exitFullscreen()}catch(e){alert('Helskärm stöds inte fullt ut i den här webbläsaren. Prova Lägg till på hemskärmen på iPad/iPhone.')}}
function goHome(){stop();clearSession();setHomeButton(false);list()}
function saveSession(){if(active&&active.p)localStorage.setItem(SESSION_KEY,JSON.stringify({pass:active.p,elapsed,view:liveView}))}
function clearSession(){localStorage.removeItem(SESSION_KEY)}
function checkResume(){try{let x=JSON.parse(localStorage.getItem(SESSION_KEY)||'null');if(!x||!x.pass||x.elapsed<=0||x.elapsed>=total(x.pass))return;stop();active={p:x.pass};elapsed=x.elapsed;liveView=x.view||liveView;setBrand(x.pass.name,'');setHomeButton(false);app.innerHTML=`<div class="resume-box"><h2>Återuppta pass?</h2><p><b>${x.pass.name}</b></p><p class="muted">Sparad position: ${fmt(x.elapsed)}</p><div class="actions"><button class="primary" onclick="resumePass()">ÅTERUPPTA</button><button onclick="restartSaved()">BÖRJA OM</button><button onclick="discardSaved()">MINA PASS</button></div></div>`}catch(e){}}
function resumePass(){running=false;drawLive()} function restartSaved(){clearSession();elapsed=0;drawLive()} function discardSaved(){clearSession();list()}
function confirmFinish(){if(confirm('Vill du avsluta passet?'))finishScreen()}
function showCue(s){let k=s.i+'-'+s.left;if(s.left>0&&s.left<=3&&cueKey!==k){cueKey=k;let n=active.p.parts[s.i+1],el=document.createElement('div');el.className='overlay';el.innerHTML=`<div><div class="cue-number" style="color:${n?color(n.borg):'#fff'}">${s.left}</div><div class="cue-next">${n?'Nästa: '+n.moment+' · Borg '+n.borg:'Sista sekunderna'}</div></div>`;document.body.appendChild(el);setTimeout(()=>el.remove(),700)}}
function startTicker(){if(timer)clearInterval(timer);timer=setInterval(()=>{if(!running)return;if(elapsed<total(active.p)){elapsed++;saveSession();drawLive()}else finishScreen()},1000)}

function drawLive(){
  let p=active.p,T=total(p);
  if(elapsed>=T){finishScreen();return}

  let s=state(),n=p.parts[s.i+1],remain=T-elapsed;
  const partDuration=sec(s.part.time)||1;
  const progressPct=Math.max(0,Math.min(100,(s.into/partDuration)*100));
  const storageRemote=!!p.remote;
  if(running)setTimeout(()=>showCue(s),0);
  const switchButton=trainingActions();

  if(liveView==='dashboard'){
    app.innerHTML=`${switchButton}<div class="dashboard">
      <div class="dash-grid">
        <section class="dash-panel">
          <h3>PASSPROFIL</h3>
          <div class="dash-profile">
            ${p.parts.map(x=>`<div class="bar" style="width:${sec(x.time)/(T||1)*100}%;height:${Math.max(12,(x.borg-6)/14*100)}%;background:${color(x.borg)}"></div>`).join('')}
            <div class="marker" style="left:${Math.min(100,elapsed/(T||1)*100)}%"></div>
          </div>
          <div class="dash-stats">
            <div><span>TOTAL TID</span><b>${fmt(T)}</b></div>
            <div><span>AKTUELL DEL</span><b>${s.i+1} / ${p.parts.length}</b></div>
            <div><span>TID KVAR</span><b>${fmt(remain)}</b></div>
          </div>
        </section>

        <section class="dash-panel dash-now">
          <h3>NU KÖR VI</h3>
          <div class="moment-now">${s.part.moment||''}</div>
          <div class="instruction-now">${s.part.instruction||''}</div>

          <div class="count-ring" style="--progress:${progressPct}%;--ring-color:${color(s.part.borg)}">
            <div class="count-ring-content">
              <div class="ring-label">BORG</div>
              <div class="ring-borg" style="color:${color(s.part.borg)}">${s.part.borg}</div>
              <div class="ring-time">${fmt(s.left)}</div>
              <div class="ring-kvar">KVAR</div>
            </div>
          </div>
        </section>

        <section class="dash-panel dash-next">
          <h3>NÄSTA</h3>
          ${n?`
            <div class="moment">${n.moment||''}</div>
            <div class="borg">BORG <span style="color:${color(n.borg)}">${n.borg}</span></div>
            <div class="time">${n.time}</div>
            <div class="muted">${n.instruction||''}</div>
          `:'<div class="moment">MÅL 🎉</div>'}
        </section>
      </div>

      <div class="controls">
        <button onclick="prev()">◀ FÖREGÅENDE</button>
        <button class="primary" onclick="toggle()">${running?'Ⅱ PAUS':'▶ START'}</button>
        <button onclick="confirmFinish()">■ AVSLUTA</button>
        <button onclick="next()">NÄSTA ▶</button>
      </div>

      <div class="dashboard-status">
        <span class="storage"><span class="dot ${storageRemote?'remote':''}"></span>${storageRemote?'Centralt sparat':'Endast lokalt'}</span>
        <span>·</span>
        <span>${p.name}</span>
      </div>
    </div>`;
    return;
  }

  app.innerHTML=`${switchButton}
  <div class="live">
    <div class="liveTop">
      <div class="liveBrand"></div>
      <div class="current">
        <div class="label">BORG</div>
        <div class="borgBig" style="color:${color(s.part.borg)}">${s.part.borg}</div>
        <div class="count">${fmt(s.left)}</div>
        <div class="remain">KVAR</div>
        <div class="totalRemain"><b>${fmt(remain)}</b> KVAR AV PASSET</div>
      </div>
      <div class="next">
        <div class="label">NÄSTA</div>
        ${n?`
          <div class="borg">BORG <span style="color:${color(n.borg)}">${n.borg}</span></div>
          <div class="time">${n.time}</div>
          <div class="moment">${n.moment}</div>
        `:'<div class="moment">MÅL 🎉</div>'}
      </div>
    </div>

    <div class="liveProfile">
      ${p.parts.map(x=>`<div class="bar" style="width:${sec(x.time)/(T||1)*100}%;height:${Math.max(12,(x.borg-6)/14*100)}%;background:${color(x.borg)}"></div>`).join('')}
      <div class="marker" style="left:${Math.min(100,elapsed/(T||1)*100)}%"></div>
    </div>

    <div class="muted">${s.part.moment}${s.part.instruction?' · '+s.part.instruction:''}</div>

    <div class="controls">
      <button onclick="prev()">◀ FÖREGÅENDE</button>
      <button class="primary" onclick="toggle()">${running?'Ⅱ PAUS':'▶ START'}</button>
      <button onclick="confirmFinish()">■ AVSLUTA</button>
      <button onclick="next()">NÄSTA ▶</button>
    </div>
  </div>`;
}
function toggle(){if(running){running=false;if(timer){clearInterval(timer);timer=null}saveSession();drawLive();return}if(elapsed>=total(active.p))elapsed=0;running=true;saveSession();startTicker();drawLive()}
function stop(){running=false;if(timer){clearInterval(timer);timer=null}}
function next(){let s=state(),c=active.p.parts.slice(0,s.i+1).reduce((a,x)=>a+sec(x.time),0);elapsed=Math.min(total(active.p),c);drawLive()}
function prev(){let s=state(),start=active.p.parts.slice(0,s.i).reduce((a,x)=>a+sec(x.time),0);elapsed=(s.into>3)?start:active.p.parts.slice(0,Math.max(0,s.i-1)).reduce((a,x)=>a+sec(x.time),0);drawLive()}

homeBtn.onclick=goHome;
loadPasses().then(()=>checkResume());
