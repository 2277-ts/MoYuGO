/* ============================================
   Voting · 投票模块
   - 创建话题 / 投票 / 实时显示结果
   - 有 Firebase → 多人实时同步
   - 无 Firebase → 本地 localStorage 模拟
   ============================================ */

const Voting = {
  votes: [],          // [{id, topic, options:[{text, count}], createdAt, closed}]
  firebaseMode: false,

  /* ---- 初始化 ---- */
  init() {
    // 检查 Firebase 是否可用
    if (window.fbDb) {
      this.firebaseMode = true;
      this.listenFirebase();
      console.log('[Voting] 多人实时模式 ✅');
    } else {
      this.loadLocal();
      console.log('[Voting] 本地模拟模式 (配置 Firebase 后可多人实时投票)');
    }

    // 绑定创建按钮
    document.getElementById('createVoteBtn').addEventListener('click', () => {
      App.openModal('voteModal');
    });

    // 创建投票表单
    document.getElementById('addOptionBtn').addEventListener('click', () => {
      const container = document.getElementById('voteOptions');
      const inputs = container.querySelectorAll('input');
      if (inputs.length >= 6) {
        alert('最多 6 个选项哦');
        return;
      }
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = `选项 ${String.fromCharCode(65 + inputs.length)}`;
      container.appendChild(input);
    });

    document.getElementById('voteCreateBtn').addEventListener('click', () => {
      this.createVote();
    });
  },

  /* ---- 创建投票 ---- */
  createVote() {
    const topicEl = document.getElementById('voteTopic');
    const optionInputs = document.querySelectorAll('#voteOptions input');
    const topic = topicEl.value.trim();
    const options = Array.from(optionInputs)
      .map(i => i.value.trim())
      .filter(v => v.length > 0);

    if (!topic) { alert('请输入话题'); return; }
    if (options.length < 2) { alert('至少需要 2 个选项'); return; }

    const vote = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      topic,
      options: options.map(text => ({ text, count: 0 })),
      createdAt: Date.now(),
      closed: false,
      creator: this.uid()
    };

    if (this.firebaseMode) {
      window.fbDb.ref('votes/' + vote.id).set(vote);
    } else {
      this.votes.unshift(vote);
      this.saveLocal();
      this.render();
    }

    // 清空表单
    topicEl.value = '';
    const container = document.getElementById('voteOptions');
    container.innerHTML = '<input type="text" placeholder="选项 A" /><input type="text" placeholder="选项 B" />';

    App.closeModal('voteModal');
    App.setStatus(`批注已添加："${topic}"`);
  },

  /* ---- 投票 ---- */
  castVote(voteId, optionIndex) {
    // 防止重复投（本地 localStorage 记录）
    const votedKey = 'moyu_voted_' + voteId;
    if (localStorage.getItem(votedKey)) {
      alert('您已经对此批注做出过回复了');
      return;
    }

    if (this.firebaseMode) {
      const ref = window.fbDb.ref('votes/' + voteId + '/options/' + optionIndex + '/count');
      ref.transaction(current => (current || 0) + 1);
    } else {
      const vote = this.votes.find(v => v.id === voteId);
      if (!vote || vote.closed) return;
      vote.options[optionIndex].count++;
      this.saveLocal();
      this.render();
    }
    localStorage.setItem(votedKey, '1');
  },

  /* ---- 关闭投票 ---- */
  closeVote(voteId) {
    if (this.firebaseMode) {
      window.fbDb.ref('votes/' + voteId + '/closed').set(true);
    } else {
      const vote = this.votes.find(v => v.id === voteId);
      if (vote) { vote.closed = true; this.saveLocal(); this.render(); }
    }
  },

  /* ---- Firebase 实时监听 ---- */
  listenFirebase() {
    const ref = window.fbDb.ref('votes');
    ref.on('value', (snapshot) => {
      const data = snapshot.val() || {};
      this.votes = Object.values(data);
      // 按创建时间倒序
      this.votes.sort((a, b) => b.createdAt - a.createdAt);
      this.render();
    });
  },

  /* ---- localStorage 本地存储 ---- */
  loadLocal() {
    try {
      this.votes = JSON.parse(localStorage.getItem('moyu_votes') || '[]');
      this.render();
    } catch(e) { this.votes = []; }
  },

  saveLocal() {
    try {
      localStorage.setItem('moyu_votes', JSON.stringify(this.votes));
    } catch(e) {}
  },

  /* ---- 渲染投票列表 ---- */
  render() {
    const list = document.getElementById('voteList');
    if (!this.votes.length) {
      list.innerHTML = `
        <div class="empty-vote">
          <p>尚未添加批注</p>
        </div>`;
      return;
    }

    list.innerHTML = this.votes.map(vote => {
      const total = vote.options.reduce((s, o) => s + (o.count || 0), 0);
      const votedKey = 'moyu_voted_' + vote.id;
      const alreadyVoted = !!localStorage.getItem(votedKey);
      const closed = vote.closed;

      return `
        <div class="vote-card">
          <button class="btn-close-vote" data-id="${vote.id}" ${closed ? 'disabled' : ''} title="${closed ? '已关闭' : '关闭投票'}">${closed ? '⨯' : '⨯'}</button>
          <h3>${this.escapeHtml(vote.topic)}</h3>
          <div class="vote-meta">
            ${this.timeAgo(vote.createdAt)} · 共 ${total} 票
          </div>
          ${vote.options.map((opt, i) => {
            const pct = total > 0 ? Math.round((opt.count / total) * 100) : 0;
            const canClick = !closed && !alreadyVoted;
            return `
              <div class="vote-option ${canClick ? '' : 'selected'}" data-vote="${vote.id}" data-idx="${i}" ${canClick ? '' : 'style="cursor: default"'}>
                <div class="vote-bar-bg" style="width: ${pct}%"></div>
                <span>
                  ${String.fromCharCode(65 + i)}. ${this.escapeHtml(opt.text)}
                  <span class="vote-pct">${opt.count || 0} 票 (${pct}%)</span>
                </span>
              </div>
            `;
          }).join('')}
          <div class="vote-total">
            ${closed ? '（已关闭）' : (alreadyVoted ? '已回复' : '点击选项回复')}
          </div>
        </div>
      `;
    }).join('');

    // 绑定点击事件
    list.querySelectorAll('.vote-option').forEach(el => {
      el.addEventListener('click', () => {
        if (el.style.cursor === 'default') return;
        const voteId = el.dataset.vote;
        const idx = parseInt(el.dataset.idx);
        this.castVote(voteId, idx);
      });
    });

    // 绑定关闭按钮
    list.querySelectorAll('.btn-close-vote').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        if (confirm('确定关闭这个投票吗？')) {
          this.closeVote(btn.dataset.id);
        }
      });
    });
  },

  /* ---- 工具 ---- */
  uid() {
    return Math.random().toString(36).slice(2, 10);
  },

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  timeAgo(ts) {
    const diff = Date.now() - ts;
    const min = Math.floor(diff / 60000);
    if (min < 1) return '刚刚';
    if (min < 60) return `${min} 分钟前`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr} 小时前`;
    const day = Math.floor(hr / 24);
    return `${day} 天前`;
  }
};
