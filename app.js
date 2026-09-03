import { firebaseConfig } from "./firebase-config.js";

const firebaseReady = !Object.values(firebaseConfig).some(v => String(v).includes("PASTE_YOUR"));
let auth = null, db = null;
let onAuthStateChanged = null, signInWithEmailAndPassword = null;
let createUserWithEmailAndPassword = null, signOut = null;
let getDoc = null, setDoc = null, doc = null;

async function setupFirebase() {
  if (!firebaseReady) return false;
  try {
    const [appMod, authMod, firestoreMod] = await Promise.all([
      import("https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js"),
      import("https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js")
    ]);
    const fb = appMod.initializeApp(firebaseConfig);
    auth = authMod.getAuth(fb);
    db = firestoreMod.getFirestore(fb);
    onAuthStateChanged = authMod.onAuthStateChanged;
    signInWithEmailAndPassword = authMod.signInWithEmailAndPassword;
    createUserWithEmailAndPassword = authMod.createUserWithEmailAndPassword;
    signOut = authMod.signOut;
    getDoc = firestoreMod.getDoc;
    setDoc = firestoreMod.setDoc;
    doc = firestoreMod.doc;
    return true;
  } catch (e) {
    console.warn("Firebase could not be loaded. Demo mode remains available.", e);
    return false;
  }
}

const defaultData={
 user:{name:"Student",goal:"Reach 80% by end of month",weeklyTarget:28,streak:0},
 subjects:["Mathematics","Science","English","Physics","Chemistry"],
 tasks:[
  {id:"t1",title:"Revise Polynomials",subject:"Mathematics",chapter:"Polynomials",priority:"high",dueDate:new Date().toISOString().slice(0,10),status:"pending",estimatedTime:45,type:"Revision"},
  {id:"t2",title:"Periodic Table practice",subject:"Science",chapter:"Periodic Table",priority:"medium",dueDate:new Date().toISOString().slice(0,10),status:"pending",estimatedTime:30,type:"Practice"}
 ],
 chapters:[
  {id:"c1",subject:"Mathematics",name:"Real Numbers",percentage:80,weakTopics:"",lastRevised:"2026-08-30",nextRevision:"2026-09-07"},
  {id:"c2",subject:"Mathematics",name:"Polynomials",percentage:40,weakTopics:"Factorization, Remainder Theorem",lastRevised:"2026-08-15",nextRevision:new Date().toISOString().slice(0,10)},
  {id:"c3",subject:"Science",name:"Periodic Table",percentage:35,weakTopics:"Groups, trends",lastRevised:"2026-08-20",nextRevision:"2026-09-04"},
  {id:"c4",subject:"English",name:"Essay Writing",percentage:85,weakTopics:"",lastRevised:"2026-08-29",nextRevision:"2026-09-06"},
  {id:"c5",subject:"Physics",name:"Optics",percentage:50,weakTopics:"Ray diagrams",lastRevised:"2026-08-25",nextRevision:"2026-09-05"},
  {id:"c6",subject:"Chemistry",name:"Chemical Bonding",percentage:55,weakTopics:"VSEPR",lastRevised:"2026-08-26",nextRevision:"2026-09-06"}
 ],
 timetable:[],
 exams:[{id:"e1",name:"Math Test",date:new Date(Date.now()+3*86400000).toISOString().slice(0,10),subjects:["Mathematics"]}],
 dailyLogs:{}
};
let data=JSON.parse(localStorage.getItem("studyTrackerData")||"null")||structuredClone(defaultData);
let currentUser=null, demo=true, weeklyChart,subjectChart,taskChart;

const $=id=>document.getElementById(id);
const saveLocal=()=>localStorage.setItem("studyTrackerData",JSON.stringify(data));
const toast=msg=>{const t=$("toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2200)};
const today=()=>new Date().toISOString().slice(0,10);
const fmt=d=>new Date(d+"T00:00:00").toLocaleDateString(undefined,{day:"numeric",month:"short",year:"numeric"});
const daysLeft=d=>Math.ceil((new Date(d+"T00:00:00")-new Date(new Date().toDateString()))/86400000);
function sync(){saveLocal();if(!demo&&currentUser) setDoc(doc(db,"users",currentUser.uid),data).catch(e=>toast("Cloud save failed"));renderAll();}
async function loadCloud(u){const snap=await getDoc(doc(db,"users",u.uid));if(snap.exists()) data=snap.data(); else await setDoc(doc(db,"users",u.uid),data);demo=false;renderAll();}
function statusFor(p){return p<=30?["Weak","weak"]:p<=60?["Average","avg"]:p<=80?["Good","good"]:["Strong","strong"]}

function showPage(page){document.querySelectorAll(".page").forEach(x=>x.classList.remove("active"));$(page).classList.add("active");document.querySelectorAll(".nav-btn").forEach(x=>x.classList.toggle("active",x.dataset.page===page));$("pageTitle").textContent=page[0].toUpperCase()+page.slice(1);if(innerWidth<=760)$(".sidebar").classList.remove("open");renderAll();}
document.addEventListener("click",e=>{const p=e.target.closest("[data-page]");if(p)showPage(p.dataset.page)});

function renderAll(){renderDashboard();renderTasks();renderProgress();renderTimetable();renderExams();renderAnalytics();renderSettings();}
function renderDashboard(){
 const d=today(), todays=data.tasks.filter(t=>t.dueDate===d), done=todays.filter(t=>t.status==="completed").length;
 $("statTasks").textContent=`${done}/${todays.length}`;$("statTaskPct").textContent=`${todays.length?Math.round(done/todays.length*100):0}% complete`;
 $("statStreak").textContent=`${data.user.streak||0} 🔥`;
 const minutes=todays.filter(t=>t.status==="completed").reduce((s,t)=>s+Number(t.estimatedTime||0),0);
 $("statHours").textContent=(minutes/60).toFixed(1)+"h";$("statTarget").textContent=`Target: ${data.user.weeklyTarget||4}h`;
 const avg=data.chapters.length?Math.round(data.chapters.reduce((s,c)=>s+Number(c.percentage||0),0)/data.chapters.length):0;$("statProgress").textContent=avg+"%";
 $("todayText").textContent=new Date().toLocaleDateString(undefined,{weekday:"long",day:"numeric",month:"long",year:"numeric"});
 const h=new Date().getHours();$("welcomeText").textContent=(h<12?"Good morning":h<18?"Good afternoon":"Good evening")+" 👋";
 const weak=[...data.chapters].sort((a,b)=>a.percentage-b.percentage).slice(0,5);
 $("weakList").innerHTML=weak.length?weak.map(c=>`<div class="list-item"><div><b>${c.subject} — ${c.name}</b><div class="progressbar"><i style="width:${c.percentage}%"></i></div></div><strong>${c.percentage}%</strong></div>`).join(""):`<div class="muted">No chapters yet.</div>`;
 const focus=weak.slice(0,3);$("focusList").innerHTML=focus.map(c=>`<div class="focus-item"><b>${c.subject} — ${c.name}</b><small>Spend 30–45 minutes on ${c.weakTopics||"core concepts"} and finish a short practice set.</small></div>`).join("")||`<div class="muted">Add chapters to receive recommendations.</div>`;
 const day=new Date().toLocaleDateString("en-US",{weekday:"long"});const slots=data.timetable.filter(x=>x.day===day).sort((a,b)=>a.time.localeCompare(b.time));
 $("todaySchedule").innerHTML=slots.length?slots.map(s=>`<div class="schedule-item"><b>${s.time}</b> · ${s.subject}${s.chapter?" — "+s.chapter:""} </div>`).join(""):`<div class="muted">No timetable slots for today.</div>`;
 renderWeeklyChart();
}
function renderWeeklyChart(){if(typeof Chart==="undefined"){return;}const labels=[],vals=[];for(let i=6;i>=0;i--){const d=new Date(Date.now()-i*86400000),key=d.toISOString().slice(0,10);labels.push(d.toLocaleDateString(undefined,{weekday:"short"}));vals.push((data.dailyLogs[key]?.studyMinutes||0)/60)}if(weeklyChart)weeklyChart.destroy();weeklyChart=new Chart($("weeklyChart"),{type:"bar",data:{labels,datasets:[{label:"Study hours",data:vals,borderRadius:6}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true}}}})}
function renderTasks(){
 const subs=$("taskSubjectFilter");subs.innerHTML='<option value="">All subjects</option>'+data.subjects.map(s=>`<option>${s}</option>`).join("");
 const q=$("taskSearch").value.toLowerCase(),sf=subs.value,st=$("taskStatusFilter").value,pf=$("taskPriorityFilter").value;
 let tasks=data.tasks.filter(t=>(!q||`${t.title} ${t.chapter}`.toLowerCase().includes(q))&&(!sf||t.subject===sf)&&(!st||t.status===st)&&(!pf||t.priority===pf));
 tasks.sort((a,b)=>({high:0,medium:1,low:2}[a.priority]-({high:0,medium:1,low:2}[b.priority])||a.dueDate.localeCompare(b.dueDate)));
 $("taskList").innerHTML=tasks.length?tasks.map(t=>`<div class="task"><button class="check ${t.status==="completed"?"done":""}" data-complete="${t.id}">${t.status==="completed"?"✓":""}</button><div><div class="task-title ${t.status==="completed"?"done":""}">${t.title}</div><div class="task-meta">${t.subject} · ${t.chapter||"General"} · ${t.estimatedTime||0} min · Due ${fmt(t.dueDate)} · ${t.status}</div></div><div class="task-actions"><span class="priority ${t.priority}">${t.priority}</span><button class="mini-btn" data-edit-task="${t.id}">✎</button><button class="mini-btn" data-delete-task="${t.id}">🗑</button></div></div>`).join(""):`<div class="card muted">No tasks match your filters.</div>`;
}
function renderProgress(){
 const avg=data.chapters.length?Math.round(data.chapters.reduce((s,c)=>s+c.percentage,0)/data.chapters.length):0;$("progressAvg").textContent=avg+"%";
 $("strongCount").textContent=data.chapters.filter(c=>c.percentage>80).length;$("avgCount").textContent=data.chapters.filter(c=>c.percentage>30&&c.percentage<=80).length;$("weakCount").textContent=data.chapters.filter(c=>c.percentage<=30).length;
 $("chapterGrid").innerHTML=data.chapters.map(c=>{const [st,cl]=statusFor(c.percentage);return `<div class="chapter-card"><h3>${c.name}</h3><p>${c.subject}</p><div class="percent">${c.percentage}%</div><div class="progressbar"><i style="width:${c.percentage}%"></i></div><div class="status ${cl}">${st}</div><p style="margin-top:10px">Weak topics: ${c.weakTopics||"None"}</p><p>Next revision: ${c.nextRevision?fmt(c.nextRevision):"—"}</p><div class="task-actions" style="margin-top:12px"><button class="mini-btn" data-edit-chapter="${c.id}">✎ Edit</button><button class="mini-btn" data-delete-chapter="${c.id}">🗑</button></div></div>`}).join("")||`<div class="card muted">No chapters added.</div>`;
}
function renderTimetable(){
 const times=[...new Set(data.timetable.map(x=>x.time))].sort();const fallback=["09:00","10:00","11:00","12:00","14:00","15:00"];const all=[...new Set([...fallback,...times])].sort();const days=["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
 $("timetableBody").innerHTML=all.map(time=>`<tr><th>${time}</th>${days.map(day=>{const s=data.timetable.find(x=>x.day===day&&x.time===time);return `<td>${s?`<div class="slot">${s.subject}${s.chapter?"<br><small>"+s.chapter+"</small>":""}<button class="mini-btn" style="margin-top:5px" data-delete-slot="${s.id}">✕</button></div>`:`<div class="slot empty" data-add-slot="${day}|${time}">+</div>`}</td>`}).join("")}</tr>`).join("");
 $("weeklyTarget").textContent=(data.user.weeklyTarget||0)+"h";$("scheduledHours").textContent=(data.timetable.length)+"h";$("scheduleCoverage").textContent=Math.min(100,Math.round(data.timetable.length/28*100))+"%";const counts={};data.timetable.forEach(x=>counts[x.subject]=(counts[x.subject]||0)+1);$("bestScheduled").textContent=Object.entries(counts).sort((a,b)=>b[1]-a[1])[0]?.[0]||"—";
}
function renderExams(){$("examGrid").innerHTML=data.exams.sort((a,b)=>a.date.localeCompare(b.date)).map(e=>`<div class="exam-card"><p class="muted">${fmt(e.date)}</p><div class="exam-date">${daysLeft(e.date)} ${daysLeft(e.date)===1?"day":"days"}</div><div class="exam-days">${daysLeft(e.date)<0?"Past exam":"remaining"}</div><h3>${e.name}</h3><p class="muted">${(e.subjects||[]).join(", ")}</p><div class="actions"><button class="mini-btn" data-edit-exam="${e.id}">✎ Edit</button><button class="mini-btn" data-delete-exam="${e.id}">🗑 Delete</button></div></div>`).join("")||`<div class="card muted">No exams added.</div>`}
function renderAnalytics(){
 if(typeof Chart==="undefined"){const total=data.tasks.length,completed=data.tasks.filter(t=>t.status==="completed").length,weak=data.chapters.filter(c=>c.percentage<=30).length,strong=data.chapters.filter(c=>c.percentage>80).length;$("weeklyReport").innerHTML=`<div class="report"><div class="report-box">Tasks<b>${completed}/${total}</b></div><div class="report-box">Completion<b>${total?Math.round(completed/total*100):0}%</b></div><div class="report-box">Strong chapters<b>${strong}</b></div><div class="report-box">Weak chapters<b>${weak}</b></div></div>`;return;}
 const subjects=data.subjects;const vals=subjects.map(s=>{const c=data.chapters.filter(x=>x.subject===s);return c.length?Math.round(c.reduce((a,x)=>a+x.percentage,0)/c.length):0});
 if(subjectChart)subjectChart.destroy();subjectChart=new Chart($("subjectChart"),{type:"doughnut",data:{labels:subjects,datasets:[{data:vals}]},options:{responsive:true,maintainAspectRatio:false}});
 const counts=["pending","in-progress","completed"].map(s=>data.tasks.filter(t=>t.status===s).length);if(taskChart)taskChart.destroy();taskChart=new Chart($("taskChart"),{type:"bar",data:{labels:["Pending","In Progress","Completed"],datasets:[{label:"Tasks",data:counts}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,ticks:{precision:0}}}}});
 const total=data.tasks.length,completed=data.tasks.filter(t=>t.status==="completed").length,weak=data.chapters.filter(c=>c.percentage<=30).length,strong=data.chapters.filter(c=>c.percentage>80).length;
 $("weeklyReport").innerHTML=`<div class="report"><div class="report-box">Tasks<b>${completed}/${total}</b></div><div class="report-box">Completion<b>${total?Math.round(completed/total*100):0}%</b></div><div class="report-box">Strong chapters<b>${strong}</b></div><div class="report-box">Weak chapters<b>${weak}</b></div></div>`;
}
function renderSettings(){$("profileName").value=data.user.name||"";$("profileTarget").value=data.user.weeklyTarget||28;$("profileGoal").value=data.user.goal||"";$("sideUser").textContent=data.user.name||"Student";$("avatar").textContent=(data.user.name||"S")[0].toUpperCase();$("syncStatus").textContent=demo?"Demo mode":"☁ Firebase synced";$("subjectChips").innerHTML=data.subjects.map((s,i)=>`<span class="chip">${s}<button data-remove-subject="${i}">✕</button></span>`).join("")}

function openModal(title,html,onSubmit){$("modalTitle").textContent=title;$("modalForm").innerHTML=`<div class="modal-form">${html}<div class="modal-buttons"><button type="button" id="cancelModal" class="btn ghost">Cancel</button><button class="btn primary">Save</button></div></div>`;$("modal").classList.remove("hidden");$("modalForm").onsubmit=e=>{e.preventDefault();onSubmit(new FormData(e.target));$("modal").classList.add("hidden");};$("cancelModal").onclick=()=>$("modal").classList.add("hidden")}
const selectSubjects=()=>data.subjects.map(s=>`<option>${s}</option>`).join("");
$("addTaskBtn").onclick=()=>openModal("Add Task",`<label>Task name<input name="title" required></label><label>Subject<select name="subject">${selectSubjects()}</select></label><label>Chapter/topic<input name="chapter"></label><label>Priority<select name="priority"><option>high</option><option>medium</option><option>low</option></select></label><label>Due date<input name="dueDate" type="date" value="${today()}" required></label><label>Estimated minutes<input name="estimatedTime" type="number" min="1" value="30"></label><label>Type<select name="type"><option>Reading</option><option>Practice</option><option>Revision</option><option>Test</option></select></label>`,f=>{data.tasks.push({id:crypto.randomUUID(),title:f.get("title"),subject:f.get("subject"),chapter:f.get("chapter"),priority:f.get("priority"),dueDate:f.get("dueDate"),status:"pending",estimatedTime:+f.get("estimatedTime"),type:f.get("type")});sync();toast("Task added")});
$("addChapterBtn").onclick=()=>openModal("Add Chapter",`<label>Subject<select name="subject">${selectSubjects()}</select></label><label>Chapter name<input name="name" required></label><label>Preparation %<input name="percentage" type="number" min="0" max="100" value="0"></label><label>Weak topics<input name="weakTopics"></label><label>Last revised<input name="lastRevised" type="date"></label><label>Next revision<input name="nextRevision" type="date"></label>`,f=>{data.chapters.push({id:crypto.randomUUID(),subject:f.get("subject"),name:f.get("name"),percentage:+f.get("percentage"),weakTopics:f.get("weakTopics"),lastRevised:f.get("lastRevised"),nextRevision:f.get("nextRevision")});sync();toast("Chapter added")});
$("addSlotBtn").onclick=()=>openModal("Add Timetable Slot",`<label>Day<select name="day">${["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"].map(x=>`<option>${x}</option>`).join("")}</select></label><label>Time<input name="time" type="time" value="09:00"></label><label>Subject<select name="subject">${selectSubjects()}</select></label><label>Chapter<input name="chapter"></label>`,f=>{data.timetable.push({id:crypto.randomUUID(),day:f.get("day"),time:f.get("time"),subject:f.get("subject"),chapter:f.get("chapter")});sync();toast("Timetable updated")});
$("addExamBtn").onclick=()=>openModal("Add Exam",`<label>Exam name<input name="name" required></label><label>Date<input name="date" type="date" required></label><label>Subjects<input name="subjects" placeholder="Mathematics, Physics"></label>`,f=>{data.exams.push({id:crypto.randomUUID(),name:f.get("name"),date:f.get("date"),subjects:f.get("subjects").split(",").map(x=>x.trim()).filter(Boolean)});sync();toast("Exam added")});

document.addEventListener("click",e=>{
 const id=e.target.dataset.complete;if(id){const t=data.tasks.find(x=>x.id===id);t.status=t.status==="completed"?"pending":"completed";if(t.status==="completed"){data.dailyLogs[today()]??={studyMinutes:0,tasksCompleted:0};data.dailyLogs[today()].tasksCompleted=(data.dailyLogs[today()].tasksCompleted||0)+1;data.dailyLogs[today()].studyMinutes+=(+t.estimatedTime||0)}sync();return}
 const del=(key,arr,msg)=>{const id=e.target.dataset[key];if(id){data[arr]=data[arr].filter(x=>x.id!==id);sync();toast(msg)}};
 del("delete-task","tasks","Task deleted");del("delete-chapter","chapters","Chapter deleted");del("delete-exam","exams","Exam deleted");del("delete-slot","timetable","Slot deleted");
 if(e.target.dataset.addSlot){const [day,time]=e.target.dataset.addSlot.split("|");openModal("Add Timetable Slot",`<label>Day<select name="day"><option>${day}</option>${["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"].filter(x=>x!==day).map(x=>`<option>${x}</option>`).join("")}</select></label><label>Time<input name="time" type="time" value="${time}"></label><label>Subject<select name="subject">${selectSubjects()}</select></label><label>Chapter<input name="chapter"></label>`,f=>{data.timetable.push({id:crypto.randomUUID(),day:f.get("day"),time:f.get("time"),subject:f.get("subject"),chapter:f.get("chapter")});sync()})}
 if(e.target.dataset.editTask){const t=data.tasks.find(x=>x.id===e.target.dataset.editTask);openModal("Edit Task",`<label>Task name<input name="title" value="${t.title}" required></label><label>Subject<select name="subject">${data.subjects.map(s=>`<option ${s===t.subject?"selected":""}>${s}</option>`).join("")}</select></label><label>Chapter/topic<input name="chapter" value="${t.chapter||""}"></label><label>Priority<select name="priority">${["high","medium","low"].map(x=>`<option ${x===t.priority?"selected":""}>${x}</option>`).join("")}</select></label><label>Due date<input name="dueDate" type="date" value="${t.dueDate}"></label><label>Status<select name="status"><option value="pending">Pending</option><option value="in-progress">In Progress</option><option value="completed">Completed</option></select></label><label>Estimated minutes<input name="estimatedTime" type="number" value="${t.estimatedTime}"></label>`,f=>{Object.assign(t,{title:f.get("title"),subject:f.get("subject"),chapter:f.get("chapter"),priority:f.get("priority"),dueDate:f.get("dueDate"),status:f.get("status"),estimatedTime:+f.get("estimatedTime")});sync()})}
 if(e.target.dataset.editChapter){const c=data.chapters.find(x=>x.id===e.target.dataset.editChapter);openModal("Edit Chapter",`<label>Subject<select name="subject">${selectSubjects()}</select></label><label>Chapter name<input name="name" value="${c.name}" required></label><label>Preparation %<input name="percentage" type="number" min="0" max="100" value="${c.percentage}"></label><label>Weak topics<input name="weakTopics" value="${c.weakTopics||""}"></label><label>Next revision<input name="nextRevision" type="date" value="${c.nextRevision||""}"></label>`,f=>{Object.assign(c,{subject:f.get("subject"),name:f.get("name"),percentage:+f.get("percentage"),weakTopics:f.get("weakTopics"),nextRevision:f.get("nextRevision")});sync()})}
 if(e.target.dataset.editExam){const x=data.exams.find(x=>x.id===e.target.dataset.editExam);openModal("Edit Exam",`<label>Exam name<input name="name" value="${x.name}" required></label><label>Date<input name="date" type="date" value="${x.date}" required></label><label>Subjects<input name="subjects" value="${(x.subjects||[]).join(", ")}"></label>`,f=>{Object.assign(x,{name:f.get("name"),date:f.get("date"),subjects:f.get("subjects").split(",").map(x=>x.trim()).filter(Boolean)});sync()})}
 if(e.target.dataset.removeSubject!==undefined){const i=+e.target.dataset.removeSubject;if(data.subjects.length>1){data.subjects.splice(i,1);sync()}}
});

["taskSearch","taskSubjectFilter","taskStatusFilter","taskPriorityFilter"].forEach(id=>$(id).addEventListener("input",renderTasks));
$("saveProfile").onclick=()=>{data.user.name=$("profileName").value.trim()||"Student";data.user.weeklyTarget=+$("profileTarget").value||28;data.user.goal=$("profileGoal").value.trim();sync();toast("Profile saved")};
$("addSubject").onclick=()=>{const s=$("newSubject").value.trim();if(s&&!data.subjects.includes(s)){data.subjects.push(s);$("newSubject").value="";sync();toast("Subject added")}};
$("exportBtn").onclick=()=>{const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="study-tracker-backup.json";a.click();URL.revokeObjectURL(a.href)};
$("resetBtn").onclick=()=>{if(confirm("Reset all demo data?")){data=structuredClone(defaultData);sync();toast("Data reset")}};
$("themeBtn").onclick=()=>{document.body.classList.toggle("dark");localStorage.setItem("studyTheme",document.body.classList.contains("dark")?"dark":"light")};
$("mobileMenu").onclick=()=>$(".sidebar").classList.toggle("open");$("closeModal").onclick=()=>$("modal").classList.add("hidden");
if(localStorage.getItem("studyTheme")==="dark")document.body.classList.add("dark");

$("demoBtn").onclick=()=>{demo=true;$("authScreen").classList.add("hidden");$("app").classList.remove("hidden");renderAll();toast("Demo mode started")};
$("loginBtn").onclick=async()=>{if(!firebaseReady)return $("authMessage").textContent="Firebase is not configured yet. Use Demo Mode, or add your Firebase settings.";if(!auth)return $("authMessage").textContent="Firebase is still loading. Please try again.";try{await signInWithEmailAndPassword(auth,$("authEmail").value,$("authPassword").value)}catch(e){$("authMessage").textContent=e.message}};
$("signupBtn").onclick=async()=>{if(!firebaseReady)return $("authMessage").textContent="Firebase is not configured yet. Use Demo Mode, or add your Firebase settings.";if(!auth)return $("authMessage").textContent="Firebase is still loading. Please try again.";try{await createUserWithEmailAndPassword(auth,$("authEmail").value,$("authPassword").value)}catch(e){$("authMessage").textContent=e.message}};
$("logoutBtn").onclick=async()=>{if(!demo&&auth)await signOut(auth);else{demo=true;$("app").classList.add("hidden");$("authScreen").classList.remove("hidden")}};

async function initializeAuth(){
  if(!firebaseReady){
    demo=true;
    $("authMessage").textContent="Firebase is not configured yet. Use Demo Mode, or add your Firebase settings.";
    return;
  }
  const ok=await setupFirebase();
  if(!ok){
    demo=true;
    $("authMessage").textContent="Firebase could not be loaded. Demo Mode is available.";
    return;
  }
  onAuthStateChanged(auth,async u=>{
    if(u){
      currentUser=u;
      try{await loadCloud(u);$("authScreen").classList.add("hidden");$("app").classList.remove("hidden");}
      catch(e){$("authMessage").textContent="Could not load cloud data: "+e.message;}
    }else if(!demo){
      $("app").classList.add("hidden");
      $("authScreen").classList.remove("hidden");
    }
  });
}
initializeAuth();
renderAll();
