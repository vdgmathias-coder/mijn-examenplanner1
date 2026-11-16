const KEY="mijnExamenplanner_v1";
const DAYS=["Zondag","Maandag","Dinsdag","Woensdag","Donderdag","Vrijdag","Zaterdag"];
const $=s=>document.querySelector(s);
let data=load(), editing=null, timer={mode:"focus",remaining:1500,running:false,interval:null};
function blank(){return {exams:[],lessons:[],subjects:[],plans:[],sessions:[],settings:{}}}
function load(){try{return {...blank(),...JSON.parse(localStorage.getItem(KEY)||"{}")}}catch{return blank()}}
function save(){localStorage.setItem(KEY,JSON.stringify(data));render()}
function esc(s=""){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function uid(){return Math.random().toString(36).slice(2,10)}
function dateLocal(d){return new Date(d+"T00:00:00")}
function fmtDate(d){return dateLocal(d).toLocaleDateString("nl-BE",{weekday:"short",day:"numeric",month:"short"})}
function mins(t){if(!t)return 0;let [h,m]=t.split(":").map(Number);return h*60+m}
function time(m){return String(Math.floor(m/60)).padStart(2,"0")+":"+String(m%60).padStart(2,"0")}
function daysUntil(d){return Math.ceil((dateLocal(d)-dateLocal(new Date().toISOString().slice(0,10)))/86400000)}
function subjectName(id){return data.subjects.find(s=>s.id===id)?.name||"Onbekend vak"}
function allTopics(){return data.subjects.flatMap(s=>s.topics.map(t=>({...t,subjectId:s.id,subject:s.name})))}
function render(){
 const now=new Date();$("#todayLabel").textContent=now.toLocaleDateString("nl-BE",{weekday:"long",day:"numeric",month:"long"}).toUpperCase();
 $("#greeting").textContent=now.getHours()<12?"Goedemorgen!":now.getHours()<18?"Goedemiddag!":"Goedenavond!";
 const exams=[...data.exams].sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
 $("#upcomingCount").textContent=exams.filter(e=>daysUntil(e.date)>=0).length;
 let topics=allTopics(),done=topics.filter(t=>t.done).length,pct=topics.length?Math.round(done/topics.length*100):0;
 $("#statProgress").textContent=pct+"%";$("#statProgressBar").style.width=pct+"%";
 let total=data.sessions.reduce((n,s)=>n+(s.minutes||0),0);$("#statMinutes").textContent=total+" min";$("#statHours").textContent=(total/60).toFixed(1)+" uur totaal";
 $("#statChapters").textContent=done;$("#statChapterTotal").textContent="van "+topics.length+" onderdelen";$("#statSessions").textContent=data.sessions.length;
 $("#dashboardExams").innerHTML=exams.filter(e=>daysUntil(e.date)>=0).slice(0,3).map(examHTML).join("")||'<div class="empty">Nog geen examens ingevoerd.</div>';
 $("#examList").innerHTML=exams.map(examHTML).join("")||'<div class="empty">Tik op “＋ Examen” om je eerste examen toe te voegen.</div>';
 $("#lessonList").innerHTML=[...data.lessons].sort((a,b)=>a.day-b.day||a.start.localeCompare(b.start)).map(l=>`<div class="item"><div class="item-main"><div class="item-title">${DAYS[l.day]} · ${esc(l.subject)}</div><div class="item-sub">${l.start} – ${l.end}</div></div><div class="item-actions"><button class="mini-btn" onclick="editLesson('${l.id}')">Bewerk</button><button class="mini-btn" onclick="removeItem('lessons','${l.id}')">✕</button></div></div>`).join("")||'<div class="empty">Je rooster is nog leeg.</div>';
 $("#subjectList").innerHTML=data.subjects.map(subjectHTML).join("")||'<div class="empty">Voeg je vakken toe en zet er hoofdstukken, taken of notities bij.</div>';
 $("#planList").innerHTML=data.plans.length?data.plans.slice().sort((a,b)=>(a.date+a.start).localeCompare(b.date+b.start)).map(planHTML).join(""):'<div class="empty">Nog geen planning. Voeg examens en leerstof toe en maak daarna je planning.</div>';
 $("#dashboardPlan").innerHTML=data.plans.slice().sort((a,b)=>(a.date+a.start).localeCompare(b.date+b.start)).slice(0,3).map(planHTML).join("")||'<div class="empty">Je studieplanning verschijnt hier.</div>';
 $("#dashboardHint").style.display=(!data.exams.length||!data.subjects.length)?"block":"none";
 $("#sessionList").innerHTML=data.sessions.slice().reverse().slice(0,10).map(s=>`<div class="item"><div class="item-main"><div class="item-title">${esc(s.subject||"Studiesessie")}</div><div class="item-sub">${fmtDate(s.date)} · ${s.minutes} minuten</div></div><span class="pill">Voltooid</span></div>`).join("")||'<div class="empty">Je afgeronde sessies verschijnen hier.</div>';
}
function examHTML(e){let n=daysUntil(e.date),label=n<0?`${Math.abs(n)} dagen geleden`:n===0?"Vandaag":n===1?"Morgen":`Nog ${n} dagen`;return `<div class="item"><div class="item-main"><div class="item-title">${esc(e.subject)}</div><div class="item-sub">${fmtDate(e.date)} · ${e.time||"Uur niet ingevuld"}${e.notes?"<br>"+esc(e.notes):""}</div><span class="pill">${label}</span></div><div class="item-actions"><button class="mini-btn" onclick="editExam('${e.id}')">Bewerk</button><button class="mini-btn" onclick="removeItem('exams','${e.id}')">✕</button></div></div>`}
function subjectHTML(s){let done=s.topics.filter(t=>t.done).length,p=s.topics.length?Math.round(done/s.topics.length*100):0;return `<article class="item" style="display:block"><div style="display:flex;justify-content:space-between;align-items:center"><div class="item-title">${esc(s.name)}</div><div class="item-actions"><button class="mini-btn" onclick="addTopic('${s.id}')">＋ Onderdeel</button><button class="mini-btn" onclick="editSubject('${s.id}')">Bewerk</button><button class="mini-btn" onclick="removeItem('subjects','${s.id}')">✕</button></div></div><div class="item-sub">${done}/${s.topics.length} afgewerkt · ${p}%</div><div class="subject-progress"><i style="width:${p}%"></i></div><div class="subsection">${s.topics.map(t=>`<label class="learn-row ${t.done?"done":""}"><input type="checkbox" ${t.done?"checked":""} onchange="toggleTopic('${s.id}','${t.id}',this.checked)"><span>${esc(t.title)}</span><small>${esc(t.type)}</small><button class="mini-btn" onclick="event.preventDefault();editTopic('${s.id}','${t.id}')">✎</button><button class="mini-btn" onclick="event.preventDefault();deleteTopic('${s.id}','${t.id}')">✕</button></label>`).join("")||'<div class="item-sub">Nog geen leerstof toegevoegd.</div>'}</div></article>`}
function planHTML(p){return `<div class="item"><div class="item-main"><div class="item-title">${esc(p.subject)} · ${esc(p.topic)}</div><div class="item-sub">${fmtDate(p.date)} · ${p.start}–${p.end} · ${p.minutes} min${p.note?"<br>"+esc(p.note):""}</div></div><div class="item-actions"><button class="mini-btn" onclick="editPlan('${p.id}')">Bewerk</button><button class="mini-btn" onclick="removeItem('plans','${p.id}')">✕</button></div></div>`}
function field(name,label,type="text",value="",extra=""){return `<div class="field"><label>${label}<input name="${name}" type="${type}" value="${esc(value)}" ${extra} required></label></div>`}
function selectField(name,label,opts,value){return `<div class="field"><label>${label}<select name="${name}" required>${opts.map(o=>`<option value="${esc(o.value)}" ${String(o.value)===String(value)?"selected":""}>${esc(o.label)}</option>`).join("")}</select></label></div>`}
function openDialog(title,html,callback){editing=callback;$("#dialogTitle").textContent=title;$("#dialogFields").innerHTML=html;$("#editDialog").showModal()}
function closeDialog(){$("#editDialog").close();editing=null}
$("#closeDialog").onclick=$("#cancelDialog").onclick=closeDialog;
$("#editForm").onsubmit=e=>{e.preventDefault();if(!editing)return;let obj=Object.fromEntries(new FormData(e.target));editing(obj);closeDialog();save()};
function editExam(id){let e=data.exams.find(x=>x.id===id);openDialog("Examen aanpassen",field("subject","Vak","text",e.subject)+field("date","Datum","date",e.date)+field("time","Uur","time",e.time)+`<div class="field"><label>Opmerkingen<textarea name="notes">${esc(e.notes||"")}</textarea></label></div>`,v=>Object.assign(e,v))}
$("#addExam").onclick=()=>openDialog("Examen toevoegen",field("subject","Vak")+field("date","Datum","date",new Date().toISOString().slice(0,10))+field("time","Uur","time","09:00")+`<div class="field"><label>Opmerkingen<textarea name="notes"></textarea></label></div>`,v=>data.exams.push({id:uid(),...v}));
window.editExam=editExam;
$("#addLesson").onclick=()=>openDialog("Les toevoegen",selectField("day","Weekdag",DAYS.map((d,i)=>({value:i,label:d})),1)+field("subject","Vak")+field("start","Beginuur","time","08:30")+field("end","Einduur","time","09:20"),v=>data.lessons.push({id:uid(),...v,day:+v.day}));
window.editLesson=id=>{let l=data.lessons.find(x=>x.id===id);openDialog("Les aanpassen",selectField("day","Weekdag",DAYS.map((d,i)=>({value:i,label:d})),l.day)+field("subject","Vak","text",l.subject)+field("start","Beginuur","time",l.start)+field("end","Einduur","time",l.end),v=>Object.assign(l,{...v,day:+v.day}))};
$("#addSubject").onclick=()=>openDialog("Vak toevoegen",field("name","Naam van het vak"),v=>data.subjects.push({id:uid(),name:v.name,topics:[]}));
window.editSubject=id=>{let s=data.subjects.find(x=>x.id===id);openDialog("Vak aanpassen",field("name","Naam van het vak","text",s.name),v=>s.name=v.name)};
window.addTopic=id=>openDialog("Leerstof toevoegen",field("title","Hoofdstuk, taak of notitie")+selectField("type","Soort",["Hoofdstuk","Taak","Notitie"].map(x=>({value:x,label:x})), "Hoofdstuk"),v=>data.subjects.find(s=>s.id===id).topics.push({id:uid(),title:v.title,type:v.type,done:false}));
window.toggleTopic=(sid,tid,val)=>{let t=data.subjects.find(s=>s.id===sid).topics.find(t=>t.id===tid);t.done=val;save()};
window.editTopic=(sid,tid)=>{let t=data.subjects.find(s=>s.id===sid).topics.find(t=>t.id===tid);openDialog("Onderdeel aanpassen",field("title","Titel","text",t.title)+selectField("type","Soort",["Hoofdstuk","Taak","Notitie"].map(x=>({value:x,label:x})),t.type),v=>Object.assign(t,v))};
window.deleteTopic=(sid,tid)=>{if(confirm("Dit onderdeel verwijderen?")){let s=data.subjects.find(x=>x.id===sid);s.topics=s.topics.filter(t=>t.id!==tid);save()}};
window.removeItem=(key,id)=>{if(confirm("Dit item verwijderen?")){data[key]=data[key].filter(x=>x.id!==id);save()}};
window.editPlan=id=>{let p=data.plans.find(x=>x.id===id);openDialog("Studieblok aanpassen",field("date","Datum","date",p.date)+field("subject","Vak","text",p.subject)+field("topic","Onderdeel","text",p.topic)+field("start","Beginuur","time",p.start)+field("end","Einduur","time",p.end)+`<div class="field"><label>Notitie<textarea name="note">${esc(p.note||"")}</textarea></label></div>`,v=>Object.assign(p,{...v,minutes:Math.max(0,mins(v.end)-mins(v.start))}))};
window.removeItem=window.removeItem;
document.querySelectorAll("[data-page]").forEach(b=>b.onclick=()=>go(b.dataset.page));
document.querySelectorAll("[data-goto]").forEach(b=>b.onclick=()=>go(b.dataset.goto));
function go(p){document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("active",b.dataset.page===p));document.querySelectorAll(".page").forEach(x=>x.classList.toggle("active",x.id==="page-"+p));window.scrollTo(0,0)}
function generate(){
 let exams=data.exams.filter(e=>daysUntil(e.date)>=0).sort((a,b)=>a.date.localeCompare(b.date));
 if(!exams.length||!data.subjects.length){alert("Voeg eerst minstens één toekomstig examen en één vak toe.");return}
 let pending=allTopics().filter(t=>!t.done);if(!pending.length){alert("Alle leerstof is afgevinkt. Voeg eventueel herhalingsonderdelen toe.");return}
 let start=mins($("#dayStart").value),end=mins($("#dayEnd").value),block=+$("#blockLength").value;
 if(end<=start){alert("Het einduur moet na het startuur liggen.");return}
 let lessons=data.lessons,created=[],cursor=new Date();cursor.setDate(cursor.getDate()+1);
 // Clear only future generated plan; user can edit the resulting blocks afterward.
 data.plans=data.plans.filter(p=>p.date<new Date().toISOString().slice(0,10));
 let topicQueue=pending.map(t=>({...t,exam:exams.find(e=>e.subject.toLowerCase()===t.subject.toLowerCase())||exams[0]})).sort((a,b)=>daysUntil(a.exam.date)-daysUntil(b.exam.date));
 let maxDays=Math.min(45,Math.max(7,...exams.map(e=>daysUntil(e.date))));
 for(let offset=1;offset<=maxDays&&topicQueue.length;offset++){
   let d=new Date();d.setDate(d.getDate()+offset);let iso=d.toISOString().slice(0,10),day=d.getDay();
   let examToday=exams.some(e=>e.date===iso);
   if(examToday)continue;
   let blocked=lessons.filter(l=>+l.day===day).map(l=>[mins(l.start),mins(l.end)]);
   // Lunch/rest gap and school-day availability are respected; create blocks only in selected study window.
   let slots=[];for(let t=start;t+block<=end;t+=block+10){let finish=t+block;if(blocked.some(([a,b])=>t<b&&finish>a))continue;if(t<12*60+30&&finish>12*60)continue;slots.push(t)}
   for(let slot of slots){
     if(!topicQueue.length)break;
     let item=topicQueue.shift(),finish=slot+block;
     let p={id:uid(),date:iso,subject:item.subject,topic:item.title,start:time(slot),end:time(finish),minutes:block,note:"Automatisch ingepland · neem na dit blok een korte pauze"};
     data.plans.push(p);created.push(p);
     // Add a repeat block for learned content shortly before its exam, when time permits.
     if(item.exam&&daysUntil(item.exam.date)>2&&offset===Math.max(0,daysUntil(item.exam.date)-2)){
       data.plans.push({...p,id:uid(),date:iso,topic:"Herhaling: "+item.title,start:time(Math.min(end-block,finish+10)),end:time(Math.min(end-block,finish+10)+block),note:"Herhaling"}); 
     }
   }
 }
 if(!created.length){alert("Geen vrije studieblokken gevonden. Pas je studie-uren aan of controleer je schoolrooster.");return}
 save();alert(`${created.length} studieblokken ingepland. Je kunt elk blok nog aanpassen of verwijderen.`);
}
$("#generatePlan").onclick=generate;

// Timer: only completed focus rounds count toward study statistics.
function updateTimer(){let m=Math.floor(timer.remaining/60),s=timer.remaining%60;$("#timerDisplay").textContent=String(m).padStart(2,"0")+":"+String(s).padStart(2,"0");$("#timerMode").textContent=timer.mode==="focus"?"Focus":"Pauze";$("#timerStart").textContent=timer.running?"Pauze":"Start"}
function stopTimer(){clearInterval(timer.interval);timer.interval=null;timer.running=false}
function switchTimer(){stopTimer();timer.mode=timer.mode==="focus"?"break":"focus";timer.remaining=(timer.mode==="focus"?+$("#studyDuration").value:+$("#breakDuration").value)*60;updateTimer()}
function startTimer(){if(timer.running){stopTimer();$("#timerStatus").textContent="Timer gepauzeerd.";updateTimer();return}if(timer.remaining<=0)timer.remaining=(timer.mode==="focus"?+$("#studyDuration").value:+$("#breakDuration").value)*60;timer.running=true;timer.interval=setInterval(()=>{timer.remaining--;updateTimer();if(timer.remaining<=0){stopTimer();if(timer.mode==="focus"){let minsDone=+$("#studyDuration").value;data.sessions.push({id:uid(),date:new Date().toISOString().slice(0,10),minutes:minsDone,subject:"Focusblok"});save();$("#timerStatus").textContent="Mooi gewerkt! Je studiesessie is opgeslagen."}else $("#timerStatus").textContent="Pauze voorbij. Klaar voor een nieuw focusblok?";switchTimer()}},1000);updateTimer()}
$("#timerStart").onclick=startTimer;$("#timerReset").onclick=()=>{stopTimer();timer.remaining=(timer.mode==="focus"?+$("#studyDuration").value:+$("#breakDuration").value)*60;$("#timerStatus").textContent="Timer gereset.";updateTimer()};$("#timerSwitch").onclick=switchTimer;
$("#studyDuration").onchange=$("#breakDuration").onchange=()=>{if(!timer.running){timer.remaining=(timer.mode==="focus"?+$("#studyDuration").value:+$("#breakDuration").value)*60;updateTimer()}};

// Backup / restore
$("#backupBtn").onclick=()=>{let blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="mijn-examenplanner-reservekopie.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
$("#restoreBtn").onclick=()=>$("#importFile").click();
$("#importFile").onchange=async e=>{let f=e.target.files[0];if(!f)return;try{let imported=JSON.parse(await f.text());if(!imported||!Array.isArray(imported.exams)||!Array.isArray(imported.subjects))throw Error();if(confirm("Je huidige gegevens vervangen door deze reservekopie?")){data={...blank(),...imported};save();alert("Reservekopie teruggezet.")}}catch{alert("Dit bestand lijkt geen geldige reservekopie van Mijn Examenplanner.")}e.target.value=""};
if("serviceWorker" in navigator && location.protocol!=="file:"){window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(console.warn))}
render();updateTimer();
