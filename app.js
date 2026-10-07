const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

const E = {
  fileInput:$("#fileInput"),selectBtn:$("#selectBtn"),addMoreBtn:$("#addMoreBtn"),
  dropzone:$("#dropzone"),emptyState:$("#emptyState"),editorState:$("#editorState"),batchPanel:$("#batchPanel"),
  thumbRail:$("#thumbRail"),thumbTemplate:$("#thumbTemplate"),selectedName:$("#selectedName"),
  selectedDimensions:$("#selectedDimensions"),originalCanvas:$("#originalCanvas"),convertedCanvas:$("#convertedCanvas"),
  convertedClip:$("#convertedClip"),compareDivider:$("#compareDivider"),compareSlider:$("#compareSlider"),
  originalBadge:$("#originalBadge"),convertedBadge:$("#convertedBadge"),selectedOriginalSize:$("#selectedOriginalSize"),
  selectedConvertedSize:$("#selectedConvertedSize"),selectedSaving:$("#selectedSaving"),selectedOutputDims:$("#selectedOutputDims"),
  refreshPreviewBtn:$("#refreshPreviewBtn"),convertSelectedBtn:$("#convertSelectedBtn"),downloadSelectedBtn:$("#downloadSelectedBtn"),
  convertAllBtn:$("#convertAllBtn"),downloadZipBtn:$("#downloadZipBtn"),clearBtn:$("#clearBtn"),batchSummary:$("#batchSummary"),
  globalProgressBar:$("#globalProgressBar"),quality:$("#quality"),qualityValue:$("#qualityValue"),format:$("#format"),
  formatPill:$("#formatPill"),qualityBlock:$("#qualityBlock"),resizeToggle:$("#resizeToggle"),resizeBox:$("#resizeBox"),
  resizeWidth:$("#resizeWidth"),resizeHeight:$("#resizeHeight"),keepAspect:$("#keepAspect"),noUpscale:$("#noUpscale"),
  backgroundMode:$("#backgroundMode"),autoPreview:$("#autoPreview"),
  renameMode:$("#renameMode"),batchBaseName:$("#batchBaseName"),baseRenameOptions:$("#baseRenameOptions"),
  replaceRenameOptions:$("#replaceRenameOptions"),replaceFind:$("#replaceFind"),replaceWith:$("#replaceWith"),
  renamePrefix:$("#renamePrefix"),renameSuffix:$("#renameSuffix"),renameNumbering:$("#renameNumbering"),
  numberStart:$("#numberStart"),numberDigits:$("#numberDigits"),numberingOptions:$("#numberingOptions"),
  renameExtHint:$("#renameExtHint"),renamePreview:$("#renamePreview"),summaryCount:$("#summaryCount"),
  summaryOriginal:$("#summaryOriginal"),summaryConverted:$("#summaryConverted"),summarySaving:$("#summarySaving"),
  compareStage:$("#compareStage"),panLayer:$("#panLayer"),zoomOutBtn:$("#zoomOutBtn"),zoomInBtn:$("#zoomInBtn"),
  fitBtn:$("#fitBtn"),zoomLabel:$("#zoomLabel"),rotateLeftBtn:$("#rotateLeftBtn"),rotateRightBtn:$("#rotateRightBtn"),
  savePresetBtn:$("#savePresetBtn"),customPresets:$("#customPresets"),workerStatus:$("#workerStatus"),engineBadge:$("#engineBadge")
};

let items=[], selectedId=null, zoom=1, fitScale=1, previewTimer=null, worker=null, workerReady=false, workerSeq=0;
const workerJobs = new Map();

function fmt(bytes){
  if(!Number.isFinite(bytes))return "—";
  const u=["B","KB","MB","GB"]; let i=0,n=bytes;
  while(n>=1024&&i<u.length-1){n/=1024;i++}
  return `${n.toFixed(i===0?0:n>=10?1:2)} ${u[i]}`
}
function extFor(type){return type==="image/jpeg"?"jpg":type==="image/png"?"png":"webp"}
function selected(){return items.find(x=>x.id===selectedId)}
function itemById(id){return items.find(x=>x.id===id)}

function initWorker(){
  try{
    if(!window.Worker||!window.OffscreenCanvas||!window.createImageBitmap) throw new Error();
    worker=new Worker("worker.js");
    worker.onmessage=e=>{
      const msg=e.data, job=workerJobs.get(msg.id);
      if(!job)return;
      workerJobs.delete(msg.id);
      msg.ok?job.resolve(msg):job.reject(new Error(msg.error||"Error en Worker"));
    };
    workerReady=true;
    E.workerStatus.textContent="✓";E.engineBadge.textContent="Web Worker + OffscreenCanvas";
  }catch(_){
    workerReady=false;
    E.workerStatus.textContent="Fallback";E.engineBadge.textContent="Motor Canvas";
  }
}
initWorker();

function getSettings(){
  return {
    type:E.format.value,
    quality:Number(E.quality.value)/100,
    resize:E.resizeToggle.checked,
    maxW:Math.max(1,Number(E.resizeWidth.value)||1920),
    maxH:Math.max(1,Number(E.resizeHeight.value)||1080),
    keepAspect:E.keepAspect.checked,
    noUpscale:E.noUpscale.checked,
    background:E.backgroundMode.value
  }
}

function targetSize(item){
  const s=getSettings();
  let w=item.width,h=item.height;
  if(!s.resize)return {w,h};
  if(s.keepAspect){
    const scale=Math.min(s.maxW/w,s.maxH/h);
    const k=s.noUpscale?Math.min(1,scale):scale;
    return {w:Math.max(1,Math.round(w*k)),h:Math.max(1,Math.round(h*k))}
  }
  return {
    w:s.noUpscale?Math.min(w,s.maxW):s.maxW,
    h:s.noUpscale?Math.min(h,s.maxH):s.maxH
  }
}

async function readImageInfo(file){
  const url=URL.createObjectURL(file);
  const img=new Image();
  return await new Promise((resolve,reject)=>{
    img.onload=()=>resolve({url,width:img.naturalWidth,height:img.naturalHeight});
    img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error("Imagen no válida"))};
    img.src=url;
  })
}

async function addFiles(files){
  const valid=[...files].filter(f=>/^image\/(png|jpeg|webp)$/i.test(f.type));
  const keys=new Set(items.map(x=>`${x.file.name}|${x.file.size}|${x.file.lastModified}`));
  for(const file of valid){
    const key=`${file.name}|${file.size}|${file.lastModified}`; if(keys.has(key))continue; keys.add(key);
    const info=await readImageInfo(file);
    const card=E.thumbTemplate.content.firstElementChild.cloneNode(true);
    const item={id:crypto.randomUUID(),file,originalUrl:info.url,width:info.width,height:info.height,rotation:0,
      blob:null,convertedUrl:null,outW:null,outH:null,previewBlob:null,previewUrl:null,card};
    card.dataset.id=item.id;
    card.querySelector(".thumb-image").src=item.originalUrl;
    card.querySelector(".thumb-name").textContent=file.name;
    card.querySelector(".thumb-meta").textContent=`${fmt(file.size)} · ${item.width}×${item.height}`;
    card.querySelector(".thumb-select").onclick=()=>selectItem(item.id);
    card.querySelector(".thumb-remove").onclick=e=>{e.stopPropagation();removeItem(item.id)};
    items.push(item);E.thumbRail.appendChild(card);
  }
  if(items.length){
    E.emptyState.classList.add("hidden");E.editorState.classList.remove("hidden");E.batchPanel.classList.remove("hidden");
    if(!selectedId||!itemById(selectedId))selectedId=items[0].id;
    await refreshSelected(true);
  }
  refreshSummary()
}

function setStatus(item,text,cls=""){
  const el=item.card.querySelector(".thumb-status"); el.textContent=text; el.className=`thumb-status ${cls}`.trim()
}

function clearItemOutputs(item){
  if(item.convertedUrl)URL.revokeObjectURL(item.convertedUrl);
  if(item.previewUrl)URL.revokeObjectURL(item.previewUrl);
  item.blob=null;item.convertedUrl=null;item.previewBlob=null;item.previewUrl=null;item.outW=null;item.outH=null;
  setStatus(item,"Pendiente");
  item.card.querySelector(".thumb-meta").textContent=`${fmt(item.file.size)} · ${item.width}×${item.height}`;
}

function invalidateAll(){
  items.forEach(clearItemOutputs);
  refreshSummary();
  schedulePreview()
}

function selectItem(id){selectedId=id;refreshSelected(true)}

async function refreshSelected(makePreview=false){
  const item=selected(); if(!item)return;
  E.selectedName.textContent=item.file.name;
  E.selectedDimensions.textContent=`${item.width} × ${item.height}px · rotación ${item.rotation}°`;
  E.selectedOriginalSize.textContent=fmt(item.file.size);E.originalBadge.textContent=fmt(item.file.size);
  E.selectedConvertedSize.textContent=item.blob?fmt(item.blob.size):"—";
  E.convertedBadge.textContent=item.blob?fmt(item.blob.size):"Vista previa";
  E.selectedSaving.textContent=item.blob?`${Math.round((1-item.blob.size/item.file.size)*100)}%`:"—";
  E.selectedOutputDims.textContent=item.outW?`${item.outW}×${item.outH}`:"—";
  E.downloadSelectedBtn.disabled=!item.blob;
  $("#copyImageBtn").disabled=false;
  $$(".thumb-card").forEach(c=>c.classList.toggle("active",c.dataset.id===item.id));
  await drawOriginal(item);
  if(item.blob) await drawConverted(item.convertedUrl);
  else if(item.previewUrl) await drawConverted(item.previewUrl);
  else await drawOriginalToConverted(item);
  fitImage();
  if(makePreview&&E.autoPreview.checked) schedulePreview()
}

async function drawBitmapToCanvas(url,canvas,rotation=0){
  const img=new Image();
  await new Promise((res,rej)=>{img.onload=res;img.onerror=rej;img.src=url});
  const r=((rotation%360)+360)%360, swap=r===90||r===270;
  canvas.width=swap?img.naturalHeight:img.naturalWidth;canvas.height=swap?img.naturalWidth:img.naturalHeight;
  const ctx=canvas.getContext("2d");ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.translate(canvas.width/2,canvas.height/2);ctx.rotate(r*Math.PI/180);
  ctx.drawImage(img,-img.naturalWidth/2,-img.naturalHeight/2);
}
async function drawOriginal(item){await drawBitmapToCanvas(item.originalUrl,E.originalCanvas,item.rotation)}
async function drawOriginalToConverted(item){await drawBitmapToCanvas(item.originalUrl,E.convertedCanvas,item.rotation)}
async function drawConverted(url){await drawBitmapToCanvas(url,E.convertedCanvas,0)}

async function processInWorker(item,preview=false){
  const s=getSettings(),{w,h}=targetSize(item),buffer=await item.file.arrayBuffer();
  if(workerReady){
    const id=`job-${++workerSeq}`;
    const p=new Promise((resolve,reject)=>workerJobs.set(id,{resolve,reject}));
    worker.postMessage({id,buffer,type:s.type,quality:s.quality,width:w,height:h,rotation:item.rotation,background:s.background},[buffer]);
    const msg=await p;
    return {blob:new Blob([msg.buffer],{type:msg.type}),outW:msg.outW,outH:msg.outH}
  }
  return processOnMain(item,s,w,h)
}

async function processOnMain(item,s,w,h){
  const img=await createImageBitmap(item.file);
  const r=((item.rotation%360)+360)%360,swap=r===90||r===270;
  const outW=swap?h:w,outH=swap?w:h;
  const c=document.createElement("canvas");c.width=outW;c.height=outH;
  const ctx=c.getContext("2d",{alpha:true});
  if(s.background==="white"){ctx.fillStyle="#fff";ctx.fillRect(0,0,outW,outH)}
  if(s.background==="black"){ctx.fillStyle="#000";ctx.fillRect(0,0,outW,outH)}
  ctx.translate(outW/2,outH/2);ctx.rotate(r*Math.PI/180);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality="high";
  ctx.drawImage(img,-w/2,-h/2,w,h);img.close?.();
  const blob=await new Promise((res,rej)=>c.toBlob(b=>b?res(b):rej(new Error("No se pudo crear la imagen")),s.type,s.quality));
  return {blob,outW,outH}
}

async function generatePreview(){
  const item=selected();if(!item)return;
  try{
    E.refreshPreviewBtn.disabled=true;E.convertedBadge.textContent="Generando…";
    const result=await processInWorker(item,true);
    if(item.previewUrl)URL.revokeObjectURL(item.previewUrl);
    item.previewBlob=result.blob;item.previewUrl=URL.createObjectURL(result.blob);
    await drawConverted(item.previewUrl);
    E.convertedBadge.textContent=`Vista previa · ${fmt(result.blob.size)}`;
    E.selectedConvertedSize.textContent=fmt(result.blob.size);
    E.selectedSaving.textContent=`${Math.round((1-result.blob.size/item.file.size)*100)}%`;
    E.selectedOutputDims.textContent=`${result.outW}×${result.outH}`;
    applyImageSize()
  }catch(err){console.error(err);E.convertedBadge.textContent="Error de vista previa"}
  finally{E.refreshPreviewBtn.disabled=false}
}
function schedulePreview(){
  clearTimeout(previewTimer);
  if(!E.autoPreview.checked||!selected())return;
  previewTimer=setTimeout(generatePreview,350)
}

async function convertItem(item){
  setStatus(item,"Convirtiendo","working");
  const result=await processInWorker(item);
  if(item.convertedUrl)URL.revokeObjectURL(item.convertedUrl);
  item.blob=result.blob;item.convertedUrl=URL.createObjectURL(result.blob);item.outW=result.outW;item.outH=result.outH;
  const pct=Math.round((1-result.blob.size/item.file.size)*100);
  item.card.querySelector(".thumb-meta").textContent=`${fmt(item.file.size)} → ${fmt(result.blob.size)} · ${pct>=0?"−":"+"}${Math.abs(pct)}%`;
  setStatus(item,"Convertido","ok");
  if(item.id===selectedId)await refreshSelected(false);
  refreshSummary()
}

async function convertSelected(){
  const item=selected();if(!item)return;
  E.convertSelectedBtn.disabled=true;E.convertSelectedBtn.textContent="Convirtiendo…";
  try{await convertItem(item)}catch(err){console.error(err);setStatus(item,"Error");alert(err.message)}
  finally{E.convertSelectedBtn.disabled=false;E.convertSelectedBtn.textContent="Convertir"}
}

async function convertAll(){
  if(!items.length)return;
  E.convertAllBtn.disabled=true;E.convertAllBtn.textContent="Procesando…";E.globalProgressBar.style.width="0%";
  for(let i=0;i<items.length;i++){
    try{await convertItem(items[i])}catch(err){console.error(err);setStatus(items[i],"Error")}
    E.globalProgressBar.style.width=`${Math.round((i+1)/items.length*100)}%`
  }
  E.convertAllBtn.disabled=false;E.convertAllBtn.textContent="Convertir todas"
}

function refreshSummary(){
  const totalOriginal=items.reduce((a,x)=>a+x.file.size,0),converted=items.filter(x=>x.blob);
  const totalConverted=converted.reduce((a,x)=>a+x.blob.size,0),convOriginal=converted.reduce((a,x)=>a+x.file.size,0);
  const saving=convOriginal?Math.round((1-totalConverted/convOriginal)*100):0;
  E.summaryCount.textContent=items.length;E.summaryOriginal.textContent=fmt(totalOriginal);
  E.summaryConverted.textContent=converted.length?fmt(totalConverted):"0 B";E.summarySaving.textContent=`${saving}%`;
  E.batchSummary.textContent=`${items.length} archivo${items.length===1?"":"s"} · ${fmt(totalOriginal)}`;
  E.downloadZipBtn.disabled=!converted.length;E.addMoreBtn.disabled=!items.length
}

function removeItem(id){
  const i=items.findIndex(x=>x.id===id);if(i<0)return;const item=items[i];
  [item.originalUrl,item.convertedUrl,item.previewUrl].filter(Boolean).forEach(URL.revokeObjectURL);
  item.card.remove();items.splice(i,1);if(selectedId===id)selectedId=items[0]?.id||null;
  if(!items.length){E.emptyState.classList.remove("hidden");E.editorState.classList.add("hidden");E.batchPanel.classList.add("hidden");E.addMoreBtn.disabled=true}
  else refreshSelected(true);
  refreshSummary()
}
function clearAll(){[...items].forEach(x=>removeItem(x.id));E.thumbRail.innerHTML="";E.fileInput.value="";E.globalProgressBar.style.width="0%";refreshSummary()}

function setCompare(){
  const v=Number(E.compareSlider.value);
  E.convertedClip.style.width=`${100-v}%`;E.convertedClip.style.left=`${v}%`;
  E.convertedCanvas.style.left=`-${E.panLayer.clientWidth*v/100}px`;E.compareDivider.style.left=`${v}%`
}
function fitImage(){const c=E.originalCanvas;if(!c.width||!c.height)return;const r=E.compareStage.getBoundingClientRect();fitScale=Math.max(.001,Math.min((r.width-30)/c.width,(r.height-30)/c.height,1));zoom=1;applyImageSize()}
function applyImageSize(){
  const c=E.originalCanvas;if(!c.width||!c.height)return;const scale=fitScale*zoom,w=Math.max(1,Math.round(c.width*scale)),h=Math.max(1,Math.round(c.height*scale));
  [E.originalCanvas,E.convertedCanvas].forEach(x=>{x.style.width=`${w}px`;x.style.height=`${h}px`});
  E.panLayer.style.width=`${w}px`;E.panLayer.style.height=`${h}px`;E.zoomLabel.textContent=`${Math.round(scale*100)}%`;requestAnimationFrame(setCompare)
}
function setZoom(v){zoom=Math.max(.25,Math.min(4,v));applyImageSize()}

async function rotate(delta){
  const item=selected();if(!item)return;item.rotation=(item.rotation+delta+360)%360;clearItemOutputs(item);await refreshSelected(true);refreshSummary()
}

function downloadBlob(blob,name){
  const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1600)
}
function downloadSelected(){
  const item=selected();if(!item?.blob)return;
  const index=Math.max(0,items.findIndex(x=>x.id===item.id));
  downloadBlob(item.blob,outputFileName(item,index,new Set()));
}

const crcTable=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
function crc32(b){let c=0xffffffff;for(let i=0;i<b.length;i++)c=crcTable[(c^b[i])&255]^(c>>>8);return(c^0xffffffff)>>>0}
const u16=n=>[n&255,(n>>>8)&255],u32=n=>[n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255];
async function makeZip(entries){
  const enc=new TextEncoder(),locals=[],centrals=[];let offset=0;
  for(const e of entries){
    const name=enc.encode(e.name),data=new Uint8Array(await e.blob.arrayBuffer()),crc=crc32(data),size=data.length;
    const local=new Uint8Array([...u32(0x04034b50),...u16(20),...u16(0),...u16(0),...u16(0),...u16(0),...u32(crc),...u32(size),...u32(size),...u16(name.length),...u16(0),...name,...data]);locals.push(local);
    const central=new Uint8Array([...u32(0x02014b50),...u16(20),...u16(20),...u16(0),...u16(0),...u16(0),...u16(0),...u32(crc),...u32(size),...u32(size),...u16(name.length),...u16(0),...u16(0),...u16(0),...u16(0),...u32(0),...u32(offset),...name]);centrals.push(central);offset+=local.length
  }
  const cs=centrals.reduce((a,x)=>a+x.length,0),end=new Uint8Array([...u32(0x06054b50),...u16(0),...u16(0),...u16(entries.length),...u16(entries.length),...u32(cs),...u32(offset),...u16(0)]);
  return new Blob([...locals,...centrals,end],{type:"application/zip"})
}
async function downloadZip(){
  const arr=items.filter(x=>x.blob);if(!arr.length)return;E.downloadZipBtn.disabled=true;E.downloadZipBtn.textContent="Creando ZIP…";
  const used=new Set(),entries=arr.map((x,index)=>({name:outputFileName(x,index,used),blob:x.blob}));
  const zip=await makeZip(entries);downloadBlob(zip,"webp-studio-v3.3-lote.zip");E.downloadZipBtn.textContent="Descargar ZIP";E.downloadZipBtn.disabled=false
}


function sanitizeFileBase(value){
  return String(value ?? "")
    .replace(/[\\/:*?"<>|]/g,"-")
    .replace(/\s+/g," ")
    .trim()
    .replace(/[. ]+$/g,"");
}

function buildOutputBase(item,index){
  const mode=E.renameMode.value;
  const original=item.file.name.replace(/\.[^.]+$/,"") || "imagen";
  let base=original;
  if(mode==="base"){
    base=sanitizeFileBase(E.batchBaseName.value) || "imagen";
  }else if(mode==="replace"){
    const find=E.replaceFind.value;
    const replacement=E.replaceWith.value;
    base=find ? original.split(find).join(replacement) : original;
    base=sanitizeFileBase(base) || "imagen";
  }
  const prefix=sanitizeFileBase(E.renamePrefix.value);
  const suffix=sanitizeFileBase(E.renameSuffix.value);
  base=`${prefix}${base}${suffix}`;
  if(E.renameNumbering.checked){
    const start=Math.max(0,Number(E.numberStart.value)||0);
    const digits=Math.max(1,Math.min(8,Number(E.numberDigits.value)||3));
    const n=String(start+index).padStart(digits,"0");
    base=`${base}-${n}`;
  }
  return sanitizeFileBase(base)||"imagen";
}

function outputFileName(item,index,usedNames=new Set()){
  const extension=extFor(E.format.value);
  const base=buildOutputBase(item,index);
  let name=`${base}.${extension}`;
  let duplicate=2;
  while(usedNames.has(name.toLowerCase())) name=`${base}-${duplicate++}.${extension}`;
  usedNames.add(name.toLowerCase());
  return name;
}

function refreshRenamePreview(){
  const ext="."+extFor(E.format.value);
  if(E.renameExtHint)E.renameExtHint.textContent=ext;
  E.baseRenameOptions.classList.toggle("is-hidden",E.renameMode.value!=="base");
  E.replaceRenameOptions.classList.toggle("is-hidden",E.renameMode.value!=="replace");
  E.numberingOptions.classList.toggle("is-hidden",!E.renameNumbering.checked);
  const ex={file:{name:"IMG_2026_001.jpg"}};
  const a=outputFileName(ex,0,new Set()),b=outputFileName(ex,1,new Set());
  if(E.renamePreview)E.renamePreview.textContent=`Ejemplo: ${a} · ${b}`;
}

function currentPreset(){
  return {name:`Preset ${new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}`,format:E.format.value,quality:E.quality.value,resize:E.resizeToggle.checked,width:E.resizeWidth.value,height:E.resizeHeight.value,keep:E.keepAspect.checked,noUpscale:E.noUpscale.checked,background:E.backgroundMode.value,renameMode:E.renameMode.value,batchBaseName:E.batchBaseName.value,replaceFind:E.replaceFind.value,replaceWith:E.replaceWith.value,renamePrefix:E.renamePrefix.value,renameSuffix:E.renameSuffix.value,renameNumbering:E.renameNumbering.checked,numberStart:E.numberStart.value,numberDigits:E.numberDigits.value}
}
function loadPresets(){try{return JSON.parse(localStorage.getItem("webpStudioV3Presets")||"[]")}catch{return[]}}
function savePresets(p){localStorage.setItem("webpStudioV3Presets",JSON.stringify(p))}
function renderPresets(){
  const presets=loadPresets();E.customPresets.innerHTML="";
  if(!presets.length){E.customPresets.innerHTML='<p class="empty-presets">Aún no hay presets guardados.</p>';return}
  presets.forEach((p,i)=>{
    const row=document.createElement("div");row.className="saved-preset";
    const use=document.createElement("button");use.textContent=p.name;use.onclick=()=>applyPreset(p);
    const del=document.createElement("button");del.className="delete-preset";del.textContent="Eliminar";del.onclick=()=>{const a=loadPresets();a.splice(i,1);savePresets(a);renderPresets()};
    row.append(use,del);E.customPresets.appendChild(row)
  })
}
function applyPreset(p){
  E.format.value=p.format;E.quality.value=p.quality;E.resizeToggle.checked=p.resize;E.resizeWidth.value=p.width;E.resizeHeight.value=p.height;E.keepAspect.checked=p.keep;E.noUpscale.checked=p.noUpscale;E.backgroundMode.value=p.background;
  E.renameMode.value=p.renameMode||"original";E.batchBaseName.value=p.batchBaseName||"";E.replaceFind.value=p.replaceFind||"";E.replaceWith.value=p.replaceWith||"";E.renamePrefix.value=p.renamePrefix||"";E.renameSuffix.value=p.renameSuffix||"";E.renameNumbering.checked=p.renameNumbering!==false;E.numberStart.value=p.numberStart??1;E.numberDigits.value=p.numberDigits??3;
  refreshSettingUI();invalidateAll()
}
E.savePresetBtn.onclick=()=>{const p=loadPresets();const np=currentPreset();const n=prompt("Nombre del preset:",np.name);if(!n)return;np.name=n;p.push(np);savePresets(p);renderPresets()};

function refreshSettingUI(){
  E.qualityValue.textContent=E.quality.value;E.formatPill.textContent=extFor(E.format.value).toUpperCase();
  E.resizeBox.classList.toggle("is-disabled",!E.resizeToggle.checked);
  E.qualityBlock.style.opacity=E.format.value==="image/png"?".4":"1";
  $$(".preset").forEach(p=>p.classList.toggle("active",p.dataset.quality===E.quality.value));
  refreshRenamePreview();
}
function settingChanged(invalidate=true){refreshSettingUI();if(invalidate)invalidateAll();else schedulePreview()}

E.selectBtn.onclick=()=>E.fileInput.click();E.addMoreBtn.onclick=()=>E.fileInput.click();E.fileInput.onchange=e=>addFiles(e.target.files);
["dragenter","dragover"].forEach(ev=>E.dropzone.addEventListener(ev,e=>{e.preventDefault();E.dropzone.classList.add("dragover")}));
["dragleave","drop"].forEach(ev=>E.dropzone.addEventListener(ev,e=>{e.preventDefault();E.dropzone.classList.remove("dragover")}));
E.dropzone.addEventListener("drop",e=>addFiles(e.dataTransfer.files));
E.dropzone.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();E.fileInput.click()}});
E.compareSlider.oninput=setCompare;E.zoomInBtn.onclick=()=>setZoom(zoom*1.2);E.zoomOutBtn.onclick=()=>setZoom(zoom/1.2);E.fitBtn.onclick=fitImage;
E.rotateLeftBtn.onclick=()=>rotate(-90);E.rotateRightBtn.onclick=()=>rotate(90);
E.refreshPreviewBtn.onclick=generatePreview;E.convertSelectedBtn.onclick=convertSelected;E.convertAllBtn.onclick=convertAll;E.downloadSelectedBtn.onclick=downloadSelected;E.downloadZipBtn.onclick=downloadZip;E.clearBtn.onclick=clearAll;

E.quality.oninput=()=>settingChanged(true);$$(".preset").forEach(p=>p.onclick=()=>{E.quality.value=p.dataset.quality;settingChanged(true)});
[E.format,E.resizeToggle,E.resizeWidth,E.resizeHeight,E.keepAspect,E.noUpscale,E.backgroundMode].forEach(el=>el.addEventListener("change",()=>settingChanged(true)));
[E.resizeWidth,E.resizeHeight].forEach(el=>el.addEventListener("input",()=>{refreshSettingUI();schedulePreview()}));
E.autoPreview.onchange=()=>{if(E.autoPreview.checked)schedulePreview()};
[E.renameMode,E.batchBaseName,E.replaceFind,E.replaceWith,E.renamePrefix,E.renameSuffix,E.numberStart,E.numberDigits].forEach(el=>el.addEventListener("input",refreshRenamePreview));
E.renameMode.addEventListener("change",refreshRenamePreview);E.renameNumbering.addEventListener("change",refreshRenamePreview);
window.addEventListener("resize",()=>selected()&&fitImage());

refreshSettingUI();refreshRenamePreview();refreshSummary();renderPresets();
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));

// v3.3: accessible help and clipboard controls.
const helpDialog=$("#helpDialog");
$("#helpBtn").onclick=()=>helpDialog.showModal();
helpDialog.addEventListener("click",e=>{if(e.target===helpDialog){const r=helpDialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)helpDialog.close()}});
let noticeTimer,clipboardSequence=0;
function notifyUser(message){const n=$("#appNotice");n.textContent=message;n.classList.remove("hidden");clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>n.classList.add("hidden"),6500)}
async function importClipboardImages(blobs){
  const supported=blobs.filter(b=>/^image\/(png|jpeg|webp)$/i.test(b.type));
  if(!supported.length){notifyUser("No hay una imagen JPG, PNG o WebP en el portapapeles. Copia una imagen o una captura, no su enlace.");return}
  try{await addFiles(supported.map(b=>new File([b],`imagen-pegada-${Date.now()}-${++clipboardSequence}.${extFor(b.type)}`,{type:b.type,lastModified:Date.now()})));notifyUser(`${supported.length} imagen(es) pegada(s).`)}
  catch(err){notifyUser("No se pudo abrir la imagen del portapapeles. Prueba seleccionando el archivo.")}
}
document.addEventListener("paste",e=>{
  if(helpDialog.open||e.target.closest?.("input,textarea,[contenteditable='true']"))return;
  const files=[...(e.clipboardData?.items||[])].filter(i=>i.kind==="file"&&i.type.startsWith("image/")).map(i=>i.getAsFile()).filter(Boolean);
  if(files.length){e.preventDefault();void importClipboardImages(files)}
});
$("#pasteBtn").onclick=async()=>{
  if(!navigator.clipboard?.read){notifyUser("Usa Ctrl + V (⌘ + V en Mac) o selecciona un archivo. El botón Pegar requiere HTTPS o localhost y un navegador compatible.");return}
  try{const entries=await navigator.clipboard.read(),blobs=[];for(const entry of entries){const type=entry.types.find(t=>/^image\/(png|jpeg|webp)$/i.test(t));if(type)blobs.push(await entry.getType(type))}await importClipboardImages(blobs)}
  catch(err){notifyUser("No se pudo leer el portapapeles. Permite el acceso o pega con Ctrl + V (⌘ + V en Mac).")}
};
$("#copyImageBtn").onclick=async()=>{
  const item=selected();if(!item)return;
  if(!navigator.clipboard?.write||!window.ClipboardItem){notifyUser("Copiar requiere HTTPS o localhost y un navegador compatible. Puedes descargar la imagen.");return}
  try{
    const png=(async()=>{const canvas=document.createElement("canvas");await drawBitmapToCanvas(item.convertedUrl||item.originalUrl,canvas,item.blob?0:item.rotation);return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error("PNG")),"image/png"))})();
    await navigator.clipboard.write([new ClipboardItem({"image/png":png})]);notifyUser(item.blob?"Resultado copiado como PNG. Ya puedes pegarlo.":"Imagen original copiada como PNG. Ya puedes pegarla.");
  }catch(err){notifyUser("No se pudo copiar. Permite el acceso al portapapeles o descarga la imagen.")}
};
if(window.ResizeObserver)new ResizeObserver(()=>{if(selected()&&zoom===1)fitImage()}).observe(E.compareStage);
