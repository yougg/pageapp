/**
 * PageApp PWA 注册与一键安装控制器
 * 支持自动探测根路径、Service Worker 注册、beforeinstallprompt 拦截与一键安装交互
 */
(function() {
  'use strict';

  // 检查是否已经在独立应用窗口（Standalone）模式中运行
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                       window.navigator.standalone === true;

  // 延迟提示对象
  let deferredPrompt = null;

  // 获取根路径前缀（通过当前脚本路径自动推导，适配二级目录与 GitHub Pages）
  function getBasePath() {
    const scriptEl = document.currentScript || document.querySelector('script[src*="pwa.js"]');
    if (scriptEl && scriptEl.src) {
      try {
        const url = new URL(scriptEl.src);
        const idx = url.pathname.lastIndexOf('/resources/js/pwa.js');
        if (idx !== -1) {
          return url.pathname.substring(0, idx + 1);
        }
      } catch (e) {
        console.warn('[PWA] 解析基准路径失败，使用默认相对路径', e);
      }
    }
    // 降级判断：当前是否在子目录
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    const hasSubdir = pathParts.length > 0 && !window.location.pathname.endsWith('/index.html') && !window.location.pathname.endsWith('/');
    return './';
  }

  // 注册 Service Worker
  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      console.log('[PWA] 当前浏览器不支持 Service Worker');
      return;
    }

    const basePath = getBasePath();
    const swUrl = basePath + 'sw.js';

    window.addEventListener('load', () => {
      navigator.serviceWorker.register(swUrl, { scope: basePath })
        .then((reg) => {
          console.log('[PWA] Service Worker 注册成功，作用域:', reg.scope);
          // 监听更新
          reg.addEventListener('updatefound', () => {
            const installingWorker = reg.installing;
            if (installingWorker) {
              installingWorker.addEventListener('statechange', () => {
                if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('[PWA] 检测到应用有新版本已就绪');
                }
              });
            }
          });
        })
        .catch((err) => {
          console.warn('[PWA] Service Worker 注册失败:', err);
        });
    });
  }

  // 显示所有安装按钮
  function showInstallButtons() {
    if (isStandalone) return;
    const btns = document.querySelectorAll('.pwa-install-btn, #btn-pwa-install');
    btns.forEach((btn) => {
      btn.style.display = 'inline-flex';
      btn.removeAttribute('hidden');
    });
  }

  // 隐藏所有安装按钮
  function hideInstallButtons() {
    const btns = document.querySelectorAll('.pwa-install-btn, #btn-pwa-install');
    btns.forEach((btn) => {
      btn.style.display = 'none';
      btn.setAttribute('hidden', '');
    });
  }

  // 触发安装流程
  async function triggerInstall() {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          console.log('[PWA] 用户接受了安装');
          deferredPrompt = null;
          hideInstallButtons();
        } else {
          console.log('[PWA] 用户取消了安装');
        }
      } catch (err) {
        console.warn('[PWA] 触发安装异常:', err);
      }
    } else {
      // 针对 iOS Safari 或其他不支持 beforeinstallprompt 的环境给出清晰操作指引
      const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
      if (isIOS) {
        alert('在 Safari 中安装为本地应用：\n1. 点击浏览器底部的【分享】按钮；\n2. 在弹出选项中选择【添加到主屏幕】。');
      } else {
        alert('若当前浏览器支持 PWA，您也可以直接点击浏览器地址栏右侧的【安装】图标完成安装。');
      }
    }
  }

  // 监听浏览器安装就绪事件
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    window.pwaDeferredPrompt = e;
    showInstallButtons();
  });

  // 监听安装完成事件
  window.addEventListener('appinstalled', () => {
    console.log('[PWA] PageApp 已成功安装到本地');
    deferredPrompt = null;
    window.pwaDeferredPrompt = null;
    hideInstallButtons();
  });

  // 初始化绑定按钮
  function initInstallButtons() {
    if (isStandalone) {
      hideInstallButtons();
      return;
    }

    const btns = document.querySelectorAll('.pwa-install-btn, #btn-pwa-install');
    btns.forEach((btn) => {
      // 避免重复绑定
      if (btn._pwaBound) return;
      btn._pwaBound = true;
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        triggerInstall();
      });
    });

    // iOS 设备即使没有 beforeinstallprompt 也可显示安装引导
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (isIOS && !isStandalone) {
      showInstallButtons();
    }
  }

  // 暴露全局 API
  window.PageAppPWA = {
    triggerInstall,
    isStandalone,
    getBasePath
  };

  // 启动注册与按钮初始化
  registerServiceWorker();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initInstallButtons);
  } else {
    initInstallButtons();
  }
})();
