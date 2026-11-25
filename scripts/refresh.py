#!/usr/bin/env python3
"""Publish one complete source check; failures never replace the last good snapshot."""
import csv
from datetime import datetime, timezone, date
from hashlib import sha256
import io
import json
from pathlib import Path
import re
import tempfile
import time
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
AGENT = 'DistroPilot/1.0 (+https://github.com/jsdyer/distropilot/issues)'
SLUG = re.compile(r'[a-z0-9][a-z0-9+_.-]{0,99}')
FIELDS = ('repo', 'subrepo', 'srcname', 'visiblename', 'version', 'origversion', 'summary')
SOURCES = {'ubuntu':'https://debian.pages.debian.net/distro-info-data/ubuntu.csv',
           'debian':'https://debian.pages.debian.net/distro-info-data/debian.csv',
           'alma':'https://wiki.almalinux.org/release-notes/'}


def fetch(url):
    with urlopen(Request(url, headers={'User-Agent':AGENT}), timeout=45) as response:
        raw = response.read(8_000_001)
        if response.status != 200 or not raw or len(raw)>8_000_000: raise ValueError('Invalid source response')
        return raw


def normalized_packages(rows, repositories=None):
    if not isinstance(rows,list) or len(rows)>100_000: raise ValueError('Expected bounded package list')
    result, seen = [], set()
    for row in rows:
        if not isinstance(row,dict) or not all(isinstance(row.get(k),str) and row[k] for k in ('repo','version')):
            raise ValueError('Malformed package record')
        if repositories is not None and row['repo'] not in repositories: continue
        item={k:row[k] for k in FIELDS if isinstance(row.get(k),str)}
        key=json.dumps(item,sort_keys=True)
        if key not in seen: result.append(item);seen.add(key)
    return result


def lifecycle(rows, family):
    output={}
    for row in csv.DictReader(io.StringIO(rows.decode('utf-8-sig'))):
        if not row.get('series'): raise ValueError('Invalid lifecycle CSV')
        record={}
        for key in ('release','eol','eol-server','eol-esm','eol-lts','eol-elts','eol-legacy'):
            if row.get(key):
                date.fromisoformat(row[key]);record[key]=row[key]
        output[row['series']]=record
    if len(output)<5: raise ValueError('Incomplete lifecycle CSV')
    return output


def alma_lifecycle(raw, major):
    text=re.sub('<[^>]+>',' ',raw.decode());text=' '.join(text.split())
    match=re.search(rf'Version {major} will have active support until (\d{{1,2}} \w+ \d{{4}}), and security support until (\d{{1,2}} \w+ \d{{4}})',text)
    if not match: raise ValueError(f'AlmaLinux {major} support statement missing')
    return {'eol':datetime.strptime(match[1],'%d %B %Y').date().isoformat(),
            'eol-security':datetime.strptime(match[2],'%d %B %Y').date().isoformat()}


def collect(config, fetcher=fetch, sleep=time.sleep, now=None):
    projects=config['projects'];repos=config['repositories']
    if not projects or len(projects)>100 or len(set(projects))!=len(projects) or not all(SLUG.fullmatch(x) for x in projects): raise ValueError('Invalid configured projects')
    repo_ids={r['id'] for r in repos}
    if len(repo_ids)!=len(repos): raise ValueError('Duplicate repositories')
    now=now or datetime.now(timezone.utc).isoformat(timespec='seconds').replace('+00:00','Z')
    sources={k:fetcher(u) for k,u in SOURCES.items()}
    life={k:lifecycle(sources[k],k) for k in ('ubuntu','debian')}
    final_repos=[]
    for repo in repos:
        row=dict(repo)
        if repo['family'] in life: row['lifecycle']=life[repo['family']].get(repo.get('series'),{})
        elif repo['family']=='alma': row['lifecycle']=alma_lifecycle(sources['alma'],repo['major'])
        else: row['lifecycle']={}
        final_repos.append(row)
    results={};coverage=set()
    for index, name in enumerate(projects):
        if index: sleep(1.1)
        rows=json.loads(fetcher('https://repology.org/api/v1/project/'+name))
        # Empty is valid for an arbitrary new project but a configured starter needs evidence.
        if not rows: raise ValueError('No source records for configured project: '+name)
        packages=normalized_packages(rows,repo_ids)
        coverage.update(p['repo'] for p in packages)
        results[name]={'project':name,'checked_at':now,'packages':packages}
    for repo in final_repos: repo['observed_in_capture']=repo['id'] in coverage
    return {'schema':1,'checked_at':now,'projects':results,'repositories':final_repos,'config':{k:config[k] for k in ('default_repositories','default_projects','max_projects','max_repositories','api_base')},'sources':SOURCES}


def write_json(path, value):
    path.parent.mkdir(parents=True,exist_ok=True)
    with tempfile.NamedTemporaryFile('w',dir=path.parent,delete=False,encoding='utf-8') as file:
        json.dump(value,file,ensure_ascii=False,indent=2);file.write('\n');temp=Path(file.name)
    temp.replace(path)


def main():
    data=collect(json.loads((ROOT/'config/catalogue.json').read_text()))
    encoded=(json.dumps(data,ensure_ascii=False,indent=2)+'\n').encode()
    # All network and validation work is complete before either publication file changes.
    write_json(ROOT/'web/data/catalogue.json',data)
    write_json(ROOT/'web/data/status.json',{'checked_at':data['checked_at'],'count':len(data['projects']),'repository_count':len(data['repositories']),'sha256':sha256(encoded).hexdigest()})
    print(f"Checked {len(data['projects'])} projects and {len(data['repositories'])} configured releases")


if __name__=='__main__': main()
