"""Portable note indexing, retrieval, and explicit skill synchronization (stdlib only)."""
import argparse
import datetime as dt
import json
import os
from pathlib import Path
import re
import shutil


def notes(root):
    records = []
    seen = set()
    for path in sorted((Path(root) / 'memory').rglob('*.md')):
        raw = path.read_text(encoding='utf-8')
        if not raw.startswith('---\n'):
            continue
        try:
            front, body = raw[4:].split('\n---\n', 1)
        except ValueError:
            raise ValueError(f'Unclosed frontmatter: {path}')
        record = {}
        for line in front.splitlines():
            if not line.strip():
                continue
            key, value = line.split(':', 1)
            record[key] = json.loads(value.strip())
        note_id = record.get('id')
        if not isinstance(note_id, str) or not note_id or note_id in seen:
            raise ValueError(f'Missing or duplicate note ID: {path}')
        seen.add(note_id)
        record['path'] = path.relative_to(root).as_posix()
        record['body'] = body
        records.append(record)
    return records


def index(root):
    records = notes(root)
    known = {r['id'] for r in records}
    edges, broken = [], []
    for record in records:
        for target in record.get('links', []):
            edge = {'source': record['id'], 'target': target, 'relation': 'links'}
            (edges if target in known else broken).append(edge)
        replacement = record.get('superseded_by')
        if replacement:
            edge = {'source': record['id'], 'target': replacement, 'relation': 'superseded_by'}
            (edges if replacement in known else broken).append(edge)
    return {'nodes': records, 'edges': edges, 'broken_links': broken}


def retrieve(root, query):
    graph = index(root)
    records = graph['nodes']
    constraints = [r for r in records if r.get('kind') in {'canon', 'preference', 'lesson'}
                   and r.get('status') == 'approved' and not r.get('superseded_by')
                   and r.get('provenance')]
    episodes = [r for r in records if r.get('kind') == 'episode'
                and r.get('status') in {'completed', 'ready', 'published', 'historical'}]
    episodes.sort(key=lambda r: (r.get('date') or '', r['id']), reverse=True)
    recent = episodes[:10]
    recent_ids = {r['id'] for r in recent}
    terms = set(re.findall(r'\w+', query.lower()))
    def score(record):
        haystack = set(re.findall(r'\w+', (record.get('title', '') + ' ' +
                       ' '.join(record.get('tags', [])) + ' ' + record['body']).lower()))
        return len(terms & haystack)
    older = sorted((r for r in episodes if r['id'] not in recent_ids and score(r)),
                   key=lambda r: (-score(r), r['id']))[:5]
    # Relevant proposals are visible as evidence, never included in operative constraints.
    pending = [r for r in records if r.get('kind') in {'feedback', 'lesson'}
               and r.get('status') == 'proposed' and score(r)]
    return {'constraints': constraints, 'recent_episodes': recent,
            'related_episodes': older, 'unapproved_context': pending,
            'broken_links': graph['broken_links']}


def sync(root, destination=None, dry_run=False, update=False):
    source = (Path(root) / 'skills' / 'comic-production').resolve()
    skills_root = Path(destination) if destination else Path(os.environ.get('CODEX_HOME', str(Path.home() / '.codex'))) / 'skills'
    target = (skills_root / 'comic-production').resolve()
    if source == target or source in target.parents or target in source.parents:
        raise ValueError('Installation source and destination must be separate directories')
    if not (source / 'SKILL.md').is_file():
        raise ValueError('Source skill is missing')
    result = {'source': str(source), 'target': str(target), 'dry_run': dry_run}
    if dry_run:
        result['existing_installation'] = target.exists()
        return result
    if target.exists():
        if not update:
            raise ValueError('Installation exists; use --update to back it up and update')
        stamp = dt.datetime.now(dt.timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
        # Backups must not live in the discovery directory as duplicate skills.
        backup = skills_root.parent / 'skill-backups' / (target.name + '.backup-' + stamp)
        backup.parent.mkdir(parents=True, exist_ok=True)
        shutil.copytree(target, backup)
        result['backup'] = str(backup)
    shutil.copytree(source, target, dirs_exist_ok=True,
                    ignore=shutil.ignore_patterns('__pycache__', '*.pyc'))
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=['index', 'retrieve', 'sync'])
    parser.add_argument('--root', type=Path, default=Path.cwd())
    parser.add_argument('--query', default='')
    parser.add_argument('--destination', type=Path)
    parser.add_argument('--dry-run', action='store_true')
    parser.add_argument('--update', action='store_true')
    args = parser.parse_args()
    try:
        root = args.root.resolve()
        result = (index(root) if args.command == 'index' else
                  retrieve(root, args.query) if args.command == 'retrieve' else
                  sync(root, args.destination, args.dry_run, args.update))
        print(json.dumps(result, indent=2, ensure_ascii=False))
    except (ValueError, OSError) as exc:
        parser.exit(1, f'{exc}\n')


if __name__ == '__main__':
    main()
