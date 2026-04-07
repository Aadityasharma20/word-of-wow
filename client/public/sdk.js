/**
 * Word of Wow — Embed SDK v2.0
 * Lightweight vanilla JS widget that loads on brand websites.
 * No dependencies. Fetches settings from the WOW API.
 *
 * Usage:
 * <script src="https://wordofwow.com/sdk.js" data-campaign-id="CAMPAIGN_ID"></script>
 *
 * Optional attributes:
 *   data-api-base="https://word-of-wow-backend.onrender.com"
 */
(function () {
  'use strict';

  // ── Find our script tag ──
  var scripts = document.querySelectorAll('script[data-campaign-id]');
  var scriptEl = scripts[scripts.length - 1];
  if (!scriptEl) return;

  var campaignId = scriptEl.getAttribute('data-campaign-id');
  if (!campaignId) return;

  // Default API base points to the actual Render backend, NOT the frontend
  var API_BASE = scriptEl.getAttribute('data-api-base') || 'https://word-of-wow-backend.onrender.com';
  var FRONTEND_BASE = 'https://wordofwow.com';
  var SESSION_KEY = 'wow_sdk_' + campaignId;
  var FAVICON_URL = FRONTEND_BASE + '/favicon.png';

  // ── Utility: inject styles ──
  function addStyles() {
    if (document.getElementById('wow-sdk-styles')) return;
    var style = document.createElement('style');
    style.id = 'wow-sdk-styles';
    style.textContent = [
      '@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap");',
      '@keyframes wowFadeInUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}',
      '@keyframes wowFadeIn{from{opacity:0}to{opacity:1}}',
      '@keyframes wowPulse{0%,100%{box-shadow:0 4px 24px rgba(167,139,250,0.4)}50%{box-shadow:0 4px 32px rgba(167,139,250,0.6)}}',

      /* Sticky Pill */
      '.wow-pill{position:fixed;bottom:20px;right:20px;z-index:99999;padding:14px 22px;border-radius:50px;' +
      'background:linear-gradient(135deg,#A78BFA,#6C5CE7);color:#fff;font-family:Inter,-apple-system,sans-serif;' +
      'font-size:14px;font-weight:600;cursor:pointer;box-shadow:0 4px 24px rgba(167,139,250,0.4);' +
      'animation:wowFadeInUp 0.6s ease-out;transition:transform 0.2s,box-shadow 0.2s;' +
      'max-width:360px;line-height:1.4;display:flex;align-items:center;gap:10px;text-decoration:none}',
      '.wow-pill:hover{transform:translateY(-3px);box-shadow:0 8px 32px rgba(167,139,250,0.55)}',
      '.wow-pill-icon{width:32px;height:32px;border-radius:50%;flex-shrink:0;object-fit:cover}',
      '.wow-pill-text{display:flex;flex-direction:column;gap:2px}',
      '.wow-pill-headline{font-size:13px;font-weight:700;line-height:1.2}',
      '.wow-pill-cta{font-size:11px;font-weight:500;opacity:0.85;line-height:1.2}',
      '.wow-pill-close{position:absolute;top:-8px;right:-8px;width:22px;height:22px;border-radius:50%;' +
      'background:rgba(30,30,50,0.9);color:#fff;border:1.5px solid rgba(167,139,250,0.3);cursor:pointer;' +
      'font-size:12px;display:flex;align-items:center;justify-content:center;transition:background 0.2s}',
      '.wow-pill-close:hover{background:rgba(225,112,85,0.8)}',

      /* Exit Intent Overlay */
      '.wow-overlay{position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,0.65);' +
      'backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);' +
      'display:flex;align-items:center;justify-content:center;animation:wowFadeIn 0.3s}',
      '.wow-modal{background:linear-gradient(145deg,#1a1a2e,#1E1E32);border-radius:24px;padding:2.5rem;' +
      'max-width:440px;width:90%;text-align:center;position:relative;' +
      'border:1px solid rgba(167,139,250,0.15);box-shadow:0 20px 60px rgba(0,0,0,0.6);' +
      'font-family:Inter,-apple-system,sans-serif;color:#E0E0E0;animation:wowFadeInUp 0.5s ease-out}',
      '.wow-modal-logo{width:44px;height:44px;border-radius:50%;margin:0 auto 16px;' +
      'box-shadow:0 0 20px rgba(167,139,250,0.3)}',
      '.wow-modal h2{font-size:1.35rem;font-weight:800;margin:0 0 8px;letter-spacing:-0.02em}',
      '.wow-modal p{font-size:0.88rem;color:#A0A0B0;margin:0 0 1.5rem;line-height:1.55}',
      '.wow-modal-btn{display:inline-flex;align-items:center;gap:8px;padding:13px 30px;border-radius:14px;' +
      'font-weight:700;font-size:0.88rem;background:linear-gradient(135deg,#A78BFA,#6C5CE7);color:#fff;' +
      'border:none;cursor:pointer;transition:transform 0.2s,box-shadow 0.2s;text-decoration:none;' +
      'box-shadow:0 4px 16px rgba(167,139,250,0.3)}',
      '.wow-modal-btn:hover{transform:translateY(-2px);box-shadow:0 6px 24px rgba(167,139,250,0.45)}',
      '.wow-modal-btn svg{width:16px;height:16px}',
      '.wow-modal-close{position:absolute;top:14px;right:14px;background:rgba(255,255,255,0.06);border:none;' +
      'color:#888;cursor:pointer;width:30px;height:30px;border-radius:50%;font-size:18px;' +
      'display:flex;align-items:center;justify-content:center;transition:background 0.2s,color 0.2s}',
      '.wow-modal-close:hover{background:rgba(255,255,255,0.12);color:#fff}',
      '.wow-modal-reward{display:inline-flex;align-items:center;gap:6px;padding:6px 14px;' +
      'border-radius:99px;background:rgba(253,203,110,0.08);border:1px solid rgba(253,203,110,0.15);' +
      'color:#FDCB6E;font-size:12px;font-weight:600;margin-bottom:16px}',

      /* Inline Embed Section */
      '.wow-embed{padding:2rem;border-radius:20px;background:linear-gradient(145deg,rgba(167,139,250,0.04),rgba(108,92,231,0.02));' +
      'border:1px solid rgba(167,139,250,0.1);text-align:center;font-family:Inter,-apple-system,sans-serif;' +
      'color:#E0E0E0;margin:1.5rem 0;animation:wowFadeIn 0.5s}',
      '.wow-embed-logo{width:32px;height:32px;border-radius:50%;margin:0 auto 12px}',
      '.wow-embed h3{font-size:1.1rem;font-weight:700;margin:0 0 6px}',
      '.wow-embed p{font-size:0.85rem;color:#A0A0B0;margin:0 0 1.2rem;line-height:1.5}',
      '.wow-embed-btn{display:inline-flex;align-items:center;gap:6px;padding:11px 24px;border-radius:12px;' +
      'font-weight:700;font-size:0.85rem;background:linear-gradient(135deg,#A78BFA,#6C5CE7);color:#fff;' +
      'border:none;cursor:pointer;text-decoration:none;transition:transform 0.2s}',
      '.wow-embed-btn:hover{transform:translateY(-2px)}',
    ].join('\n');
    document.head.appendChild(style);
  }

  // ── Arrow SVG ──
  var ARROW_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>';

  // ── Fetch settings from API ──
  function fetchSettings(cb) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', API_BASE + '/api/embed/' + campaignId, true);
    xhr.onload = function () {
      if (xhr.status === 200) {
        try {
          var resp = JSON.parse(xhr.responseText);
          cb(resp.data || resp);
        } catch (e) {
          console.warn('[WOW SDK] Failed to parse API response:', e);
        }
      } else {
        console.warn('[WOW SDK] API returned status', xhr.status, '- widget will not load.');
      }
    };
    xhr.onerror = function () {
      console.warn('[WOW SDK] Network error fetching embed settings. Check CORS and API availability.');
    };
    xhr.send();
  }

  // ── Sticky Pill Widget ──
  function showStickyPill(cfg, campaignUrl) {
    if (!cfg || !cfg.enabled) return;

    // Don't show if user already dismissed in this session
    if (sessionStorage.getItem(SESSION_KEY + '_pill_dismissed')) return;

    var pill = document.createElement('a');
    pill.className = 'wow-pill';
    pill.href = campaignUrl;
    pill.target = '_blank';
    pill.rel = 'noopener';
    pill.innerHTML =
      '<img class="wow-pill-icon" src="' + FAVICON_URL + '" alt="WOW">' +
      '<div class="wow-pill-text">' +
        '<span class="wow-pill-headline">' + escapeHtml(cfg.headline || '💬 Share your experience') + '</span>' +
        '<span class="wow-pill-cta">' + escapeHtml(cfg.cta || 'Earn rewards →') + '</span>' +
      '</div>';

    var close = document.createElement('button');
    close.className = 'wow-pill-close';
    close.textContent = '×';
    close.setAttribute('aria-label', 'Close');
    close.onclick = function (e) {
      e.preventDefault();
      e.stopPropagation();
      sessionStorage.setItem(SESSION_KEY + '_pill_dismissed', '1');
      pill.style.animation = 'none';
      pill.style.opacity = '0';
      pill.style.transform = 'translateY(20px)';
      pill.style.transition = 'opacity 0.3s, transform 0.3s';
      setTimeout(function () { pill.remove(); }, 300);
    };
    pill.appendChild(close);
    document.body.appendChild(pill);
  }

  // ── Exit Intent Popup ──
  function setupExitIntent(cfg, campaignUrl, rewardText) {
    if (!cfg || !cfg.enabled) return;
    if (sessionStorage.getItem(SESSION_KEY + '_exit')) return;

    var triggered = false;
    document.addEventListener('mouseleave', function (e) {
      if (e.clientY > 10 || triggered) return;
      triggered = true;
      sessionStorage.setItem(SESSION_KEY + '_exit', '1');

      var overlay = document.createElement('div');
      overlay.className = 'wow-overlay';

      var modal = document.createElement('div');
      modal.className = 'wow-modal';
      modal.innerHTML =
        '<img class="wow-modal-logo" src="' + FAVICON_URL + '" alt="WOW">' +
        (rewardText ? '<div class="wow-modal-reward">🎁 ' + escapeHtml(rewardText) + '</div>' : '') +
        '<h2>' + escapeHtml(cfg.headline || 'Before you go…') + '</h2>' +
        '<p>' + escapeHtml(cfg.subtext || 'Share your experience and earn exciting rewards!') + '</p>' +
        '<a class="wow-modal-btn" href="' + escapeHtml(campaignUrl) + '" target="_blank" rel="noopener">' +
          escapeHtml(cfg.cta || 'Share & Earn') + ' ' + ARROW_SVG +
        '</a>' +
        '<button class="wow-modal-close" aria-label="Close">×</button>';

      overlay.appendChild(modal);
      document.body.appendChild(overlay);

      modal.querySelector('.wow-modal-close').onclick = function () {
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.3s';
        setTimeout(function () { overlay.remove(); }, 300);
      };
      overlay.onclick = function (e) {
        if (e.target === overlay) {
          overlay.style.opacity = '0';
          overlay.style.transition = 'opacity 0.3s';
          setTimeout(function () { overlay.remove(); }, 300);
        }
      };
    });
  }

  // ── Inline Embed Section ──
  function showEmbedSection(cfg, campaignUrl) {
    if (!cfg || !cfg.enabled) return;
    var target = document.getElementById('wow-embed');
    if (!target) return;

    target.className = 'wow-embed';
    target.innerHTML =
      '<img class="wow-embed-logo" src="' + FAVICON_URL + '" alt="WOW">' +
      '<h3>' + escapeHtml(cfg.headline || '💡 Share your experience') + '</h3>' +
      '<p>' + escapeHtml(cfg.description || 'Share your honest experience and earn rewards') + '</p>' +
      '<a class="wow-embed-btn" href="' + escapeHtml(campaignUrl) + '" target="_blank" rel="noopener">' +
        escapeHtml(cfg.cta || 'Get Started') + ' ' + ARROW_SVG +
      '</a>';
  }

  // ── Escape HTML ──
  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ── Init ──
  addStyles();

  fetchSettings(function (data) {
    if (!data) {
      console.warn('[WOW SDK] No settings data received.');
      return;
    }

    var campaignUrl = data.campaignUrl || (FRONTEND_BASE + '/campaign/' + campaignId);
    var es = data.embedSettings || {};
    var rewardText = es.stickyPill ? es.stickyPill.rewardText : '';

    console.log('[WOW SDK] Loaded for campaign:', campaignId, '| Features:', {
      stickyPill: !!(es.stickyPill && es.stickyPill.enabled),
      exitIntent: !!(es.exitIntent && es.exitIntent.enabled),
      embedSection: !!(es.embedSection && es.embedSection.enabled),
    });

    showStickyPill(es.stickyPill, campaignUrl);
    setupExitIntent(es.exitIntent, campaignUrl, rewardText);

    // Wait for DOM ready for embed section
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        showEmbedSection(es.embedSection, campaignUrl);
      });
    } else {
      showEmbedSection(es.embedSection, campaignUrl);
    }
  });
})();
