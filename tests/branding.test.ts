import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseBranding, motBranding} from '../lib/branding.ts';
import {existsSync} from 'node:fs';

const settings = {name: 'MOT', logoUrl: 'https://assets.example.com/logo.svg',
  faviconUrl: 'https://assets.example.com/icon.png', appleTouchIconUrl: 'https://assets.example.com/apple.png'};

test('accepts the future Administration branding contract', () => {
  assert.deepEqual(parseBranding(settings), settings);
});
test('rejects partial settings, relative URLs and unsafe image schemes', () => {
  for (const value of [null, {}, {...settings, name: ''}, {...settings, logoUrl: '/private/logo'},
    {...settings, logoUrl: 'javascript:alert(1)'}, {...settings, faviconUrl: 'http://example.com/icon'},
    {...settings, logoUrl: 'https://user:password@example.com/logo'}]) {
    assert.equal(parseBranding(value), null);
  }
});
test('every bundled MOT fallback asset exists', () => {
  for (const url of [motBranding.logoUrl, motBranding.faviconUrl, motBranding.appleTouchIconUrl]) {
    assert.ok(existsSync(new URL('../public' + url.split('?')[0], import.meta.url)));
  }
});
