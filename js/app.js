/* ============================================
   App · 主入口
   ============================================ */

const App = {
  /* ---- 初始化 ---- */
  init() {
    // 模块初始化
    NovelReader.init();
    Voting.init();

    // 标签切换
    document.querySelectorAll('.menu-item').forEach(btn => {
      btn.addEventListener('click', () => {
        this.switchTab(btn.dataset.tab);
      });
    });

    // URL 输入按钮
    document.getElementById('urlBtn').addEventListener('click', () => {
      this.openModal('urlModal');
    });

    // URL 抓取
    document.getElementById('urlFetchBtn').addEventListener('click', () => {
      const url = document.getElementById('urlInput').value.trim();
      if (!url) { alert('请输入网址'); return; }
      if (!/^https?:\/\//.test(url)) { alert('网址需要以 http:// 或 https:// 开头'); return; }
      this.closeModal('urlModal');
      document.getElementById('urlInput').value = '';
      NovelReader.loadFromUrl(url);
      this.switchTab('reader');
    });

    // 模态框关闭
    document.querySelectorAll('[data-close]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.closeModal(btn.dataset.close);
      });
    });

    // 点击遮罩关闭
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          overlay.classList.remove('show');
        }
      });
    });

    // Esc 关闭弹窗
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.show').forEach(o => o.classList.remove('show'));
      }
    });

    this.setStatus('就绪 · 欢迎摸鱼 🐟');
  },

  switchTab(tab) {
    document.querySelectorAll('.menu-item').forEach(b => {
      b.classList.toggle('active', b.dataset.tab === tab);
    });
    document.querySelectorAll('.view').forEach(v => {
      v.classList.toggle('active', v.id === 'view-' + tab);
    });

    if (tab === 'vote') {
      Voting.render();
      this.setStatus('批注');
    } else if (tab === 'reader') {
      this.setStatus('开始');
    } else if (tab === 'about') {
      this.setStatus('视图');
    }
  },

  openModal(id) {
    document.getElementById(id).classList.add('show');
  },

  closeModal(id) {
    document.getElementById(id).classList.remove('show');
  },

  setStatus(msg) {
    const el = document.getElementById('statusLeft');
    if (el) el.textContent = msg;
  }
};

// DOM 加载完成后启动
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
