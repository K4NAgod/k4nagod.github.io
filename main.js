/* ==========================================================================
   KANA / 369.GD — interaction layer
   No dependencies. All content remains readable without JavaScript.
   ========================================================================== */

(() => {
  "use strict";

  const root = document.documentElement;
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const $ = (selector, context = document) => context.querySelector(selector);
  const $$ = (selector, context = document) => Array.from(context.querySelectorAll(selector));

  /* ----- Current year & local clock -------------------------------------- */

  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  const clockEl = $("#localTime");
  if (clockEl) {
    const formatter = new Intl.DateTimeFormat("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });

    const updateClock = () => {
      const now = new Date();
      clockEl.textContent = formatter.format(now);
      clockEl.setAttribute("datetime", now.toISOString());
    };

    updateClock();
    window.setInterval(updateClock, 1000);
  }

  /* ----- Header progress, state & scroll spy ----------------------------- */

  const header = $("#siteHeader");
  const progress = $("#scrollProgress");
  const desktopNavLinks = $$(".desktop-nav a[data-nav]");
  const sectionEls = ["cosmos", "line", "about", "contact"]
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  let scrollTicking = false;

  const updateScrollUi = () => {
    scrollTicking = false;

    const scrollTop = window.scrollY || root.scrollTop;
    const scrollable = root.scrollHeight - window.innerHeight;
    const ratio = scrollable > 0 ? Math.min(1, Math.max(0, scrollTop / scrollable)) : 0;

    if (progress) progress.style.transform = `scaleX(${ratio})`;
    if (header) header.classList.toggle("is-scrolled", scrollTop > 8);

    let activeId = "";
    const marker = window.innerHeight * 0.3;
    sectionEls.forEach((section) => {
      if (section.getBoundingClientRect().top <= marker) activeId = section.id;
    });

    desktopNavLinks.forEach((link) => {
      const isActive = link.dataset.nav === activeId;
      link.classList.toggle("is-active", isActive);
      if (isActive) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
  };

  const requestScrollUpdate = () => {
    if (scrollTicking) return;
    scrollTicking = true;
    window.requestAnimationFrame(updateScrollUi);
  };

  window.addEventListener("scroll", requestScrollUpdate, { passive: true });
  window.addEventListener("resize", requestScrollUpdate, { passive: true });
  updateScrollUi();

  /* ----- Mobile menu ----------------------------------------------------- */

  const menuDialog = $("#menuDialog");
  const menuToggle = $("#menuToggle");
  const menuClose = $("#menuClose");

  if (menuDialog && menuToggle) {
    menuToggle.setAttribute("aria-expanded", "false");

    const openMenu = () => {
      if (!menuDialog.open) {
        if (typeof menuDialog.showModal === "function") menuDialog.showModal();
        else menuDialog.setAttribute("open", "");
      }
      document.body.classList.add("menu-open");
      menuToggle.setAttribute("aria-expanded", "true");
      const firstLink = $(".menu-nav a", menuDialog);
      if (firstLink) window.setTimeout(() => firstLink.focus(), 40);
    };

    const closeMenu = () => {
      if (menuDialog.open && typeof menuDialog.close === "function") menuDialog.close();
      else menuDialog.removeAttribute("open");
      document.body.classList.remove("menu-open");
      menuToggle.setAttribute("aria-expanded", "false");
    };

    menuToggle.addEventListener("click", openMenu);
    if (menuClose) menuClose.addEventListener("click", closeMenu);

    $$("a", menuDialog).forEach((link) => {
      link.addEventListener("click", closeMenu);
    });

    menuDialog.addEventListener("close", () => {
      document.body.classList.remove("menu-open");
      menuToggle.setAttribute("aria-expanded", "false");
    });

    // Clicking the native dialog backdrop (outside the inner panel).
    menuDialog.addEventListener("click", (event) => {
      if (event.target === menuDialog) closeMenu();
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 1100 && menuDialog.open) closeMenu();
    });
  }

  /* ----- Starfield ------------------------------------------------------- */

  const starfield = $("#starfield");
  if (starfield) {
    // A tiny seeded generator keeps the constellation stable between visits.
    let seed = 369;
    const random = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    const fragment = document.createDocumentFragment();
    for (let i = 0; i < 42; i += 1) {
      const star = document.createElement("span");
      const size = random() > 0.82 ? 3 : 2;
      star.className = "pixel-star" + (random() > 0.86 ? " is-orange" : "");
      star.style.left = `${(random() * 94 + 3).toFixed(2)}%`;
      star.style.top = `${(random() * 92 + 4).toFixed(2)}%`;
      star.style.width = `${size}px`;
      star.style.height = `${size}px`;
      star.style.setProperty("--star-duration", `${(2.8 + random() * 5.5).toFixed(2)}s`);
      star.style.setProperty("--star-delay", `${(random() * 4).toFixed(2)}s`);
      star.style.opacity = (0.2 + random() * 0.72).toFixed(2);
      fragment.appendChild(star);
    }
    starfield.appendChild(fragment);
  }

  /* ----- Scroll reveal --------------------------------------------------- */

  const revealEls = $$("[data-reveal]");

  if (revealEls.length) {
    if ("IntersectionObserver" in window && !prefersReducedMotion.matches) {
      revealEls.forEach((el, index) => {
        el.classList.add("reveal-pending");
        if (index < 5) {
          // A soft stagger for the hero without delaying later sections.
          el.style.transitionDelay = `${index * 65}ms`;
        }
      });

      const revealObserver = new IntersectionObserver(
        (entries, observer) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("is-revealed");
            observer.unobserve(entry.target);
          });
        },
        { threshold: 0.08, rootMargin: "0px 0px -7% 0px" }
      );

      revealEls.forEach((el) => revealObserver.observe(el));

      // Fail-safe: never leave content invisible.
      window.setTimeout(() => {
        revealEls.forEach((el) => {
          if (!el.classList.contains("is-revealed")) el.classList.add("is-revealed");
        });
      }, 4000);
    }
  }

  /* ----- 3 / 6 / 9 selector --------------------------------------------- */

  const keyButtons = $$(".key-cell");
  const readings = $$(".reading");
  const readingStatus = $("#readingStatus");

  const readingLabels = {
    3: "创造，CREATION",
    6: "和谐，HARMONY",
    9: "智慧，WISDOM",
  };

  const selectKey = (value, shouldFocus = false) => {
    const key = String(value);
    if (!readingLabels[key]) return;

    keyButtons.forEach((button) => {
      const isActive = button.dataset.key === key;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-expanded", String(isActive));
      if (isActive && shouldFocus) button.focus();
    });

    readings.forEach((reading) => {
      const isActive = reading.dataset.reading === key;
      if (isActive) {
        reading.hidden = false;
        reading.classList.remove("is-entering");
        // Restart the short entrance animation.
        void reading.offsetWidth;
        reading.classList.add("is-entering");
      } else {
        reading.hidden = true;
      }
    });

    if (readingStatus) {
      readingStatus.textContent = `正在显示数字 ${key}，${readingLabels[key]}。`;
    }
  };

  keyButtons.forEach((button, index) => {
    const key = button.dataset.key;
    const text = readingLabels[key] || "";
    button.setAttribute("aria-label", `数字 ${key}：${text}`);
    button.addEventListener("click", () => selectKey(key));

    button.addEventListener("keydown", (event) => {
      const lastIndex = keyButtons.length - 1;
      let nextIndex = null;

      if (event.key === "ArrowDown" || event.key === "ArrowRight") {
        nextIndex = index === lastIndex ? 0 : index + 1;
      } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
        nextIndex = index === 0 ? lastIndex : index - 1;
      } else if (event.key === "Home") {
        nextIndex = 0;
      } else if (event.key === "End") {
        nextIndex = lastIndex;
      }

      if (nextIndex !== null) {
        event.preventDefault();
        selectKey(keyButtons[nextIndex].dataset.key, true);
      }
    });
  });

  /* ----- Copy controls --------------------------------------------------- */

  const copyStatus = document.createElement("span");
  copyStatus.className = "sr-only";
  copyStatus.setAttribute("role", "status");
  copyStatus.setAttribute("aria-live", "polite");
  document.body.appendChild(copyStatus);

  const copyToast = $("#copyToast");
  const copyToastText = $("#copyToastText");
  const menuChannelStatus = $("#menuChannelStatus");
  let copyToastTimer = 0;
  let copyToastHideTimer = 0;

  const showCopyToast = (message) => {
    if (!copyToast) return;

    if (copyToastText) copyToastText.textContent = message;
    window.clearTimeout(copyToastTimer);
    window.clearTimeout(copyToastHideTimer);
    copyToast.hidden = false;
    // Retrigger the small entrance transition.
    void copyToast.offsetWidth;
    copyToast.classList.add("is-visible");

    copyToastTimer = window.setTimeout(() => {
      copyToast.classList.remove("is-visible");
      copyToastHideTimer = window.setTimeout(() => {
        copyToast.hidden = true;
      }, 260);
    }, 2200);
  };

  const fallbackCopy = (text) => {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "-1000px";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(0, text.length);

    let succeeded = false;
    try {
      succeeded = document.execCommand("copy");
    } catch (error) {
      succeeded = false;
    }

    textarea.remove();
    return succeeded;
  };

  const writeClipboard = async (text) => {
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (error) {
        // Fall through to the selection-based method.
      }
    }
    return fallbackCopy(text);
  };

  const copyEmailButton = $("#copyEmail");

  if (copyEmailButton) {
    const originalMarkup = copyEmailButton.innerHTML;
    let copyResetTimer = 0;

    copyEmailButton.addEventListener("click", async () => {
      const email = copyEmailButton.dataset.email;
      if (!email) return;

      const copied = await writeClipboard(email);
      window.clearTimeout(copyResetTimer);
      copyEmailButton.classList.toggle("is-copied", copied);
      copyEmailButton.textContent = copied ? "EMAIL COPIED" : "COPY FAILED";

      copyStatus.textContent = copied
        ? "电子邮箱地址已复制。"
        : "复制失败，请手动选择电子邮箱地址。";

      if (!copied) {
        const emailLink = $(".email-link");
        if (emailLink) emailLink.focus();
      }

      copyResetTimer = window.setTimeout(() => {
        copyEmailButton.innerHTML = originalMarkup;
        copyEmailButton.classList.remove("is-copied");
      }, 2400);
    });
  }

  // Generic copy controls: Discord handle in the desktop nav, mobile menu and
  // contact section. They all read from data-copy-value so the handle is only
  // written once in the markup.
  $$("[data-copy-value]").forEach((button) => {
    const cue = $("[data-copy-cue]", button);
    const originalCue = cue ? cue.textContent : "";
    let cueTimer = 0;
    let stateTimer = 0;

    button.addEventListener("click", async () => {
      const value = button.dataset.copyValue;
      if (!value) return;

      const label = button.dataset.copyLabel || "内容";
      const copied = await writeClipboard(value);
      const dialog = button.closest("dialog");

      button.classList.toggle("is-copied", copied);

      if (cue) {
        cue.textContent = copied ? "COPIED" : "RETRY";
        window.clearTimeout(cueTimer);
        cueTimer = window.setTimeout(() => {
          cue.textContent = originalCue;
          button.classList.remove("is-copied");
        }, 2200);
      }

      copyStatus.textContent = copied
        ? `${label}已复制。`
        : `复制失败，请手动选择${label}。`;

      if (dialog && dialog.open) {
        if (menuChannelStatus) {
          menuChannelStatus.textContent = copied
            ? `${label}已复制。`
            : `复制失败，请手动选择${label}。`;
        }
      } else {
        showCopyToast(copied ? `${label}已复制` : "复制失败，请手动复制");
      }

      window.clearTimeout(stateTimer);
      stateTimer = window.setTimeout(() => {
        button.classList.remove("is-copied");
      }, 2400);
    });
  });

  /* ----- 3 · 6 · 9 easter egg -------------------------------------------- */

  const orbitCard = $("#orbitCard");
  const toast = $("#keyToast");
  const toastClose = $("#toastClose");
  const keyHint = $("#keyHint");
  let keyBuffer = "";
  let keyBufferTimer = 0;
  let toastTimer = 0;
  let alignTimer = 0;

  const hideToast = () => {
    if (!toast || toast.hidden) return;
    toast.classList.remove("is-visible");
    window.setTimeout(() => {
      if (!toast.classList.contains("is-visible")) toast.hidden = true;
    }, 260);
    if (orbitCard) orbitCard.classList.remove("is-aligned");
  };

  const showToast = () => {
    if (!toast) return;

    window.clearTimeout(toastTimer);
    window.clearTimeout(alignTimer);

    toast.hidden = false;
    // Ensure the transition runs on repeat activations.
    void toast.offsetWidth;
    toast.classList.add("is-visible");

    if (orbitCard) {
      orbitCard.classList.add("is-aligned");
      alignTimer = window.setTimeout(() => orbitCard.classList.remove("is-aligned"), 4200);
    }

    toastTimer = window.setTimeout(hideToast, 5600);
  };

  if (toastClose) toastClose.addEventListener("click", hideToast);
  if (keyHint) keyHint.addEventListener("click", showToast);

  document.addEventListener("keydown", (event) => {
    if (event.defaultPrevented) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;

    if (event.key === "Escape" && toast && !toast.hidden) {
      hideToast();
      return;
    }

    const target = event.target;
    const isTyping =
      target instanceof HTMLElement &&
      (target.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
    if (isTyping || (menuDialog && menuDialog.open)) return;

    if (!/^[0-9]$/.test(event.key)) return;

    window.clearTimeout(keyBufferTimer);
    keyBuffer = (keyBuffer + event.key).slice(-8);

    if (keyBuffer.endsWith("369")) {
      keyBuffer = "";
      showToast();
      return;
    }

    keyBufferTimer = window.setTimeout(() => {
      keyBuffer = "";
    }, 1800);
  });
})();
