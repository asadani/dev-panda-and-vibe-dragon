#!/usr/bin/env node
// Reproducible layout proof. Uses existing artwork; does not call an image model.
import fs from 'node:fs';
import path from 'node:path';
import {ROOT, EPISODES_ROOT, initEpisode, writeJson, renderEpisode, packageEpisode, publishDryRun} from './studio.mjs';

const slug='layout-proof';
const dir=path.join(EPISODES_ROOT,`${new Date().toISOString().slice(0,10)}-${slug}`);
if(fs.existsSync(dir)) {
  const current=JSON.parse(fs.readFileSync(path.join(dir,'episode.json'),'utf8'));
  if(current.demoMode!=='historical-art-layout-proof')throw new Error('Existing episode is not a demo; refusing to change it');
} else {
  initEpisode(slug,'Layout proof · historical artwork');
  fs.copyFileSync(path.join(ROOT,'assets','logo.png'),path.join(dir,'art','historical-logo.png'));
  const ep=JSON.parse(fs.readFileSync(path.join(dir,'episode.json'),'utf8'));
  Object.assign(ep,{demoMode:'historical-art-layout-proof',selectedAngle:'template-proof',angle:{id:'template-proof',description:'Renderer verification, not a selected production story'},layout:'vertical',panels:[
    {id:'panel-1',scene:'Original historical logo reused to demonstrate editable lettering; no new illustration was generated.',alt:'Layout proof: the existing logo shows Panda and Dragon smiling together. Added dialogue is illustrative.',art:'art/historical-logo.png',dialogue:[{speaker:'Panda',text:'Can we change the dialogue without redrawing us?',anchorX:0.25}]},
    {id:'panel-2',scene:'Same historical logo intentionally reused for a template proof, not a production comic.',alt:'The same historical logo is repeated. This is a renderer demonstration, with Dragon explaining separate lettering.',art:'art/historical-logo.png',dialogue:[{speaker:'Dragon',text:'Yes. The lettering is a separate layer.',anchorX:0.75}]}
  ]});
  writeJson(path.join(dir,'episode.json'),ep);
  writeJson(path.join(dir,'angles.json'),{angles:[ep.angle]});
  const substack=`This is a layout proof for Dev Panda & Vibe Dragon, using our existing logo twice. It is not a newly illustrated episode, and its repeated artwork does not replace the character references selected for a production episode. The repeated artwork is deliberate: it lets us inspect lettering, panel spacing, export formats, and revision behaviour without confusing those checks with the quality of a new story.

The production workflow separates the episode from its presentation. An editable script stores the dialogue, speaker, scene description, and image reference for each panel. A local renderer places the speech balloons and applies the same series header and footer. Changing a line should update the lettering without sending the artwork through image generation again.

Codex coordinates the creative work. A Researcher reads source material, a Writer develops different story angles, and a Reviewer checks the script and rendered images. The Producer owns the episode files and integrates their results. Those roles are part of the Codex workflow; the command-line utilities do not secretly run an agent service or contact an image API.

The package includes a complete strip, individual panels, an editable layout, and a reading-order transcript. It also prepares padded portrait JPEGs for Instagram, a LinkedIn caption, and a Substack draft. Publishing preparation is currently a dry run. It returns a description of the package and outstanding account requirements, not a claim that a post was published.

Every production episode resolves its approved character references in the brief and passes independent story, artwork, and composition reviews. The historical logo in this demo exists only to exercise the local renderer. For now, this proof answers a narrower question: can we keep the exact words and reusable branding separate from the illustrations?`;
  const linkedin=`I’m building a comic production workflow around Dev Panda & Vibe Dragon.

This image is a layout proof. It reuses the existing logo to test the part that should be predictable: exact dialogue, readable balloons, consistent branding, and editable exports. It is not a newly illustrated episode.

The useful boundary is between the story and its presentation. Codex coordinates research, three story angles, a panel script, and independent review. The image tool creates the illustrations. A local renderer adds the words and layout from the saved script.

That means a typo should not require another image-generation call. A failed panel should not mean rebuilding the entire episode. And a prepared publishing package should never be reported as a live post.

The prototype exports the strip, individual panels, Instagram-sized JPEGs, a transcript, and platform copy. Publishing is currently dry-run only; connected accounts and live adapters come later.

I’m also keeping a small, inspectable memory of character rules, previous stories, and explicit feedback. A rejected angle stays a rejected angle, rather than becoming an invented permanent preference.

Production episodes use their approved references and independent reviews to test the complete story.`;
  writeJson(path.join(dir,'copy.json'),{titles:['Words without redrawing','A comic production layout proof','Separating dialogue from artwork'],description:'A clearly labelled prototype using historical artwork to test editable comic composition.',substack,linkedin,linkedinHooks:['A typo should not require redrawing a comic.','The predictable part of comic production belongs in code.'],instagram:'Layout proof, using our existing logo. Testing separate lettering, consistent branding, and readable panels with historical artwork. This is a prototype export, not a newly illustrated episode.'});
}
const rendered=renderEpisode(dir);
const packaged=packageEpisode(dir);
for(const platform of ['linkedin','instagram','substack'])publishDryRun(dir,platform);
console.log(JSON.stringify({mode:'historical-art-layout-proof',episode:dir,rendered,packaged,published:false},null,2));
