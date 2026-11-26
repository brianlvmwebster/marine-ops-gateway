import {test} from 'node:test';
import assert from 'node:assert/strict';
import {workspaceThemes,workspaceThemeGroups,workspaceLayouts,resolveWorkspaceLayout,resolveWorkspaceTheme} from '../helpers/workspaceAppearance.ts';
function luminance(hex){const c=hex.slice(1).match(/../g).map(s=>parseInt(s,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722;}
function contrast(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
test('every workspace palette keeps normal text, secondary text and actions readable',()=>{
 for(const theme of workspaceThemes){
  for(const surface of ['background','card','surface'])for(const ink of ['foreground','muted','primary'])assert.ok(contrast(theme[ink],theme[surface])>=4.5,`${theme.id}: ${ink} on ${surface}`);
  assert.ok(contrast(theme.primaryText,theme.primary)>=4.5,theme.id+' button label');
 }
});
test('navigation layout choices are independent of color and default to Sidebar',()=>{
 assert.equal(resolveWorkspaceLayout(null).id,'sidebar');
 assert.equal(resolveWorkspaceLayout('unknown').id,'sidebar');
 assert.deepEqual(workspaceLayouts.map(layout=>layout.id),['sidebar','top']);
 assert.equal(resolveWorkspaceLayout('top').id,'top');
 assert.equal(resolveWorkspaceTheme('top').id,'paper');
});
test('saved themes are validated and obsolete values fall back to Paper',()=>{
 assert.equal(resolveWorkspaceTheme(null).id,'paper');assert.equal(resolveWorkspaceTheme('obsolete').id,'paper');
 for(const theme of workspaceThemes)assert.equal(resolveWorkspaceTheme(theme.id),theme);
 assert.equal(new Set(workspaceThemes.map(t=>t.id)).size,9);
 assert.deepEqual(workspaceThemeGroups.flatMap(group=>group.themes),[...workspaceThemes]);
 assert.deepEqual(workspaceThemeGroups[2].themes.map(theme=>theme.id),['corporate','nord','night']);
});
