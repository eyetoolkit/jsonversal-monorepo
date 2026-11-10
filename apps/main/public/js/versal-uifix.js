/* ==========================================================================
   jsonversal — versal-uifix.js  (UI-FIX 2026-11-10)
   Single runtime repair layer for BaseLayout pages, the four standalone
   landing pages and the static /compare/ pages. Every module is isolated.
   ========================================================================== */
(function () {
  'use strict';
  function safe(fn) { try { fn(); } catch (e) { /* non-fatal by design */ } }
  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  /* ---------- P0-2: one theme owner, on <html> -------------------------- */
  safe(function () {
    // Older templates hard-coded data-theme on <body>. That re-declared the
    // entire token set under a light attribute while <html> said dark (or the
    // other way round), which produced white panels inside dark pages.
    if (document.body.hasAttribute('data-theme')) document.body.removeAttribute('data-theme');
    var root = document.documentElement;
    if (!root.getAttribute('data-theme')) {
      var v = null;
      try { v = localStorage.getItem('versal-theme'); } catch (e) {}
      if (v !== 'light' && v !== 'dark') {
        v = (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) ? 'light' : 'dark';
      }
      root.setAttribute('data-theme', v);
    }
  });

  /* ---------- P0-1: hamburger + drawer ---------------------------------- */
  safe(function () {
    var inner = document.querySelector('.v-header .v-header__inner');
    if (!inner) return;
    var nav = inner.querySelector('.v-nav');
    var links = nav ? Array.prototype.slice.call(nav.querySelectorAll('a')) : [];
    if (!links.length) return;

    var burger = el('button', 'v-burger', '<span aria-hidden="true">&#9776;</span>');
    burger.type = 'button';
    burger.setAttribute('aria-label', 'Open navigation menu');
    burger.setAttribute('aria-controls', 'v-drawer');
    burger.setAttribute('aria-expanded', 'false');
    inner.appendChild(burger);

    var drawer = el('nav', 'v-drawer');
    drawer.id = 'v-drawer';
    drawer.setAttribute('aria-label', 'Mobile navigation');
    links.forEach(function (a) {
      var c = a.cloneNode(true);
      c.setAttribute('tabindex', '-1');
      drawer.appendChild(c);
    });
    var tools = el('div', 'v-drawer__tools');
    var end = inner.querySelector('.v-header__end');
    if (end) tools.appendChild(end);   // move, not clone: keeps click handlers
    drawer.appendChild(tools);
    inner.appendChild(drawer);

    function setOpen(open) {
      drawer.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      burger.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
      burger.innerHTML = '<span aria-hidden="true">' + (open ? '&times;' : '&#9776;') + '</span>';
      Array.prototype.forEach.call(drawer.querySelectorAll('a,button,summary'), function (n) {
        n.setAttribute('tabindex', open ? '0' : '-1');
      });
    }
    burger.addEventListener('click', function () { setOpen(!drawer.classList.contains('is-open')); });
    drawer.addEventListener('click', function (e) { if (e.target.closest('a')) setOpen(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && drawer.classList.contains('is-open')) { setOpen(false); burger.focus(); }
    });
    window.addEventListener('resize', function () { if (window.innerWidth > 760) setOpen(false); });
    setOpen(false);
  });

  /* ---------- P1-4: reserve ad slot containers (no ads served) ---------- */
  safe(function () {
    var main = document.querySelector('main');
    if (!main || document.querySelector('.v-ad-slot')) return;
    var header = document.querySelector('.v-header');
    if (header && !document.querySelector('.v-ad-header')) {
      var h = el('div', 'v-ad-slot v-ad-header');
      h.setAttribute('data-ad', 'header');
      header.parentNode.insertBefore(h, header.nextSibling);
    }
    var incontent = el('div', 'v-ad-slot v-ad-incontent');
    incontent.setAttribute('data-ad', 'incontent');
    var anchor = main.querySelector('.privacy-promise, .faq-block');
    if (anchor) main.insertBefore(incontent, anchor);
    else main.appendChild(incontent);
    var mobile = el('div', 'v-ad-slot v-ad-mobile');
    mobile.setAttribute('data-ad', 'mobile');
    document.body.appendChild(mobile);
  });

  /* ---------- P2-5: lightweight editor + live format -------------------- */
  safe(function () {
    var ta = document.getElementById('input');
    if (!ta || ta.tagName !== 'TEXTAREA' || ta.closest('.v-editor')) return;
    var wrap = el('div', 'v-editor');
    ta.parentNode.insertBefore(wrap, ta);
    var gutter = el('div', 'v-gutter');
    gutter.setAttribute('aria-hidden', 'true');
    wrap.appendChild(gutter);
    wrap.appendChild(ta);

    function lineCount() { return (ta.value.split('\n').length) || 1; }
    function paintGutter(errLine) {
      var n = lineCount(), out = '';
      for (var i = 1; i <= n; i++) {
        out += '<span class="' + (i === errLine ? 'is-error' : '') + '">' + i + '</span>';
      }
      gutter.innerHTML = out;
      gutter.scrollTop = ta.scrollTop;
    }
    paintGutter(-1);
    ta.addEventListener('scroll', function () { gutter.scrollTop = ta.scrollTop; }, { passive: true });

    var formatBtn = document.getElementById('format');
    var indentSel = document.getElementById('indent');
    var isJsonTool = !!(formatBtn && indentSel);
    var timer = null;

    function markError(line) {
      paintGutter(line || -1);
      if (line) {
        ta.setAttribute('aria-invalid', 'true');
        ta.setAttribute('aria-describedby', 'versal-editor-error');
      } else {
        ta.removeAttribute('aria-invalid');
      }
    }
    function state(text, done) {
      var s = document.getElementById('v-format-state');
      if (!s) {
        s = el('span', 'v-format-state');
        s.id = 'v-format-state';
        s.setAttribute('role', 'status');
        s.setAttribute('aria-live', 'polite');
        if (formatBtn && formatBtn.parentNode) formatBtn.parentNode.appendChild(s);
      }
      s.textContent = text;
      s.classList.toggle('is-done', !!done);
    }
    if (formatBtn) {
      var live = el('span', 'v-format-state');
      live.id = 'v-format-state';
      live.setAttribute('role', 'status');
      live.setAttribute('aria-live', 'polite');
      formatBtn.parentNode.appendChild(live);
      formatBtn.addEventListener('click', function () {
        state('Formatting…', false);
        setTimeout(function () {
          var out = document.getElementById('output');
          var bad = out && /error|invalid|unexpected/i.test((out.textContent || '').slice(0, 200));
          state(bad ? 'Invalid JSON — see error below' : 'Formatted', !bad);
          if (out) { out.classList.remove('v-result-pulse'); void out.offsetWidth; out.classList.add('v-result-pulse'); }
        }, 120);
      });
    }

    ta.addEventListener('input', function () {
      paintGutter(-1);
      if (!isJsonTool) return;
      clearTimeout(timer);
      timer = setTimeout(function () {
        var raw = ta.value.trim();
        if (!raw) { state(''); return; }
        try {
          JSON.parse(raw);
          markError(null);
          if (formatBtn) formatBtn.click();   // debounced live formatting
        } catch (e) {
          var m = /position\s+(\d+)/i.exec(e.message || '');
          var line = 1;
          if (m) line = raw.slice(0, parseInt(m[1], 10)).split('\n').length;
          else {
            var lm = /line\s+(\d+)/i.exec(e.message || '');
            if (lm) line = parseInt(lm[1], 10);
          }
          markError(line);
          state('Invalid JSON at line ' + line, false);
        }
      }, 800);
    });
  });

  /* ---------- P2-7: keyboard-scrollable overflow regions ---------------- */
  safe(function () {
    Array.prototype.forEach.call(document.querySelectorAll('pre,.output-text,table'), function (n) {
      if (n.scrollWidth > n.clientWidth + 4) {
        n.setAttribute('tabindex', '0');
        n.setAttribute('role', 'region');
        n.setAttribute('aria-label', 'Scrollable content');
      }
    });
  });
})();
