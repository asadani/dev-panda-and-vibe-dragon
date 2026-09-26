#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { Resvg } from '@resvg/resvg-js';
import * as fontkit from 'fontkit';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const REPO_ROOT = path.resolve(ROOT, '..');
export const EPISODES_ROOT = path.join(REPO_ROOT, '.local', 'episodes');
const FONT = path.join(ROOT, 'assets/fonts/ComicNeue-Regular.ttf');
const BOLD = path.join(ROOT, 'assets/fonts/ComicNeue-Bold.ttf');
const read = p => JSON.parse(fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, ''));
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const xml = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const now = () => new Date().toISOString();
// Preserve historical episodes that predate an explicit copyrightYear field.
const copyrightFooter = ep => `© ${ep.copyrightYear ?? 2026} Anuj Sadani`;
export function writeJson(p, data) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  const temp = `${p}.${process.pid}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(data, null, 2) + '\n');
  fs.renameSync(temp, p);
}
export function inside(base, relative) {
  if (typeof relative !== 'string' || !relative || path.isAbsolute(relative)) throw new Error('Expected a relative asset path');
  const full = path.resolve(base, relative);
  const rel = path.relative(path.resolve(base), full);
  if (rel.startsWith('..') || path.isAbsolute(rel)) throw new Error('Asset path escapes episode directory');
  let ancestor = full;
  while (!fs.existsSync(ancestor) && path.dirname(ancestor) !== ancestor) ancestor = path.dirname(ancestor);
  if (fs.existsSync(ancestor)) {
    const realRel = path.relative(fs.realpathSync(base), fs.realpathSync(ancestor));
    if (realRel.startsWith('..') || path.isAbsolute(realRel)) throw new Error('Asset symlink escapes episode directory');
  }
  return full;
}
function loadEpisode(dir) { return read(path.join(dir, 'episode.json')); }
function saveEpisode(dir, ep) { ep.updatedAt = now(); writeJson(path.join(dir, 'episode.json'), ep); }
export function validate(ep, dir, { assets = false } = {}) {
  const errors = [];
  if (ep.schemaVersion !== 1) errors.push('schemaVersion must be 1');
  if (!ep.id || !ep.title) errors.push('id and title are required');
  if (ep.copyrightYear !== undefined && (!Number.isInteger(ep.copyrightYear) || ep.copyrightYear < 1900 || ep.copyrightYear > 9999)) errors.push('copyrightYear must be an integer from 1900 to 9999');
  if (!['auto','vertical','grid'].includes(ep.layout)) errors.push('layout must be auto, vertical, or grid');
  if (!Array.isArray(ep.panels) || ep.panels.length < 1 || ep.panels.length > 6) errors.push('An episode requires 1–6 panels');
  if (ep.layout === 'grid' && ![4,6].includes(ep.panels?.length)) errors.push('Grid layout requires 4 or 6 panels');
  if (ep.template && ep.template !== 'integrated-grid-v1') errors.push('Unknown template');
  if (ep.template === 'integrated-grid-v1') {
    if (ep.layout !== 'grid' || ep.panels?.length !== 4) errors.push('integrated-grid-v1 requires grid layout and exactly 4 panels');
    if (ep.footerLeft && ep.footerLeft !== 'Dev Panda & Vibe Dragon | in the AI era') errors.push('Integrated footerLeft must match the series footer');
    if (ep.footerRight && ep.footerRight !== copyrightFooter(ep)) errors.push('Integrated footerRight must match the series footer and copyrightYear');
  }
  const ids = new Set();
  for (const [i, p] of (Array.isArray(ep.panels) ? ep.panels : []).entries()) {
    if (!p.id || ids.has(p.id)) errors.push(`Panel ${i+1}: missing or duplicate id`);
    ids.add(p.id);
    if (!p.scene || !p.alt) errors.push(`Panel ${i+1}: scene and alt are required`);
    if (!Array.isArray(p.dialogue) || p.dialogue.length > 2) errors.push(`Panel ${i+1}: dialogue must contain 0–2 balloons`);
    for (const d of (Array.isArray(p.dialogue) ? p.dialogue : [])) {
      if (!['Panda','Dragon','Caption'].includes(d.speaker) || typeof d.text !== 'string' || !d.text.trim()) errors.push(`Panel ${i+1}: invalid speaker/text`);
      if (/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(d.text || '')) errors.push(`Panel ${i+1}: unsupported control characters`);
      if (d.speaker !== 'Caption' && (!Number.isFinite(d.anchorX) || d.anchorX < 0.05 || d.anchorX > 0.95)) errors.push(`Panel ${i+1}: balloon anchorX must be 0.05–0.95`);
    }
    if (ep.template === 'integrated-grid-v1') {
      if (p.dialogue?.length !== 1) errors.push(`Panel ${i+1}: integrated template requires exactly one balloon`);
      for (const d of (Array.isArray(p.dialogue) ? p.dialogue : [])) {
        const b=d.bubble;
        if (wordCount(d.text || '') > 12) errors.push(`Panel ${i+1}: integrated dialogue exceeds 12 words`);
        if (!b || !['x','y','w','h'].every(k=>Number.isFinite(b[k])) || b.x<0.03 || b.y<0.03 || b.w<=0 || b.h<=0 || b.x+b.w>0.97 || b.y+b.h>0.43) errors.push(`Panel ${i+1}: bubble must fit the normalized upper 43% safe area`);
        if (!Number.isFinite(d.anchorY) || d.anchorY<0.43 || d.anchorY>0.95) errors.push(`Panel ${i+1}: anchorY must be 0.43–0.95`);
        if (d.speaker === 'Caption') errors.push(`Panel ${i+1}: integrated template requires a speaking character`);
      }
    }
    if (assets) {
      try {
        const f = inside(dir, p.art);
        if (!fs.existsSync(f)) errors.push(`Panel ${i+1}: missing artwork`);
        else if (!['.png','.jpg','.jpeg'].includes(path.extname(f).toLowerCase())) errors.push(`Panel ${i+1}: artwork must be PNG or JPEG`);
      } catch (e) { errors.push(`Panel ${i+1}: ${e.message}`); }
    }
  }
  return errors;
}
export function initEpisode(slug, topic, episodesRoot = EPISODES_ROOT) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error('Use a lowercase kebab-case slug');
  const id = `${new Date().toISOString().slice(0,10)}-${slug}`;
  const dir = path.join(episodesRoot, id);
  if (fs.existsSync(dir)) throw new Error('Episode exists; resume it or use a new slug');
  fs.mkdirSync(path.join(dir, 'art'), { recursive: true });
  const ep = { schemaVersion: 1, id, title: topic || slug, topic: topic || slug, createdAt: now(), copyrightYear: new Date().getUTCFullYear(), status: 'awaiting_angles', selectedAngle: null, layout: 'auto', canonVersion: 'resolve-in-brief', referenceImages: [], retrievedMemory: [], panels: [] };
  saveEpisode(dir, ep);
  writeJson(path.join(dir, 'angles.json'), { angles: [] });
  writeJson(path.join(dir, 'events.json'), [{ at: now(), type: 'created' }]);
  return dir;
}
export function selectAngle(dir, id) {
  const ep = loadEpisode(dir);
  const angle = read(path.join(dir, 'angles.json')).angles.find(a => a.id === id);
  if (!angle) throw new Error('Angle id not found');
  if (ep.selectedAngle === id) return ep;
  if (ep.selectedAngle) {
    const revisions = path.join(dir, 'revisions');
    fs.mkdirSync(revisions, { recursive: true });
    writeJson(path.join(revisions, `episode-${Date.now()}.json`), ep);
    ep.panels = [];
    delete ep.lastRender;
    delete ep.lastPackage;
  }
  ep.selectedAngle = id; ep.angle = angle; ep.status = 'angle_selected';
  saveEpisode(dir, ep);
  return ep;
}
export function transcript(ep) {
  return `# ${ep.title}\n\n` + ep.panels.map((p,i) => `## Panel ${i+1}\n\n${p.alt}\n\n` + p.dialogue.map(d => `${d.speaker}: ${d.text}`).join('\n\n')).join('\n\n') + '\n';
}
let cachedFont;
function measure(text, size) {
  cachedFont ||= fontkit.openSync(FONT);
  return cachedFont.layout(text).positions.reduce((n, p) => n+p.xAdvance, 0) / cachedFont.unitsPerEm * size;
}
function wrap(text, width, size) {
  const lines = [];
  for (const para of text.split('\n')) {
    let line = '';
    for (const word of para.trim().split(/\s+/)) {
      if (measure(word, size) > width) throw new Error(`Unbreakable word exceeds balloon width: ${word.slice(0,30)}`);
      const next = line ? `${line} ${word}` : word;
      if (measure(next,size) > width && line) { lines.push(line); line = word; }
      else line = next;
    }
    lines.push(line);
  }
  return lines;
}
function textLines(lines, x, y, size, { bold=false, center=false }={}) {
  return `<text x="${x}" y="${y}" font-family="Comic Neue" font-size="${size}" font-weight="${bold?700:400}"${center?' text-anchor="middle"':''}>${lines.map((line,i)=>`<tspan x="${x}" dy="${i?size*1.18:0}">${xml(line)}</tspan>`).join('')}</text>`;
}
function imageData(file) { return `data:image/${/\.png$/i.test(file)?'png':'jpeg'};base64,${fs.readFileSync(file).toString('base64')}`; }
export function contentDigest(ep, dir) {
  const {status, updatedAt, lastRender, lastPackage, ...content} = ep;
  return hash(JSON.stringify(content) + ep.panels.map(p=>hash(fs.readFileSync(inside(dir,p.art)))).join(''));
}
function panelGeometry(panel, width, fontSize) {
  const pad=32, gap=24, n=panel.dialogue.length;
  const bubbleW = n ? (width-2*pad-(n-1)*gap)/n : width;
  const wrapped = panel.dialogue.map(d=>wrap(d.text,bubbleW-44,fontSize));
  const maxLines = Math.max(0,...wrapped.map(l=>l.length));
  if(maxLines>6) throw new Error(`Panel ${panel.id}: dialogue needs more than six lines; shorten it or use a full-width layout`);
  const dialogueH=n?Math.ceil(maxLines*fontSize*1.18+70):0;
  const artH=Math.round(width*0.7);
  return {width,height:dialogueH+artH,dialogueH,artH,wrapped,bubbleW,fontSize};
}
function drawPanel(panel, dir, x,y,g,ink) {
  let s=`<g transform="translate(${x},${y})" fill="${ink}"><rect width="${g.width}" height="${g.height}" fill="#fffdf7" stroke="${ink}" stroke-width="4"/>`;
  s+=`<image x="4" y="${g.dialogueH+4}" width="${g.width-8}" height="${g.artH-8}" preserveAspectRatio="xMidYMid meet" href="${imageData(inside(dir,panel.art))}"/>`;
  panel.dialogue.forEach((d,i)=>{
    const bx=32+i*(g.bubbleW+24), by=12, bh=g.dialogueH-30;
    if(d.speaker!=='Caption') {
      const ax=g.width*d.anchorX, tailStart=Math.max(bx+20,Math.min(bx+g.bubbleW-35,ax));
      s+=`<path d="M ${tailStart} ${by+bh-3} L ${ax} ${g.dialogueH+22} L ${tailStart+20} ${by+bh-3}" fill="#fffdf7" stroke="${ink}" stroke-width="3"/>`;
    }
    s+=`<rect x="${bx}" y="${by}" width="${g.bubbleW}" height="${bh}" rx="25" fill="#fffdf7" stroke="${ink}" stroke-width="3"/>`;
    s+=textLines(g.wrapped[i],bx+22,by+g.fontSize+8,g.fontSize);
  });
  return s+'</g>';
}
// Geometry is fixed so a whole 2048px master retains 16px dialogue at 390px.
function integratedPanel(panel, dir, x, y, size, ink) {
  const d=panel.dialogue[0], b=d.bubble, bx=b.x*size, by=b.y*size, bw=b.w*size, bh=b.h*size;
  const fontSize=85, lines=wrap(d.text,bw-100,fontSize), lineH=fontSize*1.18;
  if(lines.length*lineH>bh-52) throw new Error(`Panel ${panel.id}: integrated balloon overflow; shorten dialogue or enlarge its box`);
  const ax=d.anchorX*size, ay=d.anchorY*size, start=Math.max(bx+80,Math.min(bx+bw-110,ax));
  const pathData=`M ${bx+bw*.5} ${by} C ${bx+bw*.88} ${by-4} ${bx+bw} ${by+bh*.08} ${bx+bw} ${by+bh*.48} C ${bx+bw+3} ${by+bh*.84} ${bx+bw*.86} ${by+bh} ${start+30} ${by+bh} L ${ax} ${ay} L ${start} ${by+bh} C ${bx+bw*.1} ${by+bh+2} ${bx} ${by+bh*.9} ${bx} ${by+bh*.52} C ${bx-2} ${by+bh*.12} ${bx+bw*.12} ${by} ${bx+bw*.5} ${by} Z`;
  return `<g transform="translate(${x},${y})" fill="${ink}"><image x="0" y="0" width="${size}" height="${size}" preserveAspectRatio="xMidYMid meet" href="${imageData(inside(dir,panel.art))}"/><path d="${pathData}" fill="#fffdf7" stroke="${ink}" stroke-width="4"/>${textLines(lines,bx+bw/2,by+(bh-lines.length*lineH)/2+fontSize*.9,fontSize,{center:true})}<rect width="${size}" height="${size}" fill="none" stroke="${ink}" stroke-width="5"/></g>`;
}
function integratedComposition(ep,dir,ink) {
  const size=960, margin=24, gap=24;
  let body=ep.panels.map((p,i)=>integratedPanel(p,dir,52+(i%2)*(size+gap),margin+Math.floor(i/2)*(size+gap),size,ink)).join('');
  body+=`<path d="M24 1984 H2024" stroke="${ink}" stroke-width="2"/>`;
  const left=ep.footerLeft || 'Dev Panda & Vibe Dragon | in the AI era', right=ep.footerRight || copyrightFooter(ep);
  // Footer baseline lies within the bottom 72px band; panels end at 1968.
  body+=textLines([left],28,2026,42)+textLines([right],2020-measure(right,42),2026,42);
  return {body,size};
}
function svgDoc(w,h,body,bg) {return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="100%" height="100%" fill="${bg}"/>${body}</svg>`;}
function exportSvg(file,svg) {
  fs.writeFileSync(file,svg);
  const r = new Resvg(svg, {font:{loadSystemFonts:false,fontFiles:[FONT,BOLD],defaultFontFamily:'Comic Neue'}});
  fs.writeFileSync(file.replace(/\.svg$/,'.png'),r.render().asPng());
}
function artifactHashes(base) {
  const files={};
  function collect(folder){for(const entry of fs.readdirSync(folder,{withFileTypes:true})){const f=path.join(folder,entry.name);if(entry.isDirectory())collect(f);else files[path.relative(base,f).replaceAll('\\','/')]=hash(fs.readFileSync(f));}}
  collect(base);return files;
}
function artifactsValid(base,files) {
  try {return !!files && Object.keys(files).length>0 && Object.entries(files).every(([f,d])=>hash(fs.readFileSync(inside(base,f)))===d);}catch{return false;}
}
function renderFingerprint(revision,brand) {
  return hash(revision+JSON.stringify(brand)+hash(fs.readFileSync(FONT))+hash(fs.readFileSync(BOLD))+hash(fs.readFileSync(fileURLToPath(import.meta.url)))).slice(0,16);
}
function availableOutput(base,marker,valid) {
  for(let n=1;;n++) {
    const dir=n===1?base:`${base}-repair-${n}`;
    if(!fs.existsSync(dir))return {dir,cached:false};
    try {if(valid(read(path.join(dir,marker)),dir))return {dir,cached:true};}catch{}
  }
}
export function assertProductionGate(dir, stage) {
  if(fs.existsSync(path.join(dir,'production-hold.json')))throw new Error('Production paused: inspect production-hold.json; no render/package/publish until resumed.');
  if(fs.existsSync(path.join(dir,'pipeline.json'))) {
    const r=spawnSync('python',[path.join(ROOT,'scripts/pipeline.py'),'check',dir,'--through',stage],{encoding:'utf8'});
    if(r.error || r.status!==0)throw new Error(`Production checkpoint failed: ${r.stdout || r.stderr || r.error?.message}`);
  }
}
export function renderEpisode(dir) {
  assertProductionGate(dir,'artwork');
  const ep=loadEpisode(dir), errors=validate(ep,dir,{assets:true});
  if(errors.length) throw new Error(errors.join('\n'));
  const decoded=spawnSync('python',[path.join(ROOT,'scripts/image_tools.py'),'check',...ep.panels.map(p=>inside(dir,p.art))],{encoding:'utf8'});
  if(decoded.error || decoded.status!==0) throw new Error(`Invalid artwork image: ${decoded.stderr || decoded.error?.message}`);
  if(!ep.selectedAngle) throw new Error('Select an angle before rendering');
  const brand=read(path.join(ROOT,'config/brand.json'));
  const integrated=ep.template==='integrated-grid-v1';
  if(integrated && JSON.parse(decoded.stdout).some(p=>p.width!==p.height)) throw new Error('Integrated artwork must be square');
  const w=integrated?2048:brand.masterWidth, margin=48, gap=28;
  const fontSize=integrated?85:Math.ceil(brand.minimumPreviewFontPx/brand.previewWidth*w);
  let cols=1, gs;
  let body,h,integratedSize;
  if(integrated) { const composition=integratedComposition(ep,dir,brand.ink); body=composition.body; integratedSize=composition.size; h=2048; cols=2; } else {
  if(ep.layout==='grid' || (ep.layout==='auto' && [4,6].includes(ep.panels.length))) {
    try { gs=ep.panels.map(p=>panelGeometry(p,(w-2*margin-gap)/2,fontSize)); cols=2; }
    catch(e) {if(ep.layout==='grid') throw e;}
  }
  if(cols===1) gs=ep.panels.map(p=>panelGeometry(p,w-2*margin,fontSize));
  const titleLines=wrap(ep.title,w-2*margin,58);
  const head=125+titleLines.length*70;
  let y=head; body=textLines([brand.name],margin,75,48,{bold:true})+textLines(titleLines,margin,145,58,{bold:true});
  for(let i=0;i<ep.panels.length;i+=cols) {
    const rowH=Math.max(...gs.slice(i,i+cols).map(g=>g.height));
    for(let j=0;j<cols && i+j<ep.panels.length;j++) body+=drawPanel(ep.panels[i+j],dir,margin+j*(gs[i+j].width+gap),y,gs[i+j],brand.ink);
    y+=rowH+gap;
  }
  body+=textLines([`© ${new Date().getFullYear()} ${brand.author} · ${brand.url}`],margin,y+45,32);
  h=y+85;
  }
  const revision=contentDigest(ep,dir);
  const renderId=renderFingerprint(revision,brand);
  const target=availableOutput(path.join(dir,'renders',renderId),'render.json',(m,d)=>m.renderId===renderId && artifactsValid(d,m.files));
  const out=target.dir;
  fs.mkdirSync(out,{recursive:true});
  if(!target.cached) {
    exportSvg(path.join(out,'strip.svg'),svgDoc(w,h,body,brand.background));
    if(integrated) {
      const preview=new Resvg(svgDoc(w,h,body,brand.background),{fitTo:{mode:'width',value:390},font:{loadSystemFonts:false,fontFiles:[FONT,BOLD],defaultFontFamily:'Comic Neue'}});
      fs.writeFileSync(path.join(out,'strip-preview-390.png'),preview.render().asPng());
    }
    // Individual panels have the same readable lettering, independent of the chosen grid.
    ep.panels.forEach((p,i)=>{
      if(integrated) { exportSvg(path.join(out,`panel-${i+1}.svg`),svgDoc(integratedSize,integratedSize,integratedPanel(p,dir,0,0,integratedSize,brand.ink),brand.background)); return; }
      const g=panelGeometry(p,w-2*margin,fontSize);
      const ph=g.height+170;
      const b=textLines([`${brand.name} · ${i+1}/${ep.panels.length}`],margin,55,40,{bold:true})+drawPanel(p,dir,margin,85,g,brand.ink)+textLines([brand.url],margin,ph-20,28);
      exportSvg(path.join(out,`panel-${i+1}.svg`),svgDoc(w,ph,b,brand.background));
    });
    fs.writeFileSync(path.join(out,'transcript.md'),transcript(ep));
    writeJson(path.join(out,'render.json'),{revision,renderId,width:w,height:h,columns:cols,fontSize,previewWidth:390,previewFontPx:fontSize/w*390,brandVersion:brand.version,designStatus:brand.designStatus,generatedAt:now(),visualReview:'pending',files:artifactHashes(out)});
  }
  ep.lastRender=path.relative(dir,out).replaceAll('\\','/'); ep.status='rendered'; saveEpisode(dir,ep);
  return out;
}
function wordCount(s) {return s.trim().split(/\s+/).filter(Boolean).length;}
export function packageEpisode(dir) {
  assertProductionGate(dir,'composition');
  const ep=loadEpisode(dir);
  if(!ep.lastRender) throw new Error('Render first');
  const rendered=inside(dir,ep.lastRender), meta=read(path.join(rendered,'render.json'));
  if(meta.revision!==contentDigest(ep,dir)) throw new Error('Episode changed since render; render again');
  if(meta.renderId!==renderFingerprint(meta.revision,read(path.join(ROOT,'config/brand.json')))) throw new Error('Renderer or brand changed since render; render again');
  if(!artifactsValid(rendered,meta.files)) throw new Error('Render is incomplete or modified; render again');
  const copy=read(path.join(dir,'copy.json'));
  if(!Array.isArray(copy.titles) || copy.titles.length!==3 || !copy.description || !copy.substack || !copy.linkedin || !copy.instagram) throw new Error('copy.json needs 3 titles, description, substack, linkedin, instagram');
  if(wordCount(copy.substack)<250 || wordCount(copy.substack)>400) throw new Error('Substack body must contain 250–400 words');
  if(copy.linkedin.length<1100 || copy.linkedin.length>1400) throw new Error('LinkedIn caption must contain 1,100–1,400 characters');
  if(!Array.isArray(copy.linkedinHooks) || copy.linkedinHooks.length!==2) throw new Error('Provide two LinkedIn alternate hooks');
  const revision=hash(meta.renderId+JSON.stringify(copy)).slice(0,16);
  const target=availableOutput(path.join(dir,'packages',revision),'manifest.json',(m,d)=>m.packageId===revision && artifactsValid(d,m.files));
  const out=target.dir;
  if(!target.cached) {
    fs.mkdirSync(out,{recursive:true});
    fs.cpSync(rendered,path.join(out,'assets'),{recursive:true});
    fs.mkdirSync(path.join(out,'instagram'),{recursive:true});
    for(let i=0;i<ep.panels.length;i++) {
      const result=spawnSync('python',[path.join(ROOT,'scripts/image_tools.py'),'instagram',path.join(rendered,`panel-${i+1}.png`),path.join(out,'instagram',`panel-${i+1}.jpg`)],{encoding:'utf8'});
      if(result.error || result.status!==0)throw new Error(`Instagram export failed: ${result.stderr || result.error?.message}`);
    }
    fs.writeFileSync(path.join(out,'linkedin.md'),copy.linkedin+'\n');
    fs.writeFileSync(path.join(out,'instagram.md'),copy.instagram+'\n');
    fs.writeFileSync(path.join(out,'substack.md'),`# ${copy.titles[0]}\n\n${copy.description}\n\n![${ep.title}](assets/strip.png)\n\n${copy.substack}\n\n${transcript(ep)}`);
    fs.writeFileSync(path.join(out,'alt-text.md'),ep.panels.map((p,i)=>`Panel ${i+1}: ${p.alt}\n${p.dialogue.map(d=>`${d.speaker}: ${d.text}`).join('\n')}`).join('\n\n')+'\n');
    writeJson(path.join(out,'copy.json'),copy);
    const files=artifactHashes(out);
    writeJson(path.join(out,'manifest.json'),{episodeId:ep.id,packageId:revision,episodeRevision:meta.revision,renderId:meta.renderId,createdAt:now(),files,status:'needs_review',publication:'not_published',platforms:{linkedin:'dry_run_only',instagram:'1080x1350_jpeg_export',substack:'editor_handoff'}});
  }
  ep.lastPackage=path.relative(dir,out).replaceAll('\\','/'); ep.status='packaged_needs_review'; saveEpisode(dir,ep);
  return out;
}
export function publishDryRun(dir, platform) {
  assertProductionGate(dir,'package');
  if(!['linkedin','instagram','substack'].includes(platform)) throw new Error('Unknown platform');
  const ep=loadEpisode(dir);
  if(!ep.lastPackage) throw new Error('Package the episode first');
  const pkg=inside(dir,ep.lastPackage), manifest=read(path.join(pkg,'manifest.json'));
  if(manifest.episodeRevision!==contentDigest(ep,dir)) throw new Error('Episode changed since packaging');
  for(const [file,digest] of Object.entries(manifest.files)) if(hash(fs.readFileSync(inside(pkg,file)))!==digest) throw new Error(`Package changed: ${file}`);
  const copy=read(path.join(pkg,'copy.json'));
  if(JSON.stringify(copy)!==JSON.stringify(read(path.join(dir,'copy.json')))) throw new Error('Copy changed since packaging');
  const report={mode:'dry-run',published:false,platform,episodeId:ep.id,packageId:manifest.packageId,account:null,contentRevision:manifest.packageId,caption:copy[platform],assets:platform==='substack'?['assets/strip.png']:ep.panels.map((_,i)=>platform==='instagram'?`instagram/panel-${i+1}.jpg`:`assets/panel-${i+1}.png`),blockers:['No connected account or live publishing adapter','Independent final review and approved character canon required',...(platform==='substack'?['Use the Substack editor handoff; no supported publishing API integrated']:[])],nextAction:platform==='substack'?'Open Substack editor and import reviewed package':'Configure and verify official publishing integration'};
  const out=path.join(dir,'publishing',`${manifest.packageId}-${platform}-dry-run.json`);
  writeJson(out,report);
  return report;
}
function help(){console.log(`Comic Studio — local utilities, orchestrated by Codex\n\ninit <slug> --topic <text>\nselect <episode-dir> <angle-id>\nintake <episode-dir> <source-path-or-url>\nresearch <episode-dir> [--topic <text>] [--intake <sources.json>] [--url <url>] [--refresh]\nvalidate|render|package|status <episode-dir>\npublish <episode-dir> --platform linkedin|instagram|substack --dry-run\n\nNo command calls an LLM or publishes live. See skills/comic-production/SKILL.md.`);}
export function main(args) {
  const [cmd,first,second]=args;
  const option=name=>{const i=args.indexOf(name);return i<0?undefined:args[i+1];};
  if(!cmd || ['help','--help','-h'].includes(cmd)) return help();
  if(cmd==='init') return console.log(initEpisode(first,option('--topic')));
  if(!first) throw new Error('Episode directory required');
  const dir=path.resolve(first);
  if(cmd==='research') {
    const ep=loadEpisode(dir);
    const python=path.join(REPO_ROOT,'.venv-web',process.platform==='win32'?'Scripts/python.exe':'bin/python');
    if(!fs.existsSync(python))throw new Error('Set up .venv-web first; see docs/web-research.md');
    const out=path.join(dir,'sources',`web-${Date.now()}`);
    const params=[path.join(ROOT,'scripts/web_research.py'),'--topic',option('--topic') || ep.topic || ep.title,'--out',out,'--cache',path.join(REPO_ROOT,'.web-cache')];
    for(const flag of ['--intake','--url'])if(option(flag))params.push(flag,option(flag));
    if(args.includes('--refresh'))params.push('--refresh');
    const r=spawnSync(python,params,{stdio:'inherit'});
    if(r.error || r.status!==0)throw new Error(`Research incomplete; inspect ${out}/web-sources.json`);
    return;
  }
  if(cmd==='select') return console.log(JSON.stringify(selectAngle(dir,second),null,2));
  if(cmd==='validate') {const errors=validate(loadEpisode(dir),dir,{assets:true}); console.log(JSON.stringify({valid:!errors.length,errors},null,2));if(errors.length)process.exitCode=1;return;}
  if(cmd==='render') return console.log(renderEpisode(dir));
  if(cmd==='package') return console.log(packageEpisode(dir));
  if(cmd==='status') return console.log(JSON.stringify(loadEpisode(dir),null,2));
  if(cmd==='intake') {
    if(!second)throw new Error('Source path or URL required');
    const out=path.join(dir,'sources',String(Date.now()));
    const r=spawnSync('python',[path.join(ROOT,'scripts/intake.py'),second,'--out',out],{stdio:'inherit'});
    if(r.error || r.status!==0)throw new Error('Source intake failed');return;
  }
  if(cmd==='publish') {if(!args.includes('--dry-run'))throw new Error('Live publishing is not implemented. Use --dry-run.');return console.log(JSON.stringify(publishDryRun(dir,option('--platform')),null,2));}
  throw new Error('Unknown command; use --help');
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try{main(process.argv.slice(2));}catch(e){console.error(`Error: ${e.message}`);process.exitCode=1;}
}
