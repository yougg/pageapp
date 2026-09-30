/**
 * PageApp 全局统一主题管理器
 * 支持:
 * 1. 默认自动匹配操作系统深色/浅色偏好
 * 2. 手动切换并持久化在 localStorage ('pageapp-theme')
 * 3. 页面初次加载防闪烁
 * 4. 监听系统设置无缝自适应
 * 5. 全局跨子页面无缝同步
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'pageapp-theme';

  // 1. 获取当前应生效的主题
  function getSystemTheme() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function getSavedTheme() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      return null;
    }
  }

  function getActiveTheme() {
    return document.documentElement.getAttribute('data-theme') || getSavedTheme() || getSystemTheme();
  }

  // 2. 应用主题到 DOM
  function applyTheme(theme, save = false) {
    const validTheme = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', validTheme);

    if (save) {
      try {
        localStorage.setItem(STORAGE_KEY, validTheme);
      } catch (e) {}
    }

    // 更新页面上的切换按钮状态
    updateToggleButtons(validTheme);

    // 触发全局自定义事件，方便各功能页面响应（如图表、Disqus等）
    try {
      window.dispatchEvent(new CustomEvent('pageapp:themechange', { detail: { theme: validTheme } }));
    } catch (e) {}

    // 如果当前页面有 Disqus，通知重载以自适应深浅色
    if (typeof DISQUS !== 'undefined') {
      try {
        DISQUS.reset({ reload: true });
      } catch (e) {}
    }

    return validTheme;
  }

  // 3. 更新切换按钮的文案与图标
  function updateToggleButtons(theme) {
    const buttons = document.querySelectorAll('.theme-toggle-btn, #btn-theme-toggle');
    buttons.forEach((btn) => {
      btn.setAttribute('data-current-theme', theme);
      btn.title = theme === 'dark' ? '当前为深色模式，点击切换至浅色' : '当前为浅色模式，点击切换至深色';

      const label = btn.querySelector('.theme-label-text, #theme-label-text');
      if (label) {
        label.textContent = theme === 'dark' ? '浅色' : '深色';
      }
    });
  }

  // 4. 切换深浅色
  function toggleTheme() {
    const current = getActiveTheme();
    const next = current === 'dark' ? 'light' : 'dark';
    return applyTheme(next, true);
  }

  // 5. 立即初始化（在脚本载入时执行，防止页面白闪）
  const initialTheme = getSavedTheme() || getSystemTheme();
  applyTheme(initialTheme, false);

  // 6. 监听系统偏好变更（仅当用户未手动指定时生效）
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
      if (!getSavedTheme()) {
        applyTheme(e.matches ? 'dark' : 'light', false);
      }
    });
  }

  // 7. DOM 准备好后绑定页面内的按钮
  function bindButtons() {
    updateToggleButtons(getActiveTheme());

    document.querySelectorAll('.theme-toggle-btn, #btn-theme-toggle').forEach((btn) => {
      // 避免重复绑定
      if (btn.dataset.themeBound) return;
      btn.dataset.themeBound = 'true';
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        toggleTheme();
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindButtons);
  } else {
    bindButtons();
  }

  // 暴露公共对象
  window.PageAppTheme = {
    get: getActiveTheme,
    set: applyTheme,
    toggle: toggleTheme,
    getSystem: getSystemTheme,
    initButtons: bindButtons
  };
})();
