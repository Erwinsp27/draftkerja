/* DraftKerja app wiring. No keys are hardcoded. The BYOK polish call sends
 * only the draft text to the user-configured endpoint, only when the user
 * clicks the button, and only when a key has been entered. */
(function () {
  'use strict';
  var E = window.DraftKerjaEngine;
  var $ = function (id) { return document.getElementById(id); };

  var SETTINGS_KEY = 'draftkerja-settings-v1';
  var LIBRARY_KEY = 'draftkerja-library-v1';

  function readSettings() {
    try {
      return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    } catch (err) {
      return {};
    }
  }

  function writeSettings(s) {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch (err) { /* storage unavailable */ }
  }

  function readLibrary() {
    try {
      var v = JSON.parse(localStorage.getItem(LIBRARY_KEY) || '[]');
      return Array.isArray(v) ? v : [];
    } catch (err) {
      return [];
    }
  }

  function writeLibrary(items) {
    try { localStorage.setItem(LIBRARY_KEY, JSON.stringify(items)); } catch (err) { /* storage unavailable */ }
  }

  function collectInput() {
    return {
      brief: $('brief').value,
      name: $('name').value.trim(),
      rate: $('rate').value.trim(),
      timeline: $('timeline').value.trim(),
      portfolio: $('portfolio').value.trim(),
      experience: $('experience').value.trim(),
      tone: $('tone').value,
      language: $('language').value
    };
  }

  function renderAnalysis(input, detected, details) {
    $('analysis-empty').hidden = true;
    $('analysis').hidden = false;
    $('a-type').textContent = E.TYPE_LABEL[detected.type][$('language').value === 'en' ? 'en' : 'id'];
    $('a-budget').textContent = details.budget || '—';
    $('a-deadline').textContent = details.deadline || '—';
    $('a-platform').textContent = details.platform || '—';
    $('a-count').textContent = details.deliverableCount || '—';
  }

  function renderCompleteness(input, draftText) {
    var result = E.completeness(input, draftText);
    $('score').textContent = String(result.score);
    var list = $('checklist');
    list.innerHTML = '';
    result.checks.forEach(function (c) {
      var li = document.createElement('li');
      li.textContent = c.label;
      if (c.ok) li.className = 'done';
      list.appendChild(li);
    });
    return result;
  }

  function generate() {
    var input = collectInput();
    if (!input.brief.trim()) {
      $('status').textContent = 'Tempel brief dulu, Win — draf butuh bahan.';
      return;
    }
    var detected = E.detectJobType(input.brief);
    var details = E.extractDetails(input.brief);
    input.detected = detected;
    input.details = details;
    var draft = E.buildDraft(input);
    $('draft').value = draft;
    renderAnalysis(input, detected, details);
    renderCompleteness(input, draft);
    $('status').textContent = 'Draf jadi. Silakan edit, salin, atau simpan.';
  }

  function renderLibrary() {
    var items = readLibrary();
    var list = $('library');
    list.innerHTML = '';
    $('library-empty').hidden = items.length > 0;
    items.forEach(function (item, i) {
      var li = document.createElement('li');
      var title = document.createElement('strong');
      title.textContent = item.title || 'Draf tanpa judul';
      var meta = document.createElement('span');
      meta.textContent = (item.when || '') + ' · ' + (item.text || '').slice(0, 80).replace(/\n/g, ' ') + '…';
      var load = document.createElement('button');
      load.type = 'button';
      load.textContent = 'Muat';
      load.addEventListener('click', function () {
        $('draft').value = item.text;
        renderCompleteness(collectInput(), item.text);
      });
      var del = document.createElement('button');
      del.type = 'button';
      del.textContent = 'Hapus';
      del.addEventListener('click', function () {
        var next = readLibrary();
        next.splice(i, 1);
        writeLibrary(next);
        renderLibrary();
      });
      li.appendChild(title);
      li.appendChild(meta);
      li.appendChild(document.createElement('br'));
      li.appendChild(load);
      li.appendChild(del);
      list.appendChild(li);
    });
  }

  function copyDraft() {
    var text = $('draft').value;
    if (!text.trim()) {
      $('status').textContent = 'Belum ada draf untuk disalin.';
      return;
    }
    function done() { $('status').textContent = 'Draf tersalin. Tempel di chat klien Anda.'; }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () {
        $('draft').select();
        document.execCommand('copy');
        done();
      });
    } else {
      $('draft').select();
      document.execCommand('copy');
      done();
    }
  }

  function saveDraft() {
    var text = $('draft').value;
    if (!text.trim()) {
      $('status').textContent = 'Belum ada draf untuk disimpan.';
      return;
    }
    var items = readLibrary();
    items.unshift({
      title: ($('name').value.trim() || 'Draf') + ' — ' + (new Date()).toLocaleString('id-ID'),
      when: new Date().toISOString().slice(0, 10),
      text: text
    });
    writeLibrary(items.slice(0, 20));
    renderLibrary();
    $('status').textContent = 'Draf tersimpan di perangkat ini.';
  }

  function loadSettingsIntoForm() {
    var s = readSettings();
    if (s.endpoint) $('endpoint').value = s.endpoint;
    if (s.model) $('model').value = s.model;
    if (s.apiKey) $('apikey').value = s.apiKey;
  }

  function polishWithAI() {
    var draft = $('draft').value;
    if (!draft.trim()) {
      $('status').textContent = 'Buat draf dulu sebelum dipoles.';
      return;
    }
    var s = readSettings();
    var key = ($('apikey').value || '').trim();
    var endpoint = ($('endpoint').value || '').trim();
    var model = ($('model').value || '').trim();
    if (!key) {
      $('status').textContent = 'Isi kunci API Anda di Pengaturan dulu. Tanpa kunci, tidak ada panggilan AI.';
      return;
    }
    if (!endpoint || !/^https:\/\//.test(endpoint)) {
      $('status').textContent = 'Endpoint harus diawali https://';
      return;
    }
    $('status').textContent = 'Memoles draf dengan AI...';
    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, 60000);
    var lang = $('language').value === 'en' ? 'English' : 'Bahasa Indonesia';
    fetch(endpoint, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: 'You polish freelance job proposals. Keep the same language (' + lang + '), keep all facts, prices, and links exactly as written, do not invent experience or credentials. Return only the polished proposal, no commentary.' },
          { role: 'user', content: draft }
        ],
        max_tokens: 1200
      })
    })
      .then(function (resp) {
        clearTimeout(timer);
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        return resp.json();
      })
      .then(function (json) {
        var out = json && json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content;
        if (!out) throw new Error('empty');
        $('draft').value = out.trim();
        renderCompleteness(collectInput(), out.trim());
        $('status').textContent = 'Draf selesai dipoles AI. Periksa sebelum dikirim.';
      })
      .catch(function (err) {
        clearTimeout(timer);
        $('status').textContent = 'Poles AI gagal (' + (err && err.name === 'AbortError' ? 'waktu habis' : 'periksa kunci/endpoint') + '). Draf template Anda tetap utuh.';
      });
  }

  document.querySelectorAll('[data-sample]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var found = E.SAMPLE_BRIEFS.filter(function (s) { return s.id === btn.getAttribute('data-sample'); })[0];
      if (found) $('brief').value = found.text;
    });
  });

  $('generate').addEventListener('click', generate);
  $('copy').addEventListener('click', copyDraft);
  $('save').addEventListener('click', saveDraft);
  $('polish').addEventListener('click', polishWithAI);
  $('draft').addEventListener('input', function () {
    renderCompleteness(collectInput(), $('draft').value);
  });
  $('save-settings').addEventListener('click', function () {
    writeSettings({ endpoint: $('endpoint').value.trim(), model: $('model').value.trim(), apiKey: $('apikey').value.trim() });
    $('settings-status').textContent = 'Pengaturan tersimpan di perangkat ini.';
  });
  $('clear-key').addEventListener('click', function () {
    var s = readSettings();
    delete s.apiKey;
    writeSettings(s);
    $('apikey').value = '';
    $('settings-status').textContent = 'Kunci dihapus dari perangkat ini.';
  });

  /* Demo caption mode: ?demo=1 shows a caption bar; the recording script
   * drives it through window.__setCaption. Not part of normal use. */
  window.__setCaption = function (text) {
    var bar = $('caption-bar');
    if (new URLSearchParams(location.search).get('demo') === '1') {
      bar.hidden = !text;
      bar.textContent = text || '';
    }
  };

  loadSettingsIntoForm();
  renderLibrary();
})();
