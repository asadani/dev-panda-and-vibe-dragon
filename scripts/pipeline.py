"""Validate evidence-backed comic checkpoints; does not run agents or generate art."""
import argparse
import hashlib
import json
from pathlib import Path

STAGES = {
    'brief': ('Producer', 'Requirements reviewer', ['intent', 'format', 'references', 'footer', 'acceptance']),
    'research': ('Researcher', 'Fact checker', ['sources', 'claims', 'uncertainty', 'fiction']),
    'story': ('Writer', 'Story editor', ['stakes', 'causality', 'reversal', 'payoff', 'voices', 'visual_action']),
    'art_plan': ('Art director', 'Visual editor', ['composition', 'identity', 'expressions', 'lettering', 'reference_match']),
    'artwork': ('Producer', 'Visual reviewer', ['actual_images', 'identity', 'acting', 'continuity', 'text_accuracy']),
    'composition': ('Compositor', 'Layout reviewer', ['panel_count', 'grid', 'footer', 'reading_order', 'phone_preview']),
    'package': ('Publisher', 'Release reviewer', ['copy_alignment', 'formats', 'hashes', 'current_revision', 'publication_state'])
}

def read(path):
    value = json.loads(path.read_text(encoding='utf-8-sig'))
    if not isinstance(value, dict):
        raise ValueError('Expected JSON object: ' + str(path))
    return value

def artifact(root, relative):
    if not isinstance(relative, str) or not relative.strip() or Path(relative).is_absolute():
        raise ValueError('Expected relative artifact path')
    path = (root / relative).resolve()
    if not path.is_relative_to(root.resolve()) or not path.is_file():
        raise ValueError('Missing or escaping artifact: ' + str(relative))
    data = path.read_bytes()
    if path == (root / 'episode.json').resolve():
        episode = read(path)
        for key in ['status', 'updatedAt', 'lastRender', 'lastPackage']:
            episode.pop(key, None)
        data = json.dumps(episode, sort_keys=True, ensure_ascii=False).encode('utf-8')
    return hashlib.sha256(data).hexdigest()


def output_tree(root, pointer, field):
    if not isinstance(pointer, str) or not pointer.strip() or Path(pointer).is_absolute():
        raise ValueError('Missing or invalid ' + field)
    directory = (root / pointer).resolve()
    if directory == root.resolve() or not directory.is_relative_to(root.resolve()) or not directory.is_dir():
        raise ValueError('Missing or escaping output directory: ' + field)
    result = {'@' + field: pointer}
    files = []
    for path in sorted(directory.rglob('*')):
        if path.is_symlink() or not path.resolve().is_relative_to(directory):
            raise ValueError('Linked or escaping output: ' + str(path))
        if path.is_file():
            files.append(path)
            relative = path.relative_to(root.resolve()).as_posix()
            result[relative] = artifact(root, relative)
    if not files:
        raise ValueError('Empty output directory: ' + field)
    return result


def stage_entry(config, stage):
    entry = config['stages'][stage]
    if not isinstance(entry, dict):
        raise ValueError(stage + ': expected stage object')
    if entry.get('ownerRole') != STAGES[stage][0]:
        raise ValueError(stage + ': required owner role: ' + STAGES[stage][0])
    for key in ['task', 'goal', 'ownerAgent']:
        if not isinstance(entry.get(key), str) or not entry[key].strip():
            raise ValueError(stage + ': ' + key + ' required')
    files = entry.get('artifacts')
    if not isinstance(files, list) or not files or any(not isinstance(f, str) or not f.strip() for f in files):
        raise ValueError(stage + ': nonempty artifact path list required')
    return entry

def snapshots(root, config, through):
    result = {'brief.json': artifact(root, 'brief.json')}
    if list(STAGES).index(through) >= list(STAGES).index('story'):
        result['episode.json'] = artifact(root, 'episode.json')
    if list(STAGES).index(through) >= list(STAGES).index('artwork'):
        for panel in read(root / 'episode.json')['panels']:
            result[panel['art']] = artifact(root, panel['art'])
    if list(STAGES).index(through) >= list(STAGES).index('composition'):
        episode = read(root / 'episode.json')
        result.update(output_tree(root, episode.get('lastRender'), 'lastRender'))
    if through == 'package':
        result.update(output_tree(root, episode.get('lastPackage'), 'lastPackage'))
        result['copy.json'] = artifact(root, 'copy.json')
    for stage in STAGES:
        files = stage_entry(config, stage)['artifacts']
        for file in files:
            result[file] = artifact(root, file)
        if stage == through:
            break
    scoped = {s: config['stages'][s] for s in list(STAGES)[:list(STAGES).index(through)+1]}
    result['pipeline.json'] = hashlib.sha256(json.dumps(scoped, sort_keys=True).encode('utf-8')).hexdigest()
    return result

def check(root, through):
    failures = []
    try:
        config = read(root / 'pipeline.json')
    except (ValueError, OSError, TypeError) as error:
        return {'through': through, 'passed': False, 'failures': [{'stage': 'contract', 'error': str(error)}]}
    try:
        brief = read(root / 'brief.json')
        for key in ['topic', 'audience', 'storyPromise', 'footerLeft', 'footerRight', 'references', 'acceptance']:
            if not brief.get(key):
                raise ValueError('brief missing ' + key)
        if brief['panelCount'] != brief['rows'] * brief['columns']:
            raise ValueError('brief panelCount must equal rows * columns')
        if brief.get('productionMode') not in ['editable_composite', 'raster_composite']:
            raise ValueError('declare productionMode')
        if brief['productionMode'] == 'raster_composite' and brief.get('editableLettering') is not False:
            raise ValueError('raster mode cannot promise editable lettering')
        if list(STAGES).index(through) >= list(STAGES).index('story'):
            script = read(root / 'episode.json')
            if len(script.get('panels', [])) != brief['panelCount']:
                raise ValueError('script panel count differs from brief')
            if brief['columns'] > 1 and script.get('layout') != 'grid':
                raise ValueError('script must preserve requested grid')
    except (ValueError, OSError, KeyError, TypeError) as error:
        failures.append({'stage': 'contract', 'error': str(error)})
    for stage, (owner, reviewer, checks) in STAGES.items():
        try:
            entry = stage_entry(config, stage)
            receipt = read(root / 'reviews' / (stage + '.json'))
            if receipt.get('role') != reviewer:
                raise ValueError('required reviewer role: ' + reviewer)
            if not receipt.get('reviewerAgent') or receipt['reviewerAgent'] == entry['ownerAgent']:
                raise ValueError('independent reviewer identity required')
            if receipt.get('status') != 'pass':
                raise ValueError('review is pending or revise')
            if receipt.get('inputs') != snapshots(root, config, stage):
                raise ValueError('review stale: artifacts or contract changed')
            for key in checks:
                finding = receipt.get('checks', {}).get(key, {})
                if not isinstance(finding, dict) or finding.get('result') != 'pass' or not isinstance(finding.get('evidence'), str) or not finding['evidence'].strip():
                    raise ValueError('missing pass with evidence: ' + key)
            if receipt.get('unresolved'):
                raise ValueError('unresolved findings remain')
        except (ValueError, OSError, KeyError, TypeError, AttributeError) as error:
            failures.append({'stage': stage, 'error': str(error)})
        if stage == through:
            break
    return {'through': through, 'passed': not failures, 'failures': failures,
            'note': 'Checks receipt completeness and freshness, not truth, humor or tool execution.'}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=['init', 'prepare', 'check'])
    parser.add_argument('episode', type=Path)
    parser.add_argument('--through', choices=list(STAGES), default='art_plan')
    args = parser.parse_args()
    root = args.episode.resolve()
    try:
        if args.command == 'init':
            root.mkdir(parents=True, exist_ok=True)
            config = {'schemaVersion': 1, 'stages': {s: {'ownerRole': spec[0], 'ownerAgent': '',
                      'task': '', 'goal': '', 'artifacts': []} for s, spec in STAGES.items()}}
            with (root / 'pipeline.json').open('x', encoding='utf-8') as handle:
                json.dump(config, handle, indent=2)
        elif args.command == 'prepare':
            config = read(root / 'pipeline.json')
            receipt = {'role': STAGES[args.through][1], 'reviewerAgent': '', 'status': 'pending',
                       'inputs': snapshots(root, config, args.through),
                       'checks': {k: {'result': 'not_inspected', 'evidence': ''} for k in STAGES[args.through][2]},
                       'unresolved': [], 'limitations': []}
            (root / 'reviews').mkdir(exist_ok=True)
            with (root / 'reviews' / (args.through + '.json')).open('x', encoding='utf-8') as handle:
                json.dump(receipt, handle, indent=2)
        else:
            report = check(root, args.through)
            print(json.dumps(report, indent=2))
            return 0 if report['passed'] else 1
    except (ValueError, OSError, KeyError, TypeError, AttributeError) as error:
        parser.exit(1, str(error) + '\n')
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
