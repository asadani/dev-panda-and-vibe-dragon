import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { Resvg } from '@resvg/resvg-js';
import { initEpisode, selectAngle, writeJson, validate, transcript, renderEpisode,
  packageEpisode, publishDryRun, inside, main } from '../scripts/studio.mjs';

const json = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const testImage = new Resvg('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="48"><rect width="64" height="48" fill="#eeeeee"/><circle cx="32" cy="24" r="10" fill="#888888"/></svg>').render().asPng();

function fixture(t, count = 1, layout = 'auto', dialogue = 'Did it pass?') {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'comic-studio-test-'));
  t.after(() => {
    const resolved = path.resolve(temporary);
    assert.equal(path.dirname(resolved), path.resolve(os.tmpdir()));
    assert.match(path.basename(resolved), /^comic-studio-test-/);
    fs.rmSync(resolved, { recursive: true, force: true });
  });
  const dir = initEpisode('fixture', 'A tiny fixture', temporary);
  writeJson(path.join(dir, 'angles.json'), { angles: [{ id: 'a', title: 'One' }, { id: 'b', title: 'Two' }] });
  selectAngle(dir, 'a');
  const episodeFile = path.join(dir, 'episode.json');
  const ep = json(episodeFile);
  ep.layout = layout;
  ep.panels = Array.from({ length: count }, (_, i) => ({
    id: `panel-${i + 1}`, scene: 'Synthetic test image, not production art.',
    alt: `Test panel ${i + 1}.`, art: `art/panel-${i + 1}.png`,
    dialogue: [{ speaker: 'Panda', text: dialogue, anchorX: 0.25 },
      { speaker: 'Dragon', text: 'Check the output.', anchorX: 0.75 }],
  }));
  for (const p of ep.panels) fs.writeFileSync(path.join(dir, p.art), testImage);
  writeJson(episodeFile, ep);
  const copy = {
    titles: ['One', 'Two', 'Three'], description: 'A fixture description.',
    substack: Array.from({ length: 260 }, () => 'context').join(' '),
    linkedin: 'A measured engineering observation. '.repeat(34),
    linkedinHooks: ['First hook', 'Second hook'], instagram: 'A short comic caption.',
  };
  writeJson(path.join(dir, 'copy.json'), copy);
  return { dir, ep, episodeFile, temporary, copy };
}

test('renders every supported panel count with readable lettering and complete outputs', async t => {
  for (let count = 1; count <= 6; count++) {
    await t.test(`${count} panels`, t => {
      const { dir, ep } = fixture(t, count);
      const rendered = renderEpisode(dir);
      const meta = json(path.join(rendered, 'render.json'));
      assert.equal(meta.columns, [4, 6].includes(count) ? 2 : 1);
      assert.equal(meta.width, 1600);
      assert.ok(meta.previewFontPx >= 16);
      assert.equal(fs.readFileSync(path.join(rendered, 'transcript.md'), 'utf8'), transcript(ep));
      const png = fs.readFileSync(path.join(rendered, 'strip.png'));
      assert.deepEqual(png.subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
      assert.equal(png.readUInt32BE(16), meta.width);
      assert.equal(png.readUInt32BE(20), meta.height);
      for (let index = 1; index <= count; index++) {
        assert.ok(fs.statSync(path.join(rendered, `panel-${index}.png`)).size > 100);
        assert.ok(fs.statSync(path.join(rendered, `panel-${index}.svg`)).size > 100);
      }
    });
  }
});

test('production hold blocks rendering packaging and publishing', t => {
  const {dir}=fixture(t);
  writeJson(path.join(dir,'production-hold.json'),{reason:'User requested pipeline repair'});
  assert.throws(()=>renderEpisode(dir),/Production paused/);
  assert.throws(()=>packageEpisode(dir),/Production paused/);
  assert.throws(()=>publishDryRun(dir,'instagram'),/Production paused/);
});

test('production contract without reviews blocks render', t => {
  const {dir}=fixture(t);
  writeJson(path.join(dir,'pipeline.json'),{stages:{}});
  assert.throws(()=>renderEpisode(dir),/Production checkpoint failed/);
});

test('rejects zero and seven panels before rendering', t => {
  for (const count of [0, 7]) {
    const { ep, dir } = fixture(t, count);
    assert.ok(validate(ep, dir).some(error => error.includes('1–6')));
    assert.throws(() => renderEpisode(dir), /1–6/);
  }
});

test('an explicit grid is limited to four or six panels', t => {
  for (const count of [1, 2, 3, 5]) {
    const { dir } = fixture(t, count, 'grid');
    assert.throws(() => renderEpisode(dir), /grid.*(four|4|six|6)|(four|4|six|6).*grid/i);
  }
});

test('auto layout falls back to full width rather than shrinking dialogue', t => {
  const long = 'I counted the tests and checked the logs before changing the expected results for this experiment.';
  const { dir } = fixture(t, 4, 'auto', long);
  const rendered = renderEpisode(dir);
  const meta = json(path.join(rendered, 'render.json'));
  assert.equal(meta.columns, 1);
  assert.ok(meta.previewFontPx >= 16);
});

test('rejects unbreakable dialogue rather than overflowing', t => {
  const { dir } = fixture(t, 1, 'vertical', 'X'.repeat(150));
  assert.throws(() => renderEpisode(dir), /Unbreakable word/);
});

test('rejects malformed artwork rather than silently producing an empty panel', t => {
  const { dir } = fixture(t);
  fs.writeFileSync(path.join(dir, 'art/panel-1.png'), 'not an image');
  assert.throws(() => renderEpisode(dir), /image|artwork|PNG|decode|invalid|signature/i);
});

test('transcript preserves exact speaker text including punctuation and newlines', t => {
  const { ep } = fixture(t);
  ep.title = 'A & B';
  ep.panels[0].dialogue[0].text = 'Wait—“pass”?\nA < B & C > D.';
  assert.equal(transcript(ep), '# A & B\n\n## Panel 1\n\nTest panel 1.\n\nPanda: Wait—“pass”?\nA < B & C > D.\n\nDragon: Check the output.\n');
});

test('selecting the same angle is idempotent; replacing it preserves a revision and invalidates downstream state', t => {
  const { dir, episodeFile } = fixture(t);
  const before = fs.readFileSync(episodeFile, 'utf8');
  selectAngle(dir, 'a');
  assert.equal(fs.readFileSync(episodeFile, 'utf8'), before);
  assert.equal(fs.existsSync(path.join(dir, 'revisions')), false);
  const ep = json(episodeFile);
  ep.lastRender = 'renders/old'; ep.lastPackage = 'packages/old';
  writeJson(episodeFile, ep);
  selectAngle(dir, 'b');
  const changed = json(episodeFile);
  assert.equal(changed.selectedAngle, 'b');
  assert.deepEqual(changed.panels, []);
  assert.equal(changed.lastRender, undefined);
  assert.equal(changed.lastPackage, undefined);
  assert.equal(fs.readdirSync(path.join(dir, 'revisions')).length, 1);
  assert.ok(fs.existsSync(path.join(dir, 'art/panel-1.png')));
});

test('packaging rejects a script changed after render', t => {
  const { dir, episodeFile } = fixture(t);
  renderEpisode(dir);
  const ep = json(episodeFile);
  ep.panels[0].dialogue[0].text = 'Different dialogue.';
  writeJson(episodeFile, ep);
  assert.throws(() => packageEpisode(dir), /changed since render/);
});

test('dry runs never claim publication and reject stale copy, changed art, and package tampering', t => {
  const { dir, ep, copy } = fixture(t);
  renderEpisode(dir);
  const packaged = packageEpisode(dir);
  const instagramImage = path.join(packaged, 'instagram/panel-1.jpg');
  const altText = fs.readFileSync(path.join(packaged, 'alt-text.md'), 'utf8');
  assert.ok(altText.includes(ep.panels[0].alt));
  for (const line of ep.panels[0].dialogue) assert.ok(altText.includes(`${line.speaker}: ${line.text}`), 'Comic alt text must include dialogue');
  const inspected = spawnSync('python', ['-c', 'import json,sys; from PIL import Image; im=Image.open(sys.argv[1]); im.load(); print(json.dumps({"format":im.format,"size":list(im.size),"mode":im.mode}))', instagramImage], { encoding: 'utf8' });
  assert.equal(inspected.status, 0, inspected.stderr);
  assert.deepEqual(JSON.parse(inspected.stdout), { format: 'JPEG', size: [1080, 1350], mode: 'RGB' });
  for (const platform of ['linkedin', 'instagram', 'substack']) {
    const report = publishDryRun(dir, platform);
    assert.equal(report.mode, 'dry-run');
    assert.equal(report.published, false);
    assert.equal(report.account, null);
    assert.ok(report.blockers.length >= 2);
    if (platform === 'instagram') assert.deepEqual(report.assets, ['instagram/panel-1.jpg']);
  }
  assert.throws(() => main(['publish', dir, '--platform', 'linkedin']), /Live publishing is not implemented/);
  writeJson(path.join(dir, 'copy.json'), { ...copy, instagram: 'Changed caption' });
  assert.throws(() => publishDryRun(dir, 'linkedin'), /Copy changed/);
  writeJson(path.join(dir, 'copy.json'), copy);
  fs.appendFileSync(path.join(dir, ep.panels[0].art), 'modified');
  assert.throws(() => publishDryRun(dir, 'linkedin'), /changed since packaging/);
  fs.writeFileSync(path.join(dir, ep.panels[0].art), testImage);
  fs.appendFileSync(path.join(packaged, 'linkedin.md'), 'tampered');
  assert.throws(() => publishDryRun(dir, 'linkedin'), /Package changed/);
});

test('render cache repairs or rejects incomplete cached outputs', t => {
  const { dir } = fixture(t);
  const rendered = renderEpisode(dir);
  fs.unlinkSync(path.join(rendered, 'panel-1.png'));
  let failure, repaired;
  try { repaired = renderEpisode(dir); } catch (error) { failure = error; }
  if (failure) assert.match(failure.message, /incomplete|missing|cache|corrupt/i);
  else {
    assert.ok(fs.existsSync(path.join(repaired, 'panel-1.png')), 'An incomplete render must not be reported as complete');
    if (repaired !== rendered) assert.equal(fs.existsSync(path.join(rendered, 'panel-1.png')), false, 'Preserve the original immutable revision');
  }
});

test('package cache repairs or rejects incomplete cached outputs', t => {
  const { dir } = fixture(t);
  renderEpisode(dir);
  const packaged = packageEpisode(dir);
  fs.unlinkSync(path.join(packaged, 'manifest.json'));
  let failure, repaired;
  try { repaired = packageEpisode(dir); } catch (error) { failure = error; }
  if (failure) assert.match(failure.message, /incomplete|missing|cache|corrupt|ENOENT/i);
  else {
    assert.ok(fs.existsSync(path.join(repaired, 'manifest.json')), 'An incomplete package must not be reported as complete');
    if (repaired !== packaged) assert.equal(fs.existsSync(path.join(packaged, 'manifest.json')), false, 'Preserve the original immutable revision');
  }
});

test('asset paths reject parent traversal, absolute paths, and escaping links', t => {
  const { dir, temporary } = fixture(t);
  assert.throws(() => inside(dir, '../outside.png'), /escapes/);
  assert.throws(() => inside(dir, path.join(temporary, 'absolute.png')), /relative/);
  assert.equal(inside(dir, 'art/panel-1.png'), path.join(dir, 'art/panel-1.png'));
  const outside = path.join(temporary, 'outside'); fs.mkdirSync(outside);
  const linked = path.join(dir, 'linked');
  try { fs.symlinkSync(outside, linked, process.platform === 'win32' ? 'junction' : 'dir'); }
  catch (error) { if (['EPERM', 'EACCES', 'ENOSYS'].includes(error.code)) return t.diagnostic('Link checks unavailable on this host'); throw error; }
  fs.writeFileSync(path.join(outside, 'present.png'), testImage);
  assert.throws(() => inside(dir, 'linked/present.png'), /escapes/);
  assert.throws(() => inside(dir, 'linked/missing.png'), /escapes/);
});

test('integrated grid preserves editable balloons and exact footer with phone preview', t => {
  const {dir,ep,episodeFile}=fixture(t,4,'grid');
  ep.template='integrated-grid-v1';
  const square=new Resvg('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="#eee"/><circle cx="50" cy="75" r="15" fill="#888"/></svg>').render().asPng();
  for(const p of ep.panels) {fs.writeFileSync(path.join(dir,p.art),square); p.dialogue=[{speaker:'Panda',text:'Did it pass?',anchorX:0.5,anchorY:0.55,bubble:{x:0.06,y:0.04,w:0.88,h:0.35}}];}
  writeJson(episodeFile,ep);
  const out=renderEpisode(dir), svg=fs.readFileSync(path.join(out,'strip.svg'),'utf8'), meta=json(path.join(out,'render.json'));
  assert.equal(meta.width,2048);assert.equal(meta.height,2048);assert.equal(meta.columns,2);assert.ok(meta.previewFontPx>=16);
  assert.match(svg,/Dev Panda &amp; Vibe Dragon \| in the AI era/);assert.match(svg,/© 2026 Anuj Sadani/);
  assert.ok(!svg.includes('substack.com')); assert.equal((svg.match(/Did it pass\?/g)||[]).length,4);
  const png=fs.readFileSync(path.join(out,'strip-preview-390.png'));assert.equal(png.readUInt32BE(16),390);assert.equal(png.readUInt32BE(20),390);
  ep.panels[0].dialogue[0].bubble.h=0.10;writeJson(episodeFile,ep);assert.throws(()=>renderEpisode(dir),/overflow/);
});

test('integrated template rejects unsupported format, footer, word count and bubble geometry',t=>{
  const {dir,ep}=fixture(t,4,'grid');ep.template='integrated-grid-v1';
  for(const p of ep.panels)p.dialogue=[{speaker:'Panda',text:'Fine.',anchorX:0.5,anchorY:0.55,bubble:{x:0.06,y:0.04,w:0.88,h:0.35}}];
  assert.deepEqual(validate(ep,dir),[]);
  ep.footerLeft='wrong';assert.match(validate(ep,dir).join(' '),/footerLeft/);delete ep.footerLeft;
  ep.panels[0].dialogue[0].text='word '.repeat(13);assert.match(validate(ep,dir).join(' '),/12 words/);
  ep.panels[0].dialogue[0].bubble.y=0.5;assert.match(validate(ep,dir).join(' '),/safe area/);
  ep.panels.pop();assert.match(validate(ep,dir).join(' '),/exactly 4/);
});
