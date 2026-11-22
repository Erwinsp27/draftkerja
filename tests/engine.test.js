/* DraftKerja engine unit tests. Run: node --test tests/ */
const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../engine.js');

test('detectJobType: logo brief is design', () => {
  const r = E.detectJobType('Dibutuhkan desainer untuk membuat logo warung kopi, gaya minimalis.');
  assert.equal(r.type, 'design');
});

test('detectJobType: SEO article brief is writing', () => {
  const r = E.detectJobType('Dicari penulis artikel SEO tema keuangan, 5 artikel @1000 kata.');
  assert.equal(r.type, 'writing');
});

test('detectJobType: landing page brief is coding', () => {
  const r = E.detectJobType('Need a freelancer to build a simple landing page, responsive, WhatsApp button.');
  assert.equal(r.type, 'coding');
});

test('detectJobType: empty brief falls back to general', () => {
  assert.equal(E.detectJobType('').type, 'general');
  assert.equal(E.detectJobType('halo apa kabar').type, 'general');
});

test('detectJobType: video brief is video, not design', () => {
  const r = E.detectJobType('Edit video reel 30 detik dari footage, capcut, musik trending.');
  assert.equal(r.type, 'video');
});

test('extractDetails: rupiah budget and day deadline', () => {
  const d = E.extractDetails('Budget Rp500.000, selesai dalam 5 hari.');
  assert.match(d.budget, /Rp500\.000/);
  assert.match(d.deadline, /5 hari/);
});

test('extractDetails: dollar budget', () => {
  const d = E.extractDetails('Budget $80, deadline 7 days.');
  assert.equal(d.budget, '$80');
  assert.match(d.deadline, /7 days/);
});

test('extractDetails: ASAP deadline in Indonesian', () => {
  const d = E.extractDetails('Butuh segera, secepatnya ya.');
  assert.equal(d.deadline, 'segera');
});

test('extractDetails: platform detection', () => {
  const d = E.extractDetails('Brief dari Upwork, balas lewat chat.');
  assert.equal(d.platform, 'upwork');
});

test('extractDetails: deliverable count', () => {
  const d = E.extractDetails('Minta dibuatkan 5 artikel @1000 kata.');
  assert.match(d.deliverableCount, /5 artikel/);
});

test('extractDetails: no details returns nulls', () => {
  const d = E.extractDetails('Halo, saya butuh bantuan.');
  assert.equal(d.budget, null);
  assert.equal(d.deadline, null);
  assert.equal(d.platform, null);
});

test('buildDraft: Indonesian design draft contains plan, rate, timeline, name', () => {
  const draft = E.buildDraft({
    brief: 'Dibutuhkan desainer logo warung kopi. Budget Rp500.000, selesai 5 hari.',
    name: 'Erwin', rate: 'Rp500.000', timeline: '5 hari', portfolio: '',
    experience: '', tone: 'ramah', language: 'id'
  });
  assert.match(draft, /Erwin/);
  assert.match(draft, /Rp500\.000/);
  assert.match(draft, /5 hari/);
  assert.match(draft, /1\. /);
  assert.match(draft, /2\. /);
  assert.match(draft, /3\. /);
});

test('buildDraft: English draft uses English labels', () => {
  const draft = E.buildDraft({
    brief: 'Need a landing page. Budget $80.',
    name: 'Erwin', rate: '$80', timeline: '7 days', portfolio: 'https://example.com',
    experience: '', tone: 'formal', language: 'en'
  });
  assert.match(draft, /What I will deliver/);
  assert.match(draft, /Best regards/);
  assert.match(draft, /example\.com/);
});

test('buildDraft: invents no experience when none given', () => {
  const draft = E.buildDraft({
    brief: 'Butuh logo.', name: 'Erwin', rate: '', timeline: '',
    portfolio: '', experience: '', tone: 'ramah', language: 'id'
  });
  assert.doesNotMatch(draft, /tahun pengalaman|berpengalaman/i);
  assert.match(draft, /\[Nama Anda\]|Erwin/);
});

test('buildDraft: experience line appears only when user provides it', () => {
  const draft = E.buildDraft({
    brief: 'Butuh logo.', name: 'Erwin', rate: '', timeline: '',
    portfolio: '', experience: '3 tahun mendesain logo UMKM', tone: 'ramah', language: 'id'
  });
  assert.match(draft, /3 tahun mendesain logo UMKM/);
});

test('buildDraft: portfolio line omitted when empty', () => {
  const draft = E.buildDraft({
    brief: 'Butuh logo.', name: 'Erwin', rate: '', timeline: '',
    portfolio: '', experience: '', tone: 'ramah', language: 'id'
  });
  assert.doesNotMatch(draft, /Contoh hasil kerja/);
});

test('buildDraft: name placeholder when name empty', () => {
  const draft = E.buildDraft({
    brief: 'Butuh logo.', name: '', rate: '', timeline: '',
    portfolio: '', experience: '', tone: 'ramah', language: 'id'
  });
  assert.match(draft, /\[Nama Anda\]/);
});

test('completeness: full input scores 100', () => {
  const input = { brief: 'Dibutuhkan desainer logo yang cukup panjang briefnya agar lolos.', name: 'Erwin', rate: 'Rp500rb', timeline: '5 hari', portfolio: 'https://x.example' };
  const draft = E.buildDraft({ ...input, experience: '', tone: 'ramah', language: 'id' });
  const c = E.completeness(input, draft);
  assert.equal(c.score, 100);
  assert.deepEqual(c.missing, []);
});

test('completeness: empty input scores 0 and lists missing items', () => {
  const c = E.completeness({ brief: '', name: '', rate: '', timeline: '', portfolio: '' }, '');
  assert.equal(c.score, 0);
  assert.ok(c.missing.length >= 5);
});

test('completeness: partial input is between 0 and 100', () => {
  const input = { brief: 'Dibutuhkan desainer logo, brief cukup panjang untuk lolos batas.', name: 'Erwin', rate: '', timeline: '', portfolio: '' };
  const draft = E.buildDraft({ ...input, experience: '', tone: 'ramah', language: 'id' });
  const c = E.completeness(input, draft);
  assert.ok(c.score > 0 && c.score < 100);
});

test('SAMPLE_BRIEFS: three samples, each detectable', () => {
  assert.equal(E.SAMPLE_BRIEFS.length, 3);
  E.SAMPLE_BRIEFS.forEach((s) => {
    assert.ok(s.text.length > 40);
    assert.notEqual(E.detectJobType(s.text).type, 'general');
  });
});
