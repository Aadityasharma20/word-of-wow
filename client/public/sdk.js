/**
 * Word of Wow — Embed SDK v1.0
 * Lightweight vanilla JS widget that loads on brand websites.
 * No dependencies. ~4KB unminified.
 *
 * Usage:
 * <script src="https://wordofwow.com/sdk.js" data-campaign-id="CAMPAIGN_ID"></script>
 */
(function () {
  'use strict';

  // ── Find our script tag ──
  var scripts = document.querySelectorAll('script[data-campaign-id]');
  var scriptEl = scripts[scripts.length - 1];
  if (!scriptEl) return;

  var campaignId = scriptEl.getAttribute('data-campaign-id');
  if (!campaignId) return;

  var API_BASE = scriptEl.getAttribute('data-api-base') || 'https://wordofwow.com';
  var SESSION_KEY = 'wow_sdk_' + campaignId;

  // ── Utility: inject styles ──
  function addStyles() {
    var style = document.createElement('style');
    style.textContent = [
      '@keyframes wowFadeInUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}',
      '@keyframes wowFadeIn{from{opacity:0}to{opacity:1}}',
      '.wow-icon{width:36px;height:36px;border-radius:50%;vertical-align:middle;margin-right:6px;display:inline-block}',
      '.wow-pill{position:fixed;bottom:20px;right:20px;z-index:99999;padding:12px 22px;border-radius:50px;',
      'background:linear-gradient(135deg,#A78BFA,#6C5CE7);color:#fff;font-family:Inter,-apple-system,sans-serif;',
      'font-size:14px;font-weight:600;cursor:pointer;box-shadow:0 4px 24px rgba(167,139,250,0.4);',
      'animation:wowFadeInUp 0.6s ease-out;transition:transform 0.2s,box-shadow 0.2s;max-width:320px;line-height:1.4;display:flex;align-items:center;gap:8px}',
      '.wow-pill:hover{transform:translateY(-2px);box-shadow:0 6px 28px rgba(167,139,250,0.5)}',
      '.wow-pill-close{position:absolute;top:-6px;right:-6px;width:20px;height:20px;border-radius:50%;background:#333;',
      'color:#fff;border:none;cursor:pointer;font-size:12px;display:flex;align-items:center;justify-content:center}',
      '.wow-overlay{position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,0.6);',
      'backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;animation:wowFadeIn 0.3s}',
      '.wow-modal{background:#1E1E32;border-radius:20px;padding:2.5rem;max-width:420px;width:90%;',
      'text-align:center;border:1px solid rgba(167,139,250,0.2);box-shadow:0 16px 48px rgba(0,0,0,0.5);',
      'font-family:Inter,-apple-system,sans-serif;color:#E0E0E0;animation:wowFadeInUp 0.5s ease-out}',
      '.wow-modal h2{font-size:1.4rem;font-weight:800;margin-bottom:0.5rem}',
      '.wow-modal p{font-size:0.9rem;color:#A0A0B0;margin-bottom:1.5rem;line-height:1.5}',
      '.wow-modal-btn{display:inline-block;padding:12px 28px;border-radius:12px;font-weight:700;font-size:0.9rem;',
      'background:linear-gradient(135deg,#A78BFA,#6C5CE7);color:#fff;border:none;cursor:pointer;',
      'transition:transform 0.2s}',
      '.wow-modal-btn:hover{transform:scale(1.03)}',
      '.wow-modal-close{position:absolute;top:16px;right:16px;background:rgba(255,255,255,0.1);border:none;',
      'color:#fff;cursor:pointer;width:28px;height:28px;border-radius:50%;font-size:16px}',
      '.wow-embed{padding:1.5rem;border-radius:16px;background:rgba(167,139,250,0.04);',
      'border:1px solid rgba(167,139,250,0.12);text-align:center;font-family:Inter,-apple-system,sans-serif;color:#E0E0E0;margin:1rem 0}',
      '.wow-embed h3{font-size:1.1rem;font-weight:700;margin-bottom:0.4rem}',
      '.wow-embed p{font-size:0.85rem;color:#A0A0B0;margin-bottom:1rem}',
      '.wow-embed-btn{display:inline-block;padding:10px 24px;border-radius:10px;font-weight:700;font-size:0.85rem;',
      'background:linear-gradient(135deg,#A78BFA,#6C5CE7);color:#fff;border:none;cursor:pointer;text-decoration:none}',
    ].join('\n');
    document.head.appendChild(style);
  }

  // ── Fetch settings from API ──
  function fetchSettings(cb) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', API_BASE + '/api/embed/' + campaignId, true);
    xhr.onload = function () {
      if (xhr.status === 200) {
        try { cb(JSON.parse(xhr.responseText).data); } catch (e) { /* silent */ }
      }
    };
    xhr.send();
  }

  // ── Sticky Pill ──
  function showStickyPill(cfg, campaignUrl) {
    if (!cfg || !cfg.enabled) return;
    var pill = document.createElement('div');
    pill.className = 'wow-pill';
    var iconUrl = (scriptEl.getAttribute('data-api-base') || 'https://wordofwow.com') + '/favicon.png';
    pill.innerHTML = '<img class="wow-icon" src="' + iconUrl + '" alt="WOW">' + cfg.headline + ' ' + cfg.cta;
    pill.onclick = function () { window.open(campaignUrl, '_blank'); };

    var close = document.createElement('button');
    close.className = 'wow-pill-close';
    close.textContent = '×';
    close.onclick = function (e) { e.stopPropagation(); pill.remove(); };
    pill.style.position = 'fixed';
    pill.appendChild(close);
    document.body.appendChild(pill);
  }

  // ── Exit Intent ──
  function setupExitIntent(cfg, campaignUrl) {
    if (!cfg || !cfg.enabled) return;
    if (sessionStorage.getItem(SESSION_KEY + '_exit')) return;

    var triggered = false;
    document.addEventListener('mouseleave', function (e) {
      if (e.clientY > 10 || triggered) return;
      triggered = true;
      sessionStorage.setItem(SESSION_KEY + '_exit', '1');

      var overlay = document.createElement('div');
      overlay.className = 'wow-overlay';

      var iconUrl = (scriptEl.getAttribute('data-api-base') || 'https://wordofwow.com') + '/favicon.png';
      var modal = document.createElement('div');
      modal.className = 'wow-modal';
      modal.style.position = 'relative';
      modal.innerHTML = '<div style="margin-bottom:12px"><img src="' + iconUrl + '" style="width:36px;height:36px;border-radius:50%"></div>' +
        '<h2>' + cfg.headline + '</h2>' +
        '<p>' + (cfg.subtext || '') + '</p>' +
        '<button class="wow-modal-btn" id="wow-exit-cta">' + cfg.cta + '</button>' +
        '<button class="wow-modal-close" id="wow-exit-close">×</button>';

      overlay.appendChild(modal);
      document.body.appendChild(overlay);

      document.getElementById('wow-exit-cta').onclick = function () {
        window.open(campaignUrl, '_blank');
        overlay.remove();
      };
      document.getElementById('wow-exit-close').onclick = function () { overlay.remove(); };
      overlay.onclick = function (e) { if (e.target === overlay) overlay.remove(); };
    });
  }

  // ── Embed Section ──
  function showEmbedSection(cfg, campaignUrl) {
    if (!cfg || !cfg.enabled) return;
    var target = document.getElementById('wow-embed');
    if (!target) return;

    var iconUrl = (scriptEl.getAttribute('data-api-base') || 'https://wordofwow.com') + '/favicon.png';
    target.className = 'wow-embed';
    target.innerHTML = '<img src="' + iconUrl + '" style="width:28px;height:28px;border-radius:50%;margin-bottom:8px">' +
      '<h3>' + cfg.headline + '</h3>' +
      '<p>' + (cfg.description || '') + '</p>' +
      '<a class="wow-embed-btn" href="' + campaignUrl + '" target="_blank">' + cfg.cta + '</a>';
  }

  // ── Init ──
  addStyles();
  fetchSettings(function (data) {
    if (!data) return;
    var url = data.campaignUrl || (API_BASE + '/campaign/' + campaignId);
    var es = data.embedSettings || {};

    showStickyPill(es.stickyPill, url);
    setupExitIntent(es.exitIntent, url);

    // Wait for DOM ready for embed section
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { showEmbedSection(es.embedSection, url); });
    } else {
      showEmbedSection(es.embedSection, url);
    }
  });
})();
