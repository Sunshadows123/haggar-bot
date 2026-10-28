const DEFAULT_PROMPT="You are {name}, a warm, friendly and concise personal assistant running privately on the user's iPhone. Use Markdown when helpful. Keep answers clear and to the point.";
const MODELS=[
 ["SmolLM2-360M-Instruct-q4f16_1-MLC","SmolLM2 360M · ~380 MB · fastest"],
 ["Qwen2.5-0.5B-Instruct-q4f16_1-MLC","Qwen2.5 0.5B · ~950 MB · fast"],
 ["Llama-3.2-1B-Instruct-q4f16_1-MLC","Llama 3.2 1B · ~880 MB · balanced (default)"],
 ["Qwen2.5-1.5B-Instruct-q4f16_1-MLC","Qwen2.5 1.5B · ~1.6 GB · smarter"],
 ["gemma-2-2b-it-q4f16_1-MLC","Gemma 2 2B · ~1.9 GB · smarter"],
 ["Llama-3.2-3B-Instruct-q4f16_1-MLC","Llama 3.2 3B · ~2.3 GB · needs 8 GB RAM"],
 ["Phi-3.5-mini-instruct-q4f16_1-MLC","Phi-3.5 mini 3.8B · ~3.7 GB · needs 8 GB RAM"],
 ["Qwen2.5-3B-Instruct-q4f16_1-MLC","Qwen2.5 3B · ~2.5 GB · needs 8 GB RAM"]];
const DEF={name:"Haggar Bot",avatar:"🦊",avatarImg:"",theme:"dark",accent:"#7c5cff",bg:"#0b0b0f",fg:"#ececf1",font:16,bubble:"rounded",prompt:DEFAULT_PROMPT,temp:0.7,max:768,ctx:16,model:"Llama-3.2-1B-Instruct-q4f16_1-MLC"};
const CHIPS=["Plan my week","Explain something simply","Write a quick email","Give me a recipe idea","Help me brainstorm","Tell me a fun fact"];
const $=s=>document.querySelector(s),chat=$("#chat"),st=$("#status"),bar=$("#bar div"),q=$("#q"),send=$("#send"),stopB=$("#stop");
let S={...DEF,...JSON.parse(localStorage.getItem("hb_settings")||"{}")};
let convs=JSON.parse(localStorage.getItem("hb_convs")||"null");
if(!convs){const old=JSON.parse(localStorage.getItem("hb_chat")||"[]");convs=old.length?[{id:Date.now()+"",title:old[0].content.slice(0,40),msgs:old,t:Date.now()}]:[]}
let cur=localStorage.getItem("hb_cur"),gen=null,busy=false,abort=null,engine=null,mode="";
const saveS=()=>localStorage.setItem("hb_settings",JSON.stringify(S));
const saveC=()=>{try{localStorage.setItem("hb_convs",JSON.stringify(convs));localStorage.setItem("hb_cur",cur||"")}catch(e){alert("Storage full — export and delete some chats.")}};
const conv=()=>convs.find(c=>c.id===cur);
const esc=s=>s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function md(src){
  const blocks=[];src=src.replace(/```(\w*)\n?([\s\S]*?)(```|$)/g,(_,l,c)=>{blocks.push("<pre><code>"+esc(c.replace(/\n$/,""))+"</code></pre>");return"\u0000"+(blocks.length-1)+"\u0000"});
  const inl=t=>esc(t).replace(/`([^`]+)`/g,"<code>$1</code>").replace(/\*\*(.+?)\*\*/g,"<b>$1</b>").replace(/(^|\W)\*(?!\s)(.+?)\*(?=\W|$)/g,"$1<i>$2</i>").replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,'<a href="$2" target="_blank" rel="noopener">$1</a>');
  let out="",list=null;const close=()=>{if(list){out+="</"+list+">";list=null}};
  for(const line of src.split("\n")){let m;
    if(/^\u0000\d+\u0000$/.test(line.trim())){close();out+=line.trim();continue}
    if(m=line.match(/^(#{1,6})\s+(.*)/)){close();out+=`<h3>${inl(m[2])}</h3>`}
    else if(m=line.match(/^\s*[-*•]\s+(.*)/)){if(list!=="ul"){close();out+="<ul>";list="ul"}out+=`<li>${inl(m[1])}</li>`}
    else if(m=line.match(/^\s*\d+[.)]\s+(.*)/)){if(list!=="ol"){close();out+="<ol>";list="ol"}out+=`<li>${inl(m[1])}</li>`}
    else if(m=line.match(/^>\s?(.*)/)){close();out+=`<blockquote>${inl(m[1])}</blockquote>`}
    else if(!line.trim())close();else{close();out+=`<p>${inl(line)}</p>`}}
  close();return out.replace(/\u0000(\d+)\u0000/g,(_,i)=>blocks[i]);
}
function avatarHTML(){return S.avatarImg?`<img src="${S.avatarImg}" alt="">`:esc(S.avatar||"🤖")}
function applySettings(){
  const r=document.documentElement.style,light=S.theme==="light",custom=S.theme==="custom";
  const bg=custom?S.bg:light?"#f6f6f8":"#0b0b0f",fg=custom?S.fg:light?"#15151a":"#ececf1";
  const mix=(p)=>`color-mix(in srgb,${fg} ${p}%,${bg})`;
  r.setProperty("--bg",bg);r.setProperty("--fg",fg);r.setProperty("--acc",S.accent);r.setProperty("--panel",mix(light?4:6));r.setProperty("--panel2",mix(light?8:11));r.setProperty("--line",mix(light?12:13));r.setProperty("--mut",mix(55));r.setProperty("--fs",S.font+"px");
  document.querySelector('meta[name=theme-color]').content=bg;
  document.body.className=document.body.className.replace(/b-\w+/g,"")+" b-"+S.bubble;
  $("#hAvatar").innerHTML=avatarHTML();$("#hName").textContent=S.name;q.placeholder="Message "+S.name+"…";document.title=S.name;
}
function renderList(){const L=$("#convList");L.innerHTML="";[...convs].sort((a,b)=>b.t-a.t).forEach(c=>{const d=document.createElement("div");d.className="conv"+(c.id===cur?" on":"");
  d.innerHTML=`<span></span><button aria-label="Rename">✎</button><button aria-label="Delete">🗑</button>`;d.querySelector("span").textContent=c.title||"New chat";
  d.querySelector("span").onclick=()=>{cur=c.id;saveC();render();document.body.classList.remove("open")};
  const [rn,dl]=d.querySelectorAll("button");rn.onclick=()=>{const t=prompt("Rename chat",c.title);if(t!==null){c.title=t.trim()||c.title;saveC();renderList()}};
  dl.onclick=()=>{if(confirm("Delete this chat?")){convs=convs.filter(x=>x!==c);if(cur===c.id)cur=null;saveC();render()}};L.appendChild(d)})}
function row(role){const r=document.createElement("div");r.className="row "+role;if(role==="assistant")r.innerHTML=`<div class="avatar">${avatarHTML()}</div>`;const col=document.createElement("div");col.style.cssText="display:flex;flex-direction:column;min-width:0;max-width:100%;"+(role==="user"?"align-items:flex-end":"");const b=document.createElement("div");b.className="bub";col.appendChild(b);r.appendChild(col);chat.appendChild(r);return{r,b,col}}
function actions(col,text,i){const a=document.createElement("div");a.className="acts";a.innerHTML=`<button>⧉ Copy</button>`+(i===conv().msgs.length-1?`<button>↻ Regenerate</button>`:"");
  a.children[0].onclick=e=>{navigator.clipboard.writeText(text);e.target.textContent="✓ Copied";setTimeout(()=>e.target.textContent="⧉ Copy",1200)};
  if(a.children[1])a.children[1].onclick=()=>{if(busy)return;conv().msgs.pop();saveC();render();reply()};col.appendChild(a)}
function render(){applySettings();renderList();chat.innerHTML="";const c=conv();
  if(!c||!c.msgs.length){chat.innerHTML=`<div class="empty"><div class="avatar">${avatarHTML()}</div><h2></h2><p>Private AI that runs on your phone. No sign-up.</p><div class="chips"></div></div>`;chat.querySelector("h2").textContent="Hi, I'm "+S.name;
    CHIPS.forEach(t=>{const b=document.createElement("button");b.textContent=t;b.onclick=()=>{q.value=t;$("#f").requestSubmit()};chat.querySelector(".chips").appendChild(b)});return}
  c.msgs.forEach((m,i)=>{const{b,col}=row(m.role);if(m.role==="user")b.textContent=m.content;else{b.innerHTML=md(m.content);actions(col,m.content,i)}});chat.scrollTop=1e9}
const prog=(p,t)=>{bar.style.width=Math.round(p*100)+"%";st.textContent=t;if(p>=1)setTimeout(()=>bar.style.width="0",600)};
async function loadGPU(id){
  const webllm=await import("https://esm.run/@mlc-ai/web-llm@0.2.79");
  const cb=r=>prog(r.progress,/Fetch|Loading model from cache/.test(r.text)?"Downloading model (once)… "+Math.round(r.progress*100)+"%":"Loading… "+Math.round(r.progress*100)+"%");
  if(engine){await engine.reload(id);}else engine=await webllm.CreateMLCEngine(id,{initProgressCallback:cb});
  return async function*(h,sig){const s=await engine.chat.completions.create({messages:h,stream:true,temperature:+S.temp,max_tokens:+S.max});
    for await(const c of s){if(sig.aborted){engine.interruptGenerate();break}yield c.choices[0]?.delta?.content||""}};
}
async function loadWasm(){
  const base="https://cdn.jsdelivr.net/npm/@wllama/wllama@2.3.1/esm/";const{Wllama}=await import(base+"index.js");
  const w=new Wllama({"single-thread/wllama.wasm":base+"single-thread/wllama.wasm","multi-thread/wllama.wasm":base+"multi-thread/wllama.wasm"});
  await w.loadModelFromHF("bartowski/SmolLM2-360M-Instruct-GGUF","SmolLM2-360M-Instruct-Q4_K_M.gguf",{n_ctx:2048,progressCallback:({loaded,total})=>prog(loaded/total,"Downloading backup model (once)… "+Math.round(loaded/total*100)+"%")});
  return async function*(h,sig){let prev="",out=[],done=false;
    w.createChatCompletion(h,{nPredict:+S.max,sampling:{temp:+S.temp},abortSignal:sig,onNewToken:(t,p,text)=>{out.push(text.slice(prev.length));prev=text}}).catch(()=>{}).finally(()=>done=true);
    while(!done||out.length){if(sig.aborted)break;if(out.length)yield out.shift();else await new Promise(r=>setTimeout(r,30))}};
}
let hasGPU=false;
async function boot(){send.disabled=true;
  try{hasGPU=hasGPU||!!(navigator.gpu&&await navigator.gpu.requestAdapter());}catch{}
  try{if(!hasGPU)throw 0;st.textContent="Loading model…";gen=await loadGPU(S.model);mode=MODELS.find(m=>m[0]===S.model)?.[1].split(" ·")[0]||S.model}
  catch(e){if(hasGPU)console.error(e);
    if(!hasGPU)st.textContent="No WebGPU (needs iOS 26+) — using small backup model";
    try{gen=await loadWasm();mode="Backup · SmolLM2 360M (CPU)"}catch(e2){console.error(e2);st.textContent="Sorry — this device can't run the on-device AI. Try iOS 26 on a recent iPhone.";return}}
  prog(1,"Ready · "+mode+" · works offline");send.disabled=false}
async function reply(){const c=conv();busy=true;send.classList.add("hidden");stopB.classList.remove("hidden");
  const{b,col}=row("assistant");b.innerHTML='<span class="typing"><i></i><i></i><i></i></span>';chat.scrollTop=1e9;
  abort=new AbortController();let r="";
  try{const sys=(S.prompt||DEFAULT_PROMPT).replaceAll("{name}",S.name);
    for await(const t of gen([{role:"system",content:sys},...c.msgs.slice(-S.ctx)],abort.signal)){r+=t;b.innerHTML=md(r);const n=chat;if(n.scrollHeight-n.scrollTop-n.clientHeight<120)n.scrollTop=1e9}}
  catch(e){r=r||"⚠️ "+e.message}
  if(!r)r="_(stopped)_";c.msgs.push({role:"assistant",content:r});c.t=Date.now();saveC();b.innerHTML=md(r);actions(col,r,c.msgs.length-1);
  busy=false;stopB.classList.add("hidden");send.classList.remove("hidden");send.disabled=!gen}
stopB.onclick=()=>abort?.abort();
$("#f").onsubmit=e=>{e.preventDefault();const t=q.value.trim();if(!t||busy||!gen)return;q.value="";q.style.height="auto";
  let c=conv();if(!c){c={id:Date.now()+"",title:t.slice(0,40),msgs:[],t:Date.now()};convs.push(c);cur=c.id}
  if(!c.msgs.length){chat.innerHTML="";c.title=t.slice(0,40)}c.msgs.push({role:"user",content:t});saveC();renderList();row("user").b.textContent=t;reply()};
q.oninput=()=>{q.style.height="auto";q.style.height=q.scrollHeight+"px"};
q.onkeydown=e=>{if(e.key==="Enter"&&!e.shiftKey&&!/iPhone|iPad/.test(navigator.userAgent)){e.preventDefault();$("#f").requestSubmit()}};
const newChat=()=>{if(busy)return;cur=null;saveC();render();document.body.classList.remove("open");q.focus()};
$("#newChat").onclick=newChat;$("#newChat2").onclick=newChat;
$("#menu").onclick=()=>document.body.classList.add("open");$("#scrim").onclick=$("#closeDrawer").onclick=()=>document.body.classList.remove("open");
// Settings
const sel=$("#s_model");MODELS.forEach(([id,l])=>sel.add(new Option(l,id)));
const fields={name:"s_name",avatar:"s_avatar",theme:"s_theme",accent:"s_accent",bg:"s_bg",fg:"s_fg",font:"s_font",bubble:"s_bubble",prompt:"s_prompt",temp:"s_temp",max:"s_max",ctx:"s_ctx",model:"s_model"};
const vals=()=>{$("#v_font").textContent=S.font+"px";$("#v_temp").textContent=(+S.temp).toFixed(2);$("#v_max").textContent=S.max;$("#v_ctx").textContent=S.ctx};
function openSettings(){document.body.classList.remove("open");for(const[k,id]of Object.entries(fields))$("#"+id).value=S[k];vals();$("#settings").classList.remove("hidden")}
$("#openSettings").onclick=$("#openSettings2").onclick=openSettings;
$("#closeSettings").onclick=()=>{$("#settings").classList.add("hidden");render()};
for(const[k,id]of Object.entries(fields))$("#"+id).addEventListener(k==="model"?"change":"input",e=>{const num=["font","temp","max","ctx"].includes(k);S[k]=num?+e.target.value:e.target.value;if(k==="avatar")S.avatarImg="";saveS();vals();applySettings();
  if(k==="model"&&hasGPU&&!busy)boot()});
$("#s_promptReset").onclick=()=>{S.prompt=DEFAULT_PROMPT;$("#s_prompt").value=S.prompt;saveS()};
$("#s_avatarFile").onchange=e=>{const f=e.target.files[0];if(!f)return;const img=new Image();img.onload=()=>{const c=document.createElement("canvas");c.width=c.height=128;const x=c.getContext("2d"),s=Math.min(img.width,img.height);x.drawImage(img,(img.width-s)/2,(img.height-s)/2,s,s,0,0,128,128);S.avatarImg=c.toDataURL("image/jpeg",.85);saveS();applySettings()};img.src=URL.createObjectURL(f)};
$("#s_avatarClear").onclick=()=>{S.avatarImg="";saveS();applySettings()};
$("#exp").onclick=()=>{const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify({app:"haggar-bot",version:2,settings:S,convs},null,2)],{type:"application/json"}));a.download="haggar-bot-chats.json";a.click()};
$("#imp").onchange=async e=>{try{const d=JSON.parse(await e.target.files[0].text());const list=Array.isArray(d)?d:d.convs;if(!Array.isArray(list))throw 0;
  const ids=new Set(convs.map(c=>c.id));list.forEach(c=>{if(c&&Array.isArray(c.msgs)){if(ids.has(c.id))c.id=c.id+"-"+Math.random().toString(36).slice(2,6);convs.push(c)}});
  if(d.settings&&confirm("Also import settings?")){S={...DEF,...d.settings};saveS();openSettings()}saveC();alert("Imported "+list.length+" chats")}catch{alert("That file isn't a valid Haggar Bot export.")}e.target.value=""};
$("#clearChats").onclick=()=>{if(confirm("Delete all chats?")){convs=[];cur=null;saveC();render()}};
$("#clearAll").onclick=async()=>{if(!confirm("Reset all settings, chats and downloaded models?"))return;localStorage.clear();
  for(const k of await caches.keys())await caches.delete(k);try{const r=await navigator.storage.getDirectory();for await(const n of r.keys())await r.removeEntry(n,{recursive:true})}catch{}
  indexedDB.databases?.().then(d=>d.forEach(x=>indexedDB.deleteDatabase(x.name)));location.reload()};
if("serviceWorker"in navigator)navigator.serviceWorker.register("sw.js");
navigator.storage?.persist?.();
render();boot();
