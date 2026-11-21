  (function () {
    const modal = document.getElementById('search-modal');
    if (!modal) return;
    const input = document.getElementById('search-input');
    const list = document.getElementById('search-results');
    const empty = document.getElementById('search-empty');

    /** 工具数据来自构建时生成的 /js/versal-tools-data.js（单一源：all-tools.js） */
    const TOOLS = (typeof window !== 'undefined' && Array.isArray(window.__VERSAL_TOOLS__))
      ? window.__VERSAL_TOOLS__
      : [];
    // 动态填充搜索框提示，避免工具数增长后文案过时（P2 修复）
    (function(){
      var input = document.getElementById('search-input');
      if (input && typeof TOOLS !== 'undefined') {
        input.setAttribute('placeholder', 'Search ' + TOOLS.length + ' tools... (try: jwt, uuid, json, hash)');
      }
    })();

    function search(q) {
      const query = (q || '').toLowerCase().trim();
      if (!query) return [];
      const words = query.split(/\s+/);
      const results = [];
      for (const t of TOOLS) {
        const titleL = t.title.toLowerCase();
        const descL = t.description.toLowerCase();
        const kwL = t.keywords.join(' ').toLowerCase();
        let score = 0, allMatch = true;
        for (const w of words) {
          const inTitle = titleL.includes(w);
          const inDesc = descL.includes(w);
          const inKw = kwL.includes(w);
          if (!inTitle && !inDesc && !inKw) { allMatch = false; break; }
          if (inTitle) score += 10;
          if (inDesc) score += 3;
          if (inKw) score += 5;
          if (titleL.indexOf(w) === 0) score += 5;
        }
        if (allMatch) results.push({ ...t, _score: score });
      }
      results.sort((a, b) => b._score - a._score || a.title.localeCompare(b.title));
      return results.slice(0, 30);
    }

    let activeIdx = -1;
    let currentResults = [];

    function render(q) {
      currentResults = search(q);
      activeIdx = currentResults.length > 0 ? 0 : -1;
      if (currentResults.length === 0) {
        list.innerHTML = '';
        empty.hidden = !q;
        return;
      }
      empty.hidden = true;
      const sectionMap = { tools: 'JSON', sec: 'Security', devops: 'DevOps', codegen: 'Codegen' };
      list.innerHTML = currentResults.map((r, i) => `
        <li>
          <a href="${r.href}" data-i="${i}" class="${i === 0 ? 'active' : ''}">
            <span class="result-section">${sectionMap[r.section] || r.section}</span>
            <span class="result-main">
              <span class="result-title">${escapeHtml(r.title)}</span>
              <span class="result-desc">${escapeHtml(r.description)}</span>
            </span>
          </a>
        </li>
      `).join('');
    }

    function escapeHtml(s) {
      return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
    }

    function setActive(i) {
      if (i < 0) i = currentResults.length - 1;
      if (i >= currentResults.length) i = 0;
      activeIdx = i;
      const links = list.querySelectorAll('a');
      links.forEach((a, idx) => a.classList.toggle('active', idx === i));
      const active = links[i];
      if (active) active.scrollIntoView({ block: 'nearest' });
    }

    function open() {
      // 从 URL ?q= 读取初值
      const params = new URLSearchParams(location.search);
      const q = params.get('q') || '';
      input.value = q;
      modal.showModal();
      render(q);
      // 选中文本，方便直接覆盖搜索
      setTimeout(() => { input.focus(); input.select(); }, 30);
      document.documentElement.style.overflow = 'hidden';
    }

    function close() {
      modal.close();
      document.documentElement.style.overflow = '';
    }

    // —— 事件 ——
    input.addEventListener('input', () => render(input.value));

    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(activeIdx + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(activeIdx - 1); }
      else if (e.key === 'Enter') {
        e.preventDefault();
        const r = currentResults[activeIdx];
        if (r) location.href = r.href;
      } else if (e.key === 'Escape') { e.preventDefault(); close(); }
    });

    // 点击卡片外部关闭
    modal.addEventListener('click', (e) => {
      if (e.target === modal) close();
    });
    modal.addEventListener('cancel', (e) => { e.preventDefault(); close(); });

    // 全局快捷键 Ctrl+K / Cmd+K
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (modal.open) close(); else open();
      }
    });

    // Header 上的搜索按钮（任何带 id="open-search" 的元素）
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('#open-search');
      if (btn) { e.preventDefault(); open(); }
    });

    // 如果 URL 带 ?search=1，自动打开
    const params2 = new URLSearchParams(location.search);
    if (params2.get('search') === '1') open();
  })();
