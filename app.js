const SYS="You are Haggar Bot, a warm, friendly and concise personal assistant running privately on the user's iPhone. Keep answers short and helpful.";
const GPU_MODEL="Llama-3.2-1B-Instruct-q4f16_1-MLC";
const $=s=>document.querySelector(s),chat=$("#chat"),st=$("#status"),bar=$("#bar div"),q=$("#q"),send=$("#send");
let msgs=JSON.parse(localStorage.getItem("hb_chat")||"[]"),gen=null,busy=false;
const save=()=>localStorage.setItem("hb_chat",JSON.stringify(msgs));
function add(role,text){const d=document.createElement("div");d.className="m "+role;d.textContent=text;chat.appendChild(d);chat.scrollTop=1e9;return d}
function render(){chat.innerHTML="";if(!msgs.length)add("assistant","Hi! I'm Haggar Bot. I run entirely on your phone — no sign-up, no server. How can I help?");msgs.forEach(m=>add(m.role,m.content))}
render();$("#new").onclick=()=>{if(busy)return;msgs=[];save();render()};
const prog=(p,t)=>{bar.style.width=Math.round(p*100)+"%";st.textContent=t};
if("serviceWorker"in navigator)navigator.serviceWorker.register("sw.js");
async function initGPU(){
  const webllm=await import("https://esm.run/@mlc-ai/web-llm@0.2.79");
  const eng=await webllm.CreateMLCEngine(GPU_MODEL,{initProgressCallback:r=>prog(r.progress,r.text.includes("Fetching")?"First run: downloading AI model (~700 MB, once)… "+Math.round(r.progress*100)+"%":r.text)});
  return async function*(h){const s=await eng.chat.completions.create({messages:h,stream:true,temperature:0.7,max_tokens:512});for await(const c of s)yield c.choices[0]?.delta?.content||""};
}
async function initWasm(){
  const {Wllama}=await import("https://cdn.jsdelivr.net/npm/@wllama/wllama@2.3.1/esm/index.js");
  const base="https://cdn.jsdelivr.net/npm/@wllama/wllama@2.3.1/esm/";
  const w=new Wllama({"single-thread/wllama.wasm":base+"single-thread/wllama.wasm","multi-thread/wllama.wasm":base+"multi-thread/wllama.wasm"});
  await w.loadModelFromHF("bartowski/SmolLM2-360M-Instruct-GGUF","SmolLM2-360M-Instruct-Q4_K_M.gguf",{n_ctx:2048,progressCallback:({loaded,total})=>prog(loaded/total,"First run: downloading small AI model (~270 MB, once)… "+Math.round(loaded/total*100)+"%")});
  return async function*(h){let prev="",out=[];const p=new Promise(r=>w.createChatCompletion(h,{nPredict:384,sampling:{temp:0.7},onNewToken:(t,p2,text)=>{out.push(text.slice(prev.length));prev=text}}).then(r));
    let done=false;p.then(()=>done=true);while(!done||out.length){if(out.length)yield out.shift();else await new Promise(r=>setTimeout(r,30))}};
}
(async()=>{
  let mode;
  try{
    if(navigator.gpu&&await navigator.gpu.requestAdapter()){mode="WebGPU · Llama 3.2 1B";gen=await initGPU()}
    else throw new Error("nogpu");
  }catch(e){
    add("assistant","ℹ️ Your device doesn't support WebGPU (needs iOS 26 or newer), so I'm using a smaller, slower backup brain. Updating iOS will make me smarter and faster.");
    try{mode="Compatibility · SmolLM2 360M";gen=await initWasm()}
    catch(e2){st.textContent="Sorry — this device can't run the on-device AI. Try updating to iOS 26 on a recent iPhone.";console.error(e2);return}
  }
  prog(1,"Ready ("+mode+") · works offline");send.disabled=false;
})();
q.oninput=()=>{q.style.height="auto";q.style.height=q.scrollHeight+"px"};
q.onkeydown=e=>{if(e.key==="Enter"&&!e.shiftKey&&!/iPhone|iPad/.test(navigator.userAgent)){e.preventDefault();$("#f").requestSubmit()}};
$("#f").onsubmit=async e=>{e.preventDefault();const t=q.value.trim();if(!t||busy||!gen)return;
  q.value="";q.style.height="auto";if(!msgs.length)chat.innerHTML="";msgs.push({role:"user",content:t});add("user",t);save();
  busy=true;send.disabled=true;const d=add("assistant","…");let r="";
  try{for await(const c of gen([{role:"system",content:SYS},...msgs.slice(-12)])){r+=c;d.textContent=r;chat.scrollTop=1e9}}catch(err){r=r||"Sorry, something went wrong: "+err.message;d.textContent=r}
  msgs.push({role:"assistant",content:r});save();busy=false;send.disabled=false};
