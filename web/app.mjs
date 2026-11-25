import {validProject,packages,cell,support,validateCapture,plan,readPlan,csv,validDate,browseProjects,browseRepositories,projectCoverage} from './model.mjs';
const $ = id => document.getElementById(id), storageKey = 'coolcode:distropilot:plan';
const node = (tag,text,cls) => { const n=document.createElement(tag); if(text!==undefined)n.textContent=text; if(cls)n.className=cls; return n; };
let capture,selected=[],wishlist=[],notes=Object.create(null),apiBase='',busy=false,projectPage=0;
const limit = (key,fallback,ceiling) => Number.isInteger(capture?.config?.[key]) ? Math.max(1,Math.min(ceiling,capture.config[key])) : fallback;
const status = text => { $('status').textContent=text; };
const dateLabel = value => new Date(value).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'});
function saveFile(name,text,type) { const url=URL.createObjectURL(new Blob([text],{type})); const a=node('a'); a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000); }
const families={ubuntu:'Ubuntu',debian:'Debian',fedora:'Fedora',alma:'AlmaLinux',rocky:'Rocky Linux',opensuse:'openSUSE',arch:'Arch Linux',alpine:'Alpine',void:'Void Linux'};
function options(id,values,all,label=value=>value){
  const select=$(id),previous=select.value;
  select.replaceChildren(...['',...values].map(value=>{const option=node('option',value?label(value):all);option.value=value;return option;}));
  select.value=values.includes(previous)?previous:'';
}
function toggleRelease(id,checked){
  if(checked&&selected.length>=limit('max_repositories',6,12)){status(`Choose up to ${limit('max_repositories',6,12)} releases.`);return false;}
  if(!checked&&selected.length===1){status('Keep at least one release selected.');return false;}
  selected=checked?[...selected,id]:selected.filter(value=>value!==id);render();return true;
}
function renderReleases(){
  const repos=browseRepositories(capture,$('release-search').value,$('release-family').value);
  $('release-results').textContent=`${repos.length} of ${capture.repositories.length} indexed release choices · ${selected.length} selected`;
  $('selected-releases').replaceChildren(...selected.map(id=>{
    const repo=capture.repositories.find(r=>r.id===id),chip=node('span',undefined,'chip'),remove=node('button','×');
    remove.type='button';remove.setAttribute('aria-label',`Deselect ${repo.label}`);remove.disabled=selected.length===1;
    remove.onclick=()=>toggleRelease(id,false);chip.append(document.createTextNode(repo.label),remove);return chip;
  }));
  $('releases').replaceChildren();
  for(const repo of repos){
    const box=node('div',undefined,'release'),label=node('label'),input=node('input');input.type='checkbox';input.checked=selected.includes(repo.id);input.value=repo.id;
    input.addEventListener('change',()=>{if(!toggleRelease(repo.id,input.checked))input.checked=selected.includes(repo.id);});
    label.append(input,document.createTextNode(repo.label));box.append(label);
    box.append(node('span',repo.release_model==='rolling'?'Rolling release':repo.release_model==='development'?'Development branch':'Fixed release','release-kind'));
    const dl=node('dl'),fields=['alma','rocky'].includes(repo.family)?{'eol':'Active support','eol-security':'Security support'}:repo.family==='ubuntu'?{'eol':'Standard support','eol-esm':'ESM','eol-legacy':'Legacy'}:repo.family==='alpine'?{'eol':'Main support'}:{'eol':'Regular support','eol-lts':'LTS','eol-elts':'ELTS'};
    for(const [key,label] of Object.entries(fields))if(repo.lifecycle?.[key])dl.append(node('dt',label),node('dd',`${support(repo.lifecycle[key])} ${repo.lifecycle[key]}`));
    if(!dl.children.length)dl.append(node('dt',repo.release_model==='fixed'?'Support dates':'Fixed end date'),node('dd',repo.release_model==='fixed'?'Not captured':'Not applicable'));
    box.append(dl);if(repo.policy_note)box.append(node('p',repo.policy_note,'policy'));
    if(repo.policy_verified_on)box.append(node('small',`Policy reviewed ${repo.policy_verified_on}${repo.lifecycle_basis==='reviewed'?' · dates not fetched daily':''}`,'policy-date'));
    const coverage=Object.values(capture.projects).filter(p=>p.packages.some(row=>row.repo===repo.id)).length;
    box.append(node('p',`${coverage} of ${Object.keys(capture.projects).length} captured projects have records here`,'coverage'));
    if(repo.source){const link=node('a','Official lifecycle ↗');link.href=repo.source;link.target='_blank';link.rel='noopener';box.append(link);}
    if(!repo.observed_in_capture)box.append(node('p','Index coverage not established in this capture','coverage'));
    $('releases').append(box);
  }
  if(!repos.length)$('releases').append(node('p','No indexed release matches. See the coverage notes below.','hint'));
}
function renderProjects(){
  const projects=browseProjects(capture,$('software-search').value,$('software-category').value),pageSize=12,pages=Math.max(1,Math.ceil(projects.length/pageSize));
  projectPage=Math.min(projectPage,pages-1);const first=projectPage*pageSize,visible=projects.slice(first,first+pageSize);
  $('software-results').textContent=`${projects.length} matches from ${Object.keys(capture.projects).length} captured projects${projects.length?` · showing ${first+1}–${first+visible.length}`:''}`;
  $('previous-projects').disabled=projectPage===0;$('next-projects').disabled=projectPage>=pages-1;
  $('software-browser').replaceChildren(...visible.map(p=>{
    const card=node('article',undefined,'software-card'),heading=node('div'),add=node('button',wishlist.includes(p.project)?'Added':'Add','secondary');
    heading.append(node('strong',p.label),node('code',p.project));card.append(heading,node('small',p.category));
    card.append(node('p',`${projectCoverage(p,capture.repositories)} / ${capture.repositories.length} indexed releases`,'hint'));
    add.type='button';add.setAttribute('aria-label',`Add ${p.label} to wishlist`);add.disabled=wishlist.includes(p.project);add.onclick=()=>lookup(p.project);card.append(add);return card;
  }));
  if(!visible.length)$('software-browser').append(node('p','No captured app matches. Clear the filters or add another project identifier below.','hint'));
}
function render() {
  $('capture-date').textContent=dateLabel(capture.checked_at);
  $('capture-size').textContent=`${Object.keys(capture.projects).length} projects · ${capture.repositories.length} indexed releases · ${new Set(capture.repositories.map(r=>r.family)).size} distributions`;
  $('source-detail').textContent='Published capture '+dateLabel(capture.checked_at)+'. Automatically collected lifecycle dates use this capture; individually reviewed policies show their separate review date. Each project has its own source check date.';
  $('release-limit').textContent=`Compare up to ${limit('max_repositories',6,12)}`; $('project-count').textContent=`${wishlist.length} / ${limit('max_projects',30,100)} projects`;
  options('release-family',[...new Set(capture.repositories.map(r=>r.family))].sort(),'All distributions',value=>families[value]||value);
  options('software-category',[...new Set(Object.values(capture.projects).map(p=>p.category||'Other'))].sort(),'All categories');
  renderReleases();renderProjects();
  $('coverage-notes').replaceChildren(...capture.coverage_notes.map(note=>{const p=node('p');p.append(node('strong',note.label+': '),document.createTextNode(note.text));if(note.source){const link=node('a',' Official source ↗');link.href=note.source;link.target='_blank';link.rel='noopener';p.append(link);}if(note.reviewed_on)p.append(node('small',' Reviewed '+note.reviewed_on));return p;}));
  if(!capture.coverage_notes.length)$('coverage-notes').append(node('p','This older capture has no additional coverage notes. Its original release choices and dates are preserved.'));
  $('projects').replaceChildren(...Object.keys(capture.projects).sort().map(name=>{const o=node('option');o.value=name;return o;}));
  $('chips').replaceChildren();$('refresh-project').replaceChildren();
  for(const name of wishlist){const chip=node('span',undefined,'chip'),remove=node('button','×');remove.type='button';remove.setAttribute('aria-label',`Remove ${name}`);remove.disabled=wishlist.length===1;remove.onclick=()=>{wishlist=wishlist.filter(x=>x!==name);render();};chip.append(document.createTextNode(name),remove);$('chips').append(chip);const option=node('option',name);option.value=name;$('refresh-project').append(option);}
  const head=node('tr');head.append(node('th','Software'));for(const id of selected)head.append(node('th',capture.repositories.find(r=>r.id===id).label));$('table-head').replaceChildren(head);$('table-body').replaceChildren();
  for(const name of wishlist){const tr=node('tr'),th=node('th',name);th.scope='row';th.append(node('small','Checked '+dateLabel(capture.projects[name].checked_at)));tr.append(th);
    for(const id of selected){const td=node('td'),rows=cell(capture.projects[name],id);if(!rows.length){td.append(node('span',capture.repositories.find(r=>r.id===id).observed_in_capture?'No captured record for this project':'Index coverage not established','empty'));}else{const versions=[...new Set(rows.map(r=>r.version))];td.append(node('div',versions.join(' · '),'versions'));const details=node('details'),summary=node('summary',`${rows.length} package record${rows.length===1?'':'s'}`),ul=node('ul');for(const row of rows)ul.append(node('li',[row.srcname||row.visiblename||name,row.origversion||row.version,row.subrepo].filter(Boolean).join(' · ')));details.append(summary,ul);td.append(details);}tr.append(td);}
    $('table-body').append(tr);
  }
  $('notes').replaceChildren();for(const name of wishlist){const label=node('label',name),area=node('textarea');area.rows=3;area.maxLength=2000;area.placeholder='Required version, compatibility checks, migration steps…';area.value=notes[name]||'';area.setAttribute('aria-label',`${name} migration notes`);area.addEventListener('input',()=>notes[name]=area.value);label.append(area);$('notes').append(label);}
}
async function lookup(name,force=false){if(busy)return;if(!validProject(name)){status('Use a Repology identifier: lowercase letters, numbers, +, _, . or -.');return;}if(!wishlist.includes(name)&&wishlist.length>=limit('max_projects',30,100)){status(`This plan can contain up to ${limit('max_projects',30,100)} projects.`);return;}
  if(capture.projects[name]&&!force){if(!wishlist.includes(name))wishlist.push(name);render();status(`Added ${name} from the published capture.`);return;}
  if(!capture.projects[name]&&Object.keys(capture.projects).length>=100){status('This capture already contains 100 projects. Export your plan, then reload to start from the current catalogue.');return;}
  if(!apiBase){status('Live package lookup is not configured. Published projects remain available.');return;}
  busy=true;$('add').disabled=true;$('refresh').disabled=true;status(`Checking ${name} in the cached Repology index…`);
  try{const response=await fetch(`${apiBase}/project?name=${encodeURIComponent(name)}`,{signal:AbortSignal.timeout(45000)});if(response.status===429)throw new Error(`The shared source is busy. Retry in ${response.headers.get('Retry-After')||'a few'} seconds.`);if(!response.ok)throw new Error(`Package lookup is unavailable (HTTP ${response.status}). Previous evidence is unchanged.`);const body=await response.json();if(!validDate(body.fetched_at))throw new Error('The source returned no valid check date.');const rows=packages(body.data);if(!rows.length)throw new Error('No indexed project found with that identifier. Try the Repology project search.');capture.projects[name]={project:name,label:capture.projects[name]?.label||name,category:capture.projects[name]?.category||'Other',checked_at:body.fetched_at,packages:rows.filter(r=>capture.repositories.some(repo=>repo.id===r.repo))};for(const r of capture.repositories)if(rows.some(row=>row.repo===r.id))r.observed_in_capture=true;if(!wishlist.includes(name))wishlist.push(name);render();status(`Loaded ${name}; source checked ${dateLabel(body.fetched_at)}. Missing cells mean no indexed record for the selected release.`);}catch(error){status(error.message || 'Package lookup failed. Your existing evidence is unchanged.');}finally{busy=false;$('add').disabled=false;$('refresh').disabled=false;}
}
$('release-search').oninput=renderReleases;$('release-family').onchange=renderReleases;
$('software-search').oninput=()=>{projectPage=0;renderProjects();};$('software-category').onchange=()=>{projectPage=0;renderProjects();};
$('previous-projects').onclick=()=>{projectPage--;renderProjects();};$('next-projects').onclick=()=>{projectPage++;renderProjects();};
$('add-form').addEventListener('submit',event=>{event.preventDefault();const name=$('project').value.trim().toLowerCase();lookup(name);$('project').value='';});
$('refresh').onclick=()=>lookup($('refresh-project').value,true);
$('save').onclick=()=>{try{localStorage.setItem(storageKey,JSON.stringify(plan(capture,selected,wishlist,notes)));status('Plan and captured evidence saved in this browser.');}catch{status('Browser storage is unavailable or full. Export the plan instead.');}};
function apply(value){const p=readPlan(value);capture=p.capture;selected=p.selected;wishlist=p.wishlist;notes=p.notes;projectPage=0;$('release-search').value='';$('software-search').value='';render();status('Restored saved evidence. Capture date: '+dateLabel(capture.checked_at)+'. Reload the page for the latest published capture.');}
$('restore').onclick=()=>{try{const value=localStorage.getItem(storageKey);if(!value)throw new Error('No plan has been saved in this browser.');apply(JSON.parse(value));}catch(error){status(error.message);}};
$('forget').onclick=()=>{try{localStorage.removeItem(storageKey);status('Saved plan deleted from this browser. The open plan stays in this tab.');}catch{status('Browser storage is unavailable.');}};
$('export').onclick=()=>saveFile('distropilot-plan.json',JSON.stringify(plan(capture,selected,wishlist,notes),null,2),'application/json');
$('csv').onclick=()=>saveFile('distropilot-versions.csv',csv(capture,selected,wishlist,notes),'text/csv');
$('import').onchange=async()=>{try{const file=$('import').files[0];if(!file)return;if(file.size>4000000)throw new Error('Plan must be smaller than 4 MB.');apply(JSON.parse(await file.text()));}catch(error){status(error.message);}finally{$('import').value='';}};
try{const response=await fetch('./data/catalogue.json');if(!response.ok)throw new Error('Published capture could not load. Try reloading.');capture=validateCapture(await response.json());apiBase=String(capture.config?.api_base||'');selected=(capture.config?.default_repositories||[]).filter(id=>capture.repositories.some(r=>r.id===id)).slice(0,limit('max_repositories',6,12));if(!selected.length)selected=[capture.repositories[0].id];wishlist=(capture.config?.default_projects||[]).filter(name=>capture.projects[name]).slice(0,limit('max_projects',30,100));if(!wishlist.length)wishlist=Object.keys(capture.projects).slice(0,4);render();$('workspace').hidden=false;status('Start with these releases and projects, or build your own comparison.');}catch(error){status(error.message);}
