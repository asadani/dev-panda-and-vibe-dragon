import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('comic_memory', Path(__file__).parents[1] / 'scripts' / 'memory.py')
memory = importlib.util.module_from_spec(spec)
spec.loader.exec_module(memory)


class MemoryTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / 'memory').mkdir()

    def note(self, name, **kwargs):
        record = dict(id=name, kind='lesson', status='proposed', title=name,
                      provenance='test evidence', tags=['agents'], links=[])
        record.update(kwargs)
        raw = '---\n' + '\n'.join(k + ': ' + json.dumps(v) for k, v in record.items()) + '\n---\n\nAgents lesson.\n'
        (self.root / 'memory' / (name + '.md')).write_text(raw, encoding='utf-8')

    def test_inference_never_promoted_and_superseded_excluded(self):
        self.note('proposal')
        self.note('old', status='approved', superseded_by='current')
        self.note('current', status='approved')
        self.note('unsupported', status='approved', provenance='')
        result = memory.retrieve(self.root, 'agents')
        self.assertEqual([n['id'] for n in result['constraints']], ['current'])
        self.assertEqual([n['id'] for n in result['unapproved_context']], ['proposal'])
        persisted = {n['id']: n for n in memory.notes(self.root)}
        self.assertEqual(persisted['proposal']['status'], 'proposed')

    def test_history_selection_and_broken_link_reporting(self):
        for i in range(12):
            self.note('ep-%02d' % i, kind='episode', status='completed', date='2026-09-%02d' % (i + 1))
        self.note('broken', links=['missing'])
        result = memory.retrieve(self.root, 'agents')
        self.assertEqual(len(result['recent_episodes']), 10)
        self.assertEqual(len(result['related_episodes']), 2)
        self.assertEqual(result['recent_episodes'][0]['id'], 'ep-11')
        self.assertEqual(result['broken_links'][0]['target'], 'missing')

    def test_duplicate_id_fails(self):
        self.note('one')
        (self.root / 'memory' / 'two.md').write_text((self.root / 'memory' / 'one.md').read_text(), encoding='utf-8')
        with self.assertRaises(ValueError):
            memory.index(self.root)

    def test_install_is_explicit_and_existing_install_preserved(self):
        source = self.root / 'skills' / 'comic-production'
        source.mkdir(parents=True)
        (source / 'SKILL.md').write_text('skill', encoding='utf-8')
        destination = self.root / 'installed'
        memory.sync(self.root, destination, dry_run=True)
        self.assertFalse(destination.exists())
        memory.sync(self.root, destination)
        with self.assertRaises(ValueError):
            memory.sync(self.root, destination)
        result = memory.sync(self.root, destination, update=True)
        self.assertTrue((Path(result['backup']) / 'SKILL.md').is_file())


if __name__ == '__main__':
    unittest.main()
