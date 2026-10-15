const DB_NAME = "inclisiran-sca-local";
const DB_VERSION = 1;
let db;
const $ = (s) => document.querySelector(s);
const form = $("#patientForm");
const message = $("#formMessage");
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fields = [...form.elements].filter(e => e.name);
const boolNames = ["diabetes","hypertension","dyslipidemia","smoking","prior_ascvd","ckd"];
function openDb(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,DB_VERSION);req.onupgradeneeded=()=>{const d=req.result;if(!d.objectStoreNames.contains("patients"))d.createObjectStore("patients",{keyPath:"study_id"});};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
function tx(mode,fn){return new Promise((resolve,reject)=>{const t=db.transaction("patients",mode),s=t.objectStore("patients");let result;try{result=fn(s)}catch(e){reject(e);return;}t.oncomplete=()=>resolve(result);t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error);});}
function getAll(){return new Promise((resolve,reject)=>{const r=db.transaction("patients").objectStore("patients").getAll();r.onsuccess=()=>resolve(r.result||[]);r.onerror=()=>reject(r.error);});}
function savePatient(p){return new Promise((resolve,reject)=>{const t=db.transaction("patients","readwrite");t.objectStore("patients").put(p);t.oncomplete=()=>resolve();t.onerror=()=>reject(t.error);});}
function deletePatient(id){return new Promise((resolve,reject)=>{const t=db.transaction("patients","readwrite");t.objectStore("patients").delete(id);t.oncomplete=()=>resolve();t.onerror=()=>reject(t.error);});}
function formToObject(){const p={};for(const el of fields){if(!el.name)continue;p[el.name]=el.type==="checkbox"?el.checked:(el.value.trim()===""?null:el.value.trim());}return p;}
function objectToForm(p){form.reset();populateLesions(p.lesions||[]);for(const el of fields){if(!(el.name in p))continue;if(el.type==="checkbox")el.checked=Boolean(p[el.name]);else el.value=p[el.name]??"";}message.textContent="Editando registro existente. Al guardar se actualizará el folio.";window.scrollTo({top:0,behavior:"smooth"});showTab("form");}
function showTab(tab){document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("active",b.dataset.tab===tab));$("#formPanel").classList.toggle("hidden",tab!=="form");$("#recordsPanel").classList.toggle("hidden",tab!=="records");$("#aboutPanel").classList.toggle("hidden",tab!=="about");if(tab==="records")renderRecords();if(tab==="about")updateStatus();}
function updateNetwork(){const online=navigator.onLine;const b=$("#networkBadge");b.textContent=online?"En línea · datos locales":"Sin conexión · modo local";b.className="status "+(online?"online":"offline");$("#connectionText").textContent=online?"En línea":"Sin conexión";}
function csvEscape(v){const s=Array.isArray(v)?v.join("; "):String(v??"");return '"'+s.replace(/"/g,'""')+'"';}
function download(name,content,type){const blob=new Blob([content],{type});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
async function updateCounts(){const rows=await getAll();$("#recordCount").textContent=rows.length;$("#localCount").textContent=rows.length;}
async function renderRecords(){const all=(await getAll()).sort((a,b)=>(b.updated_at||"").localeCompare(a.updated_at||""));const q=$("#searchRecords").value.trim().toLowerCase();const rows=all.filter(p=>(p.study_id||"").toLowerCase().includes(q));const host=$("#recordsList");if(!rows.length){host.innerHTML='<div class="empty">No hay registros que mostrar. Guarda un paciente desde la pestaña “Nuevo paciente”.</div>';await updateCounts();return;}host.innerHTML=rows.map(p=>`<article class="record"><div><h4>${esc(p.study_id)}</h4><p>${esc(p.acs_type||"SCA no especificado")} · ${esc(p.treatment_group||"Grupo no especificado")} · LDL basal: ${esc(p.ldl_baseline??"—")} mg/dL</p><p>Actualizado: ${esc((p.updated_at||"").replace("T"," ").slice(0,16))}</p></div><div class="record-actions"><button class="button secondary" data-edit="${esc(p.study_id)}">Editar</button><button class="button secondary" data-delete="${esc(p.study_id)}">Eliminar</button></div></article>`).join("");host.querySelectorAll("[data-edit]").forEach(b=>b.addEventListener("click",async()=>{const p=(await getAll()).find(x=>x.study_id===b.dataset.edit);if(p)objectToForm(p);}));host.querySelectorAll("[data-delete]").forEach(b=>b.addEventListener("click",async()=>{if(confirm(`¿Eliminar el registro ${b.dataset.delete} de este dispositivo? Esta acción no se puede deshacer.`)){await deletePatient(b.dataset.delete);await renderRecords();}}));await updateCounts();}

// Lesiones coronarias: estructura repetible, vinculada al folio del paciente.
const lesionFields = [
  ["role","Tipo de lesión","select",["Culpable del SCA","Intermedia no culpable","Otra lesión no culpable"]],
  ["artery","Arteria","select",["Tronco coronario izquierdo","DA","Diagonal","Circunfleja","Marginal obtusa","Coronaria derecha","Descendente posterior","Ramo posterolateral","Injerto","Otra"]],
  ["segment","Segmento","select",["Ostial","Proximal","Medio","Distal","Bifurcación","Tronco","Injerto","No especificado"]],
  ["stenosis_pct","Estenosis visual (%)","number"],
  ["flow_timi_pre","TIMI pre-ICP","select",["0","1","2","3","No evaluable"]],
  ["thrombus","Trombo angiográfico","select",["Sí","No","Indeterminado"]],
  ["calcification","Calcificación angiográfica","select",["Ausente/leve","Moderada","Severa","No evaluada"]],
  ["bifurcation","Lesión en bifurcación","select",["Sí","No"]],
  ["chronic_total_occlusion","Oclusión total crónica","select",["Sí","No","Indeterminado"]],
  ["flow_timi_post","TIMI final","select",["0","1","2","3","No evaluable"]],
  ["lesion_length_mm","Longitud estimada (mm)","number"],
  ["reference_diameter_mm","Diámetro de referencia (mm)","number"],
  ["physiology","Evaluación fisiológica","select",["No realizada","FFR","iFR","Otra"]],
  ["physiology_value","Valor FFR/iFR","number"],
  ["management","Manejo de lesión","select",["ICP con stent","ICP sin stent","Tratamiento médico","Revascularización quirúrgica","Pendiente/individualizar"]],
  ["stent_count","Número de stents en esta lesión","number"],
  ["stent_diameter_mm","Diámetro del stent (mm)","number"],
  ["stent_length_mm","Longitud total de stent (mm)","number"],
  ["oct_done","OCT realizada en esta lesión","select",["Sí","No"]],
  ["oct_timing","Momento de OCT","select",["Antes de ICP","Después de ICP","Antes y después","No aplica"]],
  ["oct_min_fct_um","Grosor mínimo de capa fibrosa (µm)","number"],
  ["oct_lipid_arc_deg","Arco lipídico máximo (°)","number"],
  ["oct_lipid_length_mm","Longitud de placa lipídica (mm)","number"],
  ["oct_plaque_rupture","Ruptura de placa","select",["Sí","No","Indeterminado","No evaluable"]],
  ["oct_erosion","Erosión de placa sospechada/identificada","select",["Sí","No","Indeterminado","No evaluable"]],
  ["oct_thrombus","Trombo por OCT","select",["Sí","No","Indeterminado","No evaluable"]],
  ["oct_calcium","Calcio por OCT","select",["Sí","No","Indeterminado","No evaluable"]],
  ["oct_calcium_arc_deg","Arco máximo de calcio (°)","number"],
  ["oct_calcium_length_mm","Longitud de calcio (mm)","number"],
  ["oct_min_lumen_area_mm2","Área luminal mínima (mm²)","number"],
  ["oct_min_lumen_diameter_mm","Diámetro luminal mínimo (mm)","number"],
  ["oct_reference_lumen_area_mm2","Área luminal de referencia (mm²)","number"],
  ["oct_thin_cap_fibroatheroma","TCFA por criterios OCT","select",["Sí","No","Indeterminado","No evaluable"]],
  ["oct_macrophages","Macrófagos por OCT","select",["Sí","No","Indeterminado","No evaluable"]],
  ["oct_calcified_nodule","Nódulo calcificado","select",["Sí","No","Indeterminado","No evaluable"]],
  ["oct_dissection","Disección por OCT","select",["Sí","No","Indeterminado","No evaluable"]],
  ["oct_malapposition","Malaposición del stent","select",["Sí","No","No aplica","No evaluable"]],
  ["oct_edge_dissection","Disección de bordes del stent","select",["Sí","No","No aplica","No evaluable"]],
  ["oct_tissue_prolapse","Prolapso tisular","select",["Sí","No","No aplica","No evaluable"]],
  ["oct_min_stent_area_mm2","Área mínima del stent (mm²)","number"],
  ["oct_expansion_pct","Expansión del stent (%)","number"],
  ["oct_stent_apposition","Aposición del stent","select",["Completa","Malaposición","No evaluable","No aplica"]],
  ["oct_stent_expansion","Expansión de stent evaluada","select",["Adecuada","Subóptima","No evaluada","No aplica"]],
  ["notes","Notas de la lesión","text"]
];
function lesionInput(def, idx, val=""){
  const [key,label,type,opts]=def, name=`lesion_${idx}_${key}`;
  let input="";
  if(type==="select"){
    input=`<select data-lesion-key="${key}" name="${name}"><option value="">Seleccionar</option>${opts.map(o=>`<option value="${esc(o)}" ${String(val)===o?"selected":""}>${esc(o)}</option>`).join("")}</select>`;
  }else if(type==="text"){
    input=`<textarea data-lesion-key="${key}" name="${name}" rows="2" maxlength="700">${esc(val||"")}</textarea>`;
  }else{
    input=`<input data-lesion-key="${key}" name="${name}" type="number" min="0" ${key==="stenosis_pct"?"max=\"100\"":""} step="0.1" value="${esc(val??"")}">`;
  }
  return `<label>${esc(label)}${input}</label>`;
}
function addLesionCard(data={}){
  const host=$("#lesionsContainer"), idx=Date.now().toString(36)+Math.random().toString(36).slice(2,6);
  const card=document.createElement("div");card.className="lesion-card";card.dataset.lesionId=idx;
  const group1=lesionFields.filter(d=>["role","artery","segment","stenosis_pct","flow_timi_pre","thrombus","calcification","bifurcation","chronic_total_occlusion","flow_timi_post","lesion_length_mm","reference_diameter_mm"].includes(d[0]));
  const group2=lesionFields.filter(d=>["physiology","physiology_value","management","stent_count","stent_diameter_mm","stent_length_mm"].includes(d[0]));
  const group3=lesionFields.filter(d=>d[0].startsWith("oct_"));
  const group4=lesionFields.filter(d=>d[0]==="notes");
  card.innerHTML=`<div class="lesion-card-head"><h4>Lesión coronaria <span class="lesion-number"></span></h4><div class="lesion-actions"><button type="button" class="button secondary remove-lesion">Eliminar lesión</button></div></div>
    <div class="lesion-subtitle">A. Angiografía coronaria</div><div class="grid">${group1.map(d=>lesionInput(d,idx,data[d[0]])).join("")}</div>
    <div class="lesion-subtitle">B. Fisiología y tratamiento de la lesión</div><div class="grid">${group2.map(d=>lesionInput(d,idx,data[d[0]])).join("")}</div>
    <div class="lesion-subtitle">C. OCT: placa nativa y/o resultado del stent</div><div class="grid">${group3.map(d=>lesionInput(d,idx,data[d[0]])).join("")}</div>
    <div class="grid">${group4.map(d=>lesionInput(d,idx,data[d[0]])).join("")}</div>`;
  card.querySelector(".remove-lesion").addEventListener("click",()=>{if(confirm("¿Eliminar esta lesión de la captura?")){card.remove();numberLesions();}});
  host.appendChild(card);numberLesions();
}
function numberLesions(){document.querySelectorAll(".lesion-card").forEach((c,i)=>c.querySelector(".lesion-number").textContent=i+1);}
function collectLesions(){
  return [...document.querySelectorAll(".lesion-card")].map(card=>{
    const item={};
    card.querySelectorAll("[data-lesion-key]").forEach(el=>item[el.dataset.lesionKey]=el.value.trim()===""?null:el.value.trim());
    return item;
  });
}
function clearLesions(){if($("#lesionsContainer"))$("#lesionsContainer").innerHTML="";}
function populateLesions(arr){clearLesions();(arr||[]).forEach(x=>addLesionCard(x));}
$("#addLesion")?.addEventListener("click",()=>addLesionCard());

form.addEventListener("submit",async e=>{e.preventDefault();message.className="message";const p=formToObject();p.study_id=p.study_id.toUpperCase();p.lesions=collectLesions();p.updated_at=new Date().toISOString();p.created_at=p.created_at||p.updated_at;p.schema_version=1;p.sync_status="local_only";try{const existing=(await getAll()).find(x=>x.study_id===p.study_id);if(existing)p.created_at=existing.created_at;await savePatient(p);message.textContent=`Registro ${p.study_id} guardado en este dispositivo.`;form.reset();clearLesions();await updateCounts();}catch(err){message.textContent="No se pudo guardar. Comprueba el almacenamiento del navegador.";message.className="message error";console.error(err);}});
document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>showTab(b.dataset.tab)));
$("#searchRecords").addEventListener("input",renderRecords);
$("#exportCsv").addEventListener("click",async()=>{const rows=await getAll();if(!rows.length){alert("No hay registros para exportar.");return;}const keys=[...new Set(rows.flatMap(Object.keys))];const csv=[keys.map(csvEscape).join(","),...rows.map(r=>keys.map(k=>csvEscape(r[k])).join(","))].join("\r\n");download("inclisiran_sca_registros.csv","\ufeff"+csv,"text/csv;charset=utf-8;");});

$("#exportLesionsCsv").addEventListener("click",async()=>{
 const rows=await getAll();const out=[];
 for(const p of rows){(p.lesions||[]).forEach((l,i)=>out.push({study_id:p.study_id,lesion_number:i+1,...l}));}
 if(!out.length){alert("No hay lesiones registradas para exportar.");return;}
 const keys=[...new Set(out.flatMap(Object.keys))];
 const csv=[keys.map(csvEscape).join(","),...out.map(r=>keys.map(k=>csvEscape(r[k])).join(","))].join("\r\n");
 download("inclisiran_sca_lesiones.csv","\ufeff"+csv,"text/csv;charset=utf-8;");
});

$("#exportJson").addEventListener("click",async()=>{const rows=await getAll();download("inclisiran_sca_respaldo.json",JSON.stringify({app:"INCLISIRAN-SCA",schema_version:1,exported_at:new Date().toISOString(),patients:rows},null,2),"application/json");});
$("#importJson").addEventListener("click",()=>$("#jsonFile").click());
$("#jsonFile").addEventListener("change",async e=>{const f=e.target.files[0];if(!f)return;try{const obj=JSON.parse(await f.text());const rows=Array.isArray(obj)?obj:obj.patients;if(!Array.isArray(rows))throw new Error("Formato inválido");let n=0;for(const p of rows){if(!p.study_id)continue;const clean={...p,study_id:String(p.study_id).toUpperCase(),sync_status:"local_only"};await savePatient(clean);n++;}alert(`Se importaron/actualizaron ${n} registros en este dispositivo.`);await renderRecords();}catch(err){alert("No se pudo importar el archivo JSON. Verifica que sea un respaldo válido.");}finally{e.target.value="";}});
window.addEventListener("online",updateNetwork);window.addEventListener("offline",updateNetwork);
(async()=>{try{db=await openDb();await updateCounts();updateNetwork();if("serviceWorker" in navigator && location.protocol.startsWith("http"))navigator.serviceWorker.register("./service-worker.js").catch(console.warn);}catch(e){console.error(e);alert("Este navegador no permite abrir el almacenamiento local. Usa una versión actualizada de Safari, Chrome o Edge.");}})();
