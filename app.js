const STORAGE_KEY = 'friskis-borg-workouts-v1';

const borgColor = (borg) => {
  if (borg <= 9) return '#2bb7b3';
  if (borg <= 11) return '#37c86b';
  if (borg <= 13) return '#b7d93d';
  if (borg <= 15) return '#f2c84b';
  if (borg <= 17) return '#f28b3c';
  return '#e63a3a';
};

const borgLabel = (borg) => {
  if (borg <= 8) return 'Mycket lätt';
  if (borg <= 10) return 'Lätt';
  if (borg <= 12) return 'Ganska lätt';
  if (borg <= 14) return 'Något ansträngande';
  if (borg <= 16) return 'Ansträngande';
  if (borg <= 18) return 'Mycket ansträngande';
  return 'Extremt ansträngande';
};

const demoWorkout = {
  id: crypto.randomUUID(),
  name: 'Spinning 45 – Intervall',
  blocks: [
    { duration: 300, borg: 10, name:'Uppvärmning', instruction:'Hitta rytmen' },
    { duration: 240, borg: 12, name:'Stegring', instruction:'Öka successivt' },
    { duration: 180, borg: 14, name:'Tempo', instruction:'Stabilt tryck' },
    { duration: 180, borg: 16, name:'Backe', instruction:'Sittande tungt' },
    { duration: 120, borg: 11, name:'Återhämtning', instruction:'Släpp motstånd' },
    { duration: 120, borg: 15, name:'Tempo', instruction:'Kontrollerat hårt' },
    { duration: 90, borg: 17, name:'Intervall', instruction:'Tryck på' },
    { duration: 90, borg: 11, name:'Återhämtning', instruction:'Lugnt' },
    { duration: 180, borg: 16, name:'Backe', instruction:'Stående / sittande' },
    { duration: 60, borg: 18, name:'Peak', instruction:'Hårt men kontrollerat' },
    { duration: 120, borg: 12, name:'Återhämtning', instruction:'Hitta andningen' },
    { duration: 180, borg: 15, name:'Tempo', instruction:'Jämnt arbete' },
    { duration: 60, borg: 17, name:'Intervall', instruction:'Sista hårda' },
    { duration: 240, borg: 9, name:'Nedvarvning', instruction:'Lugnt hela vägen ner' },
    { duration: 135, borg: 7, name:'Avslut', instruction:'Mycket lätt' }
  ]
};

function loadWorkouts(){
  const raw = localStorage.getItem(STORAGE_KEY);
  if(!raw){ localStorage.setItem(STORAGE_KEY, JSON.stringify([demoWorkout])); return [demoWorkout]; }
  try { return JSON.parse(raw); } catch { return [demoWorkout]; }
}
function saveWorkouts(workouts){ localStorage.setItem(STORAGE_KEY, JSON.stringify(workouts)); }
function fmt(sec){
  sec = Math.max(0, Math.round(sec));
  const m = Math.floor(sec/60), s = sec%60;
  return `${m}:${String(s).padStart(2,'0')}`;
}
function totalDuration(workout){ return workout.blocks.reduce((a,b)=>a+b.duration,0); }
function heightForBorg(borg){ return Math.max(8, ((borg-6)/(20-6))*92 + 8); }

const app = document.getElementById('app');
let state = { view:'list', workouts: loadWorkouts(), editing:null, player:null };
let timer = null;

function nav(view){ state.view=view; render(); }
function render(){
  clearInterval(timer); timer=null;
  if(state.view==='list') renderList();
  if(state.view==='edit') renderEditor();
  if(state.view==='player') renderPlayer();
}

function shell(content){
  app.innerHTML = `<div class="app-shell"><div class="topbar"><div class="brand"><span>FRISKIS</span> BORG PLAYER</div><button class="btn ghost small" onclick="nav('list')">Mina pass</button></div><main class="container">${content}</main></div>`;
}

function profileHTML(workout, cls='mini-profile'){
  const total=totalDuration(workout)||1;
  return `<div class="${cls}">${workout.blocks.map(b=>`<div class="bar" title="${b.name} · Borg ${b.borg} · ${fmt(b.duration)}" style="height:${heightForBorg(b.borg)}%;background:${borgColor(b.borg)};width:${(b.duration/total)*100}%"></div>`).join('')}</div>`;
}

function renderList(){
  shell(`<div class="hero-row"><div><h1>Mina pass</h1><p class="muted">Välj ett sparat pass eller skapa ett nytt.</p></div><button class="btn primary" onclick="newWorkout()">+ Skapa nytt pass</button></div>
  <div class="grid workout-grid">${state.workouts.map(w=>`<article class="card workout-card"><h3>${escapeHtml(w.name)}</h3><div class="muted">${fmt(totalDuration(w))} · ${w.blocks.length} delar</div>${profileHTML(w)}<div class="card-actions"><button class="btn primary" onclick="startWorkout('${w.id}')">▶ Kör passet</button><button class="btn" onclick="editWorkout('${w.id}')">Redigera</button><button class="btn ghost" onclick="duplicateWorkout('${w.id}')">Duplicera</button><button class="btn ghost" onclick="deleteWorkout('${w.id}')">Radera</button></div></article>`).join('')}</div>`);
}

function newWorkout(){
  state.editing={ id:crypto.randomUUID(), name:'Nytt spinningpass', blocks:[{duration:300,borg:10,name:'Uppvärmning',instruction:''}]};
  state.view='edit'; render();
}
function editWorkout(id){ state.editing=structuredClone(state.workouts.find(w=>w.id===id)); state.view='edit'; render(); }
function duplicateWorkout(id){ const src=state.workouts.find(w=>w.id===id); const copy=structuredClone(src); copy.id=crypto.randomUUID(); copy.name += ' – kopia'; state.workouts.unshift(copy); saveWorkouts(state.workouts); render(); }
function deleteWorkout(id){ if(confirm('Radera passet?')){ state.workouts=state.workouts.filter(w=>w.id!==id); saveWorkouts(state.workouts); render(); } }

function renderEditor(){
  const w=state.editing;
  shell(`<div class="hero-row"><div><h1>Redigera pass</h1><p class="muted">Bredd = tid · Höjd och färg = Borg.</p></div><div><button class="btn" onclick="previewEditing()">▶ Provkör</button> <button class="btn primary" onclick="saveEditing()">Spara pass</button></div></div>
  <div class="editor-layout"><section class="card"><div class="form-row"><div><label>Passnamn</label><input value="${escapeAttr(w.name)}" oninput="state.editing.name=this.value"></div><div><label>Total tid</label><input value="${fmt(totalDuration(w))}" disabled></div></div>
  <div class="section-title"><h2>Passdelar</h2><button class="btn small" onclick="addBlock()">+ Lägg till del</button></div>
  <div class="block-row header"><div></div><div>Tid</div><div>Borg</div><div>Moment</div><div class="instruction-col">Instruktion</div><div></div></div>
  <div id="blockRows">${w.blocks.map((b,i)=>blockRowHTML(b,i)).join('')}</div>
  </section><aside class="profile-preview"><h3 style="margin-top:0">Passprofil</h3>${profileHTML(w,'profile-chart')}<div class="profile-meta"><span>${escapeHtml(w.name)}</span><span>${fmt(totalDuration(w))}</span></div><p class="muted" style="color:#999">Borg 6–20</p></aside></div>`);
}

function blockRowHTML(b,i){
  return `<div class="block-row"><div class="drag">${i+1}</div><input value="${fmt(b.duration)}" onchange="updateDuration(${i},this.value)"><select onchange="updateBlock(${i},'borg',Number(this.value))">${Array.from({length:15},(_,k)=>k+6).map(v=>`<option ${v===b.borg?'selected':''}>${v}</option>`).join('')}</select><input value="${escapeAttr(b.name)}" oninput="updateBlock(${i},'name',this.value,false)"><input class="instruction-col" value="${escapeAttr(b.instruction||'')}" oninput="updateBlock(${i},'instruction',this.value,false)"><button class="icon-btn" onclick="removeBlock(${i})">×</button></div>`;
}
function updateDuration(i,v){
  const m=v.match(/^(\d+):([0-5]\d)$/); if(!m){alert('Ange tid som mm:ss, t.ex. 03:30'); render(); return;}
  state.editing.blocks[i].duration=Number(m[1])*60+Number(m[2]); render();
}
function updateBlock(i,key,val,rerender=true){ state.editing.blocks[i][key]=val; if(rerender) render(); }
function addBlock(){ state.editing.blocks.push({duration:120,borg:13,name:'Ny del',instruction:''}); render(); }
function removeBlock(i){ state.editing.blocks.splice(i,1); render(); }
function saveEditing(){
  const idx=state.workouts.findIndex(w=>w.id===state.editing.id);
  if(idx>=0) state.workouts[idx]=structuredClone(state.editing); else state.workouts.unshift(structuredClone(state.editing));
  saveWorkouts(state.workouts); state.view='list'; render();
}
function previewEditing(){ state.player=createPlayer(structuredClone(state.editing)); state.view='player'; render(); }

function createPlayer(workout){ return {workout, elapsed:0, running:false, startedAt:null}; }
function startWorkout(id){ state.player=createPlayer(structuredClone(state.workouts.find(w=>w.id===id))); state.view='player'; render(); }
function currentBlockInfo(workout, elapsed){
  let acc=0;
  for(let i=0;i<workout.blocks.length;i++){
    const b=workout.blocks[i];
    if(elapsed < acc+b.duration || i===workout.blocks.length-1) return {index:i, block:b, start:acc, end:acc+b.duration, remaining:Math.max(0,acc+b.duration-elapsed)};
    acc+=b.duration;
  }
}
function renderPlayer(){
  const p=state.player, w=p.workout, total=totalDuration(w), info=currentBlockInfo(w,p.elapsed), next=w.blocks[info.index+1];
  app.innerHTML=`<div class="player"><div class="player-top"><div class="brand"><span>FRISKIS</span> BORG PLAYER</div><button class="btn ghost small" style="color:#fff;border-color:#444" onclick="nav('list')">Avsluta</button></div><main class="player-main">
  <div class="player-header"><div class="title">${escapeHtml(w.name)}</div><div class="elapsed">${fmt(p.elapsed)} / ${fmt(total)}</div><div class="current"><div class="borg">BORG ${info.block.borg}</div><div class="label">${borgLabel(info.block.borg)}</div></div></div>
  <div class="live-profile-wrap"><div class="live-profile">${w.blocks.map(b=>`<div class="bar" style="height:${heightForBorg(b.borg)}%;background:${borgColor(b.borg)};width:${(b.duration/total)*100}%"></div>`).join('')}<div class="done-overlay" style="width:${Math.min(100,(p.elapsed/total)*100)}%"></div><div class="time-marker" style="left:${Math.min(100,(p.elapsed/total)*100)}%"></div></div></div>
  <div class="player-info"><div class="now-box"><div class="name">${escapeHtml(info.block.name)}</div><div class="instruction">${escapeHtml(info.block.instruction||'')}</div></div><div class="countdown">${fmt(info.remaining)}</div><div class="next-box">${next?`Nästa: <strong style="color:#fff">Borg ${next.borg}</strong> · ${escapeHtml(next.name)} · ${fmt(next.duration)}`:'Sista delen'}</div></div>
  <div class="player-controls"><button class="btn" onclick="prevBlock()">⏮ Föregående</button><button class="btn primary" onclick="togglePlay()">${p.running?'⏸ Paus':'▶ Start'}</button><button class="btn" onclick="nextBlock()">Nästa ⏭</button><button class="btn dark" onclick="toggleFullscreen()">⛶ Helskärm</button></div>
  <div class="zone-legend">${[8,10,12,14,16,18,20].map(v=>`<span class="legend-chip"><span class="legend-dot" style="background:${borgColor(v)}"></span>${v}</span>`).join('')}</div>
  </main></div>`;
  if(p.running){
    const baseElapsed=p.elapsed; p.startedAt=performance.now();
    timer=setInterval(()=>{
      p.elapsed=Math.min(total, baseElapsed+(performance.now()-p.startedAt)/1000);
      if(p.elapsed>=total){ p.running=false; clearInterval(timer); timer=null; }
      renderPlayer();
    },500);
  }
}
function togglePlay(){ const p=state.player; p.running=!p.running; renderPlayer(); }
function nextBlock(){ const p=state.player, info=currentBlockInfo(p.workout,p.elapsed); p.elapsed=info.end; renderPlayer(); }
function prevBlock(){ const p=state.player, info=currentBlockInfo(p.workout,p.elapsed); p.elapsed=(p.elapsed-info.start>3)?info.start:Math.max(0, info.start-(p.workout.blocks[info.index-1]?.duration||0)); renderPlayer(); }
function toggleFullscreen(){ if(!document.fullscreenElement) document.documentElement.requestFullscreen?.(); else document.exitFullscreen?.(); }
function escapeHtml(s=''){ return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function escapeAttr(s=''){ return escapeHtml(s); }

render();
