/* ============================================================
   AI Chat for Android — 站点交互
   原生 JS · 无依赖 · 无构建
   ============================================================ */
(() => {
  'use strict';

  /* ---------- 0. 工具 ---------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const raf = (fn) => requestAnimationFrame(fn);
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouch = window.matchMedia('(hover: none)').matches;
  const esc = (s) => String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  const REPO = 'zhaohairuiour/ai-chat-app';
  const BRANCH = 'main';
  const APK_FALLBACK = `https://github.com/${REPO}/releases/download/v3.32.104/ai-chat-app-v3.32.104-full-nokeys.apk`;
  const APK_FALLBACK_LITE = `https://github.com/${REPO}/releases/download/v3.32.104/ai-chat-app-v3.32.104-lite-nokeys.apk`;
  const APK_MIRRORS = [
    { id: 'com', name: 'gh-proxy.com', prefix: 'https://gh-proxy.com/' },
    { id: 'net', name: 'ghproxy.net', prefix: 'https://ghproxy.net/' }
  ];
  let apkTarget = APK_FALLBACK;
  let apkTargetLite = APK_FALLBACK_LITE;
  let apkSizeFull = 276387595;
  let apkSizeLite = 4470390;
  let dlVariant = 'full';
  const MANIFEST_MIRRORS = [
    `https://gh-proxy.com/https://raw.githubusercontent.com/${REPO}/${BRANCH}/version.json`,
    `https://ghproxy.net/https://raw.githubusercontent.com/${REPO}/${BRANCH}/version.json`,
    `https://raw.githubusercontent.com/${REPO}/${BRANCH}/version.json`
  ];

  /* ---------- 1. Toast ---------- */
  const toastEl = $('#toast');
  let toastTimer = 0;

  function toast(message, type = 'info', duration = 2600) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.className = 'toast is-show' +
      (type === 'error' ? ' is-error' : type === 'success' ? ' is-success' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('is-show'), duration);
  }

  /* ---------- 2. 复制 ---------- */
  async function copyText(text, okMsg = '已复制') {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
      }
      toast(okMsg, 'success');
      return true;
    } catch (_) {
      toast('复制失败，请手动选择', 'error');
      return false;
    }
  }

  /* ---------- 3. 按钮涟漪 ---------- */
  document.addEventListener('pointerdown', (e) => {
    const btn = e.target.closest('.btn');
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    btn.style.setProperty('--rx', `${e.clientX - rect.left}px`);
    btn.style.setProperty('--ry', `${e.clientY - rect.top}px`);
    btn.classList.add('is-ripple');
    setTimeout(() => btn.classList.remove('is-ripple'), 60);
  });

  /* ---------- 4. 顶栏 / 滚动进度 / 当前分区 ---------- */
  const hdr = $('#hdr');
  const scrollBar = $('#scrollBar');
  const toTop = $('#toTop');
  const ringFg = $('#ringFg');
  const navLinks = $$('.nav-link');
  const sections = $$('main section[id]');
  const RING_LEN = 100.5;

  let lastY = -1;
  let activeSection = '';
  let scrollRaf = 0;

  function onScroll() {
    scrollRaf = 0;
    const y = window.scrollY || window.pageYOffset;
    if (Math.abs(y - lastY) < 1) return;
    lastY = y;

    hdr?.classList.toggle('is-stuck', y > 8);

    const docH = document.documentElement.scrollHeight - window.innerHeight;
    const p = docH > 0 ? clamp(y / docH, 0, 1) : 0;
    if (scrollBar) scrollBar.style.width = `${p * 100}%`;
    if (toTop) toTop.classList.toggle('is-visible', y > 520);
    if (ringFg) ringFg.style.strokeDashoffset = String(RING_LEN - RING_LEN * p);

    let current = '';
    for (const sec of sections) {
      if (sec.offsetTop - 150 <= y) current = sec.id;
    }
    if (current !== activeSection) {
      activeSection = current;
      navLinks.forEach((a) => a.classList.toggle('is-active', a.dataset.nav === current));
    }
  }

  window.addEventListener('scroll', () => {
    if (!scrollRaf) scrollRaf = raf(onScroll);
  }, { passive: true });

  onScroll();

  toTop?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
  });

  /* ---------- 5. 移动端导航 ---------- */
  const menuBtn = $('#menuBtn');
  const nav = $('#nav');
  const navScrim = $('#navScrim');

  function setNav(open) {
    if (!nav || !menuBtn) return;
    nav.classList.toggle('is-open', open);
    navScrim?.classList.toggle('is-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? '关闭导航' : '打开导航');
    const use = $('use', menuBtn);
    if (use) use.setAttribute('href', open ? '#i-close' : '#i-menu');
  }

  menuBtn?.addEventListener('click', () => setNav(!nav.classList.contains('is-open')));
  navScrim?.addEventListener('click', () => setNav(false));
  navLinks.forEach((a) => a.addEventListener('click', () => setNav(false)));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setNav(false);
  });
  document.addEventListener('click', (e) => {
    if (!nav?.classList.contains('is-open')) return;
    if (e.target.closest('#nav') || e.target.closest('#menuBtn')) return;
    setNav(false);
  });

  /* ---------- 6. 揭示动画 ---------- */
  const revealEls = $$('.reveal');
  if ('IntersectionObserver' in window && !reduced) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -8% 0px' });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('is-in'));
  }

  /* ---------- 7. 数字滚动 ---------- */
  function animateCount(el) {
    const target = Number(el.dataset.count || 0);
    const plain = el.dataset.plain === '1';
    if (reduced) {
      el.textContent = plain ? String(target) : target.toLocaleString('en-US');
      return;
    }
    const t0 = performance.now();
    const dur = 1350;

    function tick(now) {
      const t = clamp((now - t0) / dur, 0, 1);
      const v = Math.round(target * (1 - Math.pow(1 - t, 3)));
      el.textContent = plain ? String(v) : v.toLocaleString('en-US');
      if (t < 1) raf(tick);
    }
    raf(tick);
  }

  const stats = $$('.stat-num');
  if ('IntersectionObserver' in window) {
    const statIo = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        animateCount(entry.target);
        statIo.unobserve(entry.target);
      });
    }, { threshold: 0.55 });
    stats.forEach((el) => statIo.observe(el));
  } else {
    stats.forEach(animateCount);
  }

  /* ---------- 8. 指针光晕 ---------- */
  const glow = $('#cursorGlow');
  if (glow && !isTouch && !reduced) {
    let tx = window.innerWidth / 2;
    let ty = window.innerHeight / 2;
    let cx = tx;
    let cy = ty;

    window.addEventListener('pointermove', (e) => {
      tx = e.clientX;
      ty = e.clientY;
      glow.style.opacity = '1';
    }, { passive: true });

    document.addEventListener('pointerleave', () => {
      glow.style.opacity = '0';
    });

    (function loop() {
      cx += (tx - cx) * 0.14;
      cy += (ty - cy) * 0.14;
      glow.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
      raf(loop);
    })();
  }

  /* ---------- 9. 卡片倾斜 + 聚光 ---------- */
  $$('.tilt').forEach((card) => {
    if (isTouch || reduced) return;
    let rect = null;

    card.addEventListener('pointerenter', () => {
      rect = card.getBoundingClientRect();
    });

    card.addEventListener('pointermove', (e) => {
      if (!rect) rect = card.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;
      card.style.setProperty('--mx', `${px * 100}%`);
      card.style.setProperty('--my', `${py * 100}%`);
      card.style.transform =
        `perspective(900px) rotateX(${(0.5 - py) * 4}deg) rotateY(${(px - 0.5) * 4}deg) translateY(-2px)`;
    });

    card.addEventListener('pointerleave', () => {
      card.style.transform = '';
      rect = null;
    });
  });

  /* ---------- 10. 背景粒子 ---------- */
  const canvas = $('#bgCanvas');
  if (canvas && !reduced) {
    const ctx = canvas.getContext('2d');
    let W = 0;
    let H = 0;
    let nodes = [];
    let running = true;
    const pointer = { x: -9999, y: -9999 };

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = clamp(Math.round((W * H) / 22000), 24, 84);
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.26,
        vy: (Math.random() - 0.5) * 0.26,
        r: Math.random() * 1.4 + 0.6
      }));
    }

    let resizeTimer = 0;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 160);
    });

    window.addEventListener('pointermove', (e) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
    }, { passive: true });

    window.addEventListener('pointerleave', () => {
      pointer.x = -9999;
      pointer.y = -9999;
    });

    function draw() {
      if (!running) return;
      ctx.clearRect(0, 0, W, H);

      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        a.x += a.vx;
        a.y += a.vy;

        if (a.x < -20) a.x = W + 20;
        if (a.x > W + 20) a.x = -20;
        if (a.y < -20) a.y = H + 20;
        if (a.y > H + 20) a.y = -20;

        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 15000) {
            ctx.strokeStyle = `rgba(120, 140, 255, ${(1 - d2 / 15000) * 0.13})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }

        const pdx = a.x - pointer.x;
        const pdy = a.y - pointer.y;
        const pd2 = pdx * pdx + pdy * pdy;
        if (pd2 < 26000) {
          ctx.strokeStyle = `rgba(77, 107, 254, ${(1 - pd2 / 26000) * 0.34})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(pointer.x, pointer.y);
          ctx.stroke();
        }

        ctx.fillStyle = 'rgba(170, 180, 220, 0.28)';
        ctx.beginPath();
        ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
        ctx.fill();
      }
      raf(draw);
    }

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        running = false;
      } else if (!running) {
        running = true;
        raf(draw);
      }
    });

    resize();
    raf(draw);
  }

  /* ---------- 11. 手机模型倾斜 ---------- */
  const phone = $('#phone');
  if (phone && !isTouch && !reduced) {
    const stage = phone.parentElement;
    stage?.addEventListener('pointermove', (e) => {
      const rect = stage.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      phone.style.transform = `rotateX(${-py * 7}deg) rotateY(${px * 9}deg)`;
    });
    stage?.addEventListener('pointerleave', () => {
      phone.style.transform = '';
    });
  }

  /* ---------- 12. 手机内迷你终端 ---------- */
  const miniBody = $('#miniTermBody');
  const miniState = $('#miniTermState');

  if (miniBody) {
    const script = [
      { prompt: 'openclaw doctor', lines: ['ok runtime   node 22', 'ok gateway   ready', '0 errors'] },
      { prompt: 'node -v', lines: ['v22.23.4'] },
      { prompt: 'openclaw agent run', lines: ['agent online', '12 tools loaded'] }
    ];
    let idx = 0;
    let gen = 0;

    async function typeText(text, cps, my) {
      for (let i = 0; i < text.length; i++) {
        if (my !== gen) return false;
        miniBody.textContent += text[i];
        await sleep(cps);
      }
      return true;
    }

    async function miniLoop() {
      while (true) {
        const my = gen;
        const item = script[idx % script.length];
        miniBody.textContent = '$ ';
        if (miniState) miniState.textContent = 'typing';
        if (!(await typeText(item.prompt, 42, my))) return;
        miniBody.textContent += '\n';
        if (miniState) miniState.textContent = 'running';
        await sleep(240);
        for (const line of item.lines) {
          if (!(await typeText(line, 16, my))) return;
          miniBody.textContent += '\n';
          await sleep(110);
        }
        if (miniState) miniState.textContent = 'ready';
        await sleep(1600);
        if (my !== gen) return;
        idx += 1;
      }
    }

    setTimeout(miniLoop, 800);

    document.addEventListener('visibilitychange', () => {
      gen += 1;
      if (!document.hidden) setTimeout(miniLoop, 500);
    });
  }

  /* ---------- 13. 终端对比演示 ---------- */
  const termBody = $('#termBody');
  const termModeEl = $('#termMode');
  const termSpeedBtn = $('#termSpeedBtn');
  const termReplay = $('#termReplay');
  const termTabs = $$('.term-tab');
  const cmdChips = $$('.cmd-chip');

  let termMode = 'after';
  let termCmd = 'openclaw doctor';
  let termSpeed = 1;
  let termRun = 0;

  const GARBLE = '[90m|[39mOpenClaw doctor[0m|[?2004h|[33m|[32mok[0m|[?2004l|';
  const DIM_NOTE = '（后续 214 行仍为逐字竖排，此处截断）';

  function beforeRows() {
    const rows = Array.from(GARBLE).map((ch) => {
      let cls = 't-err';
      if (ch === '|') cls = 't-err';
      else if ('[]?0123456789mlh'.includes(ch)) cls = 't-garble';
      return [{ t: ch, c: cls }];
    });
    rows.push([{ t: DIM_NOTE, c: 't-dim' }]);
    return rows;
  }

  function afterRows(cmd) {
    if (cmd === 'node -v') {
      return [[{ t: 'v22.23.4', c: 't-ok' }]];
    }
    if (cmd === 'openclaw --version') {
      return [[{ t: 'openclaw bundled', c: 't-ok' }, { t: ' · node v22.23.4', c: 't-dim' }]];
    }
    return [
      [{ t: 'OpenClaw doctor', c: 't-cmd' }],
      [{ t: '────────────────────────────────────────', c: 't-dim' }],
      [{ t: '  runtime      ', c: 't-dim' }, { t: 'node v22.23.4', c: 't-ok' }],
      [{ t: '  prefix       ', c: 't-dim' }, { t: '/data/…/files/usr', c: '' }],
      [{ t: '  gateway      ', c: 't-dim' }, { t: 'local · ready', c: 't-ok' }],
      [{ t: '  channels     ', c: 't-dim' }, { t: 'web · telegram', c: '' }],
      [{ t: '  providers    ', c: 't-dim' }, { t: 'zhipu · poixe · openrouter · agnes', c: '' }],
      [{ t: '  updater      ', c: 't-dim' }, { t: 'manifest v3.32.102 · mirror ok', c: 't-ok' }],
      [{ t: '────────────────────────────────────────', c: 't-dim' }],
      [{ t: '  0 errors · 0 warnings · plain text', c: 't-ok' }]
    ];
  }

  function playTerm(mode = termMode, cmd = termCmd) {
    if (!termBody) return;
    termMode = mode;
    termCmd = cmd;

    const my = ++termRun;
    termBody.innerHTML = '';

    if (termModeEl) {
      termModeEl.textContent = mode === 'before'
        ? '真实故障形态 · ESC 字节丢失后的残留'
        : '演示输出 · 已去除控制序列';
    }

    const prompt = document.createElement('div');
    prompt.className = 'term-line';
    const dollar = document.createElement('span');
    dollar.className = 't-dim';
    dollar.textContent = '$ ';
    const cmdText = document.createElement('span');
    cmdText.className = 't-cmd';
    cmdText.textContent = cmd;
    prompt.append(dollar, cmdText);
    termBody.appendChild(prompt);

    const rows = mode === 'before' ? beforeRows() : afterRows(cmd);
    let r = 0;
    let s = 0;
    let c = 0;
    let line = null;
    let caret = null;

    function newLine() {
      line = document.createElement('div');
      line.className = 'term-line';
      caret = document.createElement('span');
      caret.className = 'caret';
      line.appendChild(caret);
      termBody.appendChild(line);
    }

    newLine();

    function step() {
      if (my !== termRun) return;

      if (r >= rows.length) {
        caret?.remove();
        return;
      }

      const row = rows[r];

      if (s >= row.length) {
        caret?.remove();
        r += 1;
        s = 0;
        c = 0;
        if (r < rows.length) {
          setTimeout(() => {
            if (my !== termRun) return;
            newLine();
            step();
          }, 14 / termSpeed);
        }
        return;
      }

      const seg = row[s];
      let span = line.querySelector(`[data-s="${s}"]`);
      if (!span) {
        span = document.createElement('span');
        if (seg.c) span.className = seg.c;
        span.dataset.s = String(s);
        line.insertBefore(span, caret);
      }

      span.textContent = seg.t.slice(0, c + 1);
      c += 1;

      if (c >= seg.t.length) {
        s += 1;
        c = 0;
      }

      termBody.scrollTop = termBody.scrollHeight;
      setTimeout(step, (mode === 'before' ? 10 : 12) / termSpeed);
    }

    step();
  }

  termTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      termTabs.forEach((t) => {
        const on = t === tab;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-selected', String(on));
      });
      playTerm(tab.dataset.mode);
    });
  });

  termSpeedBtn?.addEventListener('click', () => {
    termSpeed = termSpeed === 1 ? 2 : termSpeed === 2 ? 4 : 1;
    termSpeedBtn.textContent = `${termSpeed}×`;
    toast(`打字速度 ${termSpeed}×`);
    if (termRun > 0) playTerm();
  });

  termReplay?.addEventListener('click', () => playTerm());

  cmdChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      cmdChips.forEach((c) => c.classList.remove('is-on'));
      chip.classList.add('is-on');
      playTerm(termMode, chip.dataset.cmd || 'openclaw doctor');
    });
  });

  if (termBody) {
    if ('IntersectionObserver' in window && !reduced) {
      let started = false;
      const termIo = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting || started) return;
          started = true;
          playTerm('after');
          termIo.disconnect();
        });
      }, { threshold: 0.28 });
      termIo.observe($('#termWindow') || termBody);
    } else {
      playTerm('after');
    }
  }

  /* ---------- 14. 架构图 ---------- */
  const ARCH = {
    webview: {
      kicker: 'LAYER 01',
      title: 'WebView UI',
      desc: 'Capacitor 把前端资源打进 <code>assets/public</code>，会话、终端、文件树都在这一层渲染；状态先落本地，再决定是否发出网络请求。',
      points: [
        '页面无框架、无构建，app.js 单文件承载状态与渲染',
        '终端按「同色片段」渲染，颜色全部来自程序自身的 SGR',
        '模型面板、附件、确认卡片复用同一套交互组件'
      ],
      file: 'py_project/public/app.js',
      code: `const IS_NATIVE = !!(window.Capacitor
  && window.Capacitor.isNativePlatform
  && window.Capacitor.isNativePlatform());

function getSandbox() {
  if (sandboxApi) return sandboxApi;
  if (!window.Capacitor) return null;

  sandboxApi = window.Capacitor
    .registerPlugin('Sandbox');
  return sandboxApi;
}`
    },
    bridge: {
      kicker: 'LAYER 02',
      title: 'Capacitor Bridge',
      desc: '前端用 <code>registerPlugin(&quot;Sandbox&quot;)</code> 拿到原生能力。命令输出经 <code>output</code> / <code>progress</code> 事件回推，下载进度走 <code>update-progress</code>。',
      points: [
        '事件名固定：output、progress、screen、update-progress',
        '返回值统一 JSObject，前端只取 path / versionCode 等字段',
        '原生 reject 后由前端 toast 兜底，不阻塞队列'
      ],
      file: 'MainActivity.java',
      code: `@Override
public void onCreate(Bundle saved) {
    super.onCreate(saved);
    registerPlugin(SandboxPlugin.class);
}

// 前端订阅输出
const sb = getSandbox();
sb.addListener('output', (ev) => {
    renderRunsInto(bubble, ev.runs);
    scrollToBottom();
});`
    },
    plugin: {
      kicker: 'LAYER 03',
      title: 'SandboxPlugin',
      desc: '一个 <code>@CapacitorPlugin</code> 管完执行、文件、解压、版本信息与 APK 安装。<code>exec</code> 负责拼命令、注入环境、起进程并持续读流。',
      points: [
        'exec 识别 openclaw 类 TUI 命令，降级为 dumb 终端',
        'streamReader 4096 字节读流，按完整 UTF-8 边界解码',
        'appInfo / downloadApk / installApk 支撑应用内更新'
      ],
      file: 'SandboxPlugin.java',
      code: `@PluginMethod
public void appInfo(PluginCall call) {
    PackageInfo pi = getContext()
        .getPackageManager()
        .getPackageInfo(
            getContext().getPackageName(), 0);

    JSObject ret = new JSObject();
    ret.put("versionName", pi.versionName);
    ret.put("versionCode", pi.versionCode);
    call.resolve(ret);
}`
    },
    termux: {
      kicker: 'LAYER 04',
      title: 'Termux PREFIX',
      desc: 'bootstrap 解包到应用私有目录，<code>PREFIX/bin/bash</code> 直接 exec。<code>apt</code>、<code>pkg</code>、<code>python</code>、<code>node</code> 共用这套前缀。',
      points: [
        'targetSdk 24 不受 W^X 限制，不需要 Root',
        'APT_CONFIG / DPKG_ADMINDIR 覆盖 com.termux 硬编码路径',
        'SHELL 指回 PREFIX/bin/bash，避免 script 解析 ENOENT'
      ],
      file: 'SandboxPlugin.java',
      code: `ProcessBuilder pb = new ProcessBuilder(
    prefixPath + "/bin/bash",
    "--noprofile", "--norc",
    "-c", execCmd);
pb.directory(workDir);

pb.environment().put("PREFIX", prefixPath);
pb.environment().put("PATH", pathVal);
pb.environment().put("HOME", homePath);
pb.environment().put("TMPDIR", tmpPath);
pb.environment().put("TERM", "xterm-256color");`
    },
    claw: {
      kicker: 'LAYER 05',
      title: 'OpenClaw CLI',
      desc: '随包分发的 <code>openclaw.mjs</code> 由 wrapper 转发到 <code>node_modules/openclaw</code>。首次启动写入 <code>PREFIX/bin/openclaw</code>，之后一条命令拉起智能体。',
      points: [
        'ensureOpenclawCli() 生成 wrapper 并加执行位',
        'agentRun 链路单独注入 NO_COLOR / CI / TZ',
        'doctor、agent run 共用同一套 Node 运行时'
      ],
      file: 'SandboxPlugin.java',
      code: `private void ensureOpenclawCli() {
    File cli = new File(prefix, "bin/openclaw");
    if (cli.exists()) return;

    String body = "#!/bin/bash\\n"
        + "exec " + prefix + "/bin/node "
        + prefix + "/opt/openclaw/openclaw.mjs "
        + "\\"$@\\"\\n";

    writeText(cli, body);
    chmod(cli, 0755);
}`
    },
    model: {
      kicker: 'LAYER 06',
      title: '模型 Provider',
      desc: '四路 OpenAI 兼容端点：智谱 GLM、Poixe、OpenRouter、Agnes。前端本地核心按「免费优先」排序，失败自动切下一路。',
      points: [
        'SSE 流式解析，正文 delta 与 thinking 分开回调',
        'Key 由环境变量或前端常量注入，仓库内保持为空',
        '模型面板只列免费模型，避免误触付费额度'
      ],
      file: 'py_project/public/local-core.js',
      code: `async function openaiCompatStream(opts) {
  const res = await fetch(opts.base + '/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + opts.key,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: opts.model,
      messages: opts.messages,
      stream: true
    }),
    signal: opts.signal
  });

  // 逐行读取 data: 前缀的 SSE 分片
  for await (const line of readLines(res.body)) {
    const delta = parseDelta(line);
    if (delta) opts.onDelta(delta);
  }
}`
    }
  };

  const archNodes = $$('.arch-node');
  const archKicker = $('#archKicker');
  const archTitle = $('#archTitle');
  const archDesc = $('#archDesc');
  const archPoints = $('#archPoints');
  const archCode = $('#archCode');
  const archCodeFile = $('#archCodeFile');
  const archCopy = $('#archCopy');

  function showArch(key) {
    const data = ARCH[key];
    if (!data) return;

    archNodes.forEach((node) => {
      const on = node.dataset.node === key;
      node.classList.toggle('is-active', on);
      node.setAttribute('aria-pressed', String(on));
    });

    if (archKicker) archKicker.textContent = data.kicker;
    if (archTitle) archTitle.textContent = data.title;
    if (archDesc) archDesc.innerHTML = data.desc;
    if (archCodeFile) archCodeFile.textContent = data.file;
    if (archCode) archCode.textContent = data.code;

    if (archPoints) {
      archPoints.innerHTML = '';
      data.points.forEach((p) => {
        const li = document.createElement('li');
        li.textContent = p;
        archPoints.appendChild(li);
      });
    }
  }

  archNodes.forEach((node) => {
    node.addEventListener('click', () => showArch(node.dataset.node));
  });

  archCopy?.addEventListener('click', () => {
    copyText(archCode?.textContent || '', '该层代码已复制');
  });

  if (archNodes.length) showArch('webview');

  /* ---------- 15. 更新检查器 ---------- */
  const updCurrent = $('#updCurrent');
  const updCheck = $('#updCheck');
  const updResult = $('#updResult');
  const jsonView = $('#jsonView');
  const cmpCurrent = $('#cmpCurrent');
  const cmpLatest = $('#cmpLatest');
  const cmpBar = $('#cmpBar');
  const cmpNote = $('#cmpNote');
  const updDownload = $('#updDownload');
  const dlSim = $('#dlSim');
  const dlFill = $('#dlFill');
  const dlPct = $('#dlPct');
  const dlLabel = $('#dlLabel');
  const dlFoot = $('#dlFoot');
  const copyManifest = $('#copyManifest');

  let currentManifest = null;
  let checking = false;
  let downloading = false;

  function setMirrorState(idx, state, ms) {
    const li = $(`#mirrorList li[data-mirror="${idx}"]`);
    if (!li) return;
    const status = $('.mirror-status', li);
    const msEl = $('.mirror-ms', li);
    if (!status || !msEl) return;
    const labels = { idle: '待命', loading: '请求中', ok: '命中', fail: '失败', skip: '跳过' };
    status.dataset.state = state;
    status.textContent = labels[state] || state;
    msEl.textContent = ms == null ? '—' : `${ms} ms`;
  }

  function renderJson(obj) {
    if (!jsonView) return;
    const text = JSON.stringify(obj, null, 2);
    let out = '';
    let last = 0;
    const re = /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|(-?\d+(?:\.\d+)?)/g;
    let m;

    while ((m = re.exec(text)) !== null) {
      out += esc(text.slice(last, m.index));
      if (m[1] !== undefined) {
        if (m[2] !== undefined) {
          out += `<span class="j-key">${esc(m[1])}</span>${m[2]}`;
        } else {
          out += `<span class="j-str">${esc(m[1])}</span>`;
        }
      } else if (m[3] !== undefined) {
        out += `<span class="j-bool">${m[3]}</span>`;
      } else if (m[4] !== undefined) {
        out += `<span class="j-num">${m[4]}</span>`;
      }
      last = m.index + m[0].length;
    }

    out += esc(text.slice(last));
    jsonView.innerHTML = out;
  }

  function currentMeta() {
    const code = Number(updCurrent?.value || 0);
    const opt = updCurrent?.selectedOptions?.[0];
    const name = opt ? String(opt.textContent).split('·')[0].trim() : '';
    return { code, name };
  }

  function compareVer(a, b) {
    const pa = String(a || '').split('.').map((x) => parseInt(x, 10) || 0);
    const pb = String(b || '').split('.').map((x) => parseInt(x, 10) || 0);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      const d = (pa[i] || 0) - (pb[i] || 0);
      if (d) return d;
    }
    return 0;
  }

  function resetDownloadUi() {
    downloading = false;
    dlSim?.classList.remove('is-active');
    if (dlFill) dlFill.style.width = '0%';
    if (dlPct) dlPct.textContent = '0%';
    if (dlLabel) dlLabel.textContent = '下载进度';
    if (dlFoot) dlFoot.textContent = '下载完成后由 FileProvider 拉起系统安装器。';
    if (updDownload) {
      updDownload.innerHTML =
        '<svg class="ic" aria-hidden="true"><use href="#i-download"/></svg>下载并安装（演示）';
    }
  }

  function applyManifest(manifest, silent = false) {
    currentManifest = manifest;
    const cur = currentMeta();
    const newCode = Number(manifest.versionCode || 0);
    const newName = String(manifest.versionName || '');

    const newer = cur.code > 0 && newCode > 0
      ? newCode > cur.code
      : compareVer(newName, cur.name) > 0;

    if (cmpCurrent) cmpCurrent.textContent = `build ${cur.code}`;
    if (cmpLatest) cmpLatest.textContent = `build ${newCode} · ${newName}`;

    if (cmpBar) {
      const ratio = newCode > 0 ? clamp((cur.code / newCode) * 100, 0, 100) : 100;
      cmpBar.style.width = newer ? `${ratio}%` : '100%';
      cmpBar.classList.toggle('is-latest', !newer);
    }

    if (cmpNote) {
      cmpNote.textContent = newer
        ? `versionCode ${cur.code} → ${newCode}，检测到新版本`
        : `versionCode ${cur.code} 已是最新，无需更新`;
    }

    if (updResult) {
      updResult.className = 'upd-result';
      updResult.innerHTML = '';

      const head = document.createElement('strong');
      head.innerHTML = newer
        ? '<svg class="ic" style="width:15px;height:15px;stroke-width:2" aria-hidden="true"><use href="#i-download"/></svg>'
        : '<svg class="ic" style="width:15px;height:15px;stroke-width:2" aria-hidden="true"><use href="#i-check"/></svg>';
      head.appendChild(document.createTextNode(newer ? `发现新版本 ${newName}` : '已是最新版本'));
      updResult.appendChild(head);

      const lines = newer
        ? [
            `当前 build ${cur.code} → 远端 build ${newCode}`,
            `apkUrl（镜像）: ${APK_MIRRORS[0].prefix}${manifest.apkUrl}`,
            manifest.notes ? `说明：${manifest.notes}` : ''
          ]
        : [
            `远端清单 ${newName} · build ${newCode}`,
            '静默检查时不会弹出任何提示'
          ];

      lines.filter(Boolean).forEach((line) => {
        const p = document.createElement('p');
        p.className = 'res-code';
        p.textContent = line;
        updResult.appendChild(p);
      });

      updResult.classList.add(newer ? 'is-new' : 'is-latest');
    }

    if (updDownload) updDownload.disabled = !newer;
    if (!newer) resetDownloadUi();

    if (!silent) toast(newer ? `发现新版本 ${newName}` : '已是最新版本', newer ? 'success' : 'info');
  }

  async function fetchJson(url, ms) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), ms);
    try {
      const res = await fetch(url, {
        signal: ctl.signal,
        cache: 'no-store'
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const txt = await res.text();
      return JSON.parse(txt);
    } finally {
      clearTimeout(timer);
    }
  }

  async function checkUpdate() {
    if (checking) return;
    checking = true;
    resetDownloadUi();

    resetMirrors();
    if (updCheck) {
      updCheck.disabled = true;
      updCheck.innerHTML = '<span class="pulse-dot"></span>正在请求清单…';
    }
    if (updResult) {
      updResult.className = 'upd-result';
      updResult.innerHTML = '<p class="upd-placeholder">依次请求三个源，首个成功即停。</p>';
    }
    if (cmpBar) cmpBar.style.width = '0%';

    let manifest = null;

    for (let i = 0; i < MANIFEST_MIRRORS.length; i++) {
      setMirrorState(i, 'loading', null);
      const t0 = performance.now();

      try {
        const data = await fetchJson(MANIFEST_MIRRORS[i], 9000);
        const ms = Math.round(performance.now() - t0);
        if (!data || !data.apkUrl) throw new Error('清单缺少 apkUrl');
        manifest = data;
        setMirrorState(i, 'ok', ms);
        for (let j = i + 1; j < MANIFEST_MIRRORS.length; j++) {
          setMirrorState(j, 'skip', null);
        }
        break;
      } catch (_) {
        setMirrorState(i, 'fail', Math.round(performance.now() - t0));
      }
    }

    if (updCheck) {
      updCheck.disabled = false;
      updCheck.innerHTML = '<svg class="ic" aria-hidden="true"><use href="#i-refresh"/></svg>重新检查';
    }

    if (!manifest) {
      if (updResult) {
        updResult.className = 'upd-result is-error';
        updResult.innerHTML =
          '<strong>全部镜像请求失败</strong><p class="res-code">可能是网络受限或镜像临时不可用</p><p class="res-code">应用内会回退到直连 raw.githubusercontent</p>';
      }
      if (jsonView) jsonView.innerHTML = '<span class="json-empty">// no response</span>';
      toast('更新检查失败：三个源均不可达', 'error', 3600);
      checking = false;
      return;
    }

    renderJson(manifest);
    applyManifest(manifest);
    checking = false;
  }

  function resetMirrors() {
    for (let i = 0; i < MANIFEST_MIRRORS.length; i++) {
      setMirrorState(i, 'idle', null);
    }
  }

  updCheck?.addEventListener('click', checkUpdate);

  updCurrent?.addEventListener('change', () => {
    if (currentManifest) {
      applyManifest(currentManifest, true);
      toast(`当前版本切换为 ${currentMeta().name}`);
    } else {
      const cur = currentMeta();
      if (cmpCurrent) cmpCurrent.textContent = `build ${cur.code}`;
      if (cmpNote) cmpNote.textContent = '已切换当前版本，点击检查更新';
    }
  });

  copyManifest?.addEventListener('click', () => {
    if (!currentManifest) {
      toast('尚未获取清单', 'error');
      return;
    }
    copyText(JSON.stringify(currentManifest, null, 2), 'version.json 已复制');
  });

  updDownload?.addEventListener('click', () => {
    if (!currentManifest || downloading) return;
    if (dlPct?.textContent === '100%') {
      toast('演示已完成，真实安装由系统安装器接管', 'info');
      return;
    }

    downloading = true;
    updDownload.disabled = true;
    dlSim?.classList.add('is-active');
    if (dlLabel) dlLabel.textContent = 'ghproxy.net · app-update.apk';
    if (dlFoot) dlFoot.textContent = '正在经 ghproxy.net 镜像前缀下载…';

    const sizeMB = 264.9;
    const dur = 3600;
    const t0 = performance.now();

    function tick(now) {
      const t = clamp((now - t0) / dur, 0, 1);
      const pct = Math.round(t * 100);
      if (dlFill) dlFill.style.width = `${pct}%`;
      if (dlPct) dlPct.textContent = `${pct}%`;
      if (dlFoot) {
        dlFoot.textContent = `${(sizeMB * t).toFixed(1)} MB / ${sizeMB} MB · 保存到 cacheDir/update/`;
      }

      if (t < 1) {
        raf(tick);
        return;
      }

      downloading = false;
      if (dlLabel) dlLabel.textContent = '下载完成';
      if (dlFoot) dlFoot.textContent = '已通过 ghproxy.net 镜像下载，FileProvider 拉起安装器（演示）';
      if (updDownload) {
        updDownload.disabled = false;
        updDownload.innerHTML =
          '<svg class="ic" aria-hidden="true"><use href="#i-check"/></svg>安装器已拉起（演示）';
      }
      toast('演示完成：真实安装会由系统安装器接管', 'success', 3600);
    }

    raf(tick);
  });

  /* ---------- 16. 页面载入时静默拉清单 ---------- */
  function applyLiveVersion(manifest) {
    if (!manifest) return;
    const name = String(manifest.versionName || '');
    const code = String(manifest.versionCode || '');

    if (name) {
      const pill = $('#verPillText');
      if (pill) pill.textContent = `v${name}`;
      const heroVer = $('#heroVer');
      if (heroVer) heroVer.textContent = `v${name}`;
      const finalVer = $('#finalVer');
      if (finalVer) finalVer.textContent = `v${name}`;
      const phoneVer = $('#phoneVer');
      if (phoneVer) phoneVer.textContent = name;
      const specVersion = $('#specVersion');
      if (specVersion) specVersion.textContent = name;
      const dlVer = $('#dlVer');
      if (dlVer) dlVer.textContent = name;
    }
    if (code) {
      const specBuild = $('#specBuild');
      if (specBuild) specBuild.textContent = code;
      const dlBuild = $('#dlBuild');
      if (dlBuild) dlBuild.textContent = code;
    }

    if (manifest.apkUrl) setApkTarget(String(manifest.apkUrl), manifest.apkUrlLite ? String(manifest.apkUrlLite) : null);
    if (Number(manifest.apkSize) > 0) apkSizeFull = Number(manifest.apkSize);
    if (Number(manifest.apkSizeLite) > 0) apkSizeLite = Number(manifest.apkSizeLite);
    const specSize = $('#specSize');
    if (specSize) specSize.textContent = `${fmtBytes(apkSizeFull)} 字节`;
    const specSizeLite = $('#specSizeLite');
    if (specSizeLite) specSizeLite.textContent = `${fmtBytes(apkSizeLite)} 字节`;
    applyDlVariant(dlVariant);

    if (updCurrent && code) {
      const exists = Array.from(updCurrent.options).some((o) => Number(o.value) === Number(code));
      if (!exists) {
        const opt = document.createElement('option');
        opt.value = code;
        opt.textContent = `${name} · build ${code} · 最新`;
        updCurrent.insertBefore(opt, updCurrent.firstChild);
      }
    }
  }

  (async () => {
    for (const url of MANIFEST_MIRRORS) {
      try {
        const data = await fetchJson(url, 8000);
        if (data && data.apkUrl) {
          applyLiveVersion(data);
          if (jsonView && !currentManifest) renderJson(data);
          return;
        }
      } catch (_) { /* 静默跳过 */ }
    }
  })();

  /* ---------- 17. 代码面板 ---------- */
  const CODE_SAMPLES = {
    exec: {
      lang: 'JAVA',
      file: 'SandboxPlugin.java',
      path: 'apk-build/android/app/src/main/java/com/aichat/app/SandboxPlugin.java',
      code: String.raw`// openclaw 等带 TUI/颜色的 CLI 在 xterm-256color 下会
// 输出 SGR 颜色与光标/备用屏控制序列；本桥接是行级模型，
// 解释不了光标定位，序列漏网后被逐字拆成竖排乱码。
// 这类命令强制纯文本：注入 dumb 终端、关闭颜色与交互。
final boolean tuiCli =
    cmd.matches("(?is).*\\bopenclaw\\b.*")
    || cmd.contains("openclaw.mjs");

if (tuiCli) {
    execCmd = execCmd.replaceAll(
        "(?is)^(\\s*openclaw)(\\s+)",
        "$1 --no-color$2");
}

// targetSdk=24 不受 W^X 限制，直接 exec PREFIX/bin/bash
ProcessBuilder pb = new ProcessBuilder(
        prefixPath + "/bin/bash", "--noprofile",
        "--norc", "-c", execCmd);
pb.directory(workDir);
pb.environment().put("PREFIX", prefixPath);
pb.environment().put("PATH", pathVal);
pb.environment().put("SHELL", prefixPath + "/bin/bash");
pb.environment().put("TERM", "xterm-256color");

if (tuiCli) {
    // 行级桥接无法承载 TUI：dumb 终端让 CLI 退化为纯文本流
    pb.environment().put("TERM", "dumb");
    pb.environment().put("NO_COLOR", "1");
    pb.environment().put("FORCE_COLOR", "0");
    pb.environment().put("CLICOLOR", "0");
    pb.environment().put("CI", "1");
    pb.environment().remove("COLORTERM");
}`
    },
    utf8: {
      lang: 'JAVA',
      file: 'SandboxPlugin.java',
      path: 'apk-build/android/app/src/main/java/com/aichat/app/SandboxPlugin.java',
      code: String.raw`/** 末尾不完整 UTF-8 序列的字节数：多字节字符若被读边界
 *  拆开，留到下一块再解码，避免半个字变替换符。 */
private static int trailingIncompleteUtf8(byte[] b, int len) {
    int i = len - 1, cont = 0;
    while (i >= 0 && (b[i] & 0xC0) == 0x80) {
        cont++;
        i--;
    }
    if (i < 0) return 0;

    int lead = b[i] & 0xFF;
    int need;
    if ((lead & 0x80) == 0)         need = 1;
    else if ((lead & 0xE0) == 0xC0) need = 2;
    else if ((lead & 0xF0) == 0xE0) need = 3;
    else if ((lead & 0xF8) == 0xF0) need = 4;
    else                            need = 1;

    int missing = need - cont - 1;
    return Math.max(0, missing);
}

while ((n = is.read(chunk)) != -1) {
    pending.write(chunk, 0, n);
    byte[] all = pending.toByteArray();
    int tail = trailingIncompleteUtf8(all, all.length);
    int decLen = all.length - tail;

    String seg = new String(all, 0, decLen,
            StandardCharsets.UTF_8);
    pending.reset();
    if (tail > 0) {
        pending.write(all, decLen, tail);
    }
    feedTermSeg(tb, csi, state, seg, stream, buf);
}`
    },
    ansi: {
      lang: 'JAVA',
      file: 'SandboxPlugin.java',
      path: 'apk-build/android/app/src/main/java/com/aichat/app/SandboxPlugin.java',
      code: String.raw`/** CSI 状态机漏掉的裸转义片段兜底剥离：ESC 丢失后
 *  残留的 "[90m"、"[?2004h" 等不再落到前端。 */
private static String stripResidualAnsi(String s) {
    if (s == null) return "";

    return s
        .replaceAll("\u001B\\[[0-9;?]*[ -/]*[@-~]", "")
        .replaceAll("\u001B\\][^\u0007\n]*\u0007", "")
        .replaceAll("\\[\\d+(?:;\\d+)*m", "")
        .replaceAll("\\[?\\??2004[hl]", "")
        .replaceAll("\\[\\?\\d*[hl]", "")
        .replaceAll("\\[[0-9;]*[JKH]", "")
        .replaceAll("[\u0000-\u0008\u000b\u000c"
                + "\u000e-\u001f]", "");
}

private void emitBuffer(String stream, TermBuf tb,
                        boolean fin) {
    String plain =
        stripResidualAnsi(tb.text.toString()).trim();
    if (!fin && plain.isEmpty()) return;

    JSArray runs = new JSArray();
    int i = 0;
    while (i < tb.text.length()) {
        int c = tb.colorAt(i);
        int j = i + 1;
        while (j < tb.text.length()
                && tb.colorAt(j) == c) j++;

        String seg = stripResidualAnsi(
                tb.text.substring(i, j));
        if (seg.isEmpty()) { i = j; continue; }

        if (c >= 0 && c <= 7) {
            JSObject run = new JSObject();
            run.put("t", seg);
            run.put("c", c);
            runs.put(run);
        } else {
            runs.put(seg);
        }
        i = j;
    }
}`
    },
    updater: {
      lang: 'JS',
      file: 'app.js',
      path: 'py_project/public/app.js',
      code: `const UPDATE_REPO = 'zhaohairuiour/ai-chat-app';
const UPDATE_BRANCH = 'main';

// 清单与 APK 都先走镜像前缀，末尾直连兜底
const MANIFEST_MIRRORS = [
  'https://ghproxy.net/https://raw.githubusercontent.com/'
    + UPDATE_REPO + '/' + UPDATE_BRANCH + '/version.json',
  'https://gh-proxy.com/https://raw.githubusercontent.com/'
    + UPDATE_REPO + '/' + UPDATE_BRANCH + '/version.json',
  'https://raw.githubusercontent.com/'
    + UPDATE_REPO + '/' + UPDATE_BRANCH + '/version.json'
];

const APK_MIRROR_PREFIXES = [
  'https://ghproxy.net/',
  'https://gh-proxy.com/',
  ''
];

async function fetchUpdateManifest() {
  let lastErr = null;
  for (const url of MANIFEST_MIRRORS) {
    try {
      const txt = await fetchTextTimeout(url, 12000);
      const j = JSON.parse(txt);
      if (j && j.apkUrl) return j;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('更新清单拉取失败');
}

async function checkAppUpdate(silent) {
  if (!IS_NATIVE) return;

  const manifest = await fetchUpdateManifest();
  const cur = await getSandbox().appInfo();

  const newCode = Number(manifest.versionCode) || 0;
  const curCode = Number(cur.versionCode) || 0;
  const newer = curCode > 0 && newCode > 0
    ? newCode > curCode
    : compareVer(manifest.versionName, cur.versionName) > 0;

  if (!newer) {
    if (!silent) toast('已是最新版本');
    return;
  }
  showUpdateDialog(manifest, cur);
}`
    }
  };

  const codeTabs = $$('.code-tab');
  const codeView = $('#codeView');
  const codeFileEl = $('#codePath');
  const codeDirEl = $('#codeDir');
  const codeLangEl = $('#codeLang');
  const codeSizeEl = $('#codeSize');
  const copyCodeBtn = $('#copyCode');

  let activeCode = 'exec';

  const JAVA_KEYWORDS = new Set([
    'public', 'private', 'protected', 'static', 'final', 'class', 'extends',
    'implements', 'new', 'return', 'if', 'else', 'for', 'while', 'do',
    'try', 'catch', 'finally', 'throw', 'throws', 'void', 'boolean', 'int',
    'byte', 'char', 'long', 'short', 'float', 'double', 'null', 'true',
    'false', 'this', 'super', 'import', 'package', 'interface', 'enum',
    'instanceof', 'break', 'continue', 'switch', 'case', 'default'
  ]);

  const JAVA_TYPES = new Set([
    'String', 'StringBuilder', 'ProcessBuilder', 'JSObject', 'JSArray',
    'PluginCall', 'PluginMethod', 'StandardCharsets', 'Math', 'File',
    'InputStream', 'FileOutputStream', 'HttpURLConnection', 'PackageInfo',
    'Intent', 'Uri', 'Throwable', 'Exception', 'ByteArrayOutputStream',
    'TermBuf'
  ]);

  const JS_KEYWORDS = new Set([
    'const', 'let', 'var', 'function', 'async', 'await', 'return', 'if',
    'else', 'for', 'of', 'in', 'new', 'throw', 'try', 'catch', 'finally',
    'class', 'extends', 'import', 'from', 'export', 'default', 'while',
    'break', 'continue', 'switch', 'case', 'typeof', 'instanceof', 'null',
    'true', 'false', 'void', 'delete', 'do'
  ]);

  function classify(token, lang) {
    if (token.startsWith('//') || token.startsWith('/*')) return 'tok-com';
    if (token.startsWith('"') || token.startsWith("'") || token.startsWith('`')) return 'tok-str';
    if (token.startsWith('@')) return 'tok-anno';
    if (/^\d/.test(token)) return 'tok-num';

    if (lang === 'JAVA') {
      if (JAVA_KEYWORDS.has(token)) return 'tok-kw';
      if (JAVA_TYPES.has(token)) return 'tok-type';
      if (/^[A-Z]/.test(token)) return 'tok-type';
      return 'tok-fn';
    }

    if (JS_KEYWORDS.has(token)) return 'tok-kw';
    if (/^[A-Z]/.test(token)) return 'tok-type';
    return 'tok-fn';
  }

  function highlight(code, lang) {
    const re = lang === 'JAVA'
      ? /\/\/[^\n]*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|@[A-Za-z]+|\b\d+\b|\b[A-Za-z_$][\w$]*\b/g
      : /\/\/[^\n]*|\/\*[\s\S]*?\*\/|'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`|\b\d+\b|\b[A-Za-z_$][\w$]*\b/g;

    let out = '';
    let last = 0;
    let m;

    while ((m = re.exec(code)) !== null) {
      out += esc(code.slice(last, m.index));
      out += `<span class="${classify(m[0], lang)}">${esc(m[0])}</span>`;
      last = m.index + m[0].length;
    }

    out += esc(code.slice(last));
    return out;
  }

  function renderCode(key) {
    const sample = CODE_SAMPLES[key];
    if (!sample || !codeView) return;

    activeCode = key;

    codeTabs.forEach((tab) => {
      const on = tab.dataset.tab === key;
      tab.classList.toggle('is-active', on);
      tab.setAttribute('aria-selected', String(on));
    });

    const html = highlight(sample.code, sample.lang);
    const lines = html.split('\n');
    const frag = document.createDocumentFragment();

    lines.forEach((line, i) => {
      const row = document.createElement('div');
      row.className = 'cl';

      const ln = document.createElement('span');
      ln.className = 'ln';
      ln.textContent = String(i + 1);

      const cc = document.createElement('span');
      cc.className = 'cc';
      cc.innerHTML = line || ' ';

      row.append(ln, cc);
      frag.appendChild(row);
    });

    codeView.innerHTML = '';
    codeView.appendChild(frag);

    if (codeFileEl) {
      codeFileEl.textContent = sample.file;
      codeFileEl.title = sample.path;
    }
    if (codeDirEl) {
      const cut = sample.path.lastIndexOf('/') + 1;
      codeDirEl.textContent = sample.path.slice(0, cut);
    }
    if (codeLangEl) codeLangEl.textContent = sample.lang;
    if (codeSizeEl) codeSizeEl.textContent = `${lines.length} 行`;
  }

  codeTabs.forEach((tab) => {
    tab.addEventListener('click', () => renderCode(tab.dataset.tab));
  });

  if (codeView) renderCode('exec');

  copyCodeBtn?.addEventListener('click', async () => {
    const sample = CODE_SAMPLES[activeCode];
    if (!sample) return;
    const ok = await copyText(sample.code, '代码已复制');
    if (!ok) return;

    copyCodeBtn.classList.add('is-copied');
    const label = $('span', copyCodeBtn);
    if (label) label.textContent = '已复制';

    setTimeout(() => {
      copyCodeBtn.classList.remove('is-copied');
      if (label) label.textContent = '复制';
    }, 1800);
  });

  codeView?.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      codeView.scrollTop += 28;
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      codeView.scrollTop -= 28;
      e.preventDefault();
    }
  });

  /* ---------- 18. 镜像下载弹窗 ---------- */
  function mirrorHref(prefix, target) {
    return target ? `${prefix}${target}` : '#';
  }

  function fmtBytes(n) {
    return Number(n || 0).toLocaleString('en-US');
  }

  function variantTarget(variant = dlVariant) {
    return variant === 'lite' ? apkTargetLite : apkTarget;
  }

  function applyDlVariant(variant = 'full') {
    dlVariant = variant === 'lite' ? 'lite' : 'full';
    const target = variantTarget();

    $$('[data-dl-mirror]').forEach((link) => {
      const mirror = APK_MIRRORS.find((m) => m.id === link.dataset.dlMirror);
      if (mirror) link.href = mirrorHref(mirror.prefix, target);
    });
    $$('[data-dl-open]').forEach((link) => {
      const v = link.dataset.dlOpen === 'lite' ? 'lite' : 'full';
      link.href = mirrorHref(APK_MIRRORS[0].prefix, variantTarget(v));
    });

    const kicker = $('#dlKicker');
    const desc = $('#dlDesc');
    const sizeLabel = dlVariant === 'lite' ? `${fmtBytes(apkSizeLite)} 字节（约 4.3 MB）` : `${fmtBytes(apkSizeFull)} 字节（约 264 MB）`;
    if (kicker) kicker.textContent = `${dlVariant === 'lite' ? '轻量版' : '完整版'} · APK · arm64-v8a · ${sizeLabel}`;
    if (desc) {
      desc.textContent = dlVariant === 'lite'
        ? '安装包只含应用本体。首次打开终端需联网下载约 29 MB，首次使用 OpenClaw 再下载约 240 MB，下载完成前无法断网使用；下载后同样可离线。两个版本签名一致，可互相覆盖安装。'
        : '两个地址指向同一个 Release 附件，均走 GitHub 镜像，不经过 GitHub 原站。哪个快用哪个。';
    }
    const subNet = $('#dlSubNet');
    const subCom = $('#dlSubCom');
    if (subNet) subNet.textContent = target ? `ghproxy.net/…/${target.split('/').pop()}` : 'ghproxy.net/…';
    if (subCom) subCom.textContent = target ? `gh-proxy.com/…/${target.split('/').pop()}` : 'gh-proxy.com/…';
  }

  function setApkTarget(url, liteUrl) {
    const ok = (u) => u && /^https:\/\/github\.com\/\S+\/releases\/download\/\S+\.apk$/i.test(u);
    if (ok(url)) apkTarget = url;
    if (ok(liteUrl)) apkTargetLite = liteUrl;
    applyDlVariant(dlVariant);
  }

  const dlModal = $('#dlModal');
  const dlPanel = $('.dl-modal-panel', dlModal || document);
  let dlLastFocus = null;

  function openDlModal(opener) {
    if (!dlModal) return;
    applyDlVariant(opener?.dataset?.dlOpen === 'lite' ? 'lite' : 'full');
    dlLastFocus = opener || document.activeElement;
    dlModal.classList.add('is-open');
    dlModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('dl-lock');
    setTimeout(() => dlPanel?.focus({ preventScroll: true }), 60);
  }

  function closeDlModal() {
    if (!dlModal) return;
    dlModal.classList.remove('is-open');
    dlModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('dl-lock');
    if (dlLastFocus && typeof dlLastFocus.focus === 'function') {
      dlLastFocus.focus({ preventScroll: true });
    }
  }

  $$('[data-dl-open]').forEach((link) => {
    link.addEventListener('click', (e) => {
      if (!dlModal) return;
      e.preventDefault();
      openDlModal(link);
    });
  });

  $('#dlClose')?.addEventListener('click', closeDlModal);

  dlModal?.addEventListener('click', (e) => {
    if (e.target.closest('[data-dl-close]')) closeDlModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && dlModal?.classList.contains('is-open')) {
      e.preventDefault();
      closeDlModal();
    }
  });

  dlModal?.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab' || !dlPanel) return;
    const items = $$('a[href], button:not([disabled])', dlPanel);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    const current = document.activeElement;

    if (e.shiftKey && (current === first || current === dlPanel)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && current === last) {
      e.preventDefault();
      first.focus();
    }
  });

  applyDlVariant('full');

  $$('[data-dl-mirror]').forEach((link) => {
    link.addEventListener('click', () => {
      const name = link.dataset.dlName || '镜像';
      setTimeout(() => {
        closeDlModal();
        toast(`正在通过 ${name} 镜像下载 APK`, 'success', 3200);
      }, 80);
    });
  });
})();
