export const SLUG = /^[a-z0-9][a-z0-9+_.-]{0,99}$/;
export const validProject = name => typeof name === 'string' && SLUG.test(name);
export function packages(rows) {
  if (!Array.isArray(rows) || rows.length > 100000) throw new Error('The source did not return a valid package list.');
  const fields = ['repo','subrepo','srcname','visiblename','version','origversion','summary'];
  const found = new Map();
  for (const row of rows) {
    if (!row || typeof row.repo !== 'string' || typeof row.version !== 'string' || !row.repo || !row.version) throw new Error('A package record is incomplete.');
    const record = Object.fromEntries(fields.filter(k => typeof row[k] === 'string').map(k => [k, row[k].slice(0, 2000)]));
    found.set(JSON.stringify(record), record);
  }
  return [...found.values()];
}
export function cell(project, repository) {
  return [...new Map((project?.packages || []).filter(row => row.repo === repository).map(row => [JSON.stringify([row.version,row.origversion || '',row.subrepo || '',row.srcname || '']),row])).values()].sort((a,b) => a.version.localeCompare(b.version,undefined,{numeric:true}));
}
export function support(date, today = new Date().toISOString().slice(0,10)) {
  if (!date) return 'Not captured';
  return date < today ? 'Ended' : 'Until';
}
export function validateCapture(value) {
  if (!value || value.schema !== 1 || !Array.isArray(value.repositories) || value.repositories.length < 1 || value.repositories.length > 100 || typeof value.projects !== 'object' || !value.projects || !validDate(value.checked_at)) throw new Error('This is not a Distro Pilot capture.');
  const ids = new Set();
  const repositories = value.repositories.map(r => {
    if (!r || !validProject(r.id) || ids.has(r.id) || typeof r.label !== 'string' || r.label.length > 150) throw new Error('Invalid release in capture.');
    ids.add(r.id);
    const lifecycle = {};
    for (const [key,date] of Object.entries(r.lifecycle || {})) if (/^(release|eol(?:-server|-esm|-lts|-elts|-legacy|-security)?)$/.test(key)) { if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Invalid lifecycle date.'); lifecycle[key] = date; }
    return {id:r.id,label:r.label,family:String(r.family || '').slice(0,30),source:safeLink(r.source),lifecycle,observed_in_capture:!!r.observed_in_capture};
  });
  const projects = Object.create(null);
  const entries = Object.entries(value.projects);
  if (entries.length > 100) throw new Error('Capture has too many projects.');
  for (const [name,p] of entries) {
    if (!validProject(name) || !p || !validDate(p.checked_at)) throw new Error('Invalid project capture.');
    projects[name] = {project:name,checked_at:p.checked_at,packages:packages(p.packages)};
  }
  return {...value,repositories,projects};
}
export const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value));
export function safeLink(value) { try { const u = new URL(value); return u.protocol === 'https:' ? u.href : ''; } catch { return ''; } }
export function plan(capture, selected, wishlist, notes) {
  return {format:'distropilot-plan',version:1,saved_at:new Date().toISOString(),capture,selected,wishlist,notes};
}
export function readPlan(value) {
  if (value?.format !== 'distropilot-plan' || value.version !== 1) throw new Error('Choose a Distro Pilot plan JSON file.');
  const capture = validateCapture(value.capture), ids = new Set(capture.repositories.map(r => r.id));
  if (!Array.isArray(value.selected) || !value.selected.length || value.selected.length > 12 || !value.selected.every(v => ids.has(v)) || new Set(value.selected).size !== value.selected.length) throw new Error('Invalid selected releases.');
  if (!Array.isArray(value.wishlist) || !value.wishlist.length || value.wishlist.length > 100 || !value.wishlist.every(p => validProject(p) && capture.projects[p]) || new Set(value.wishlist).size !== value.wishlist.length) throw new Error('Invalid software wishlist.');
  const notes = Object.create(null);
  for (const name of value.wishlist) notes[name] = typeof value.notes?.[name] === 'string' ? value.notes[name].slice(0,2000) : '';
  return {...value,capture,notes};
}
export const csvValue = value => '"' + (/^[=+@\-\t\r]/.test(String(value)) ? "'" : '') + String(value).replaceAll('"','""') + '"';
export function csv(capture,selected,wishlist,notes) {
  const lines = [['Project','Release','Version','Distribution version','Repository section','Package name','Checked at','Migration notes']];
  for (const name of wishlist) for (const id of selected) {
    const repo = capture.repositories.find(r => r.id === id), rows = cell(capture.projects[name],id);
    if (!rows.length) lines.push([name,repo.label,'No captured record','','','',capture.projects[name]?.checked_at || '',notes[name] || '']);
    for (const row of rows) lines.push([name,repo.label,row.version,row.origversion || '',row.subrepo || '',row.srcname || '',capture.projects[name].checked_at,notes[name] || '']);
  }
  return lines.map(row => row.map(csvValue).join(',')).join('\r\n');
}
