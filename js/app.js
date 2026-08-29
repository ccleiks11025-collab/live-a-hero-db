/* ==========================================================================
   LIVE A HERO! スキル＆キャラ検索データベース
   【アプリ動的処理・ロジック】
   ========================================================================== */

/* 属性および役割の並び順定義 */
const ATTR_ORDER = { "火": 1, "水": 2, "木": 3, "光": 4, "影": 5 };
const ROLE_ORDER = { "攻撃": 1, "防御": 2, "回復": 3, "補助": 4, "弱体化": 5, "Spd操作": 6, "View獲得": 7, "特殊": 8 };

/* アプリ状態管理 (State) */
const state = {
  category: "all", // "all", "hero", "sidekick"
  searchKeyword: "",
  selectedAttr: "all",
  selectedType: "all",
  selectedObtain: "all",
  selectedTags: new Set(),
  tagsExpanded: false,
  sortBy: "id", // "id", "attribute", "type", "rarity", "name"
  sortAscending: true
};

/* DOM 要素参照 */
let elements = {};

/* 初期化 */
function initApp() {
  elements = {
    categoryTabs: document.getElementById('categoryTabs'),
    countAll: document.getElementById('countAll'),
    countHero: document.getElementById('countHero'),
    countSidekick: document.getElementById('countSidekick'),
    searchInput: document.getElementById('searchInput'),
    sortSelect: document.getElementById('sortSelect'),
    orderToggleBtn: document.getElementById('orderToggleBtn'),
    orderIcon: document.getElementById('orderIcon'),
    attrFilterGroup: document.getElementById('attrFilterGroup'),
    typeFilterGroup: document.getElementById('typeFilterGroup'),
    obtainFilterGroup: document.getElementById('obtainFilterGroup'),
    tagFilterGroup: document.getElementById('tagFilterGroup'),
    toggleTagsBtn: document.getElementById('toggleTagsBtn'),
    clearFiltersBtn: document.getElementById('clearFiltersBtn'),
    resultCount: document.getElementById('resultCount'),
    cardGrid: document.getElementById('cardGrid'),
    
    // モーダル
    detailModal: document.getElementById('detailModal'),
    modalBackBtn: document.getElementById('modalBackBtn'),
    modalCategoryBadge: document.getElementById('modalCategoryBadge'),
    modalIconContainer: document.getElementById('modalIconContainer'),
    modalCharName: document.getElementById('modalCharName'),
    modalAttrBadge: document.getElementById('modalAttrBadge'),
    modalTypeBadge: document.getElementById('modalTypeBadge'),
    modalRankBadge: document.getElementById('modalRankBadge'),
    modalIdBadge: document.getElementById('modalIdBadge'),
    modalOfficeBadge: document.getElementById('modalOfficeBadge'),
    modalCvBadge: document.getElementById('modalCvBadge'),
    modalObtainBadge: document.getElementById('modalObtainBadge'),
    modalCharSubtitle: document.getElementById('modalCharSubtitle'),
    heroStatsBox: document.getElementById('heroStatsBox'),
    statsBoxTitle: document.getElementById('statsBoxTitle'),
    heroStatsContent: document.getElementById('heroStatsContent'),
    skillsListContainer: document.getElementById('skillsListContainer'),

    // 用語解説モーダル
    effectModal: document.getElementById('effectModal'),
    effectModalName: document.getElementById('effectModalName'),
    effectModalCategory: document.getElementById('effectModalCategory'),
    effectModalDesc: document.getElementById('effectModalDesc'),
    effectModalCloseBtn: document.getElementById('effectModalCloseBtn'),
    effectModalBackBtn: document.getElementById('effectModalBackBtn')
  };

  updateCategoryCounts();
  renderTagFilters();
  renderCards();

  // イベントリスナー設定
  setupEventListeners();
}

/* 全キャラクターデータからタグを自動抽出して動的生成・展開制御 */
function renderTagFilters() {
  if (!elements.tagFilterGroup) return;
  const data = (typeof CHARACTER_DATA !== 'undefined' ? CHARACTER_DATA : window.CHARACTER_DATA) || [];
  
  // 全キャラのタグを集計（重複排除）
  const allTagsSet = new Set();
  data.forEach(c => {
    if (c.tags && Array.isArray(c.tags)) {
      c.tags.forEach(t => allTagsSet.add(t));
    }
  });
  const allTags = Array.from(allTagsSet).sort();

  if (allTags.length === 0) {
    elements.tagFilterGroup.innerHTML = '<span style="font-size: 0.85rem; color: var(--text-muted);">登録されているタグはありません</span>';
    if (elements.toggleTagsBtn) elements.toggleTagsBtn.style.display = 'none';
    return;
  }

  // 8個以上ある場合は折りたたみ制御
  const LIMIT = 8;
  const showAll = state.tagsExpanded || allTags.length <= LIMIT;
  const visibleTags = showAll ? allTags : allTags.slice(0, LIMIT);

  elements.tagFilterGroup.innerHTML = visibleTags.map(tag => {
    const isActive = state.selectedTags.has(tag) ? 'active' : '';
    return `<button class="chip-btn ${isActive}" data-tag="${tag}">${tag}</button>`;
  }).join('');

  if (elements.toggleTagsBtn) {
    if (allTags.length > LIMIT) {
      elements.toggleTagsBtn.style.display = 'inline-block';
      elements.toggleTagsBtn.textContent = state.tagsExpanded 
        ? '▲ タグを折りたたむ' 
        : `▼ タグをすべて表示 (${allTags.length}件)`;
    } else {
      elements.toggleTagsBtn.style.display = 'none';
    }
  }
}

function setupEventListeners() {
  // カテゴリータブ切替
  elements.categoryTabs.addEventListener('click', (e) => {
    const btn = e.target.closest('.tab-btn');
    if (!btn) return;
    
    elements.categoryTabs.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.category = btn.dataset.category;
    renderCards();
  });

  // 検索入力
  elements.searchInput.addEventListener('input', (e) => {
    state.searchKeyword = e.target.value.trim().toLowerCase();
    renderCards();
  });

  // ソート選択
  elements.sortSelect.addEventListener('change', (e) => {
    state.sortBy = e.target.value;
    renderCards();
  });

  // 昇順/降順切替
  if (elements.orderToggleBtn) {
    elements.orderToggleBtn.addEventListener('click', () => {
      state.sortAscending = !state.sortAscending;
      if (elements.orderIcon) elements.orderIcon.textContent = state.sortAscending ? '▲' : '▼';
      if (elements.orderToggleBtn.childNodes[2]) elements.orderToggleBtn.childNodes[2].textContent = state.sortAscending ? ' 昇順' : ' 降順';
      renderCards();
    });
  }

  // 属性フィルター
  elements.attrFilterGroup.addEventListener('click', (e) => {
    const btn = e.target.closest('.chip-btn');
    if (!btn) return;
    
    elements.attrFilterGroup.querySelectorAll('.chip-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.selectedAttr = btn.dataset.attr;
    renderCards();
  });

  // タイプフィルター
  elements.typeFilterGroup.addEventListener('click', (e) => {
    const btn = e.target.closest('.chip-btn');
    if (!btn) return;
    
    elements.typeFilterGroup.querySelectorAll('.chip-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.selectedType = btn.dataset.type;
    renderCards();
  });

  // 入手方法フィルター
  if (elements.obtainFilterGroup) {
    elements.obtainFilterGroup.addEventListener('click', (e) => {
      const btn = e.target.closest('.chip-btn');
      if (!btn) return;
      
      elements.obtainFilterGroup.querySelectorAll('.chip-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.selectedObtain = btn.dataset.obtain;
      renderCards();
    });
  }

  // タグフィルター (複数選択可能・動的生成)
  elements.tagFilterGroup.addEventListener('click', (e) => {
    const btn = e.target.closest('.chip-btn');
    if (!btn) return;
    
    const tag = btn.dataset.tag;
    if (state.selectedTags.has(tag)) {
      state.selectedTags.delete(tag);
      btn.classList.remove('active');
    } else {
      state.selectedTags.add(tag);
      btn.classList.add('active');
    }
    renderCards();
  });

  // タグ一覧の展開/折りたたみトグル
  if (elements.toggleTagsBtn) {
    elements.toggleTagsBtn.addEventListener('click', () => {
      state.tagsExpanded = !state.tagsExpanded;
      renderTagFilters();
    });
  }

  // フィルター全解除
  elements.clearFiltersBtn.addEventListener('click', () => {
    state.searchKeyword = "";
    state.selectedAttr = "all";
    state.selectedType = "all";
    state.selectedObtain = "all";
    state.selectedTags.clear();
    
    elements.searchInput.value = "";
    
    elements.attrFilterGroup.querySelectorAll('.chip-btn').forEach(b => b.classList.toggle('active', b.dataset.attr === 'all'));
    elements.typeFilterGroup.querySelectorAll('.chip-btn').forEach(b => b.classList.toggle('active', b.dataset.type === 'all'));
    if (elements.obtainFilterGroup) {
      elements.obtainFilterGroup.querySelectorAll('.chip-btn').forEach(b => b.classList.toggle('active', b.dataset.obtain === 'all'));
    }
    renderTagFilters();

    renderCards();
  });

  // モーダルイベント
  elements.modalBackBtn.addEventListener('click', closeModal);
  elements.detailModal.addEventListener('click', (e) => {
    if (e.target === elements.detailModal) closeModal();
  });

  // 用語解説モーダルイベント
  if (elements.effectModalCloseBtn) {
    elements.effectModalCloseBtn.addEventListener('click', closeEffectModal);
  }
  if (elements.effectModalBackBtn) {
    elements.effectModalBackBtn.addEventListener('click', popEffectState);
  }
  if (elements.effectModal) {
    elements.effectModal.addEventListener('click', (e) => {
      if (e.target === elements.effectModal) closeEffectModal();
    });
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (elements.effectModal && elements.effectModal.classList.contains('active')) {
        closeEffectModal();
      } else if (elements.detailModal && elements.detailModal.classList.contains('active')) {
        closeModal();
      }
    }
  });
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/* カスタム注釈辞書 (IDから単語と説明文を参照) */
const customEffectRegistry = {};
let customEffectCounter = 0;

function parseCustomInlineSyntax(text) {
  if (!text) return "";
  let result = "";
  let i = 0;

  while (i < text.length) {
    if (text[i] === '*') {
      const closeStar = text.indexOf('*', i + 1);
      if (closeStar !== -1 && (text[closeStar + 1] === '{' || text[closeStar + 1] === '｛')) {
        const word = text.substring(i + 1, closeStar);
        const openBracePos = closeStar + 1;
        const openChar = text[openBracePos];
        const closeChar = openChar === '{' ? '}' : '｝';

        let depth = 1;
        let j = openBracePos + 1;
        while (j < text.length && depth > 0) {
          if (text[j] === openChar) depth++;
          else if (text[j] === closeChar) depth--;
          j++;
        }

        if (depth === 0) {
          const desc = text.substring(openBracePos + 1, j - 1);
          const customId = `c_eff_${customEffectCounter++}`;
          customEffectRegistry[customId] = { word, desc };

          result += `<span class="effect-link" onclick="event.stopPropagation(); openCustomEffectModal('${customId}')">【${word}】</span>`;
          i = j;
          continue;
        }
      }
    }
    result += text[i];
    i++;
  }

  return result;
}

/* 用語・状態変化テキストの動的青文字リンク化処理 */
function highlightEffectKeywords(text) {
  if (!text) return "";

  // 1. カスタムインライン構文 *単語*{説明} のパース
  let processed = parseCustomInlineSyntax(text);

  // 2. 辞書キーワードのハイライト処理
  const dict = window.EFFECT_DICTIONARY || {};
  const keywords = Object.keys(dict).sort((a, b) => b.length - a.length);

  const placeholders = {};

  keywords.forEach((kw, index) => {
    const escaped = escapeRegExp(kw);
    const regex = new RegExp(`【?(${escaped})】?`, 'g');
    const ph = `__EFF_PH_${index}__`;
    placeholders[ph] = kw;
    processed = processed.replace(regex, ph);
  });

  Object.keys(placeholders).forEach(ph => {
    const kw = placeholders[ph];
    const regex = new RegExp(ph, 'g');
    processed = processed.replace(regex, `<span class="effect-link" onclick="event.stopPropagation(); openEffectModal('${kw}')">【${kw}】</span>`);
  });

  return processed;
}

/* ------------------------------------------------------------------------
   ネスト（階層化）ポップアップモーダル状態管理
   ------------------------------------------------------------------------ */
const effectModalHistory = [];
let currentEffectState = null;

function renderEffectModalState(stateObj) {
  if (!stateObj) return;
  if (elements.effectModalName) elements.effectModalName.textContent = stateObj.name;
  if (elements.effectModalCategory) elements.effectModalCategory.textContent = stateObj.category || "用語";
  
  // モーダルの文章自体にも再帰的に用語ハイライトを適用
  if (elements.effectModalDesc) {
    elements.effectModalDesc.innerHTML = highlightEffectKeywords(stateObj.desc);
  }

  if (elements.effectModalBackBtn) {
    elements.effectModalBackBtn.style.display = effectModalHistory.length > 0 ? 'inline-block' : 'none';
  }
}

function pushEffectState(name, category, desc) {
  if (currentEffectState) {
    effectModalHistory.push(currentEffectState);
  }
  currentEffectState = { name, category, desc };
  renderEffectModalState(currentEffectState);

  if (elements.effectModal) {
    elements.effectModal.classList.add('active');
  }
}

function popEffectState() {
  if (effectModalHistory.length > 0) {
    currentEffectState = effectModalHistory.pop();
    renderEffectModalState(currentEffectState);
  } else {
    closeEffectModal();
  }
}

/* 用語詳細モーダル表示 */
function openEffectModal(effectName) {
  const dict = window.EFFECT_DICTIONARY || {};
  const info = dict[effectName] || { category: "用語", description: "説明が見つかりません。" };
  pushEffectState(effectName, info.category || "用語", info.description || "");
}

/* カスタムテキスト詳細モーダル表示 (*単語*{説明}構文用) */
function openCustomEffectModal(customId) {
  const item = customEffectRegistry[customId] || { word: "補足", desc: "説明が見つかりません。" };
  pushEffectState(item.word, "スキル詳細補足", item.desc);
}

function closeEffectModal() {
  effectModalHistory.length = 0;
  currentEffectState = null;
  if (elements.effectModalBackBtn) elements.effectModalBackBtn.style.display = 'none';
  if (elements.effectModal) {
    elements.effectModal.classList.remove('active');
  }
}

function updateCategoryCounts() {
  const data = (typeof CHARACTER_DATA !== 'undefined' ? CHARACTER_DATA : window.CHARACTER_DATA) || [];
  if (elements.countAll) elements.countAll.textContent = data.length;
  if (elements.countHero) elements.countHero.textContent = data.filter(c => c.category === 'hero').length;
  if (elements.countSidekick) elements.countSidekick.textContent = data.filter(c => c.category === 'sidekick').length;
}

function getFilteredAndSortedCharacters() {
  const data = (typeof CHARACTER_DATA !== 'undefined' ? CHARACTER_DATA : window.CHARACTER_DATA) || [];
  let result = data.filter(char => {
    if (state.category !== "all" && char.category !== state.category) return false;
    if (state.selectedAttr !== "all" && char.attribute !== state.selectedAttr) return false;
    if (state.selectedType !== "all" && char.type !== state.selectedType) return false;
    if (state.selectedObtain !== "all" && (!char.obtain || !char.obtain.includes(state.selectedObtain))) return false;

    if (state.selectedTags.size > 0) {
      for (let tag of state.selectedTags) {
        if (!char.tags || !char.tags.includes(tag)) return false;
      }
    }

    if (state.searchKeyword !== "") {
      const kw = state.searchKeyword.toLowerCase();
      const matchName = char.name.toLowerCase().includes(kw);
      const matchType = char.type ? char.type.toLowerCase().includes(kw) : false;
      const matchAttr = char.attribute ? char.attribute.toLowerCase().includes(kw) : false;
      const matchOffice = char.office ? char.office.toLowerCase().includes(kw) : false;
      const matchCv = char.cv ? char.cv.toLowerCase().includes(kw) : false;
      const matchObtain = char.obtain ? char.obtain.toLowerCase().includes(kw) : false;
      const matchTags = char.tags && char.tags.some(t => t.toLowerCase().includes(kw));

      let matchSpecial = false;
      if (kw.includes("敵を対象")) {
        matchSpecial = char.skills && char.skills.some(s => s.description.includes("敵単体") || s.description.includes("敵全体") || s.description.includes("敵に"));
      } else if (kw.includes("味方を対象")) {
        matchSpecial = char.skills && char.skills.some(s => s.description.includes("味方単体") || s.description.includes("味方全体") || s.description.includes("自身"));
      } else if (kw.includes("第2スキル") || kw.includes("スキル2")) {
        matchSpecial = char.skills && char.skills.some(s => (s.description && (s.description.includes("第2スキル") || s.description.includes("スキル2"))) || (s.passiveDescription && (s.passiveDescription.includes("第2スキル") || s.passiveDescription.includes("スキル2"))));
      } else if (kw.includes("第3スキル") || kw.includes("スキル3")) {
        matchSpecial = char.skills && char.skills.some(s => (s.description && (s.description.includes("第3スキル") || s.description.includes("スキル3"))) || (s.passiveDescription && (s.passiveDescription.includes("第3スキル") || s.passiveDescription.includes("スキル3"))));
      }

      const matchSkills = char.skills && char.skills.some(s => 
        s.name.toLowerCase().includes(kw) || s.description.toLowerCase().includes(kw) || (s.passiveDescription && s.passiveDescription.toLowerCase().includes(kw))
      );

      if (!matchName && !matchType && !matchAttr && !matchOffice && !matchCv && !matchObtain && !matchTags && !matchSkills && !matchSpecial) return false;
    }

    return true;
  });

  result.sort((a, b) => {
    let valA, valB;
    switch (state.sortBy) {
      case 'attribute':
        valA = ATTR_ORDER[a.attribute] || 99;
        valB = ATTR_ORDER[b.attribute] || 99;
        break;
      case 'type':
        valA = ROLE_ORDER[a.type] || 99;
        valB = ROLE_ORDER[b.type] || 99;
        break;
      case 'rarity':
        valA = a.rarity || "";
        valB = b.rarity || "";
        break;
      case 'name':
        valA = a.name;
        valB = b.name;
        break;
      case 'id':
      default:
        valA = a.id;
        valB = b.id;
        break;
    }

    if (valA < valB) return state.sortAscending ? -1 : 1;
    if (valA > valB) return state.sortAscending ? 1 : -1;
    return 0;
  });

  return result;
}

function renderCards() {
  const chars = getFilteredAndSortedCharacters();
  if (elements.resultCount) elements.resultCount.textContent = chars.length;
  if (elements.cardGrid) elements.cardGrid.innerHTML = "";

  if (chars.length === 0) {
    elements.cardGrid.innerHTML = `
      <div class="empty-state">
        <div class="empty-title">条件に一致するキャラクターが見つかりません</div>
        <div class="empty-desc">検索キーワードを変更するか、フィルター条件を解除してみてください。</div>
      </div>
    `;
    return;
  }

  chars.forEach(char => {
    const card = document.createElement('div');
    card.className = 'char-card';
    card.onclick = () => openDetailModal(char);

    const subDir = char.category === 'sidekick' ? 'sidekick' : 'hero';
    const normId = (char.id || "").replace(/[−ー―–—]/g, '-');
    let iconPath = char.iconUrl || `images/${subDir}/id${normId}.png`;

    const initialLetter = char.name.charAt(0);
    // 画像読み込み失敗時はサブフォルダ・ルート直下・大文字小文字違いを順次フォールバック試行
    let iconInner = `<img src="${iconPath}" alt="${char.name}" class="icon-img" onerror="
      if (!this.dataset.retried) {
        this.dataset.retried = '1';
        this.src = 'images/${subDir}/${normId}.png';
      } else if (this.dataset.retried === '1') {
        this.dataset.retried = '2';
        this.src = 'images/id${normId}.png';
      } else if (this.dataset.retried === '2') {
        this.dataset.retried = '3';
        this.src = 'images/${normId}.png';
      } else {
        this.onerror = null;
        this.parentElement.innerHTML = '<div class=\\'icon-placeholder\\'>${initialLetter}</div>';
      }
    ">`;

    const categoryText = char.category === 'hero' ? 'HERO' : 'SIDEKICK';
    const categoryClass = char.category;

    const attrTagHtml = char.attribute 
      ? `<span class="card-attr-tag" style="background-color: ${getAttrColorVar(char.attribute)};">${char.attribute}</span>` 
      : '';

    const typeBadgeHtml = char.type 
      ? `<div class="char-type-badge">${char.type}</div>` 
      : '';

    card.innerHTML = `
      <span class="card-category-tag ${categoryClass}">${categoryText}</span>
      ${attrTagHtml}
      <div class="icon-container">
        ${iconInner}
      </div>
      <div class="char-name">${char.name}</div>
      ${typeBadgeHtml}
    `;

    elements.cardGrid.appendChild(card);
  });
}

function getAttrColorVar(attr) {
  switch (attr) {
    case '火': return 'var(--attr-fire)';
    case '水': return 'var(--attr-water)';
    case '木': return 'var(--attr-wood)';
    case '光': return 'var(--attr-light)';
    case '影': return 'var(--attr-shadow)';
    default: return 'var(--attr-none)';
  }
}

function openDetailModal(char) {
  if (elements.modalCharName) elements.modalCharName.textContent = char.name;
  
  if (elements.modalAttrBadge) {
    if (char.attribute) {
      elements.modalAttrBadge.style.display = 'inline-block';
      elements.modalAttrBadge.textContent = char.attribute;
      elements.modalAttrBadge.style.backgroundColor = getAttrColorVar(char.attribute);
      if (char.attribute === '光') elements.modalAttrBadge.style.color = '#000';
      else elements.modalAttrBadge.style.color = '#fff';
    } else {
      elements.modalAttrBadge.style.display = 'none';
    }
  }

  if (elements.modalTypeBadge) {
    if (char.type) {
      elements.modalTypeBadge.style.display = 'inline-block';
      elements.modalTypeBadge.textContent = char.type;
    } else {
      elements.modalTypeBadge.style.display = 'none';
    }
  }

  if (elements.modalIdBadge) elements.modalIdBadge.textContent = `ID: ${char.id}`;
  
  if (elements.modalRankBadge) {
    if (char.rank) {
      elements.modalRankBadge.style.display = 'inline-block';
      elements.modalRankBadge.textContent = `ランク ${char.rank}`;
    } else {
      elements.modalRankBadge.style.display = 'none';
    }
  }

  if (elements.modalOfficeBadge) {
    elements.modalOfficeBadge.textContent = `所属: ${char.office || '未設定'}`;
  }
  if (elements.modalCvBadge) {
    elements.modalCvBadge.textContent = `CV: ${char.cv || '未設定'}`;
  }
  if (elements.modalObtainBadge) {
    elements.modalObtainBadge.textContent = `入手: ${char.obtain || '未設定'}`;
  }
  
  if (elements.modalCharSubtitle) {
    if (char.tags && char.tags.length > 0) {
      const tagLinks = char.tags.map(t => highlightEffectKeywords(t)).join(', ');
      elements.modalCharSubtitle.innerHTML = `タグ: ${tagLinks}`;
    } else {
      elements.modalCharSubtitle.textContent = `タグ: なし`;
    }
  }

  // ステータス表示
  if (char.category === 'hero') {
    if (elements.modalCategoryBadge) {
      elements.modalCategoryBadge.textContent = 'ヒーロー';
      elements.modalCategoryBadge.style.backgroundColor = 'var(--accent-hero)';
    }
    if (elements.statsBoxTitle) elements.statsBoxTitle.textContent = '【基礎ステータス (LvMAX)】';
    
    if (char.stats) {
      if (elements.heroStatsBox) elements.heroStatsBox.style.display = 'block';
      if (elements.heroStatsContent) {
        elements.heroStatsContent.innerHTML = `
          <span><strong>HP:</strong> ${char.stats.HP || '-'}</span>
          <span><strong>ATK:</strong> ${char.stats.ATK || '-'}</span>
          <span><strong>SPD:</strong> ${char.stats.SPD || '-'}</span>
          <span><strong>View:</strong> ${char.stats.View || '-'}</span>
        `;
      }
    } else {
      if (elements.heroStatsBox) elements.heroStatsBox.style.display = 'none';
    }
  } else {
    if (elements.modalCategoryBadge) {
      elements.modalCategoryBadge.textContent = 'サイドキック';
      elements.modalCategoryBadge.style.backgroundColor = 'var(--accent-sidekick)';
    }
    if (elements.statsBoxTitle) elements.statsBoxTitle.textContent = '【装備ステータス補正 (最大強化時)】';
    
    if (char.equipStats) {
      if (elements.heroStatsBox) elements.heroStatsBox.style.display = 'block';
      if (elements.heroStatsContent) {
        elements.heroStatsContent.innerHTML = Object.entries(char.equipStats)
          .map(([stat, val]) => `<span><strong>${stat}:</strong> ${val}</span>`)
          .join('');
      }
    } else {
      if (elements.heroStatsBox) elements.heroStatsBox.style.display = 'none';
    }
  }

  const subDir = char.category === 'sidekick' ? 'sidekick' : 'hero';
  const normId = (char.id || "").replace(/[−ー―–—]/g, '-');
  let modalIconPath = char.iconUrl || `images/${subDir}/id${normId}.png`;
  const initialLetter = char.name.charAt(0);
  elements.modalIconContainer.innerHTML = `<img src="${modalIconPath}" alt="${char.name}" class="detail-icon-img" onerror="
    if (!this.dataset.retried) {
      this.dataset.retried = '1';
      this.src = 'images/${subDir}/${normId}.png';
    } else if (this.dataset.retried === '1') {
      this.dataset.retried = '2';
      this.src = 'images/id${normId}.png';
    } else if (this.dataset.retried === '2') {
      this.dataset.retried = '3';
      this.src = 'images/${normId}.png';
    } else {
      this.onerror = null;
      this.parentElement.innerHTML = '<div class=\\'icon-placeholder\\' style=\\'font-size: 3rem;\\'>${initialLetter}</div>';
    }
  ">`;

  elements.skillsListContainer.innerHTML = "";
  if (char.skills && char.skills.length > 0) {
    char.skills.forEach(skill => {
      const skillCard = document.createElement('div');
      skillCard.className = 'skill-card';

      // 装備スキルやパッシブスキルは消費VPを表示しない
      let vpBadge = "";
      const isPassiveOrEquip = skill.type === "装備スキル" || skill.type === "SKパッシブ";
      if (!isPassiveOrEquip && skill.vp !== undefined) {
        vpBadge = skill.vp > 0 
          ? `<span class="skill-vp-badge">消費VP: ${skill.vp}</span>` 
          : `<span class="skill-vp-badge" style="background-color: #f1f5f9; color: var(--text-muted);">消費VP: 0</span>`;
      }

      // パッシブ効果の併記枠 (用語の自動青文字リンク化)
      let passiveHtml = "";
      if (skill.passiveDescription) {
        const highlightedPassive = highlightEffectKeywords(skill.passiveDescription);
        passiveHtml = `<div style="margin-top: 8px; padding: 8px 12px; background-color: #fff7ed; border-left: 3px solid #f97316; border-radius: 6px; font-size: 0.88rem; color: #c2410c; font-weight: 500;"><strong>【パッシブ効果】</strong> ${highlightedPassive}</div>`;
      }

      const highlightedDesc = highlightEffectKeywords(skill.description);

      skillCard.innerHTML = `
        <div class="skill-header">
          <div class="skill-name-group">
            <span class="skill-type-label">${skill.type}</span>
            <span class="skill-name">${skill.name}</span>
          </div>
          ${vpBadge}
        </div>
        <div class="skill-desc">${highlightedDesc}</div>
        ${passiveHtml}
      `;
      elements.skillsListContainer.appendChild(skillCard);
    });
  } else {
    elements.skillsListContainer.innerHTML = `<div style="color: var(--text-muted); font-size: 0.9rem;">スキルデータが登録されていません。</div>`;
  }

  elements.detailModal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  elements.detailModal.classList.remove('active');
  document.body.style.overflow = '';
}

/* 1ファイル自動生成エクスポート機能 */

document.addEventListener('DOMContentLoaded', initApp);
