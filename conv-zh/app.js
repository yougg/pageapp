/**
 * 简繁转换前端交互逻辑
 */
document.addEventListener('DOMContentLoaded', () => {
  // 1. 初始化引擎
  if (!window.DICT_DATA || !window.ChineseConverter) {
    console.error('词典数据或转换引擎未加载成功');
    alert('资源加载失败，请检查 dict-data.js 与 convert.js 是否存在。');
    return;
  }

  const converter = new ChineseConverter(window.DICT_DATA);

  // 2. DOM 元素
  const inputText = document.getElementById('input-text');
  const outputContainer = document.getElementById('output-container');
  const btnS2T = document.getElementById('btn-s2t');
  const btnT2S = document.getElementById('btn-t2s');
  const btnSwap = document.getElementById('btn-swap');
  const chkDisambig = document.getElementById('chk-disambig');
  const chkHighlight = document.getElementById('chk-highlight');
  const sampleSelect = document.getElementById('sample-select');
  const btnCopy = document.getElementById('btn-copy');
  const btnClear = document.getElementById('btn-clear') || document.getElementById('btnClear');
  const btnExport = document.getElementById('btn-export');

  // 统计面板
  const statInputCount = document.getElementById('stat-input-count');
  const statConvertedCount = document.getElementById('stat-converted-count');
  const statPhraseCount = document.getElementById('stat-phrase-count');
  const statAmbiguousCount = document.getElementById('stat-ambiguous-count');

  // 候选字 Popover
  const popover = document.getElementById('candidate-popover');
  const popoverOrigChar = document.getElementById('popover-orig-char');
  const popoverSourceBadge = document.getElementById('popover-source-badge');
  const popoverCandCount = document.getElementById('popover-cand-count');
  const popoverCandidateList = document.getElementById('popover-candidate-list');
  const btnReplaceAll = document.getElementById('btn-replace-all');

  // 响应全局主题切换事件
  window.addEventListener('pageapp:themechange', (e) => {
    const isDark = e.detail && e.detail.theme === 'dark';
    showToast(isDark ? '已切换至深色模式' : '已切换至浅色模式');
  });

  // 3. 运行状态
  let currentDirection = 's2t'; // 's2t' 或 't2s'
  let currentTokens = [];
  let manualOverrides = new Map(); // tokenIndex -> newChar
  let activeTokenIndex = null;

  // 经典测试样例
  const SAMPLE_TEXTS = {
    disambig_sample_1: '皇后在前后端吃牛肉面，头发长了要去理发店，突然发生火灾。',
    disambig_sample_2: '台风吹过台湾写字台，舞台上的演员在微风中台步轻盈。',
    disambig_sample_3: '干杯之后继续干活，实干兴邦，吃了点饼干充饥。',
    disambig_sample_4: '复杂的数据需要复制并恢复，经过反复多次复查，终于复苏。',
    disambig_sample_5: '看著這本經典著作，心裡感到無比慰藉，藉口推託是沒有用的。',
    disambig_sample_6: '乾坤旋轉，他在休閒時間吃著乾脆的餅乾，喝著乾淨的水。'
  };

  // 4. 执行转换与渲染
  function runConversion() {
    const text = inputText.value;

    // 更新输入字数
    statInputCount.textContent = text.length;

    if (!text) {
      outputContainer.innerHTML = '<span class="empty-placeholder">转换结果将实时在此显示，支持高亮标注与点击一对多候选字自由切换...</span>';
      statConvertedCount.textContent = '0';
      statPhraseCount.textContent = '0';
      statAmbiguousCount.textContent = '0';
      currentTokens = [];
      manualOverrides.clear();
      hidePopover();
      return;
    }

    const enableDisambiguation = chkDisambig.checked;
    const highlightAmbiguous = chkHighlight.checked;

    // 执行结构化转换
    currentTokens = converter.convertStructured(text, {
      direction: currentDirection,
      enableDisambiguation: enableDisambiguation
    });

    // 统计指标
    let convertedChars = 0;
    let phraseMatches = new Set();
    let ambiguousCount = 0;

    outputContainer.innerHTML = '';
    const fragment = document.createDocumentFragment();

    currentTokens.forEach((token, index) => {
      // 检查是否有手动覆盖
      if (manualOverrides.has(index)) {
        token.converted = manualOverrides.get(index);
        token.isManuallyModified = true;
      }

      if (token.converted !== token.original) {
        convertedChars++;
      }
      if (token.fromPhrase && token.phraseMatch) {
        phraseMatches.add(token.phraseMatch);
      }
      if (token.isAmbiguous) {
        ambiguousCount++;
      }

      // 如果开启高亮并且属于一对多候选字
      if (highlightAmbiguous && token.isAmbiguous) {
        const span = document.createElement('span');
        span.className = 'token-ambiguous';
        if (token.isManuallyModified) {
          span.classList.add('token-manual-modified');
          span.title = `手动指定: ${token.original} -> ${token.converted} (点击修改)`;
        } else if (token.fromPhrase) {
          span.classList.add('token-resolved');
          span.title = `词组上下文消歧 [${token.phraseMatch}]: 选自 [${token.candidates.join(', ')}] (点击修改)`;
        } else {
          span.title = `存在一对多候选: [${token.candidates.join(', ')}] (点击修改)`;
        }

        span.textContent = token.converted;
        span.dataset.index = index;

        span.addEventListener('click', (e) => {
          e.stopPropagation();
          showPopover(index, span);
        });

        fragment.appendChild(span);
      } else {
        // 普通文本节点
        fragment.appendChild(document.createTextNode(token.converted));
      }
    });

    outputContainer.appendChild(fragment);

    // 更新统计栏
    statConvertedCount.textContent = convertedChars;
    statPhraseCount.textContent = phraseMatches.size;
    statAmbiguousCount.textContent = ambiguousCount;
  }

  // 获取当前输出纯文本
  function getOutputPlainText() {
    return currentTokens.map((t, idx) => {
      return manualOverrides.has(idx) ? manualOverrides.get(idx) : t.converted;
    }).join('');
  }

  // 5. 候选字 Popover 交互
  function showPopover(tokenIndex, targetElement) {
    const token = currentTokens[tokenIndex];
    if (!token || !token.candidates) return;

    activeTokenIndex = tokenIndex;
    popoverOrigChar.textContent = `「${token.original}」`;

    if (token.fromPhrase && token.phraseMatch) {
      popoverSourceBadge.textContent = `词组: ${token.phraseMatch}`;
      popoverSourceBadge.title = `匹配到上下文词组: ${token.phraseMatch}`;
      popoverSourceBadge.classList.remove('neutral');
    } else {
      popoverSourceBadge.textContent = '单字候选';
      popoverSourceBadge.title = '未匹配到长词组，根据字表推荐';
      popoverSourceBadge.classList.add('neutral');
    }

    popoverCandCount.textContent = `${token.candidates.length} 个候选`;
    popoverCandidateList.innerHTML = '';

    const currentVal = manualOverrides.has(tokenIndex) ? manualOverrides.get(tokenIndex) : token.converted;

    token.candidates.forEach((cand, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'candidate-btn' + (cand === currentVal ? ' active' : '');
      btn.innerHTML = `<span>${cand}</span><span class="tag">${idx === 0 ? '首选' : '备选'}</span>`;

      btn.addEventListener('click', () => {
        applyCandidate(tokenIndex, cand);
        hidePopover();
      });

      popoverCandidateList.appendChild(btn);
    });

    // 计算弹窗定位与防溢出
    const rect = targetElement.getBoundingClientRect();
    const popoverWidth = 270;
    const popoverHeight = 220;
    let left = rect.left + window.scrollX;
    let top = rect.bottom + window.scrollY + 6;

    // 防止右侧或左侧溢出视口
    if (left + popoverWidth > window.innerWidth - 16) {
      left = window.innerWidth - popoverWidth - 16;
    }
    if (left < 16) {
      left = 16;
    }

    // 若下方空间不足，则向上弹出
    if (rect.bottom + popoverHeight > window.innerHeight && rect.top > popoverHeight) {
      top = rect.top + window.scrollY - popoverHeight - 6;
    }

    popover.style.left = `${left}px`;
    popover.style.top = `${top}px`;
    popover.style.display = 'block';
  }

  function hidePopover() {
    popover.style.display = 'none';
    activeTokenIndex = null;
  }

  // 单字替换
  function applyCandidate(tokenIndex, newChar) {
    manualOverrides.set(tokenIndex, newChar);
    runConversion();
    showToast(`已将该字修改为「${newChar}」`);
  }

  // 全文替换所有相同字
  btnReplaceAll.addEventListener('click', () => {
    if (activeTokenIndex === null) return;
    const activeToken = currentTokens[activeTokenIndex];
    const targetOrig = activeToken.original;
    const currentVal = manualOverrides.has(activeTokenIndex) ? manualOverrides.get(activeTokenIndex) : activeToken.converted;

    let count = 0;
    currentTokens.forEach((t, idx) => {
      if (t.original === targetOrig && t.candidates && t.candidates.includes(currentVal)) {
        manualOverrides.set(idx, currentVal);
        count++;
      }
    });

    hidePopover();
    runConversion();
    showToast(`已将全文共 ${count} 处「${targetOrig}」统一替换为「${currentVal}」`);
  });

  // 点击外部关闭弹窗
  document.addEventListener('click', (e) => {
    if (!popover.contains(e.target) && !e.target.classList.contains('token-ambiguous')) {
      hidePopover();
    }
  });

  // 6. 事件监听与功能控制
  // 文本即时输入
  inputText.addEventListener('input', () => {
    manualOverrides.clear();
    runConversion();
  });

  // 方向切换：简转繁
  btnS2T.addEventListener('click', () => {
    if (currentDirection === 's2t') return;
    currentDirection = 's2t';
    btnS2T.classList.add('active');
    btnT2S.classList.remove('active');
    manualOverrides.clear();
    runConversion();
    showToast('已切换为「简体 → 繁体」模式');
  });

  // 方向切换：繁转简
  btnT2S.addEventListener('click', () => {
    if (currentDirection === 't2s') return;
    currentDirection = 't2s';
    btnT2S.classList.add('active');
    btnS2T.classList.remove('active');
    manualOverrides.clear();
    runConversion();
    showToast('已切换为「繁体 → 简体」模式');
  });

  // 交换输入与输出
  btnSwap.addEventListener('click', () => {
    const outText = getOutputPlainText();
    if (!outText) return;

    inputText.value = outText;
    // 切换方向
    if (currentDirection === 's2t') {
      currentDirection = 't2s';
      btnT2S.classList.add('active');
      btnS2T.classList.remove('active');
    } else {
      currentDirection = 's2t';
      btnS2T.classList.add('active');
      btnT2S.classList.remove('active');
    }

    manualOverrides.clear();
    runConversion();
    showToast('已交换输入输出内容及转换方向');
  });

  // 消歧开关
  chkDisambig.addEventListener('change', () => {
    manualOverrides.clear();
    runConversion();
    showToast(chkDisambig.checked ? '智能上下文消歧已开启' : '已关闭消歧（按字表默认转换）');
  });

  // 高亮开关
  chkHighlight.addEventListener('change', () => {
    runConversion();
  });

  // 样例选择
  sampleSelect.addEventListener('change', () => {
    const key = sampleSelect.value;
    if (key && SAMPLE_TEXTS[key]) {
      inputText.value = SAMPLE_TEXTS[key];
      // 样例 5 和 6 是繁体，自动切换为繁转简，其余为简转繁
      if (key === 'disambig_sample_5' || key === 'disambig_sample_6') {
        currentDirection = 't2s';
        btnT2S.classList.add('active');
        btnS2T.classList.remove('active');
      } else {
        currentDirection = 's2t';
        btnS2T.classList.add('active');
        btnT2S.classList.remove('active');
      }
      manualOverrides.clear();
      runConversion();
      showToast('已填入经典消歧测试例句');
      sampleSelect.value = '';
    }
  });

  // 一键复制
  btnCopy.addEventListener('click', async () => {
    const text = getOutputPlainText();
    if (!text) {
      showToast('暂无内容可复制');
      return;
    }

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      showToast('复制成功！');
    } catch (err) {
      console.error(err);
      showToast('复制失败，请手动选择复制');
    }
  });

  // 一键清空
  if (btnClear) {
    btnClear.addEventListener('click', () => {
      inputText.value = '';
      manualOverrides.clear();
      runConversion();
      showToast('已清空内容');
    });
  }

  // 导出文本文件
  if (btnExport) {
    btnExport.addEventListener('click', () => {
      const text = getOutputPlainText();
      if (!text) {
        showToast('暂无内容可导出');
        return;
      }

      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `convert_result_${currentDirection}_${Date.now()}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('已开始下载导出文件');
    });
  }

  // Toast 气泡提示
  function showToast(message) {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, 2200);
  }

  // 初始状态渲染占位符
  runConversion();
});
