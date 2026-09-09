
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
  passes=loadCache();
  if(!passes.length)passes=[demo,shortDemo];
  list();
  setSync('work','Synkar...');
  try{
    const rows=await api('passes?select=id,name,parts,updated_at&order=updated_at.desc');
    online=true;
    if(rows && rows.length){
      passes=rows.map(r=>({id:r.id,name:r.name,parts:r.parts||[],remote:true}));
    }else{
      passes=[demo,shortDemo];
    }
    cache(); list(); setSync('ok','Centralt sparat');
  }catch(e){
    online=false; setSync('err','Lokalt läge');
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
  <div class="cards">${passes.map((p,i)=>`<div class="card"><h2>${p.name}</h2><div class="muted">${fmt(total(p))} · ${p.parts.length} delar</div>${bars(p)}
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
function startPlayer(p){stop();setBrand(p.name,'');setHomeButton(true);active={p};elapsed=0;drawLive()}
function state(){let p=active.p,c=0;for(let i=0;i<p.parts.length;i++){let d=sec(p.parts[i].time);if(elapsed<c+d)return{i,part:p.parts[i],into:elapsed-c,left:d-(elapsed-c)};c+=d}return{i:p.parts.length-1,part:p.parts.at(-1),into:sec(p.parts.at(-1).time),left:0}}
function drawLive(){
  let p=active.p,s=state(),T=total(p),n=p.parts[s.i+1],remain=T-elapsed;
  app.innerHTML=`<div class="live"><div class="liveTop"><div class="liveBrand"></div>
  <div class="current"><div class="label">BORG</div><div class="borgBig" style="color:${color(s.part.borg)}">${s.part.borg}</div>
  <div class="count">${fmt(s.left)}</div><div class="remain">KVAR</div><div class="totalRemain"><b>${fmt(remain)}</b> KVAR AV PASSET</div></div>
  <div class="next"><div class="label">NÄSTA</div>${n?`<div class="borg">BORG <span style="color:${color(n.borg)}">${n.borg}</span></div><div class="time">${n.time}</div><div class="moment">${n.moment}</div>`:'<div class="moment">MÅL 🎉</div>'}</div></div>
  <div class="liveProfile">${p.parts.map(x=>`<div class="bar" style="width:${sec(x.time)/(T||1)*100}%;height:${Math.max(12,(x.borg-6)/14*100)}%;background:${color(x.borg)}"></div>`).join('')}
  <div class="marker" style="left:${Math.min(100,elapsed/(T||1)*100)}%"></div></div>
  <div class="muted">${s.part.moment}${s.part.instruction?' · '+s.part.instruction:''}</div>
  <div class="controls"><button onclick="prev()">◀ FÖREGÅENDE</button><button class="primary" onclick="toggle()">${running?'Ⅱ PAUS':'▶ START'}</button><button onclick="next()">NÄSTA ▶</button></div></div>`;
}
function toggle(){
  if(running){running=false;if(timer){clearInterval(timer);timer=null}drawLive();return}
  if(elapsed>=total(active.p))elapsed=0;
  running=true;
  timer=setInterval(()=>{if(!running)return;if(elapsed<total(active.p)){elapsed++;drawLive()}else{stop();drawLive()}},1000);
  drawLive();
}
function stop(){running=false;if(timer){clearInterval(timer);timer=null}}
function next(){let s=state(),c=active.p.parts.slice(0,s.i+1).reduce((a,x)=>a+sec(x.time),0);elapsed=Math.min(total(active.p),c);drawLive()}
function prev(){let s=state(),start=active.p.parts.slice(0,s.i).reduce((a,x)=>a+sec(x.time),0);elapsed=(s.into>3)?start:active.p.parts.slice(0,Math.max(0,s.i-1)).reduce((a,x)=>a+sec(x.time),0);drawLive()}

homeBtn.onclick=list;
loadPasses();
