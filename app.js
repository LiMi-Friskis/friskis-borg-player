
const KEY='friskis-borg-passes';
const OLD_KEYS=['friskis-borg-passes-v13'];
const demo={id:'demo',name:'Spinning 45 – Intervall',parts:[
['5:00',10,'Uppvärmning','Hitta rytmen'],['4:00',12,'Tempo','Öka successivt'],['3:00',14,'Backe – sittande','Kontrollerat'],
['2:00',11,'Återhämtning','Lätt'],['4:00',15,'Backe – stående','Tryck'],['3:00',16,'Tempo','Jämnt hårt'],['2:00',12,'Återhämtning',''],
['4:00',17,'Intervall','Hårt'],['3:00',14,'Tempo',''],['2:00',11,'Återhämtning',''],['4:00',16,'Backe – sittande',''],
['3:00',14,'Tempo',''],['2:00',12,'Återhämtning',''],['4:00',10,'Nedvarvning','Lugnt']
].map((x,i)=>({id:i+1,time:x[0],borg:x[1],moment:x[2],instruction:x[3]}))};
let stored=localStorage.getItem(KEY);
if(!stored){for(const k of OLD_KEYS){if(localStorage.getItem(k)){stored=localStorage.getItem(k);break}}}
let passes=JSON.parse(stored||'null')||[demo], active=null, elapsed=0, running=false, timer=null;
localStorage.setItem(KEY,JSON.stringify(passes));
const app=document.querySelector('#app');
const brandTitle=document.querySelector('#brandTitle');
const brandSub=document.querySelector('#brandSub');
function setBrand(title='SPINNING',sub='TILLSAMMANS<br>GÖR VI SKILLNAD'){brandTitle.textContent=title;brandSub.innerHTML=sub;brandSub.style.display=sub?'block':'none'}
const sec=t=>{let [m,s]=t.split(':').map(Number);return m*60+s}, fmt=s=>`${Math.floor(Math.max(0,s)/60)}:${String(Math.max(0,s)%60).padStart(2,'0')}`;
function color(b){if(b<=9)return'#2868d8';if(b<=11)return'#38b978';if(b<=13)return'#b8d83c';if(b<=14)return'#ffd02d';if(b<=16)return'#ff8a27';return'#ef1738'}
function total(p){return p.parts.reduce((a,x)=>a+sec(x.time),0)} function save(){localStorage.setItem(KEY,JSON.stringify(passes))}
function bars(p,cls='mini'){let T=total(p);return `<div class="${cls}">${p.parts.map(x=>`<div class="bar" style="width:${sec(x.time)/T*100}%;height:${Math.max(15,(x.borg-6)/14*100)}%;background:${color(x.borg)}"></div>`).join('')}</div>`}
function list(){stop();setBrand();app.innerHTML=`<div class="toprow"><h1>Mina pass</h1><button class="primary" onclick="edit()">+ SKAPA NYTT PASS</button></div><div class="cards">${passes.map((p,i)=>`<div class="card"><h2>${p.name}</h2><div class="muted">${fmt(total(p))} · ${p.parts.length} delar</div>${bars(p)}<div class="actions"><button class="primary" onclick="run(${i})">▶ KÖR PASSET</button><button onclick="edit(${i})">REDIGERA</button><button onclick="duplicate(${i})">DUPLICERA</button><button onclick="del(${i})">RADERA</button></div></div>`).join('')}</div>`}
function edit(i){stop();setBrand();let p=i==null?{id:Date.now(),name:'Nytt pass',parts:[{id:1,time:'5:00',borg:10,moment:'Uppvärmning',instruction:''}]}:structuredClone(passes[i]);active={p,i};drawEdit()}
function drawEdit(){let p=active.p;app.innerHTML=`<h1>Skapa / redigera pass</h1><div class="editor"><input class="name" id="pname" value="${p.name}">${bars(p,'profile')}<div id="rows">${p.parts.map((x,j)=>`<div class="row"><b>${j+1}</b><input value="${x.time}" onchange="chg(${j},'time',this.value)"><input class="borginput" type="number" min="6" max="20" value="${x.borg}" onchange="chg(${j},'borg',this.value)"><input value="${x.moment}" placeholder="Moment" onchange="chg(${j},'moment',this.value)"><input class="instruction" value="${x.instruction||''}" placeholder="Instruktion" onchange="chg(${j},'instruction',this.value)"><button onclick="removePart(${j})">×</button></div>`).join('')}</div><p><b>Total tid: ${fmt(total(p))}</b></p><div class="actions"><button onclick="addPart()">+ LÄGG TILL DEL</button><button class="primary" onclick="saveEdit()">SPARA PASS</button><button onclick="preview()">▶ PROVKÖR</button></div></div>`}
function chg(i,k,v){active.p.parts[i][k]=k==='borg'?Math.max(6,Math.min(20,+v)):v;drawEdit()} function addPart(){active.p.parts.push({id:Date.now(),time:'2:00',borg:12,moment:'Ny del',instruction:''});drawEdit()} function removePart(i){if(active.p.parts.length>1)active.p.parts.splice(i,1);drawEdit()}
function saveEdit(){active.p.name=document.querySelector('#pname').value||'Namnlöst pass'; if(active.i==null)passes.push(active.p);else passes[active.i]=active.p;save();list()}
function preview(){active.p.name=document.querySelector('#pname').value||active.p.name; startPlayer(active.p)}
function duplicate(i){let p=structuredClone(passes[i]);p.id=Date.now();p.name+=' – kopia';passes.push(p);save();list()} function del(i){if(confirm('Radera passet?')){passes.splice(i,1);save();list()}}
function run(i){startPlayer(passes[i])} function startPlayer(p){stop();setBrand(p.name,'');active={p};elapsed=0;drawLive()}
function state(){let p=active.p,c=0;for(let i=0;i<p.parts.length;i++){let d=sec(p.parts[i].time);if(elapsed<c+d)return{i,part:p.parts[i],into:elapsed-c,left:d-(elapsed-c)};c+=d}return{i:p.parts.length-1,part:p.parts.at(-1),into:sec(p.parts.at(-1).time),left:0}}
function drawLive(){let p=active.p,s=state(),T=total(p),n=p.parts[s.i+1],remain=T-elapsed;app.innerHTML=`<div class="live"><div class="liveTop"><div class="liveBrand"></div><div class="current"><div class="label">BORG</div><div class="borgBig" style="color:${color(s.part.borg)}">${s.part.borg}</div><div class="count">${fmt(s.left)}</div><div class="remain">KVAR</div><div class="totalRemain"><b>${fmt(remain)}</b> KVAR AV PASSET</div></div><div class="next"><div class="label">NÄSTA</div>${n?`<div class="borg">BORG <span style="color:${color(n.borg)}">${n.borg}</span></div><div class="time">${n.time}</div><div class="moment">${n.moment}</div>`:'<div class="moment">MÅL 🎉</div>'}</div></div><div class="liveProfile">${p.parts.map(x=>`<div class="bar" style="width:${sec(x.time)/T*100}%;height:${Math.max(12,(x.borg-6)/14*100)}%;background:${color(x.borg)}"></div>`).join('')}<div class="marker" style="left:${Math.min(100,elapsed/T*100)}%"></div></div><div class="muted">${s.part.moment}${s.part.instruction?' · '+s.part.instruction:''}</div><div class="controls"><button onclick="prev()">◀ FÖREGÅENDE</button><button class="primary" onclick="toggle()">${running?'Ⅱ PAUS':'▶ START'}</button><button onclick="next()">NÄSTA ▶</button></div></div>`}
function toggle(){
  if(running){
    running=false;
    if(timer){clearInterval(timer);timer=null}
    drawLive();
    return;
  }
  if(elapsed>=total(active.p)) elapsed=0;
  running=true;
  timer=setInterval(()=>{
    if(!running) return;
    if(elapsed<total(active.p)){
      elapsed++;
      drawLive();
    }else{
      stop();
      drawLive();
    }
  },1000);
  drawLive();
}
function stop(){
  running=false;
  if(timer){clearInterval(timer);timer=null}
}}
function next(){let s=state(),c=active.p.parts.slice(0,s.i+1).reduce((a,x)=>a+sec(x.time),0);elapsed=Math.min(total(active.p),c);drawLive()}
function prev(){let s=state(),start=active.p.parts.slice(0,s.i).reduce((a,x)=>a+sec(x.time),0);elapsed=(s.into>3)?start:active.p.parts.slice(0,Math.max(0,s.i-1)).reduce((a,x)=>a+sec(x.time),0);drawLive()}
document.querySelector('#home').onclick=list; list();
