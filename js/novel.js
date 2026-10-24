/* ============================================
   Novel Reader · 小说阅读模块
   - 文件上传 (.txt)
   - 网址抓取（CORS 代理）
   - 打字机效果
   ============================================ */

const NovelReader = {
  text: '',           // 当前小说的完整文本
  title: '',          // 小说标题
  index: 0,           // 打字机当前位置
  timer: null,        // setInterval 句柄
  speed: 80,          // 每个字的间隔毫秒数 (80ms = 中速)
  isPlaying: false,
  speedLevels: [      // 速度档位
    { label: '手动',   ms: 0   },   // ★ 按一下出一个字（伪装真打字）
    { label: '慢',     ms: 150 },
    { label: '较低',   ms: 100 },
    { label: '正常',   ms: 60 },
    { label: '较快',   ms: 35 },
    { label: '快',     ms: 15 },
  ],
  speedIndex: 3,  // 默认 "正常"

  // DOM 引用
  get els() {
    return {
      paper: document.getElementById('paper'),
      title: document.getElementById('novelTitle'),
      content: document.getElementById('novelContent'),
      playBtn: document.getElementById('playBtn'),
      resetBtn: document.getElementById('resetBtn'),
      speedUp: document.getElementById('speedUp'),
      speedDown: document.getElementById('speedDown'),
      speedVal: document.getElementById('speedVal'),
      fileInput: document.getElementById('fileInput'),
      progressCur: document.getElementById('progressCur'),
      progressTotal: document.getElementById('progressTotal'),
      tapHint: document.getElementById('tapHint'),
    };
  },

  /* 安全设置提示文字（元素可能不存在）*/
  setHint(text) {
    const el = this.els.tapHint;
    if (el) el.textContent = text;
  },

  /* ---- 初始化 ---- */
  init() {
    const els = this.els;
    this.speed = this.speedLevels[this.speedIndex].ms;  // ★ 同步 speed
    els.speedVal.textContent = this.speedLevels[this.speedIndex].label;

    // 点击纸张
    els.paper.addEventListener('click', (e) => {
      if (e.target.closest('button, input')) return;
      if (!this.text) return;

      // 手动模式 + 播放中 → 每点一下出一个字
      if (this.isManual() && this.isPlaying) {
        this.tick();
        return;
      }
      this.togglePlay();
    });

    // 键盘事件
    document.addEventListener('keydown', (e) => {
      if (!this.text) return;

      // 手动模式 + 播放中 → 按任意键出一个字（排除功能键）
      if (this.isManual() && this.isPlaying) {
        // 忽略修饰键 / 方向键 / F 键
        if (e.ctrlKey || e.altKey || e.metaKey) return;
        if (e.key.startsWith('Arrow') || e.key === 'Escape') return;
        this.tick();
        return;
      }

      // 其他模式：空格 = 开始/暂停
      if (e.code === 'Space') {
        e.preventDefault();
        this.togglePlay();
      }
    });

    // 工具栏按钮
    els.playBtn.addEventListener('click', () => this.togglePlay());
    els.resetBtn.addEventListener('click', () => this.reset());
    els.speedUp.addEventListener('click', () => this.changeSpeed(1));
    els.speedDown.addEventListener('click', () => this.changeSpeed(-1));

    // 文件上传
    els.fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      this.loadFromFile(file);
    });

    // 加载历史
    this.renderHistory();
  },

  /* ---- 切换播放 ---- */
  togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  },

  /* ---- 判断是否手动模式 ---- */
  isManual() {
    return this.speedLevels[this.speedIndex].ms === 0;
  },

  play() {
    if (!this.text) return;
    this.isPlaying = true;
    this.els.playBtn.textContent = '⏸ 暂停';

    // 手动模式：不启动 timer，等用户按一下才出一个字
    if (this.isManual()) return;

    // 自动模式：启动 timer
    this.timer = setInterval(() => this.tick(), this.speed);
  },

  /* 自动/手动 共用的"前进一字" */
  tick() {
    if (this.index >= this.text.length) {
      this.pause();
      return;
    }
    this.index++;
    this.renderPartial();
  },

  pause() {
    this.isPlaying = false;
    clearInterval(this.timer);
    this.timer = null;
    this.els.playBtn.textContent = this.isManual() ? '▶ 手动' : '▶ 继续';
  },

  reset() {
    this.pause();
    this.index = 0;
    this.renderPartial();
    const label = this.isManual() ? '▶ 手动' : '▶ 开始';
    this.els.playBtn.textContent = label;
  },

  changeSpeed(delta) {
    this.speedIndex = Math.max(0, Math.min(this.speedLevels.length - 1, this.speedIndex + delta));
    this.speed = this.speedLevels[this.speedIndex].ms;
    this.els.speedVal.textContent = this.speedLevels[this.speedIndex].label;
    // 如果正在播放，重启 timer 以应用新速度
    if (this.isPlaying) {
      this.pause();
      this.play();
    }
  },

  /* ---- 渲染部分文本（打字机效果）---- */
  renderPartial() {
    const els = this.els;
    const visibleText = this.text.substring(0, this.index);

    // 把文本按段落分割，给每段包 <p>
    const paragraphs = visibleText.split(/\n\s*\n/).filter(p => p.trim());
    const html = paragraphs.map(p => `<p>${this.escapeHtml(p)}</p>`).join('');

    // 加光标
    const cursor = `<span class="typewriter-cursor"></span>`;

    els.content.innerHTML = html + cursor;

    // 更新进度
    els.progressCur.textContent = this.index;
    els.progressTotal.textContent = this.text.length;

    // 自动滚动到光标位置
    const paper = els.paper;
    paper.scrollTop = paper.scrollHeight;
  },

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  /* ---- 从文件加载（自动检测 GBK / UTF-8）---- */
  loadFromFile(file) {
    // 统一读 ArrayBuffer，自己决定用什么编码解
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buf = e.target.result;
        const bytes = new Uint8Array(buf);

        // 先试 UTF-8
        let text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
        // 如果替换字符太多，说明不是 UTF-8，用 GBK 解
        if ((text.match(/\uFFFD/g) || []).length > Math.max(3, text.length * 0.01)) {
          console.log('[MoYuGO] UTF-8 疑似乱码，改用 GBK 解码');
          text = new TextDecoder('gbk').decode(bytes);
        }

        this.setContent(file.name.replace(/\.[^.]+$/, ''), text);
        this.addHistory({ type: 'file', title: file.name.replace(/\.[^.]+$/, ''), time: Date.now() });
      } catch(err) {
        alert('读取文件失败: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  },

  /* ---- 从网址加载（CORS 代理 + 自动检测 GBK/UTF-8）---- */
  async loadFromUrl(url) {
    try {
      App.setStatus('正在从网页获取文本…');
      // 用 allorigins.win CORS 代理（raw 模式返回原始字节）
      const proxy = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url);
      const resp = await fetch(proxy);
      if (!resp.ok) throw new Error('HTTP ' + resp.status);

      // ★ 关键：拿 ArrayBuffer，自己决定编码
      const buf = await resp.arrayBuffer();
      const bytes = new Uint8Array(buf);

      // 先试 UTF-8
      let html = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
      // 如果替换字符（U+FFFD）太多 → 原网页是 GBK
      const replacementCount = (html.match(/\uFFFD/g) || []).length;
      if (replacementCount > Math.max(3, html.length * 0.01)) {
        console.log('[MoYuGO] 网页疑似 GBK，改用 GBK 解码 (FFFD 数量:', replacementCount, ')');
        html = new TextDecoder('gbk').decode(bytes);
      }

      // 解析 HTML 提取正文
      const { title, text } = this.extractArticle(html);
      if (!text || text.length < 20) {
        throw new Error('没能从网页里提取到小说内容（可能页面结构不支持）');
      }

      this.setContent(title || '网文精选', text);
      this.addHistory({ type: 'url', title: title || url, url, time: Date.now() });
      App.setStatus('网页文本已加载');
    } catch(err) {
      console.error(err);
      App.setStatus('网页文本获取失败');
      alert('抓取失败: ' + err.message + '\n\n（有些小说网站会屏蔽代理，如果经常失败，建议直接下载 .txt 再上传）');
    }
  },

  /* ---- 从 HTML 中提取正文（启发式）---- */
  extractArticle(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const title = doc.querySelector('title')?.textContent?.trim() || '';

    // 1. 先找常见的小说容器
    const selectors = [
      '#content', '#txtContent', '#chaptercontent',
      '.content', '.chapter-content', '.read-content',
      'article', 'main', '.novel-content', '.text'
    ];
    let container = null;
    for (const sel of selectors) {
      const el = doc.querySelector(sel);
      if (el && el.textContent.length > 100) {
        container = el;
        break;
      }
    }

    // 2. 没找到就找最长的 <p> 标签群
    if (!container) {
      const pTags = doc.querySelectorAll('p');
      let maxLen = 0, maxP = null;
      pTags.forEach(p => {
        if (p.textContent.length > maxLen) {
          maxLen = p.textContent.length;
          maxP = p;
        }
      });
      if (maxP) {
        container = maxP.parentElement;
      }
    }

    if (!container) {
      return { title, text: doc.body?.innerText || '' };
    }

    // 移除 script/style/noscript 标签
    container.querySelectorAll('script, style, noscript, iframe, .ad, .ads, .advertisement').forEach(el => el.remove());

    let text = container.innerText
      .replace(/[ \t]+\n/g, '\n')    // 清理行尾空格
      .replace(/\n{3,}/g, '\n\n')    // 压缩多余空行
      .trim();

    return { title, text };
  },

  /* ---- 设置内容 ---- */
  setContent(title, text) {
    // 清理一下文本
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();

    this.title = title;
    this.text = text;
    this.index = Math.min(50, text.length);   // ★ 先显示前 50 字作为预览
    this.isPlaying = false;

    const els = this.els;
    els.title.textContent = title;
    els.playBtn.textContent = this.isManual() ? '▶ 手动' : '▶ 开始';
    els.progressTotal.textContent = text.length;
    els.progressCur.textContent = this.index;

    // 渲染预览
    this.renderPartial();

    App.setStatus(`已打开《${title}》，共 ${text.length} 字`);
  },

  /* ---- 历史记录 ---- */
  addHistory(entry) {
    try {
      const list = JSON.parse(localStorage.getItem('moyu_history') || '[]');
      list.unshift(entry);
      // 最多保留 10 条
      localStorage.setItem('moyu_history', JSON.stringify(list.slice(0, 10)));
      this.renderHistory();
    } catch(e) {}
  },

  renderHistory() {
    const list = JSON.parse(localStorage.getItem('moyu_history') || '[]');
    const ul = document.getElementById('historyList');
    if (!list.length) {
      ul.innerHTML = '<li class="empty-hint">暂无记录…<br>上传一本小说开始吧！</li>';
      return;
    }
    ul.innerHTML = list.map((item, i) => {
      const icon = item.type === 'url' ? '〈〉' : '📄';
      return `<li data-idx="${i}" title="点击重新加载">${icon} ${this.escapeHtml(item.title).substring(0, 30)}</li>`;
    }).join('');
    // 绑定点击事件（用事件委托）
    ul.querySelectorAll('li[data-idx]').forEach(li => {
      li.addEventListener('click', () => {
        const idx = parseInt(li.dataset.idx);
        const entry = list[idx];
        if (entry.type === 'url' && entry.url) {
          NovelReader.loadFromUrl(entry.url);
        } else {
          App.setStatus('📂 文件历史记录暂不支持直接重新加载（浏览器安全限制）');
        }
      });
    });
  }
};
