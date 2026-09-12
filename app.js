
const SUPABASE_URL='https://eaapffhepvbfcryayipx.supabase.co';
const SUPABASE_KEY='sb_publishable_TP0UobkURSjVgu5QU7neRA_dfBfVMrN';
const APP_PUBLIC_URL='https://limi-friskis.github.io/friskis-borg-player/';
const KEY='friskis-training-passes';
const AUTH_KEY='friskis-training-auth';
const SETTINGS_KEY='friskis-training-settings';
let auth=JSON.parse(localStorage.getItem(AUTH_KEY)||'null');
let currentProfile=null, profiles=[];
let registries={activities:[],models:[],values:[],descriptions:[],moments:[]};
let registryErrors=[];
let settings=Object.assign({prestart:10,soundPrestart:false,soundBlock:false},JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}'));

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
let musicImportDraft=null;
let liveView=localStorage.getItem('friskis-live-view')||'clean';
let cueKey='', prestartTimer=null;
const SESSION_KEY='friskis-active-session';
const app=document.querySelector('#app');
const brandTitle=document.querySelector('#brandTitle');
const brandSub=document.querySelector('#brandSub');
const homeBtn=document.querySelector('#home');

const sec=t=>{let [m,s]=String(t).split(':').map(Number);return (m||0)*60+(s||0)};
const fmt=s=>`${Math.floor(Math.max(0,s)/60)}:${String(Math.max(0,s)%60).padStart(2,'0')}`;
function color(b){b=+b;if(b<=9)return'#7DD3FC';if(b<=12)return'#2563EB';if(b<=14)return'#22C55E';if(b<=17)return'#FACC15';if(b<=19)return'#EF4444';return'#5B0A0A'}
function total(p){return p.parts.reduce((a,x)=>a+sec(x.time),0)}
function setBrand(title='FRISKIS TRAINING PLAYER',sub='PROTOTYPE 2.3.4'){brandTitle.textContent=title;brandSub.innerHTML=sub;brandSub.style.display=sub?'block':'none'}
function setAppBrand(){setBrand('FRISKIS TRAINING PLAYER','PROTOTYPE 2.3.4')}
function setHomeButton(show=true){homeBtn.style.display=show?'inline-block':'none'}
function cache(){localStorage.setItem(KEY,JSON.stringify(passes))}
function loadCache(){try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return[]}}

function headers(extra={}) {
  return {
    'apikey': SUPABASE_KEY,
    'Authorization': 'Bearer '+(auth?.access_token||SUPABASE_KEY),
    'Content-Type':'application/json',
    ...extra
  };
}
let refreshSessionPromise=null;
function jwtExpiryMs(token){
  try{
    const payload=JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
    return payload.exp?payload.exp*1000:0;
  }catch{return 0}
}
function sessionNeedsRefresh(){
  if(!auth?.access_token||!auth?.refresh_token)return false;
  const exp=jwtExpiryMs(auth.access_token);
  return !!exp && exp-Date.now()<60000;
}
async function refreshAuthSession(){
  if(!auth?.refresh_token)throw new Error('Din session har gått ut. Logga in igen för att fortsätta.');
  if(refreshSessionPromise)return refreshSessionPromise;
  refreshSessionPromise=(async()=>{
    try{
      const fresh=await authFetch('token?grant_type=refresh_token',{method:'POST',body:JSON.stringify({refresh_token:auth.refresh_token})});
      if(!fresh?.access_token)throw new Error('Kunde inte förnya sessionen');
      auth={...auth,...fresh,user:fresh.user||auth.user};
      localStorage.setItem(AUTH_KEY,JSON.stringify(auth));
      return auth;
    }catch(e){
      auth=null;currentProfile=null;profiles=[];localStorage.removeItem(AUTH_KEY);
      throw new Error('Din session har gått ut. Logga in igen för att fortsätta.');
    }finally{
      refreshSessionPromise=null;
    }
  })();
  return refreshSessionPromise;
}
async function api(path,opts={},retry=true) {
  if(auth && sessionNeedsRefresh())await refreshAuthSession();
  const res=await fetch(SUPABASE_URL+'/rest/v1/'+path,{...opts,headers:headers(opts.headers||{})});
  const text=await res.text();
  const expired=res.status===401 || /JWT expired|PGRST303/i.test(text);
  if(!res.ok && expired && retry && auth?.refresh_token){
    await refreshAuthSession();
    return api(path,opts,false);
  }
  if(!res.ok){
    if(expired){
      auth=null;currentProfile=null;profiles=[];localStorage.removeItem(AUTH_KEY);
      throw new Error('Din session har gått ut. Logga in igen för att fortsätta.');
    }
    throw new Error(text||('HTTP '+res.status));
  }
  return text?JSON.parse(text):null;
}
async function authFetch(path,opts={}){
  const res=await fetch(SUPABASE_URL+'/auth/v1/'+path,{...opts,headers:{'apikey':SUPABASE_KEY,'Content-Type':'application/json',...(opts.headers||{})}});
  const data=await res.json().catch(()=>({})); if(!res.ok)throw new Error(data.msg||data.error_description||data.message||'Inloggning misslyckades'); return data;
}
async function markOwnProfileActive(){
  if(!auth?.access_token)return;
  try{
    await api('rpc/mark_own_profile_active',{method:'POST',headers:{'Prefer':'return=minimal'},body:'{}'});
  }catch(e){console.warn('Kunde inte markera profilen som aktiv',e)}
}
async function signIn(){
  const email=document.querySelector('#loginEmail')?.value.trim(), password=document.querySelector('#loginPassword')?.value||'';
  try{
    auth=await authFetch('token?grant_type=password',{method:'POST',body:JSON.stringify({email,password})});
    localStorage.setItem(AUTH_KEY,JSON.stringify(auth));
    await markOwnProfileActive();
    await loadProfiles();
    if(currentProfile && !currentProfile.is_active){
      auth=null;currentProfile=null;profiles=[];localStorage.removeItem(AUTH_KEY);
      alert('Ditt konto är inaktiverat. Kontakta en administratör.');
      login();
      return;
    }
    await loadRegistries();
    await loadPasses();
  } catch(e){alert(e.message)}
}
function signOut(){auth=null;currentProfile=null;profiles=[];localStorage.removeItem(AUTH_KEY);loadPasses()}
async function loadProfiles(){
  if(!auth){currentProfile=null;profiles=[];return []}
  try{
    profiles=await api('profiles?select=user_id,display_name,email,role,is_active,onboarding_complete,last_login_at,created_at&order=display_name.asc')||[];
    currentProfile=profiles.find(p=>p.user_id===auth.user?.id)||null;
    return profiles;
  }catch(e){
    console.warn('Kunde inte ladda användarprofiler',e);currentProfile=null;profiles=[];return [];
  }
}
function roleLabel(role){return ({instructor:'Instruktör',admin:'Admin',super_user:'Super User'})[role]||role||'Instruktör'}
function isSuper(){return currentProfile?.role==='super_user'}
function isAdmin(){return ['admin','super_user'].includes(currentProfile?.role)}
function canEditPass(p){return !!auth && (p?.owner_id===auth.user?.id || isSuper())}
function ownerName(p){const pr=profiles.find(x=>x.user_id===p?.owner_id);return pr?.display_name||((p?.owner_id===auth?.user?.id)?(currentProfile?.display_name||auth?.user?.email):'Okänd ägare')}
function login(){stop();setAppBrand();setHomeButton(true);app.innerHTML=`<div class="loginbox"><h1>Logga in</h1><p class="muted">Publika pass kan köras utan konto. Inloggning krävs för att skapa och redigera.</p><input id="loginEmail" type="email" placeholder="E-post"><input id="loginPassword" type="password" placeholder="Lösenord" onkeydown="if(event.key==='Enter')signIn()"><div class="login-links"><button class="linkbtn" onclick="requestPasswordReset()">Glömt lösenord?</button></div><div class="actions"><button class="primary" onclick="signIn()">LOGGA IN</button><button onclick="list()">AVBRYT</button></div></div>`}

async function requestPasswordReset(){
  const email=(document.querySelector('#loginEmail')?.value||prompt('Ange din e-postadress:')||'').trim();
  if(!email)return;
  try{
    await authFetch('recover?redirect_to='+encodeURIComponent(APP_PUBLIC_URL),{method:'POST',body:JSON.stringify({email})});
    alert('Om adressen finns registrerad skickas en länk för att välja ett nytt lösenord.');
  }catch(e){alert('Kunde inte skicka återställningslänken: '+e.message)}
}

function parseAuthCallback(){
  const raw=(location.hash||'').replace(/^#/,'');
  if(!raw)return null;
  const q=new URLSearchParams(raw);
  const type=q.get('type');
  const access_token=q.get('access_token');
  const refresh_token=q.get('refresh_token');
  if(!access_token || !['invite','recovery','signup'].includes(type))return null;
  return {type,access_token,refresh_token};
}

function showSetPassword(callback){
  stop();setAppBrand();setHomeButton(false);
  const heading=callback.type==='recovery'?'Välj ett nytt lösenord':'Välkommen – välj ditt lösenord';
  app.innerHTML=`<div class="loginbox"><h1>${heading}</h1><p class="muted">Lösenordet ska vara minst 8 tecken.</p><input id="newPassword1" type="password" placeholder="Nytt lösenord"><input id="newPassword2" type="password" placeholder="Upprepa lösenord" onkeydown="if(event.key==='Enter')completePasswordSetup()"><div class="actions"><button class="primary" onclick="completePasswordSetup()">SPARA LÖSENORD</button></div></div>`;
  window.pendingAuthCallback=callback;
}

async function completePasswordSetup(){
  const cb=window.pendingAuthCallback;
  const p1=document.querySelector('#newPassword1')?.value||'',p2=document.querySelector('#newPassword2')?.value||'';
  if(p1.length<8){alert('Välj ett lösenord med minst 8 tecken.');return}
  if(p1!==p2){alert('Lösenorden är inte lika.');return}
  try{
    const res=await fetch(SUPABASE_URL+'/auth/v1/user',{method:'PUT',headers:{'apikey':SUPABASE_KEY,'Authorization':'Bearer '+cb.access_token,'Content-Type':'application/json'},body:JSON.stringify({password:p1})});
    const data=await res.json().catch(()=>({}));
    if(!res.ok)throw new Error(data.msg||data.message||'Kunde inte spara lösenordet');
    auth={access_token:cb.access_token,refresh_token:cb.refresh_token,user:data};
    localStorage.setItem(AUTH_KEY,JSON.stringify(auth));
    history.replaceState(null,'',location.pathname+location.search);
    await markOwnProfileActive();
    await loadProfiles();await loadRegistries();await loadPasses();
    alert('Lösenordet är sparat. Du är nu inloggad.');
  }catch(e){alert(e.message)}
}

async function loadRegistries(){
  registryErrors=[];
  const specs=[
    ['activities','activity_types?select=id,code,name,is_active,sort_order&order=sort_order.asc'],
    ['models','intensity_models?select=id,code,name,value_mode,unit_label,is_active,sort_order&order=sort_order.asc'],
    ['values','intensity_values?select=id,intensity_model_id,code,label,numeric_value,min_value,max_value,color_hex,text_color_hex,description,is_active,sort_order&order=sort_order.asc'],
    ['descriptions','block_description_suggestions?select=id,text,is_active,sort_order&order=sort_order.asc'],
    ['moments','block_moment_suggestions?select=id,text,is_active,sort_order&order=sort_order.asc']
  ];
  const results=await Promise.allSettled(specs.map(([,path])=>api(path)));
  results.forEach((r,i)=>{
    const key=specs[i][0];
    if(r.status==='fulfilled') registries[key]=r.value||[];
    else { registries[key]=[]; registryErrors.push(key+': '+(r.reason?.message||'okänt fel')); }
  });
  if(registryErrors.length) console.warn('Registerfel',registryErrors);
  return registryErrors.length===0;
}
function userTools(){
  const name=currentProfile?.display_name||auth?.user?.email||'Användare';
  return `<div class="toplinks">
    ${auth&&isAdmin()?`<button class="iconbtn" title="Användare" aria-label="Användare" onclick="showUsers()">♙</button><button class="iconbtn" title="Register" aria-label="Register" onclick="showRegisters()">☷</button>`:''}
    <button class="iconbtn" title="Inställningar" aria-label="Inställningar" onclick="showSettings()">⚙</button>
    <button class="iconbtn" title="Hjälp" aria-label="Hjälp" onclick="showHelp()">?</button>
    ${auth?`<details class="usermenu"><summary>👤 ${escAttr(name)} ▾</summary><div class="usermenu-pop"><div><b>${escAttr(name)}</b><small>${roleLabel(currentProfile?.role)}</small></div><button onclick="signOut()">Logga ut</button></div></details>`:`<button onclick="login()">LOGGA IN</button>`}
  </div>`
}


function musicDurationText(seconds){seconds=Math.max(0,Math.round(+seconds||0));return fmt(seconds)}
function parseMusicDuration(value){
  const s=String(value||'').trim();
  if(/^\d+$/.test(s))return +s;
  const m=s.match(/^(\d+):([0-5]?\d)$/);return m?(+m[1]*60 + +m[2]):0;
}
function musicCounts(items){
  const tracks=items.filter(x=>x.type==='track').length, pauses=items.filter(x=>x.type==='pause').length;
  const total=items.reduce((n,x)=>n+(+x.duration_sec||0),0);return {tracks,pauses,total};
}
function showMusicImport(){
  if(!auth){login();return}
  if(!isSuper()){alert('Music Import v0.1 är endast tillgänglig för Super Users.');return}
  stop();setBrand('FRISKIS TRAINING PLAYER','MUSIC IMPORT v0.1');setHomeButton(true);musicImportDraft=null;
  app.innerHTML=`${userTools()}<div class="music-import-shell"><div class="music-step">1 AV 3 · SCREENSHOTS</div><h1>Skapa pass från musiklista</h1><p class="muted">Ladda upp en eller flera screenshots från FitnessPlayer. Överlapp mellan bilderna dedupliceras automatiskt.</p>
    <div class="music-upload-card"><div class="field"><label>Namn på musiklista <span class="muted">(valfritt)</span></label><input id="musicTitleHint" placeholder="t.ex. Ingvar Gubbröra HT-26"></div>
    <label class="music-drop" for="musicScreenshots"><b>📷 Välj screenshots</b><span>PNG, JPG eller WEBP · flera bilder går bra</span></label><input id="musicScreenshots" class="sr-only" type="file" accept="image/png,image/jpeg,image/webp" multiple onchange="previewMusicFiles(this.files)"><div id="musicFilePreview" class="music-file-preview"></div></div>
    <div class="actions"><button class="primary" id="analyzeMusicBtn" onclick="analyzeMusicScreenshots()">ANALYSERA MUSIKLISTA</button><button onclick="list()">AVBRYT</button></div>
    <div class="muted music-privacy">Bilderna används endast för analys i importflödet och sparas inte i Training Player-databasen.</div></div>`;
}
function previewMusicFiles(files){
  const box=document.querySelector('#musicFilePreview');if(!box)return;box.innerHTML='';
  [...files].forEach((f,i)=>{const u=URL.createObjectURL(f);box.insertAdjacentHTML('beforeend',`<div class="music-file"><img src="${u}" alt="Screenshot ${i+1}"><div><b>Bild ${i+1}</b><small>${escAttr(f.name)} · ${Math.round(f.size/1024)} KB</small></div></div>`)})
}
async function optimizedImageDataUrl(file){
  const raw=await new Promise((ok,bad)=>{const r=new FileReader();r.onload=()=>ok(r.result);r.onerror=bad;r.readAsDataURL(file)});
  const img=await new Promise((ok,bad)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=bad;i.src=raw});
  const max=1800,scale=Math.min(1,max/Math.max(img.width,img.height)),w=Math.round(img.width*scale),h=Math.round(img.height*scale);
  const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(img,0,0,w,h);
  return c.toDataURL('image/jpeg',.88);
}
async function musicImportEdge(payload,retry=true){
  if(auth&&sessionNeedsRefresh())await refreshAuthSession();
  const res=await fetch(SUPABASE_URL+'/functions/v1/music-import',{method:'POST',headers:{'apikey':SUPABASE_KEY,'Authorization':'Bearer '+auth.access_token,'Content-Type':'application/json'},body:JSON.stringify(payload)});
  const text=await res.text();
  if((res.status===401||/JWT expired/i.test(text))&&retry&&auth?.refresh_token){await refreshAuthSession();return musicImportEdge(payload,false)}
  let data={};try{data=text?JSON.parse(text):{}}catch{data={error:text}}
  if(!res.ok)throw new Error(data.error||data.message||('HTTP '+res.status));return data;
}
async function analyzeMusicScreenshots(){
  if(!isSuper())return;
  const input=document.querySelector('#musicScreenshots'),files=[...(input?.files||[])];
  if(!files.length){alert('Välj minst en screenshot.');return}
  const btn=document.querySelector('#analyzeMusicBtn');btn.disabled=true;btn.textContent='ANALYSERAR…';
  try{
    const images=[];for(let i=0;i<files.length;i++)images.push({name:files[i].name,data_url:await optimizedImageDataUrl(files[i])});
    const data=await musicImportEdge({title_hint:document.querySelector('#musicTitleHint')?.value.trim()||'',images});
    musicImportDraft={title:data.source_title||document.querySelector('#musicTitleHint')?.value.trim()||'Importerad musiklista',items:(data.items||[]).map((x,i)=>({...x,_id:crypto.randomUUID(),order:i+1})),deduplicated_count:data.deduplicated_count||0,screenshot_count:files.length};
    showMusicImportPreview();
  }catch(e){alert('Kunde inte analysera musiklistan: '+e.message);btn.disabled=false;btn.textContent='ANALYSERA MUSIKLISTA'}
}
function musicPreviewRow(x,i){
  return `<tr data-music-row="${i}"><td class="music-order">${i+1}</td><td><select onchange="musicImportDraft.items[${i}].type=this.value;showMusicImportPreview()"><option value="track" ${x.type==='track'?'selected':''}>Låt</option><option value="pause" ${x.type==='pause'?'selected':''}>PAUSE</option></select></td><td>${x.type==='track'?`<input value="${escAttr(x.artist||'')}" oninput="musicImportDraft.items[${i}].artist=this.value">`:''}</td><td>${x.type==='track'?`<input value="${escAttr(x.title||'')}" oninput="musicImportDraft.items[${i}].title=this.value">`:'<b>PAUSE</b>'}</td><td><input class="music-time-input" value="${musicDurationText(x.duration_sec)}" onblur="musicImportDraft.items[${i}].duration_sec=parseMusicDuration(this.value);this.value=musicDurationText(musicImportDraft.items[${i}].duration_sec);refreshMusicStats()"></td><td>${x.confidence!=null&&x.confidence<.8?'<span class="music-review">Kontrollera</span>':'<span class="music-ok">OK</span>'}</td><td><button class="iconbtn small danger" onclick="removeMusicItem(${i})">×</button></td></tr>`;
}
function showMusicImportPreview(){
  if(!musicImportDraft){showMusicImport();return}
  setBrand('FRISKIS TRAINING PLAYER','MUSIC IMPORT v0.1');setHomeButton(true);const c=musicCounts(musicImportDraft.items);
  app.innerHTML=`${userTools()}<div class="music-import-shell wide"><div class="music-step">2 AV 3 · GRANSKA</div><div class="toprow"><div><h1>${escAttr(musicImportDraft.title)}</h1><div class="muted">Kontrollera AI-tolkningen innan passet skapas.${musicImportDraft.deduplicated_count?` · ${musicImportDraft.deduplicated_count} överlappande poster togs bort.`:''}</div></div><div id="musicStats" class="music-stats"><b>${c.tracks} låtar</b><span>${c.pauses} pauser</span><span>${fmt(c.total)}</span></div></div>
  <div class="music-preview-table"><table class="admin-table"><thead><tr><th>#</th><th>Typ</th><th>Artist</th><th>Titel</th><th>Tid</th><th>Status</th><th></th></tr></thead><tbody>${musicImportDraft.items.map(musicPreviewRow).join('')}</tbody></table></div>
  <div class="music-preview-actions"><button onclick="addMusicItem('track')">+ LÅT</button><button onclick="addMusicItem('pause')">+ PAUSE</button><span class="spacer"></span><button onclick="showMusicImport()">TILLBAKA</button><button class="primary" onclick="createPassFromMusic()">SKAPA PASS</button></div></div>`;
}
function refreshMusicStats(){const el=document.querySelector('#musicStats');if(!el)return;const c=musicCounts(musicImportDraft.items);el.innerHTML=`<b>${c.tracks} låtar</b><span>${c.pauses} pauser</span><span>${fmt(c.total)}</span>`}
function removeMusicItem(i){musicImportDraft.items.splice(i,1);showMusicImportPreview()}
function addMusicItem(type){musicImportDraft.items.push({_id:crypto.randomUUID(),type,artist:'',title:'',duration_sec:type==='pause'?10:180,confidence:1});showMusicImportPreview()}
function buildWorkoutPartsFromMusic(items,timelineIds){
  const hasPauses=items.some(x=>x.type==='pause'),parts=[],first=intensityValues({intensity_model_id:registries.models.find(x=>x.code==='borg')?.id})[0];
  const base=()=>({id:Date.now()+Math.random(),time:'2:00',borg:12,intensity:first?.code||'',moment:'',instruction:'',music_refs:[],music_labels:[]});
  if(!hasPauses){
    items.forEach((x,i)=>{if(x.type!=='track')return;const p=base();p.time=fmt(x.duration_sec);p.music_refs=[timelineIds[i]];p.music_labels=[`${x.artist?x.artist+' – ':''}${x.title||'Okänd låt'}`];parts.push(p)});
    return parts;
  }
  let group=base(),groupSeconds=0;
  const flush=()=>{if(!groupSeconds)return;group.time=fmt(groupSeconds);parts.push(group);group=base();groupSeconds=0};
  items.forEach((x,i)=>{
    if(x.type==='pause'){
      flush();const p=base();p.time=fmt(x.duration_sec);p.borg=9;p.moment='Paus';p.instruction='';p.music_refs=[timelineIds[i]];p.music_labels=[`PAUSE · ${fmt(x.duration_sec)}`];parts.push(p);return;
    }
    groupSeconds+=+x.duration_sec||0;group.music_refs.push(timelineIds[i]);group.music_labels.push(`${x.artist?x.artist+' – ':''}${x.title||'Okänd låt'}`);
  });flush();return parts;
}
async function createPassFromMusic(){
  if(!isSuper()||!musicImportDraft)return;
  const items=musicImportDraft.items.map((x,i)=>({...x,order:i+1,duration_sec:+x.duration_sec||0}));
  if(!items.length||items.some(x=>x.duration_sec<=0)){alert('Alla rader måste ha en giltig tid.');return}
  const importId=crypto.randomUUID(),timelineIds=items.map(()=>crypto.randomUUID()),trackIds=items.map(x=>x.type==='track'?crypto.randomUUID():null);
  const starts=[];let cursor=0;items.forEach(x=>{starts.push(cursor);cursor+=x.duration_sec});
  try{
    await api('music_imports',{method:'POST',headers:{'Prefer':'return=minimal'},body:JSON.stringify({id:importId,created_by:auth.user.id,source:'fitnessplayer_screenshot',source_title:musicImportDraft.title,status:'approved',screenshot_count:musicImportDraft.screenshot_count||0})});
    const tracks=items.map((x,i)=>x.type==='track'?{id:trackIds[i],import_id:importId,artist:x.artist||'',title:x.title||'',duration_sec:x.duration_sec,sort_order:i+1,confidence:x.confidence??null}:null).filter(Boolean);
    if(tracks.length)await api('music_tracks',{method:'POST',headers:{'Prefer':'return=minimal'},body:JSON.stringify(tracks)});
    const timeline=items.map((x,i)=>({id:timelineIds[i],import_id:importId,type:x.type,track_id:trackIds[i],duration_sec:x.duration_sec,sort_order:i+1,start_sec:starts[i],end_sec:starts[i]+x.duration_sec,source_screenshot:x.source_screenshot||null,source_order:x.source_order||null,confidence:x.confidence??null}));
    await api('music_timeline_items',{method:'POST',headers:{'Prefer':'return=minimal'},body:JSON.stringify(timeline)});
    const spin=registries.activities.find(x=>x.code==='spinning')||registries.activities[0],borg=registries.models.find(x=>x.code==='borg')||registries.models[0];
    const parts=buildWorkoutPartsFromMusic(items,timelineIds);if(!parts.length)throw new Error('Musiklistan innehåller inga låtar att skapa pass från.');
    const passDraft={id:null,name:musicImportDraft.title,parts,owner_id:auth.user.id,visibility:'private',activity_type_id:spin?.id||null,intensity_model_id:borg?.id||null,remote:false,music_import:{id:importId,title:musicImportDraft.title,track_count:items.filter(x=>x.type==='track').length,pause_count:items.filter(x=>x.type==='pause').length,total_sec:cursor}};
    const saved=await upsertPass(passDraft,true);
    await api('pass_music',{method:'POST',headers:{'Prefer':'return=minimal'},body:JSON.stringify({pass_id:saved.id,import_id:importId})});
    saved.music_import=passDraft.music_import;passes.unshift(saved);cache();musicImportDraft=null;active={p:structuredClone(saved),i:0};drawEdit();
  }catch(e){console.error(e);alert('Kunde inte skapa passet: '+e.message)}
}

function showSettings(){setAppBrand();setHomeButton(true);app.innerHTML=`<div class="settingsbox"><h1>Inställningar</h1><div class="settingrow"><span>Förstart</span><select onchange="settings.prestart=+this.value;saveSettings()"><option value="10" ${settings.prestart==10?'selected':''}>10 sekunder</option><option value="0" ${settings.prestart==0?'selected':''}>Direktstart</option></select></div><div class="settingrow"><span>Ljud under förstart</span><input type="checkbox" ${settings.soundPrestart?'checked':''} onchange="settings.soundPrestart=this.checked;saveSettings()"></div><div class="settingrow"><span>Ljud vid blockbyte</span><input type="checkbox" ${settings.soundBlock?'checked':''} onchange="settings.soundBlock=this.checked;saveSettings()"></div><div class="actions"><button class="primary" onclick="list()">KLAR</button></div><div class="copyright">© 2026 LiMi Equus AB. Alla rättigheter förbehållna.</div></div>`}
function saveSettings(){localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings))}
function showHelp(){setAppBrand();setHomeButton(true);app.innerHTML=`<div class="helpbox"><h1>Friskis Training Player</h1><p><b>Prototype 2.3.4</b></p><p>Skapa, redigera och kör träningspass med valbar aktivitet och intensitetsmodell. Borg använder exakta nivåer och FTP zoner i % FTP.</p><p class="muted">Admin och Super User kan under Registervård administrera aktiviteter, intensitetsmodeller, intensitetsvärden, moment och beskrivningsförslag.</p><p class="muted">Publika pass kan köras utan inloggning. Inloggning krävs för att skapa eller redigera pass.</p><h3>Om</h3><p>Utvecklad av LiMi Equus AB</p><div class="copyright">© 2026 LiMi Equus AB. Alla rättigheter förbehållna.</div><div class="actions"><button class="primary" onclick="list()">MINA PASS</button></div></div>`}

function fmtDateTime(value){
  if(!value)return '—';
  try{return new Intl.DateTimeFormat('sv-SE',{dateStyle:'short',timeStyle:'short'}).format(new Date(value))}
  catch{return value}
}
async function sendPasswordReset(email){
  if(!email)return;
  if(!confirm('Skicka en länk för nytt lösenord till '+email+'?'))return;
  try{
    await authFetch('recover?redirect_to='+encodeURIComponent(APP_PUBLIC_URL),{method:'POST',body:JSON.stringify({email})});
    alert('Länk för nytt lösenord skickad till '+email+'.');
  }catch(e){alert('Kunde inte skicka länken: '+e.message)}
}
async function resendInvite(email){
  if(!email)return;
  if(!confirm('Skicka en ny inbjudan till '+email+'?'))return;
  try{
    const res=await fetch(SUPABASE_URL+'/functions/v1/invite-user',{method:'POST',headers:{'apikey':SUPABASE_KEY,'Authorization':'Bearer '+auth.access_token,'Content-Type':'application/json'},body:JSON.stringify({email,resend:true,redirect_to:APP_PUBLIC_URL})});
    const data=await res.json().catch(()=>({}));
    if(!res.ok)throw new Error(data.error||data.message||'Kunde inte skicka ny inbjudan');
    alert('Ny inbjudan skickad till '+email+'.');
  }catch(e){alert('Kunde inte skicka ny inbjudan: '+e.message)}
}

async function showUsers(){
  if(!auth){login();return}
  await loadProfiles();
  if(!isAdmin()){alert('Du saknar behörighet till användaradministrationen.');list();return}
  stop();setAppBrand();setHomeButton(true);
  const editable=isSuper();
  app.innerHTML=`${userTools()}<div class="toprow"><div><h1>Användare</h1><div class="muted">${editable?'Hantera användare, roller och status.':'Översikt över registrerade användare.'}</div></div><button class="primary" onclick="showInviteUser()">+ BJUD IN ANVÄNDARE</button></div>
  <div class="adminbox user-admin-scroll"><table class="admin-table"><thead><tr><th>Namn / e-post</th><th>Roll</th><th>Status</th><th>Senast inloggad</th><th>Åtgärder</th></tr></thead><tbody>
  ${profiles.map(p=>{
    const status=!p.is_active?'Inaktiv':p.onboarding_complete?'Aktiv':'Inbjuden';
    const cls=!p.is_active?'inactive':p.onboarding_complete?'active':'invited';
    const email=p.email||'';
    const actions=[];
    if(p.user_id!==auth.user?.id){
      if(!p.onboarding_complete && p.is_active && email) actions.push(`<button class="smallbtn" onclick="resendInvite('${escAttr(email)}')">Ny inbjudan</button>`);
      if(p.onboarding_complete && email) actions.push(`<button class="smallbtn" onclick="sendPasswordReset('${escAttr(email)}')">Nytt lösenord</button>`);
      if(editable) actions.push(`<button class="smallbtn" onclick="toggleUserActive('${p.user_id}',${!p.is_active})">${p.is_active?'Inaktivera':'Aktivera'}</button>`);
    }
    return `<tr>
      <td><b>${escAttr(p.display_name||'Namnlös')}</b>${p.user_id===auth.user?.id?' <span class="badge">Du</span>':''}<div class="user-email">${escAttr(email||'Ingen e-post sparad')}</div></td>
      <td>${editable&&p.user_id!==auth.user?.id?`<select onchange="updateUserRole('${p.user_id}',this.value)"><option value="instructor" ${p.role==='instructor'?'selected':''}>Instruktör</option><option value="admin" ${p.role==='admin'?'selected':''}>Admin</option><option value="super_user" ${p.role==='super_user'?'selected':''}>Super User</option></select>`:`<span class="badge">${roleLabel(p.role)}</span>`}</td>
      <td><span class="status ${cls}">${status}</span></td>
      <td class="nowrap">${fmtDateTime(p.last_login_at)}</td>
      <td><div class="user-actions">${actions.join('')}</div></td>
    </tr>`;
  }).join('')}
  </tbody></table></div>`;
}

function showInviteUser(){
  if(!auth||!isAdmin())return;
  app.innerHTML=`${userTools()}<div class="loginbox"><h1>Bjud in användare</h1><p class="muted">Användaren får ett mejl och väljer själv sitt lösenord.</p><input id="inviteName" type="text" placeholder="Namn"><input id="inviteEmail" type="email" placeholder="E-post"><div class="field" style="margin-top:10px"><label>Roll</label><select id="inviteRole"><option value="instructor">Instruktör</option><option value="admin">Admin</option>${isSuper()?'<option value="super_user">Super User</option>':''}</select></div><div class="actions"><button class="primary" onclick="inviteUser()">SKICKA INBJUDAN</button><button onclick="showUsers()">AVBRYT</button></div></div>`;
}

async function inviteUser(){
  const email=document.querySelector('#inviteEmail')?.value.trim();
  const display_name=document.querySelector('#inviteName')?.value.trim();
  const role=document.querySelector('#inviteRole')?.value||'instructor';
  if(!email){alert('Ange e-postadress.');return}
  try{
    const res=await fetch(SUPABASE_URL+'/functions/v1/invite-user',{method:'POST',headers:{'apikey':SUPABASE_KEY,'Authorization':'Bearer '+auth.access_token,'Content-Type':'application/json'},body:JSON.stringify({email,display_name,role,redirect_to:APP_PUBLIC_URL})});
    const data=await res.json().catch(()=>({}));
    if(!res.ok)throw new Error(data.error||data.message||'Kunde inte skicka inbjudan');
    alert('Inbjudan skickad till '+email+'.');
    await loadProfiles();showUsers();
  }catch(e){alert('Kunde inte bjuda in användaren: '+e.message)}
}

async function updateUserRole(userId,role){
  if(!isSuper())return;
  try{await api('profiles?user_id=eq.'+encodeURIComponent(userId),{method:'PATCH',headers:{'Prefer':'return=minimal'},body:JSON.stringify({role})});await loadProfiles();showUsers()}catch(e){alert('Kunde inte ändra roll: '+e.message)}
}
async function toggleUserActive(userId,value){
  if(!isSuper())return;
  const owns=passes.some(p=>p.remote&&p.owner_id===userId);
  if(!value&&owns){alert('Användaren äger fortfarande pass. Byt ägare på passen innan användaren inaktiveras.');return}
  try{await api('profiles?user_id=eq.'+encodeURIComponent(userId),{method:'PATCH',headers:{'Prefer':'return=minimal'},body:JSON.stringify({is_active:value})});await loadProfiles();showUsers()}catch(e){alert('Kunde inte ändra status: '+e.message)}
}


const registerTabs=[
  {key:'activities',label:'Aktiviteter'},
  {key:'models',label:'Intensitetsmodeller'},
  {key:'moments',label:'Moment'},
  {key:'descriptions',label:'Beskrivningar'}
];
let activeRegisterTab='activities';
let activeIntensityModelId=null;

function safeCode(s){
  return String(s||'').trim().toLowerCase().replace(/[åä]/g,'a').replace(/ö/g,'o').replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
}
function regSort(a,b){return (+a.sort_order||0)-(+b.sort_order||0)}
function registerRowActions(kind,id,isActive){
  return `<div class="reg-actions">
    <button class="smallbtn" onclick="saveRegisterRow('${kind}','${id}')">Spara</button>
    <button class="smallbtn" onclick="toggleRegisterRow('${kind}','${id}',${!isActive})">${isActive?'Inaktivera':'Aktivera'}</button>
  </div>`;
}
async function showRegisters(tab=activeRegisterTab){
  if(!auth||!isAdmin()){alert('Du saknar behörighet till registervården.');list();return}
  activeRegisterTab=tab;
  await loadRegistries();
  stop();setAppBrand();setHomeButton(true);
  app.innerHTML=`${userTools()}
    <div class="toprow"><div><h1>Registervård</h1><div class="muted">Gemensamma register för Training Player. Inaktivera hellre än att radera sådant som redan kan användas i pass.</div></div></div>
    <div class="register-tabs">${registerTabs.map(t=>`<button class="${t.key===tab?'active':''}" onclick="showRegisters('${t.key}')">${t.label}</button>`).join('')}</div>
    <div id="registerPane"></div>`;
  renderRegisterPane();
}

function renderRegisterPane(){
  const pane=document.querySelector('#registerPane');
  if(!pane)return;
  if(activeRegisterTab==='activities') pane.innerHTML=renderActivitiesRegister();
  else if(activeRegisterTab==='models') pane.innerHTML=renderModelsRegister();
  else if(activeRegisterTab==='moments') pane.innerHTML=renderTextRegister('moments','Moment');
  else pane.innerHTML=renderTextRegister('descriptions','Beskrivning');
}

function renderActivitiesRegister(){
  const rows=[...registries.activities].sort(regSort);
  return `<div class="adminbox register-box">
    <div class="register-head"><div><h2>Aktiviteter</h2><div class="muted">Exempel: Spinning, Indoor Walking.</div></div><button class="primary smallbtn" onclick="addRegisterRow('activities')">+ NY AKTIVITET</button></div>
    <div class="user-admin-scroll"><table class="admin-table register-table"><thead><tr><th>Namn</th><th>Kod</th><th>Ordning</th><th>Status</th><th></th></tr></thead><tbody>
    ${rows.map(r=>`<tr data-reg-kind="activities" data-id="${r.id}">
      <td><input data-f="name" value="${escAttr(r.name||'')}"></td>
      <td><input data-f="code" value="${escAttr(r.code||'')}"></td>
      <td><input data-f="sort_order" type="number" value="${+r.sort_order||0}"></td>
      <td><span class="status ${r.is_active?'active':'inactive'}">${r.is_active?'Aktiv':'Inaktiv'}</span></td>
      <td>${registerRowActions('activities',r.id,!!r.is_active)}</td></tr>`).join('')}
    </tbody></table></div></div>`;
}

function renderModelsRegister(){
  const rows=[...registries.models].sort(regSort);
  if(!activeIntensityModelId || !rows.some(r=>r.id===activeIntensityModelId)) activeIntensityModelId=rows[0]?.id||null;
  return `<div class="adminbox register-box">
    <div class="register-head"><div><h2>Intensitetsmodeller</h2><div class="muted">Borg använder exakta nivåer. FTP använder zoner/intervall i % FTP.</div></div><button class="primary smallbtn" onclick="addRegisterRow('models')">+ NY MODELL</button></div>
    <div class="user-admin-scroll"><table class="admin-table register-table"><thead><tr><th>Namn</th><th>Kod</th><th>Typ</th><th>Enhet</th><th>Ordning</th><th>Status</th><th></th></tr></thead><tbody>
    ${rows.map(r=>`<tr data-reg-kind="models" data-id="${r.id}">
      <td><input data-f="name" value="${escAttr(r.name||'')}"></td>
      <td><input data-f="code" value="${escAttr(r.code||'')}"></td>
      <td><select data-f="value_mode"><option value="exact" ${r.value_mode==='exact'?'selected':''}>Exakt</option><option value="zone" ${r.value_mode==='zone'?'selected':''}>Zon</option><option value="range" ${r.value_mode==='range'?'selected':''}>Intervall</option></select></td>
      <td><input data-f="unit_label" value="${escAttr(r.unit_label||'')}"></td>
      <td><input data-f="sort_order" type="number" value="${+r.sort_order||0}"></td>
      <td><span class="status ${r.is_active?'active':'inactive'}">${r.is_active?'Aktiv':'Inaktiv'}</span></td>
      <td><div class="reg-actions">${registerRowActions('models',r.id,!!r.is_active)}<button class="smallbtn value-button ${activeIntensityModelId===r.id?'selected':''}" onclick="activeIntensityModelId='${r.id}';renderRegisterPane()">Värden</button></div></td>
    </tr>`).join('')}
    </tbody></table></div>
    ${activeIntensityModelId?renderIntensityValues(activeIntensityModelId):''}
  </div>`;
}

function renderIntensityValues(modelId){
  const model=registries.models.find(m=>m.id===modelId);
  const rows=registries.values.filter(v=>v.intensity_model_id===modelId).sort(regSort);
  const zoned=model?.value_mode==='zone'||model?.value_mode==='range';
  const unit=model?.unit_label||'';
  return `<div class="intensity-values">
    <div class="register-head"><div><h3>Värden – ${escAttr(model?.name||'')}</h3><div class="muted">${zoned?`Zon/intervall anges med Från och Till${unit?' i '+escAttr(unit):''}.`:'Exakta nivåer anges i Värde.'} Färgerna är endast presentation.</div></div><button class="smallbtn" onclick="addIntensityValue('${modelId}')">+ NYTT VÄRDE</button></div>
    ${model?.code==='ftp'?`<div class="muted" style="margin:0 0 10px"><b>Förslag:</b> FTP-zonerna är ett diskussionsunderlag och kan ändras av Admin/Super User när Friskis har fastställt nivåerna.</div>`:''}
    <div class="user-admin-scroll"><table class="admin-table register-table values-table"><thead><tr><th>Etikett</th><th>Kod</th>${zoned?`<th>Från ${escAttr(unit)}</th><th>Till ${escAttr(unit)}</th>`:'<th>Värde</th>'}<th>Beskrivning</th><th>Färg</th><th>Text</th><th>Ordning</th><th>Status</th><th></th></tr></thead><tbody>
    ${rows.map(r=>`<tr data-reg-kind="values" data-id="${r.id}">
      <td><input data-f="label" value="${escAttr(r.label||'')}"></td>
      <td><input data-f="code" value="${escAttr(r.code||'')}"></td>
      ${zoned?`<td><input data-f="min_value" type="number" step="0.1" value="${r.min_value??''}" placeholder="Ingen"></td><td><input data-f="max_value" type="number" step="0.1" value="${r.max_value??''}" placeholder="Ingen"></td>`:`<td><input data-f="numeric_value" type="number" step="0.1" value="${r.numeric_value??''}"></td>`}
      <td><input data-f="description" value="${escAttr(r.description||'')}"></td>
      <td><input data-f="color_hex" class="color-text" value="${escAttr(r.color_hex||'#888888')}"><input data-color-for="color_hex" type="color" value="${escAttr(r.color_hex||'#888888')}" oninput="this.previousElementSibling.value=this.value"></td>
      <td><input data-f="text_color_hex" class="color-text" value="${escAttr(r.text_color_hex||'#ffffff')}"><input data-color-for="text_color_hex" type="color" value="${escAttr(r.text_color_hex||'#ffffff')}" oninput="this.previousElementSibling.value=this.value"></td>
      <td><input data-f="sort_order" type="number" value="${+r.sort_order||0}"></td>
      <td><span class="status ${r.is_active?'active':'inactive'}">${r.is_active?'Aktiv':'Inaktiv'}</span></td>
      <td>${registerRowActions('values',r.id,!!r.is_active)}</td>
    </tr>`).join('')}
    </tbody></table></div></div>`;
}

function renderTextRegister(kind,title){
  const rows=[...registries[kind]].sort(regSort);
  return `<div class="adminbox register-box">
    <div class="register-head"><div><h2>${title}</h2><div class="muted">Förslag i editorn. Instruktören kan fortfarande skriva egen fritext.</div></div><button class="primary smallbtn" onclick="addRegisterRow('${kind}')">+ NYTT FÖRSLAG</button></div>
    <div class="user-admin-scroll"><table class="admin-table register-table"><thead><tr><th>Text</th><th>Ordning</th><th>Status</th><th></th></tr></thead><tbody>
    ${rows.map(r=>`<tr data-reg-kind="${kind}" data-id="${r.id}">
      <td><input data-f="text" value="${escAttr(r.text||'')}"></td>
      <td><input data-f="sort_order" type="number" value="${+r.sort_order||0}"></td>
      <td><span class="status ${r.is_active?'active':'inactive'}">${r.is_active?'Aktiv':'Inaktiv'}</span></td>
      <td>${registerRowActions(kind,r.id,!!r.is_active)}</td>
    </tr>`).join('')}
    </tbody></table></div></div>`;
}

function registerTable(kind){
  return {activities:'activity_types',models:'intensity_models',values:'intensity_values',moments:'block_moment_suggestions',descriptions:'block_description_suggestions'}[kind];
}
function registerFields(kind){
  return {
    activities:['name','code','sort_order'],
    models:['name','code','value_mode','unit_label','sort_order'],
    values:['label','code','numeric_value','min_value','max_value','description','color_hex','text_color_hex','sort_order'],
    moments:['text','sort_order'],
    descriptions:['text','sort_order']
  }[kind]||[];
}
function readRegisterRow(kind,id){
  const tr=document.querySelector(`tr[data-reg-kind="${kind}"][data-id="${id}"]`);
  if(!tr)throw new Error('Raden hittades inte.');
  const obj={};
  registerFields(kind).forEach(f=>{
    const el=tr.querySelector(`[data-f="${f}"]`);
    if(!el)return;
    let v=el.value;
    if(['sort_order','numeric_value','min_value','max_value'].includes(f)) v=v===''?null:+v;
    obj[f]=v;
  });
  return obj;
}
async function saveRegisterRow(kind,id){
  if(!isAdmin())return;
  try{
    const payload=readRegisterRow(kind,id);
    if((kind==='activities'||kind==='models')&&!payload.code) payload.code=safeCode(payload.name);
    await api(registerTable(kind)+'?id=eq.'+encodeURIComponent(id),{method:'PATCH',headers:{'Prefer':'return=minimal'},body:JSON.stringify(payload)});
    await loadRegistries();renderRegisterPane();
  }catch(e){alert('Kunde inte spara: '+e.message)}
}
async function toggleRegisterRow(kind,id,value){
  if(!isAdmin())return;
  try{
    await api(registerTable(kind)+'?id=eq.'+encodeURIComponent(id),{method:'PATCH',headers:{'Prefer':'return=minimal'},body:JSON.stringify({is_active:value})});
    await loadRegistries();renderRegisterPane();
  }catch(e){alert('Kunde inte ändra status: '+e.message)}
}
async function addRegisterRow(kind){
  if(!isAdmin())return;
  try{
    const table=registerTable(kind);
    let payload;
    if(kind==='activities'){
      const name=prompt('Namn på aktivitet:'); if(!name)return;
      payload={name:name.trim(),code:safeCode(name),is_active:true,sort_order:(Math.max(0,...registries.activities.map(x=>+x.sort_order||0))+10)};
    }else if(kind==='models'){
      const name=prompt('Namn på intensitetsmodell:'); if(!name)return;
      payload={name:name.trim(),code:safeCode(name),value_mode:'exact',unit_label:'',is_active:false,sort_order:(Math.max(0,...registries.models.map(x=>+x.sort_order||0))+10)};
    }else{
      const text=prompt(kind==='moments'?'Nytt moment:':'Ny beskrivning:'); if(!text)return;
      payload={text:text.trim(),is_active:true,sort_order:(Math.max(0,...registries[kind].map(x=>+x.sort_order||0))+10)};
    }
    await api(table,{method:'POST',headers:{'Prefer':'return=minimal'},body:JSON.stringify(payload)});
    await loadRegistries();renderRegisterPane();
  }catch(e){alert('Kunde inte skapa: '+e.message)}
}
async function addIntensityValue(modelId){
  if(!isAdmin())return;
  try{
    const label=prompt('Etikett för värdet/zonen:'); if(!label)return;
    const siblings=registries.values.filter(v=>v.intensity_model_id===modelId);
    const payload={intensity_model_id:modelId,label:label.trim(),code:safeCode(label),color_hex:'#888888',text_color_hex:'#ffffff',is_active:true,sort_order:(Math.max(0,...siblings.map(x=>+x.sort_order||0))+10)};
    await api('intensity_values',{method:'POST',headers:{'Prefer':'return=minimal'},body:JSON.stringify(payload)});
    await loadRegistries();renderRegisterPane();
  }catch(e){alert('Kunde inte skapa värde: '+e.message)}
}

function setSync(state,msg){
  const el=document.querySelector('#syncState');
  if(!el)return;
  el.className='sync '+state;
  el.innerHTML=`<span class="sync-dot"></span>${msg}`;
}
async function loadPasses(){
  const cached=loadCache();
  const legacyLocal=cached.filter(p=>!p.remote && p.id!=='demo-short' && !p.builtIn).map(p=>({...p,legacyLocal:true,visibility:'private'}));
  passes=cached.length?cached:[{...shortDemo,builtIn:true}];
  if(!passes.some(p=>p.id==='demo-short')) passes.push({...shortDemo,builtIn:true});
  list();
  setSync('work','Synkar...');
  try{
    const rows=await api('passes?select=id,name,parts,updated_at,owner_id,visibility,activity_type_id,intensity_model_id&order=updated_at.desc');
    online=true;

    const remotePasses=(rows||[]).map(r=>({
      id:r.id,
      name:r.name,
      parts:r.parts||[],owner_id:r.owner_id,visibility:r.visibility||'public',activity_type_id:r.activity_type_id,intensity_model_id:r.intensity_model_id,
      remote:true
    }));

    // Centralt lagrade pass är normalläget. Gamla lokala pass behålls endast
    // tills användaren hunnit importera dem som privata.
    passes=[...remotePasses,...legacyLocal,{...shortDemo,builtIn:true}];

    cache();
    list();
    setSync('ok','Centralt sparat');
  }catch(e){
    online=false;
    if(!passes.some(p=>p.id==='demo-short')) passes.push({...shortDemo,builtIn:true});
    list();
    setSync('err','Offline · visar senast synkade pass');
    console.error(e);
  }
}
async function upsertPass(p,isNew){
  if(!online)throw new Error('Ingen anslutning. Passet kan inte sparas förrän Training Player är online.')
  const body={name:p.name,parts:p.parts,updated_at:new Date().toISOString(),visibility:p.visibility||'public',activity_type_id:p.activity_type_id||null,intensity_model_id:p.intensity_model_id||null}; if(auth?.user?.id)body.owner_id=p.owner_id||auth.user.id;
  if(isNew || !p.remote){
    const rows=await api('passes?select=id,name,parts,updated_at,owner_id,visibility,activity_type_id,intensity_model_id',{
      method:'POST',
      headers:{'Prefer':'return=representation'},
      body:JSON.stringify(body)
    });
    const r=rows[0]; return {...p,...r,parts:r.parts||[],remote:true};
  }else{
    const rows=await api('passes?id=eq.'+encodeURIComponent(p.id)+'&select=id,name,parts,updated_at',{
      method:'PATCH',
      headers:{'Prefer':'return=representation'},
      body:JSON.stringify(body)
    });
    const r=rows[0]; return {...p,...r,parts:r.parts||[],remote:true};
  }
}
async function deleteRemote(p){
  if(!online || !p.remote)return;
  await api('passes?id=eq.'+encodeURIComponent(p.id),{method:'DELETE'});
}

function intensityModel(p){return registries.models.find(x=>x.id===p.intensity_model_id)}
function intensityValues(p){return registries.values.filter(v=>v.intensity_model_id===p.intensity_model_id&&v.is_active!==false).sort(regSort)}
function intensityValue(p,part){
  const model=intensityModel(p);
  if(!model||model.code==='borg') return intensityValues(p).find(v=>+v.numeric_value===+part.borg)||null;
  const vals=intensityValues(p);
  return vals.find(v=>v.code===part.intensity||v.id===part.intensity||v.label===part.intensity)||vals[0]||null;
}
function intensityLabel(p,part){
  const model=intensityModel(p);
  if(!model||model.code==='borg')return String(part.borg??'');
  const v=intensityValue(p,part); if(!v)return part.intensity||'—';
  const unit=model.unit_label||'';
  let range='';
  if(v.min_value!=null&&v.max_value!=null)range=`${v.min_value}–${v.max_value} ${unit}`;
  else if(v.max_value!=null)range=`≤${v.max_value} ${unit}`;
  else if(v.min_value!=null)range=`>${v.min_value} ${unit}`;
  return `${v.label}${range?' · '+range:''}`;
}
function intensityShort(p,part){const m=intensityModel(p);return (!m||m.code==='borg')?String(part.borg??''):intensityValue(p,part)?.label||part.intensity||'—'}
function intensityRange(p,part){
  const m=intensityModel(p);if(!m||m.code==='borg')return '';
  const v=intensityValue(p,part);if(!v)return '';
  const unit=m.code==='ftp'?'%':(m.unit_label||'');
  if(v.min_value==null&&v.max_value!=null)return `≤ ${v.max_value} ${unit}`.trim();
  if(v.min_value!=null&&v.max_value==null)return `> ${Number(v.min_value)-1} ${unit}`.trim();
  if(v.min_value!=null&&v.max_value!=null)return `${v.min_value}–${v.max_value} ${unit}`.trim();
  return ''
}
function zoneTextClass(p,part){
  const t=intensityShort(p,part)||'';
  if(t.length>=13)return 'zone-xlong';
  if(t.length>=10)return 'zone-long';
  if(t.length>=7)return 'zone-medium';
  return ''
}
function intensityColor(p,part){const m=intensityModel(p);if(!m||m.code==='borg')return color(part.borg);return intensityValue(p,part)?.color_hex||'#888888'}
function intensityHeight(p,part){const m=intensityModel(p);if(!m||m.code==='borg')return Math.max(15,(part.borg-6)/14*100);const vals=intensityValues(p),v=intensityValue(p,part),i=Math.max(0,vals.findIndex(x=>x.id===v?.id));return vals.length?Math.max(20,((i+1)/vals.length)*100):50}
function intensityHeading(p){const m=intensityModel(p);return (!m||m.code==='borg')?'BORG':(m.name||'INTENSITET').toUpperCase()}
function bars(p,cls='mini'){let T=total(p)||1;return `<div class="${cls}">${p.parts.map(x=>`<div class="bar" title="${escAttr(intensityLabel(p,x))}" style="width:${sec(x.time)/T*100}%;height:${intensityHeight(p,x)}%;background:${intensityColor(p,x)}"></div>`).join('')}</div>`}

function activityName(p){return registries.activities.find(x=>x.id===p.activity_type_id)?.name||'Spinning'}
function modelName(p){return registries.models.find(x=>x.id===p.intensity_model_id)?.name||'Borg'}
function list(){
  stop(); setAppBrand(); setHomeButton(false);
  const legacyCount=passes.filter(p=>p.legacyLocal).length;
  app.innerHTML=`${userTools()}<div class="toprow"><div><h1>Mina pass</h1><div class="muted">${auth?'Inloggad som '+escAttr(currentProfile?.display_name||auth.user?.email||'användare')+' · '+roleLabel(currentProfile?.role):'Publika pass kan köras utan inloggning'} <span id="syncState" class="sync"><span class="sync-dot"></span></span></div></div><div class="toprow-actions">${isSuper()?`<button onclick="showMusicImport()">🎵 SKAPA PASS FRÅN MUSIKLISTA</button>`:''}<button class="primary" onclick="${auth?'edit()':'login()'}">+ SKAPA NYTT PASS</button></div></div>
  ${legacyCount?`<div class="legacy-banner"><b>${legacyCount} äldre lokalt ${legacyCount===1?'pass':'sparade pass'} hittades.</b> Flytta ${legacyCount===1?'det':'dem'} till Mina Pass så sparas ${legacyCount===1?'det':'de'} centralt som Privat.</div>`:''}
  <div class="cards">${passes.map((p,i)=>`<div class="card"><h2>${escAttr(p.name)}</h2><div><span class="badge">${activityName(p)}</span><span class="badge">${modelName(p)}</span>${p.builtIn?`<span class="badge">Demo</span>`:`<span class="badge">${p.visibility==='private'?'🔒 Privat':'🌐 Publikt'}</span>`}${auth&&p.remote?`<span class="badge ownerbadge">👤 ${escAttr(ownerName(p))}</span>`:''}</div><div class="muted" style="margin-top:8px">${fmt(total(p))} · ${p.parts.length} delar</div>${p.legacyLocal?`<div class="pass-storage legacy"><i></i>Äldre lokalt pass · flytta till Mina Pass</div>`:p.remote?`<div class="pass-storage remote"><i></i>Centralt sparat</div>`:''}${bars(p)}
  <div class="actions"><button class="primary" onclick="run(${i})">▶ KÖR PASSET</button>${p.legacyLocal?`${auth?`<button onclick="importLocalPass(${i})">SPARA SOM PRIVAT</button>`:`<button onclick="login()">LOGGA IN FÖR ATT SPARA</button>`}`:auth&&canEditPass(p)?`<button onclick="edit(${i})">REDIGERA</button><button onclick="duplicate(${i})">DUPLICERA</button><button onclick="del(${i})">RADERA</button>`:auth&&(p.remote||p.builtIn)?`<button onclick="duplicate(${i})">DUPLICERA</button>`:''}</div></div>`).join('')}</div>`;
  setSync(online?'ok':'err',online?'Centralt sparat':'Offline · visar senast synkade pass');
}
async function edit(i){
  if(!auth){login();return}
  if(i!=null && passes[i]?.legacyLocal){alert('Flytta först det äldre lokala passet till Mina Pass som Privat.');return}
  if(i!=null && !canEditPass(passes[i])){alert('Du kan bara redigera pass som du äger. Super User kan redigera alla pass.');return}
  stop(); setAppBrand(); setHomeButton(true);
  if(!registries.activities.length || !registries.models.length){
    await loadRegistries();
  }
  if(!registries.activities.length || !registries.models.length){
    app.innerHTML=`<div class="registry-error"><h1>Register kunde inte laddas</h1><p>Aktivitet och intensitetsmodell måste hämtas från databasen innan passet kan redigeras.</p><p class="muted">${registryErrors.join('<br>')||'Kontrollera databasbehörigheter för registertabellerna.'}</p><div class="actions"><button class="primary" onclick="edit(${i==null?'null':i})">FÖRSÖK IGEN</button><button onclick="list()">MINA PASS</button></div></div>`;
    return;
  }
  let borg=registries.models.find(x=>x.code==='borg'), spin=registries.activities.find(x=>x.code==='spinning');
  let p=i==null?{id:null,name:'Nytt pass',visibility:'private',owner_id:auth.user.id,activity_type_id:spin?.id||registries.activities[0]?.id||null,intensity_model_id:borg?.id||registries.models[0]?.id||null,parts:[{id:1,time:'5:00',borg:10,moment:'Uppvärmning',instruction:''}],remote:false}:structuredClone(passes[i]);
  if(!p.activity_type_id) p.activity_type_id=spin?.id||registries.activities[0]?.id||null;
  if(!p.intensity_model_id) p.intensity_model_id=borg?.id||registries.models[0]?.id||null;
  active={p,i}; drawEdit();
}
function escAttr(v){return String(v??'').replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;')}
function drawEdit(focus=null){
  let p=active.p; const model=registries.models.find(x=>x.id===p.intensity_model_id); const isBorg=!model||model.code==='borg';
  const pageTitle=active.i==null?'Skapa nytt pass':'Redigera pass';
  app.innerHTML=`<div class="editor-head"><div><h1>${pageTitle}</h1><div class="muted">Direktredigera tabellen. Moment och beskrivning har förslag men tillåter egen text.</div></div></div><div class="editor">
  <input class="name" id="pname" value="${escAttr(p.name)}" oninput="active.p.name=this.value">
  ${p.music_import?`<div class="music-editor-summary"><span>🎵</span><div><b>${escAttr(p.music_import.title||'Importerad musiklista')}</b><small>${p.music_import.track_count||0} låtar${p.music_import.pause_count?` · ${p.music_import.pause_count} pauser`:''} · ${fmt(p.music_import.total_sec||0)}</small></div></div>`:''}
  <div class="meta-grid"><div class="field"><label>Aktivitet</label><select onchange="active.p.activity_type_id=this.value;drawEdit()">${registries.activities.filter(x=>x.is_active!==false).map(x=>`<option value="${x.id}" ${x.id===p.activity_type_id?'selected':''}>${x.name}</option>`).join('')}</select></div><div class="field"><label>Intensitetsmodell</label><select onchange="active.p.intensity_model_id=this.value;const v=intensityValues(active.p)[0];if(v)active.p.parts.forEach(x=>x.intensity=v.code);drawEdit()">${registries.models.filter(x=>x.is_active!==false).map(x=>`<option value="${x.id}" ${x.id===p.intensity_model_id?'selected':''}>${x.name}</option>`).join('')}</select></div>${isSuper()?`<div class="field owner-field"><label>Ägare</label><select onchange="active.p.owner_id=this.value">${profiles.filter(x=>x.is_active!==false).map(x=>`<option value="${x.user_id}" ${x.user_id===p.owner_id?'selected':''}>${escAttr(x.display_name||'Användare')} · ${roleLabel(x.role)}</option>`).join('')}</select></div>`:`<div class="field owner-field"><label>Ägare</label><div class="readonly-field">${escAttr(ownerName(p))}</div></div>`}</div>
  <div class="visibility"><b>Synlighet:</b><label><input type="radio" name="vis" ${p.visibility!=='private'?'checked':''} onchange="active.p.visibility='public'"> 🌐 Publikt</label><label><input type="radio" name="vis" ${p.visibility==='private'?'checked':''} onchange="active.p.visibility='private'"> 🔒 Privat</label></div>
  ${bars(p,'profile editor-profile')}
  <div class="row row-head"><span>#</span><span>Tid</span><span>Intensitet</span><span>Moment</span><span>Beskrivning</span><span></span></div>
  <div id="rows">${p.parts.map((x,j)=>`${j>0?`<div class="insert-block"><button type="button" onclick="insertPartAt(${j})">＋ Infoga block</button></div>`:''}${x.music_labels?.length?`<div class="music-block-label"><span>🎵</span><span>${x.music_labels.map(escAttr).join(' · ')}</span></div>`:''}<div class="row editor-block" data-row="${j}" ondragover="blockDragOver(event,${j})" ondragleave="blockDragLeave(event)" ondrop="blockDrop(event,${j})"><b>${j+1}</b>
  <input data-field="time" value="${escAttr(x.time)}" oninput="setPart(${j},'time',this.value)" onkeydown="editorKey(event,${j},'time')">
  ${isBorg?`<select data-field="borg" class="borginput" onchange="setPart(${j},'borg',this.value);this.style.background=color(this.value);refreshProfile()" onkeydown="editorKey(event,${j},'borg')" style="background:${color(x.borg)}">${registries.values.filter(v=>v.intensity_model_id===p.intensity_model_id&&v.is_active!==false).map(v=>`<option value="${v.numeric_value}" ${+v.numeric_value===+x.borg?'selected':''}>${v.label}</option>`).join('')||Array.from({length:15},(_,k)=>`<option value="${k+6}" ${k+6===+x.borg?'selected':''}>${k+6}</option>`).join('')}</select>`:`<select data-field="borg" class="borginput" onchange="setPart(${j},'intensity',this.value);this.style.background=intensityColor(active.p,active.p.parts[${j}]);refreshProfile()" onkeydown="editorKey(event,${j},'borg')" style="background:${intensityColor(p,x)}">${intensityValues(p).map(v=>`<option value="${escAttr(v.code)}" ${v.code===(x.intensity||intensityValues(p)[0]?.code)?'selected':''}>${escAttr(v.label)}${v.min_value!=null||v.max_value!=null?' · '+(v.min_value==null?'≤'+v.max_value:v.max_value==null?'>'+v.min_value:v.min_value+'–'+v.max_value)+' '+escAttr(model?.unit_label||''):''}</option>`).join('')}</select>`}
  ${comboField('moment',j,x.moment,'Moment','moments')}
  ${comboField('instruction',j,x.instruction,'Beskrivning','descriptions','instruction')}
  <div class="rowtools"><button type="button" class="iconbtn small drag-handle" title="Dra för att flytta block" aria-label="Dra för att flytta block" draggable="true" ondragstart="blockDragStart(event,${j})" ondragend="blockDragEnd(event)" onpointerdown="blockPointerStart(event,${j})" onpointermove="blockPointerMove(event)" onpointerup="blockPointerEnd(event)" onpointercancel="blockPointerCancel(event)">⋮⋮</button>${j<p.parts.length-1?`<button class="iconbtn small" title="Slå ihop med nästa block" onclick="mergePartWithNext(${j})">⇥</button>`:''}<button class="iconbtn small" title="Duplicera block" onclick="duplicatePart(${j})">⧉</button><button class="iconbtn small danger" title="Ta bort block" onclick="removePart(${j})">×</button></div></div>`).join('')}</div>
  <div class="editor-actions-sticky"><div class="editor-total"><b>Total tid: <span id="editorTotal">${fmt(total(p))}</span></b></div><div class="actions editor-actions"><button onclick="addPart(null,true)">+ LÄGG TILL BLOCK</button><button onclick="preview()">▶ PROVKÖR</button><button class="primary" onclick="saveEdit()">SPARA PASS</button></div></div></div>`;
  if(focus) requestAnimationFrame(()=>focusEditor(focus.row,focus.field));
}
function comboItems(kind){return (registries[kind]||[]).filter(x=>x.is_active!==false).map(x=>x.text).filter(Boolean)}
function comboField(key,row,value,placeholder,kind,extraClass=''){
  return `<div class="combo-wrap ${extraClass}"><input data-field="${key}" data-row="${row}" data-key="${key}" data-combo="${kind}" value="${escAttr(value||'')}" placeholder="${placeholder}" autocomplete="off" onfocus="openCombo(this)" onclick="openCombo(this)" oninput="setPart(${row},'${key}',this.value);openCombo(this)" onkeydown="editorKey(event,${row},'${key}')"><button type="button" class="combo-toggle" tabindex="-1" onclick="toggleCombo(this.previousElementSibling,event)">⌄</button><div class="combo-menu"></div></div>`;
}
function openCombo(input){
  closeCombos(input.closest('.combo-wrap'));
  const wrap=input.closest('.combo-wrap'), menu=wrap?.querySelector('.combo-menu'); if(!menu)return;
  const q=(input.value||'').trim().toLowerCase();
  const items=comboItems(input.dataset.combo).filter(t=>!q||t.toLowerCase().includes(q));
  menu.innerHTML=(items.length?items:['Inga förslag']).map(t=>items.length?`<button type="button" onmousedown="event.preventDefault()" onclick="chooseCombo(this,'${encodeURIComponent(t)}')">${escAttr(t)}</button>`:`<div class="combo-empty">${t}</div>`).join('');
  menu.classList.add('open');
}
function toggleCombo(input,e){if(e)e.stopPropagation();const menu=input.closest('.combo-wrap')?.querySelector('.combo-menu');if(menu?.classList.contains('open'))menu.classList.remove('open');else{input.focus();openCombo(input)}}
function chooseCombo(btn,encoded){const wrap=btn.closest('.combo-wrap'),input=wrap.querySelector('input');const value=decodeURIComponent(encoded);input.value=value;setPart(+input.dataset.row,input.dataset.key,value);wrap.querySelector('.combo-menu')?.classList.remove('open');input.focus()}
function closeCombos(except=null){document.querySelectorAll('.combo-wrap').forEach(w=>{if(w!==except)w.querySelector('.combo-menu')?.classList.remove('open')})}
document.addEventListener('mousedown',e=>{if(!e.target.closest('.combo-wrap'))closeCombos()});
function setPart(i,k,v){active.p.parts[i][k]=k==='borg'?Math.max(6,Math.min(20,+v)):v; const t=document.querySelector('#editorTotal');if(t)t.textContent=fmt(total(active.p));if(k==='time')refreshProfile()}
function refreshProfile(){const el=document.querySelector('.editor-profile');if(el)el.outerHTML=bars(active.p,'profile editor-profile')}
function focusEditor(row,field='time'){const el=document.querySelector(`.row[data-row="${row}"] [data-field="${field}"]`);if(el){el.focus();if(el.select)el.select()}}
function addPart(after=null,focus=false){const first=intensityValues(active.p)[0];const part={id:Date.now()+Math.random(),time:'2:00',borg:12,intensity:first?.code||'',moment:'',instruction:''};if(after==null)active.p.parts.push(part);else active.p.parts.splice(after+1,0,part);drawEdit(focus?{row:after==null?active.p.parts.length-1:after+1,field:'time'}:null)}
function duplicatePart(i){const c=structuredClone(active.p.parts[i]);c.id=Date.now()+Math.random();active.p.parts.splice(i+1,0,c);drawEdit({row:i+1,field:'time'})}
function mergePartWithNext(i){
  if(!active?.p?.parts?.[i]||!active.p.parts[i+1])return;
  const a=active.p.parts[i],b=active.p.parts[i+1];
  a.time=fmt(sec(a.time)+sec(b.time));
  a.music_refs=[...(a.music_refs||[]),...(b.music_refs||[])];
  a.music_labels=[...(a.music_labels||[]),...(b.music_labels||[])];
  if(!a.moment&&b.moment)a.moment=b.moment;
  if(!a.instruction&&b.instruction)a.instruction=b.instruction;
  active.p.parts.splice(i+1,1);
  drawEdit({row:i,field:'time'});
}
function removePart(i){if(active.p.parts.length>1){active.p.parts.splice(i,1);drawEdit({row:Math.min(i,active.p.parts.length-1),field:'time'})}}
function insertPartAt(index){
  const first=intensityValues(active.p)[0];
  const part={id:Date.now()+Math.random(),time:'2:00',borg:12,intensity:first?.code||'',moment:'',instruction:''};
  active.p.parts.splice(index,0,part);
  drawEdit({row:index,field:'time'});
}
let blockDragIndex=null,blockDropSlot=null,blockPointerState=null;
function clearBlockDropMarks(){document.querySelectorAll('.editor-block').forEach(r=>r.classList.remove('drop-before','drop-after','dragging'))}
function dropSlotForEvent(e,rowIndex){
  const row=e.target.closest('.editor-block')||document.querySelector(`.editor-block[data-row="${rowIndex}"]`);
  if(!row)return rowIndex;
  const rect=row.getBoundingClientRect();
  return rowIndex+(e.clientY>rect.top+rect.height/2?1:0);
}
function markDropSlot(slot){
  document.querySelectorAll('.editor-block').forEach(r=>r.classList.remove('drop-before','drop-after'));
  const n=active.p.parts.length;
  if(slot<=0){document.querySelector('.editor-block[data-row="0"]')?.classList.add('drop-before');return}
  if(slot>=n){document.querySelector(`.editor-block[data-row="${n-1}"]`)?.classList.add('drop-after');return}
  document.querySelector(`.editor-block[data-row="${slot}"]`)?.classList.add('drop-before');
}
function movePartToSlot(from,slot){
  if(from==null||slot==null)return;
  let target=slot;
  if(from<target)target--;
  if(target===from||target<0||target>=active.p.parts.length)return;
  const [part]=active.p.parts.splice(from,1);
  active.p.parts.splice(target,0,part);
  drawEdit();
}
function blockDragStart(e,i){
  blockDragIndex=i;blockDropSlot=i;
  e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',String(i));
  requestAnimationFrame(()=>document.querySelector(`.editor-block[data-row="${i}"]`)?.classList.add('dragging'));
}
function blockDragOver(e,i){
  if(blockDragIndex==null)return;
  e.preventDefault();e.dataTransfer.dropEffect='move';
  blockDropSlot=dropSlotForEvent(e,i);markDropSlot(blockDropSlot);
}
function blockDragLeave(e){}
function blockDrop(e,i){
  e.preventDefault();
  const slot=blockDropSlot??dropSlotForEvent(e,i),from=blockDragIndex;
  blockDragIndex=null;blockDropSlot=null;clearBlockDropMarks();movePartToSlot(from,slot);
}
function blockDragEnd(e){blockDragIndex=null;blockDropSlot=null;clearBlockDropMarks()}
function blockPointerStart(e,i){
  if(e.pointerType==='mouse')return;
  e.preventDefault();blockPointerState={from:i,slot:i,pointerId:e.pointerId};
  try{e.currentTarget.setPointerCapture(e.pointerId)}catch{}
  document.querySelector(`.editor-block[data-row="${i}"]`)?.classList.add('dragging');
}
function blockPointerMove(e){
  if(!blockPointerState||e.pointerId!==blockPointerState.pointerId)return;
  e.preventDefault();
  const el=document.elementFromPoint(e.clientX,e.clientY),row=el?.closest?.('.editor-block');
  if(!row)return;
  const i=+row.dataset.row,rect=row.getBoundingClientRect();
  blockPointerState.slot=i+(e.clientY>rect.top+rect.height/2?1:0);
  markDropSlot(blockPointerState.slot);
}
function blockPointerEnd(e){
  if(!blockPointerState||e.pointerId!==blockPointerState.pointerId)return;
  const {from,slot}=blockPointerState;blockPointerState=null;clearBlockDropMarks();movePartToSlot(from,slot);
}
function blockPointerCancel(e){blockPointerState=null;clearBlockDropMarks()}

function editorKey(e,row,field){
  const order=['time','borg','moment','instruction']; const idx=order.indexOf(field);
  if(e.key==='Enter'){
    e.preventDefault();
    if(row===active.p.parts.length-1){addPart(row,true)} else focusEditor(row+1,'time');
    return;
  }
  if(e.key==='Tab'&&!e.shiftKey&&row===active.p.parts.length-1&&idx===order.length-1){e.preventDefault();addPart(row,true)}
}
async function saveEdit(){
  active.p.name=document.querySelector('#pname').value||'Namnlöst pass';
  try{
    const saved=await upsertPass(active.p,active.i==null);
    if(active.i==null)passes.unshift(saved);else passes[active.i]=saved;
    cache(); list(); setSync('ok','Centralt sparat');
  }catch(e){
    online=false;
    console.error(e);
    alert('Passet kunde inte sparas centralt. Dina ändringar finns kvar i editorn – försök igen när anslutningen är tillbaka.');
    drawEdit();
  }
}
function preview(){active.p.name=document.querySelector('#pname').value||active.p.name;startPlayer(active.p)}
async function duplicate(i){
  const p=structuredClone(passes[i]); p.id=null; p.remote=false; p.legacyLocal=false; p.builtIn=false; p.owner_id=auth?.user?.id||null; p.visibility='private'; p.name+=' – kopia';
  try{
    const saved=await upsertPass(p,true);
    passes.unshift(saved);cache();list();
  }catch(e){
    online=false;console.error(e);
    alert('Kopian kunde inte sparas centralt. Försök igen när anslutningen är tillbaka.');
  }
}
async function importLocalPass(i){
  if(!auth){login();return}
  if(!online){alert('Training Player måste vara online för att flytta passet till Mina Pass.');return}
  const old=passes[i];
  if(!old?.legacyLocal)return;
  let borg=registries.models.find(x=>x.code==='borg'),spin=registries.activities.find(x=>x.code==='spinning');
  const p=structuredClone(old);
  p.id=null;p.remote=false;p.legacyLocal=false;p.builtIn=false;
  p.owner_id=auth.user.id;p.visibility='private';
  p.activity_type_id=p.activity_type_id||spin?.id||registries.activities[0]?.id||null;
  p.intensity_model_id=p.intensity_model_id||borg?.id||registries.models[0]?.id||null;
  try{
    const saved=await upsertPass(p,true);
    passes.splice(i,1,saved);
    cache();list();
    alert('Passet är nu sparat som Privat i Mina Pass.');
  }catch(e){
    console.error(e);alert('Passet kunde inte flyttas till Mina Pass: '+e.message);
  }
}
async function del(i){
  if(!confirm('Radera passet?'))return;
  const p=passes[i];
  try{await deleteRemote(p)}catch(e){online=false;console.error(e)}
  passes.splice(i,1);cache();list();
}

function run(i){startPlayer(passes[i])}
function unlockAudio(){
 try{
  if(!beep.countdown){
   beep.countdown=new Audio('beep-countdown.wav');
   beep.block=new Audio('beep-block.wav');
   beep.countdown.preload='auto';
   beep.block.preload='auto';
   beep.countdown.load();
   beep.block.load();
  }
 }catch(e){console.warn('Audio setup failed',e)}
}
function startPlayer(p){
 // Lås upp Web Audio direkt i användarens klickhändelse (viktigt i Safari/iPad).
 if(settings.soundPrestart||settings.soundBlock)unlockAudio();
 stop();setBrand(p.name,'');setHomeButton(false);active={p};elapsed=0;
 beginPass(settings.prestart||0);
}
function beginPass(n){if(n)runPrestart(n);else{saveSession();drawLive()}}
function beep(freq=880,duration=.11){
 try{
  if(!beep.countdown)unlockAudio();
  const a=(freq>=1000?beep.block:beep.countdown);
  if(!a)return;
  a.muted=false;
  a.currentTime=0;
  const p=a.play();
  if(p&&p.catch)p.catch(e=>console.warn('Audio play failed',e));
 }catch(e){console.warn('Audio beep failed',e)}
}
function runPrestart(n){
 let left=n;
 const render=()=>app.innerHTML=`<div class="overlay"><div><h2>PASS STARTAR OM</h2><div class="prestart-number ${left<=3?'pulse':''}">${left}</div></div></div>`;
 render();
 prestartTimer=setInterval(()=>{left--;if(left<=0){clearInterval(prestartTimer);prestartTimer=null;running=true;saveSession();startTicker();drawLive()}else{if(settings.soundPrestart&&left<=3)beep(left===1?1100:880,left===1?.18:.10);render()}},1000);
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
function showCue(s){
  let k=s.i+'-'+s.left;
  if(s.left>0 && s.left<=3 && cueKey!==k){
    cueKey=k;
    if(settings.soundBlock)beep(s.left===1?1050:820,s.left===1?.16:.09);
    requestAnimationFrame(()=>{
      const el=document.querySelector('.count, .ring-time');
      if(!el)return;
      el.classList.remove('block-time-blink');
      void el.offsetWidth;
      el.classList.add('block-time-blink');
      setTimeout(()=>el.classList.remove('block-time-blink'),950);
    });
  }
}
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
            ${p.parts.map(x=>`<div class="bar" style="width:${sec(x.time)/(T||1)*100}%;height:${intensityHeight(p,x)}%;background:${intensityColor(p,x)}"></div>`).join('')}
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

          <div class="count-ring" style="--progress:${progressPct}%;--ring-color:${intensityColor(p,s.part)}">
            <div class="count-ring-content">
              <div class="ring-label">${intensityHeading(p)}</div>
              <div class="ring-borg ${zoneTextClass(p,s.part)}" style="color:${intensityColor(p,s.part)}">${intensityShort(p,s.part)}</div>
              ${intensityRange(p,s.part)?`<div class="ring-range">${intensityRange(p,s.part)}</div>`:''}
              <div class="ring-time">${fmt(s.left)}</div>
              <div class="ring-kvar">KVAR</div>
            </div>
          </div>
        </section>

        <section class="dash-panel dash-next">
          <h3>NÄSTA</h3>
          ${n?`
            <div class="moment">${n.moment||''}</div>
            <div class="borg">${intensityHeading(p)} <span class="${zoneTextClass(p,n)}" style="color:${intensityColor(p,n)}">${intensityShort(p,n)}</span></div>
            ${intensityRange(p,n)?`<div class="intensity-range next-range">${intensityRange(p,n)}</div>`:''}
            <div class="time">${n.time}</div>
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
        <div class="label">${intensityHeading(p)}</div>
        <div class="borgBig ${zoneTextClass(p,s.part)}" style="color:${intensityColor(p,s.part)}">${intensityShort(p,s.part)}</div>
        ${intensityRange(p,s.part)?`<div class="intensity-range current-range">${intensityRange(p,s.part)}</div>`:''}
        <div class="count">${fmt(s.left)}</div>
        <div class="remain">KVAR</div>
        <div class="totalRemain"><b>${fmt(remain)}</b> KVAR AV PASSET</div>
      </div>
      <div class="next">
        <div class="label">NÄSTA</div>
        ${n?`
          <div class="borg">${intensityHeading(p)} <span class="${zoneTextClass(p,n)}" style="color:${intensityColor(p,n)}">${intensityShort(p,n)}</span></div>
          ${intensityRange(p,n)?`<div class="intensity-range next-range">${intensityRange(p,n)}</div>`:''}
          <div class="time">${n.time}</div>
          <div class="moment">${n.moment}</div>
        `:'<div class="moment">MÅL 🎉</div>'}
      </div>
    </div>

    <div class="liveProfile">
      ${p.parts.map(x=>`<div class="bar" style="width:${sec(x.time)/(T||1)*100}%;height:${intensityHeight(p,x)}%;background:${intensityColor(p,x)}"></div>`).join('')}
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
(async()=>{const cb=parseAuthCallback();if(cb){showSetPassword(cb);return}if(auth){try{if(sessionNeedsRefresh())await refreshAuthSession()}catch(e){alert(e.message);login();return}await markOwnProfileActive();await loadProfiles();if(currentProfile&&!currentProfile.is_active){auth=null;currentProfile=null;profiles=[];localStorage.removeItem(AUTH_KEY);alert('Ditt konto är inaktiverat. Kontakta en administratör.');login();return}}await loadRegistries();await loadPasses();checkResume()})();
