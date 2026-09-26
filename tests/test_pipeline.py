import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('pipeline', Path(__file__).parents[1]/'scripts/pipeline.py')
p = importlib.util.module_from_spec(spec)
spec.loader.exec_module(p)

class PipelineTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        (self.root/'reviews').mkdir()
        self.brief = dict(topic='routing', audience='developers', storyPromise='reversal', footerLeft='Series',
                          footerRight='Copyright', references=['reference'], acceptance=['grid'],
                          panelCount=4, rows=2, columns=2, productionMode='editable_composite')
        self.write('brief.json', self.brief)
        self.write('episode.json', dict(layout='grid', panels=[{'art':'art.bin'}]*4,
                                       lastRender='renders/id', lastPackage='packages/id'))
        (self.root/'renders/id').mkdir(parents=True)
        (self.root/'packages/id/assets').mkdir(parents=True)
        (self.root/'renders/id/strip.png').write_bytes(b'rendered fixture')
        self.write('renders/id/render.json', {'files': ['strip.png']})
        (self.root/'packages/id/assets/strip.png').write_bytes(b'packaged fixture')
        self.write('packages/id/manifest.json', {'files': ['assets/strip.png']})
        self.write('copy.json', {'description': 'Fixture story'})
        (self.root/'art.bin').write_bytes(b'art fixture')
        self.config = {'stages': {stage: dict(ownerRole=role[0],task='bounded task',goal='goal',ownerAgent='creator',artifacts=['brief.json','episode.json']) for stage,role in p.STAGES.items()}}
        self.write('pipeline.json',self.config)
        for stage, (_, role, checks) in p.STAGES.items():
            self.write('reviews/'+stage+'.json', dict(role=role, reviewerAgent='independent',status='pass',
                       inputs=p.snapshots(self.root,self.config,stage),
                       checks={k:dict(result='pass',evidence='Inspected fixture artifact at locator') for k in checks},unresolved=[]))

    def write(self,name,data):
        (self.root/name).write_text(json.dumps(data),encoding='utf-8')

    def test_complete_receipts(self):
        self.assertTrue(p.check(self.root,'package')['passed'])

    def test_changed_script_invalidates_reviews(self):
        self.write('episode.json',dict(layout='grid',panels=[{'changed':True}]*4))
        self.assertFalse(p.check(self.root,'story')['passed'])

    def test_wrong_layout_and_count(self):
        self.write('episode.json',dict(layout='vertical',panels=[{}]*5))
        report=p.check(self.root,'art_plan')
        self.assertTrue(any(f['stage']=='contract' for f in report['failures']))

    def test_missing_self_and_uninspected_reviews(self):
        file=self.root/'reviews/story.json'
        receipt=p.read(file)
        for change in [dict(reviewerAgent='creator'),dict(status='pending'),dict(checks={}),dict(unresolved=['weak payoff'])]:
            self.write('reviews/story.json',dict(receipt,**change))
            self.assertFalse(p.check(self.root,'story')['passed'])
        file.unlink()
        self.assertFalse(p.check(self.root,'story')['passed'])

    def test_raster_editable_promise_rejected(self):
        self.write('brief.json',dict(self.brief,productionMode='raster_composite',editableLettering=True))
        self.assertTrue(any(f['stage']=='contract' for f in p.check(self.root,'brief')['failures']))

    def test_path_escape_rejected(self):
        with self.assertRaises(ValueError): p.artifact(self.root,'../outside.json')

    def test_operational_progress_does_not_stale_review(self):
        ep=p.read(self.root/'episode.json')
        ep.update(status='rendered',lastRender='renders/id',updatedAt='later')
        self.write('episode.json',ep)
        self.assertTrue(p.check(self.root,'package')['passed'])

    def test_later_contract_changes_preserve_earlier_reviews(self):
        self.config['stages']['package']['goal']='New export goal'
        self.write('pipeline.json',self.config)
        self.assertTrue(p.check(self.root,'story')['passed'])
        self.assertFalse(p.check(self.root,'package')['passed'])

    def test_actual_art_change_stales_artwork_review(self):
        (self.root/'art.bin').write_bytes(b'changed artwork')
        self.assertTrue(p.check(self.root,'story')['passed'])
        self.assertFalse(p.check(self.root,'artwork')['passed'])

    def test_undeclared_render_changes_stale_composition(self):
        (self.root/'renders/id/strip.png').write_bytes(b'changed render')
        self.assertTrue(p.check(self.root,'artwork')['passed'])
        self.assertFalse(p.check(self.root,'composition')['passed'])

    def test_undeclared_package_changes_stale_release(self):
        (self.root/'packages/id/assets/strip.png').write_bytes(b'changed export')
        self.assertTrue(p.check(self.root,'composition')['passed'])
        self.assertFalse(p.check(self.root,'package')['passed'])

    def test_copy_change_stales_release_only(self):
        self.write('copy.json', {'description':'different story'})
        self.assertTrue(p.check(self.root,'composition')['passed'])
        self.assertFalse(p.check(self.root,'package')['passed'])

    def test_added_and_removed_outputs_stale_review(self):
        target=self.root/'renders/id/new.png'
        target.write_bytes(b'new output')
        self.assertFalse(p.check(self.root,'composition')['passed'])
        target.unlink()
        (self.root/'renders/id/strip.png').unlink()
        self.assertFalse(p.check(self.root,'composition')['passed'])

    def test_invalid_pointers_fail_without_crash(self):
        original=p.read(self.root/'episode.json')
        for field,stage in [('lastRender','composition'),('lastPackage','package')]:
            for value in [None, '', '../outside', '.', 'missing', 'art.bin', [], {}]:
                with self.subTest(field=field,value=value):
                    self.write('episode.json',dict(original,**{field:value}))
                    self.assertFalse(p.check(self.root,stage)['passed'])
                    self.assertTrue(p.check(self.root,'artwork')['passed'])

    def test_pointer_change_invalidates_even_identical_files(self):
        import shutil
        shutil.copytree(self.root/'renders/id',self.root/'renders/other')
        ep=p.read(self.root/'episode.json')
        ep['lastRender']='renders/other'
        self.write('episode.json',ep)
        self.assertFalse(p.check(self.root,'composition')['passed'])

    def test_invalid_stage_contract_rejected(self):
        original=dict(self.config['stages']['story'])
        for change in [dict(ownerRole='Publisher'),dict(ownerAgent=' '),dict(artifacts='episode.json'),dict(artifacts=[]),dict(artifacts=[None])]:
            self.config['stages']['story']=dict(original,**change)
            self.write('pipeline.json',self.config)
            self.assertFalse(p.check(self.root,'story')['passed'])

    def test_missing_or_malformed_inputs_fail_without_crash(self):
        (self.root/'pipeline.json').unlink()
        self.assertFalse(p.check(self.root,'package')['passed'])
        self.write('pipeline.json',self.config)
        self.write('reviews/story.json', [])
        self.assertFalse(p.check(self.root,'story')['passed'])
        self.write('pipeline.json', {'stages': None})
        self.assertFalse(p.check(self.root,'story')['passed'])

if __name__=='__main__': unittest.main()
