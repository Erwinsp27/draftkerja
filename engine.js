/* DraftKerja engine — pure functions, no DOM, no network.
 * Works in the browser (window.DraftKerjaEngine) and in Node (module.exports).
 * The analysis is deterministic local keyword/regex matching, NOT AI.
 * The draft is assembled from templates — no credentials or experience are
 * invented. Optional LLM polishing happens only in app.js, with the user's
 * own key, against an endpoint the user configures. */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.DraftKerjaEngine = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var KEYWORDS = {
    design: ['logo', 'desain', 'design', 'banner', 'poster', 'figma', 'ilustrasi', 'illustration', 'brand', 'branding', 'mockup', 'photoshop', 'canva', 'ui', 'ux', 'thumbnail', 'feed', 'kemasan', 'packaging'],
    writing: ['artikel', 'article', 'tulis', 'menulis', 'writing', 'copywriting', 'blog', 'konten', 'content', 'caption', 'seo', 'naskah', 'artikel', 'proofread', 'editing naskah'],
    coding: ['website', 'web', 'landing page', 'aplikasi', 'application', 'app', 'api', 'bug', 'frontend', 'front-end', 'backend', 'back-end', 'react', 'python', 'javascript', 'database', 'wordpress', 'bot', 'script', 'dashboard'],
    data: ['data entry', 'entri data', 'excel', 'spreadsheet', 'scraping', 'input data', 'csv', 'olah data', 'google sheet', 'typing', 'ketik'],
    video: ['video', 'editing', 'edit video', 'reel', 'animasi', 'animation', 'capcut', 'premiere', 'motion', 'shorts', 'podcast'],
    marketing: ['marketing', 'iklan', 'ads', 'sosial media', 'social media', 'promosi', 'campaign', 'kampanye', 'tiktok shop', 'marketplace', 'shopee', 'meta ads', 'digital marketing'],
    translation: ['terjemah', 'translate', 'translation', 'penerjemah', 'subtitle', 'subtitel', 'bahasa inggris', 'bahasa indonesia']
  };

  var TYPE_LABEL = {
    design: { id: 'Desain', en: 'Design' },
    writing: { id: 'Penulisan', en: 'Writing' },
    coding: { id: 'Coding / Web', en: 'Coding / Web' },
    data: { id: 'Entri Data', en: 'Data Entry' },
    video: { id: 'Video', en: 'Video' },
    marketing: { id: 'Marketing', en: 'Marketing' },
    translation: { id: 'Terjemahan', en: 'Translation' },
    general: { id: 'Umum', en: 'General' }
  };

  var PLANS = {
    design: {
      id: ['Mempelajari referensi dan identitas merek Anda sebelum mulai mendesain.', 'Menyajikan 2 arah konsep awal, lalu revisi sampai sesuai selera Anda.', 'Menyerahkan file akhir siap pakai (PNG/JPG + file master yang bisa diedit).'],
      en: ['Study your references and brand identity before designing.', 'Present 2 initial concept directions, then revise until it matches your taste.', 'Deliver final files ready to use (PNG/JPG + editable master file).']
    },
    writing: {
      id: ['Riset topik dan kata kunci agar tulisan akurat dan mudah ditemukan.', 'Menulis draf dengan struktur jelas: pembuka, isi, dan penutup yang kuat.', 'Revisi 1x gratis untuk penyesuaian gaya dan fakta.'],
      en: ['Research the topic and keywords so the piece is accurate and discoverable.', 'Write a draft with a clear structure: strong opening, body, and closing.', 'One free revision round for style and fact adjustments.']
    },
    coding: {
      id: ['Memetakan kebutuhan dan halaman/fitur yang harus dibangun.', 'Membangun dengan kode rapi dan responsif di semua ukuran layar.', 'Uji coba menyeluruh sebelum serah terima, plus panduan singkat.'],
      en: ['Map the requirements and the pages/features to build.', 'Build with clean code, responsive on all screen sizes.', 'Full testing before handover, plus a short guide.']
    },
    data: {
      id: ['Merapikan dan memeriksa ulang setiap baris data sebelum diserahkan.', 'Bekerja dalam file terstruktur (Excel/Sheets) sesuai format yang Anda minta.', 'Laporan singkat berisi jumlah data dan hal yang perlu diperhatikan.'],
      en: ['Tidy and double-check every row of data before delivery.', 'Work in structured files (Excel/Sheets) in the format you request.', 'A short report with the data count and anything worth noting.']
    },
    video: {
      id: ['Menyusun alur video dari materi yang Anda kirim.', 'Editing dengan transisi, teks, dan musik yang sesuai tema.', 'Revisi 1x untuk potongan, teks, dan musik.'],
      en: ['Build the video flow from the material you send.', 'Edit with transitions, text, and music matching the theme.', 'One revision round for cuts, text, and music.']
    },
    marketing: {
      id: ['Analisis target audiens dan akun/media yang akan dipakai.', 'Menyusun rencana konten/iklan dengan jadwal yang jelas.', 'Laporan hasil sederhana: jangkauan, klik, dan rekomendasi lanjut.'],
      en: ['Analyse the target audience and the accounts/channels to use.', 'Draft a content/ads plan with a clear schedule.', 'A simple results report: reach, clicks, and next recommendations.']
    },
    translation: {
      id: ['Menerjemahkan dengan menjaga makna dan gaya bahasa aslinya.', 'Pemeriksaan ulang istilah dan konsistensi antar bagian.', 'File akhir dalam format yang sama seperti file sumber.'],
      en: ['Translate while preserving the meaning and tone of the original.', 'Double-check terminology and consistency across sections.', 'Final file in the same format as the source file.']
    },
    general: {
      id: ['Memahami kebutuhan Anda lewat diskusi singkat sebelum mulai.', 'Mengerjakan sesuai kesepakatan, dengan kabar perkembangan berkala.', 'Serah terima rapi beserta catatan singkat hasil pekerjaan.'],
      en: ['Understand your needs through a short discussion before starting.', 'Work as agreed, with regular progress updates.', 'Tidy handover with a short note on the result.']
    }
  };

  function normalize(text) {
    return (text || '').toLowerCase();
  }

  function detectJobType(text) {
    var lower = normalize(text);
    var best = 'general';
    var bestScore = 0;
    var scores = {};
    Object.keys(KEYWORDS).forEach(function (type) {
      var score = 0;
      KEYWORDS[type].forEach(function (kw) {
        if (lower.indexOf(kw) !== -1) score += 1;
      });
      scores[type] = score;
      if (score > bestScore) {
        bestScore = score;
        best = type;
      }
    });
    return { type: best, scores: scores };
  }

  function extractDetails(text) {
    var raw = text || '';
    var lower = normalize(raw);
    var details = { budget: null, deadline: null, platform: null, deliverableCount: null };

    var rp = raw.match(/rp\.?\s?[\d][\d.,]*/i);
    var usd = raw.match(/\$\s?[\d][\d,]*/);
    var juta = raw.match(/(\d+(?:[.,]\d+)?)\s*(juta|jt)\b/i);
    var ribu = raw.match(/(\d+(?:[.,]\d+)?)\s*(ribu|rb|k)\b/i);
    function cleanAmount(m) { return m[0].replace(/\s+/g, ' ').trim().replace(/[,.]+$/, ''); }
    if (rp) details.budget = cleanAmount(rp);
    else if (usd) details.budget = cleanAmount(usd);
    else if (juta) details.budget = cleanAmount(juta);
    else if (ribu) details.budget = cleanAmount(ribu);

    var dur = raw.match(/(\d+)\s*(hari|minggu|bulan|days?|weeks?)\b/i);
    var date = raw.match(/\b(\d{1,2})[\/\-](\d{1,2})([\/\-](\d{2,4}))?\b/);
    if (dur) details.deadline = dur[0].trim();
    else if (date) details.deadline = date[0].trim();
    else if (lower.indexOf('segera') !== -1 || lower.indexOf('asap') !== -1 || lower.indexOf('secepatnya') !== -1) {
      details.deadline = 'segera';
    }

    ['upwork', 'fiverr', 'freelancer', 'projects.co.id', 'sribulancer', 'whatsapp', 'telegram', 'shopee', 'tokopedia', 'instagram', 'tiktok'].forEach(function (p) {
      if (!details.platform && lower.indexOf(p) !== -1) details.platform = p;
    });

    var count = raw.match(/(\d+)\s*(artikel|desain|halaman|video|logo|post|file|lembar|produk|banner)/i);
    if (count) details.deliverableCount = count[0].trim();

    return details;
  }

  var GREETINGS = {
    formal: { id: 'Yth. Bapak/Ibu,', en: 'Dear Sir/Madam,' },
    ramah: { id: 'Halo, terima kasih atas brief-nya!', en: 'Hello, thank you for the brief!' },
    percaya: { id: 'Halo! Saya siap mengerjakan proyek ini.', en: 'Hello! I am ready to take on this project.' }
  };

  var OPENERS = {
    formal: {
      id: 'Saya membaca brief Anda dengan saksama dan memahami kebutuhan proyek ini.',
      en: 'I have read your brief carefully and understand what this project needs.'
    },
    ramah: {
      id: 'Brief-nya jelas, dan proyek ini cocok dengan yang biasa saya kerjakan.',
      en: 'The brief is clear, and this project matches the work I usually do.'
    },
    percaya: {
      id: 'Proyek seperti ini adalah keahlian saya, dan saya bisa mulai segera.',
      en: 'Projects like this are my specialty, and I can start right away.'
    }
  };

  var CLOSINGS = {
    formal: {
      id: 'Saya menunggu kabar baik dari Anda. Terima kasih atas kesempatan yang diberikan.',
      en: 'I look forward to hearing from you. Thank you for the opportunity.'
    },
    ramah: {
      id: 'Silakan balas pesan ini bila ada yang ingin ditanyakan — saya senang berdiskusi dulu sebelum mulai.',
      en: 'Feel free to reply if you have any questions — I am happy to discuss before starting.'
    },
    percaya: {
      id: 'Mari mulai. Saya akan memberikan hasil yang rapi, tepat waktu, dan sesuai brief.',
      en: "Let's get started. I will deliver neat, on-time work that matches the brief."
    }
  };

  function buildDraft(input) {
    var lang = input.language === 'en' ? 'en' : 'id';
    var tone = GREETINGS[input.tone] ? input.tone : 'ramah';
    var detected = input.detected || detectJobType(input.brief || '');
    var type = detected.type || 'general';
    var details = input.details || extractDetails(input.brief || '');
    var lines = [];

    lines.push(GREETINGS[tone][lang]);
    lines.push('');
    lines.push(OPENERS[tone][lang]);

    var typeLabel = TYPE_LABEL[type][lang];
    var detailBits = [];
    if (details.deliverableCount) detailBits.push(details.deliverableCount);
    if (details.deadline) detailBits.push((lang === 'en' ? 'deadline: ' : 'tenggat: ') + details.deadline);
    if (details.budget) detailBits.push((lang === 'en' ? 'budget: ' : 'anggaran: ') + details.budget);
    if (detailBits.length) {
      lines.push(lang === 'en'
        ? 'Key points I noted from the brief (' + typeLabel + '): ' + detailBits.join(', ') + '.'
        : 'Poin penting yang saya catat dari brief (' + typeLabel + '): ' + detailBits.join(', ') + '.');
    }

    lines.push('');
    lines.push(lang === 'en' ? 'What I will deliver:' : 'Yang akan saya kerjakan:');
    PLANS[type][lang].forEach(function (step, i) {
      lines.push((i + 1) + '. ' + step);
    });

    if (input.experience) {
      lines.push('');
      lines.push((lang === 'en' ? 'About my experience: ' : 'Tentang pengalaman saya: ') + input.experience);
    }

    var terms = [];
    if (input.rate) terms.push((lang === 'en' ? 'Rate: ' : 'Tarif: ') + input.rate);
    if (input.timeline) terms.push((lang === 'en' ? 'Estimated completion: ' : 'Perkiraan selesai: ') + input.timeline);
    if (terms.length) {
      lines.push('');
      lines.push(terms.join(' | '));
    }

    if (input.portfolio) {
      lines.push('');
      lines.push((lang === 'en' ? 'Portfolio samples: ' : 'Contoh hasil kerja saya: ') + input.portfolio);
    }

    lines.push('');
    lines.push(CLOSINGS[tone][lang]);
    lines.push('');
    lines.push(lang === 'en' ? 'Best regards,' : 'Salam,');
    lines.push(input.name || (lang === 'en' ? '[Your name]' : '[Nama Anda]'));

    return lines.join('\n');
  }

  function completeness(input, draftText) {
    var checks = [];
    function add(label, ok) {
      checks.push({ label: label, ok: !!ok });
    }
    add('Brief terisi', !!(input.brief && input.brief.trim().length >= 20));
    add('Nama terisi', !!(input.name && input.name.trim()));
    add('Tarif terisi', !!(input.rate && input.rate.trim()));
    add('Perkiraan selesai terisi', !!(input.timeline && input.timeline.trim()));
    add('Portofolio / contoh kerja terisi', !!(input.portfolio && input.portfolio.trim()));
    add('Draf menyebut rencana kerja', /1\.\s/.test(draftText || ''));
    add('Draf menyebut ajakan membalas', /(Silakan balas|Mari mulai|menunggu kabar|look forward|get started|reply)/i.test(draftText || ''));
    var done = checks.filter(function (c) { return c.ok; }).length;
    var missing = checks.filter(function (c) { return !c.ok; }).map(function (c) { return c.label; });
    return { score: Math.round((done / checks.length) * 100), checks: checks, missing: missing };
  }

  var SAMPLE_BRIEFS = [
    {
      id: 'logo',
      label: 'Contoh 1 — Logo warung kopi',
      text: 'Dibutuhkan desainer untuk membuat logo warung kopi "Kopi Senja". Gaya minimalis, warna cokelat dan krem. Butuh file PNG dan file master. Budget Rp500.000, selesai dalam 5 hari. Kirim contoh logo yang pernah dibuat.'
    },
    {
      id: 'artikel',
      label: 'Contoh 2 — Artikel SEO',
      text: 'Dicari penulis artikel SEO tema keuangan untuk pemula, 5 artikel @1000 kata, bahasa Indonesia, gaya santai tapi akurat. Deadline 1 minggu. Tarif Rp150.000 per artikel. Sertakan contoh tulisan.'
    },
    {
      id: 'web',
      label: 'Contoh 3 — Landing page',
      text: 'Need a freelancer to build a simple landing page for a skincare product. One page, responsive, with WhatsApp order button. Content and photos provided. Budget $80, deadline 7 days. Please share portfolio links.'
    }
  ];

  return {
    KEYWORDS: KEYWORDS,
    TYPE_LABEL: TYPE_LABEL,
    PLANS: PLANS,
    SAMPLE_BRIEFS: SAMPLE_BRIEFS,
    detectJobType: detectJobType,
    extractDetails: extractDetails,
    buildDraft: buildDraft,
    completeness: completeness
  };
});
