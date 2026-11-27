/* Static tip menu site — loads pack.json; optional remote check only if checkUrl set */

(function () {
  "use strict";

  const PULSE_CHAIN = {
    chainId: "0x171",
    chainName: "PulseChain",
    nativeCurrency: { name: "Pulse", symbol: "PLS", decimals: 18 },
    rpcUrls: [
      "https://rpc.pulsechain.com",
      "https://pulsechain-rpc.publicnode.com",
    ],
    blockExplorerUrls: ["https://scan.pulsechain.com"],
  };

  function $(id) {
    return document.getElementById(id);
  }
  function text(el, v) {
    if (el) el.textContent = v == null ? "" : String(v);
  }

  let pack = null;
  let selectedId = null;
  let walletAccount = null;
  let payAllowed = false;
  let freshnessOk = false;
  let firstFailAt = null;
  let vizRaf = null;
  let vizSteps = [];
  let vizInterval = 400;
  let vizStart = 0;
  let wavePreview = null;

  const els = {
    gate: $("gate"),
    gateTitle: $("gate-title"),
    gateBody: $("gate-body"),
    warn: $("warn"),
    announce: $("status-announce"),
    packMeta: $("pack-meta"),
    tipWallet: $("tip-wallet"),
    chipFresh: $("chip-fresh"),
    chipRev: $("chip-rev"),
    exactTipLine: $("exact-tip-line"),
    ring: $("pulse-ring"),
    intensity: $("intensity-num"),
    stageLine: $("stage-line"),
    stageSub: $("stage-sub"),
    featured: $("featured"),
    grid: $("menu-grid"),
    tipToken: $("tip-token"),
    tipAmount: $("tip-amount"),
    tipAddress: $("tip-address"),
    tipStatus: $("tip-status"),
    btnConnect: $("btn-connect"),
    btnPay: $("btn-pay"),
    selName: $("sel-name"),
    selPrice: $("sel-price"),
    stickName: $("stick-name"),
    stickPrice: $("stick-price"),
    stickPay: $("stick-pay"),
  };

  let lastAnnounce = "";

  function announce(msg) {
    const t = String(msg || "").trim();
    if (!t || t === lastAnnounce) return;
    lastAnnounce = t;
    if (els.announce) {
      els.announce.textContent = "";
      setTimeout(function () {
        if (els.announce) els.announce.textContent = t;
      }, 30);
    }
  }

  function ensureWavePreview() {
    if (wavePreview) return wavePreview;
    const canvas = $("wave-canvas");
    if (!canvas || !window.ChainHapticWave) return null;
    wavePreview = window.ChainHapticWave.create(canvas, {
      scale20: false,
      onLevel: function (level8, amp01) {
        text(els.intensity, String(level8));
      },
    });
    return wavePreview;
  }

  function setStatus(msg, isErr) {
    text(els.tipStatus, msg || "");
    if (els.tipStatus) els.tipStatus.classList.toggle("is-err", Boolean(isErr));
  }

  function showGate(title, body) {
    if (els.gate) els.gate.hidden = false;
    text(els.gateTitle, title || "Menu locked");
    text(els.gateBody, body || "");
    payAllowed = false;
    updatePayButtons();
  }

  function hideGate() {
    if (els.gate) els.gate.hidden = true;
  }

  function showWarn(msg) {
    if (!els.warn) return;
    if (!msg) {
      els.warn.hidden = true;
      text(els.warn, "");
      return;
    }
    els.warn.hidden = false;
    text(els.warn, msg);
  }

  function formatUsd(u) {
    if (u == null || !Number.isFinite(Number(u))) return "";
    const n = Number(u);
    if (n >= 10) return "$" + (Math.round(n * 10) / 10).toFixed(1);
    return "$" + (Math.round(n * 100) / 100).toFixed(2);
  }

  function formatPls(p) {
    const n = Number(p);
    if (!Number.isFinite(n)) return String(p || "");
    if (n >= 1000) return Math.round(n).toLocaleString();
    return String(n);
  }

  function priceHeadline(it) {
    const usd = formatUsd(it.priceUsd);
    const asset = selectedToken();
    const sym = String((asset && asset.symbol) || pack.nativeSymbol || "PLS").toUpperCase();
    const stable = /^(E?DAI|E?USDC|E?USDT|USDC|USDT|DAI)$/.test(sym);
    if (usd && stable) return { primary: usd, secondary: "" };
    if (usd) {
      return {
        primary: usd,
        secondary: formatPls(it.price) + " " + (pack.nativeSymbol || "PLS"),
      };
    }
    return {
      primary: formatPls(it.price) + " " + (pack.nativeSymbol || "PLS"),
      secondary: "",
    };
  }

  function outcomeLine(it) {
    const bits = ["She feels this"];
    if (it.timeSec != null) bits.push(it.timeSec + "s");
    if (it.strokes != null) bits.push(it.strokes + " strokes");
    return bits.join(" · ");
  }

  /** Exact amount customers must send (host matches tips by amount). */
  function exactTipText(it) {
    if (!it) return "Pick a pattern — amount locks to the menu price";
    const ph = priceHeadline(it);
    const hum = tipHumanAmount(it);
    const tok = selectedToken();
    const sym = String((tok && tok.symbol) || pack.nativeSymbol || "PLS");
    if (ph.primary && ph.primary.charAt(0) === "$") {
      return (
        "Send exactly " +
        ph.primary +
        (ph.secondary ? " (" + ph.secondary + ")" : "") +
        " · wrong size won’t match"
      );
    }
    return (
      "Send exactly " +
      (hum != null ? hum : ph.primary || "?") +
      " " +
      sym +
      " · wrong size won’t match"
    );
  }

  function shortExactTip(it) {
    if (!it) return "";
    const ph = priceHeadline(it);
    const hum = tipHumanAmount(it);
    if (ph.primary && ph.primary.charAt(0) === "$") {
      return "Exactly " + ph.primary;
    }
    const tok = selectedToken();
    const sym = String((tok && tok.symbol) || pack.nativeSymbol || "PLS");
    return "Exactly " + (hum != null ? hum : ph.primary) + " " + sym;
  }

  function itemById(id) {
    return (pack.items || []).find(function (x) {
      return x.id === id;
    });
  }

  function isStableTok(sym) {
    return /^(E?DAI|E?USDC|E?USDT|USDC|USDT|DAI)$/.test(String(sym || "").toUpperCase());
  }

  function selectedToken() {
    if (!els.tipToken) return { kind: "native", symbol: pack.nativeSymbol || "PLS" };
    try {
      const v = els.tipToken.value;
      if (v === "native" || !v) return { kind: "native", symbol: pack.nativeSymbol || "PLS" };
      return JSON.parse(v);
    } catch {
      return { kind: "native", symbol: pack.nativeSymbol || "PLS" };
    }
  }

  function tipHumanAmount(it) {
    if (!it) return null;
    const tok = selectedToken();
    if (tok.kind === "token" && it.priceUsd != null && isStableTok(tok.symbol)) {
      return String(Math.round(Number(it.priceUsd) * 100) / 100);
    }
    return String(it.price);
  }

  function buildWaveSvg(steps, w, h) {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 " + w + " " + h);
    svg.setAttribute("class", "pattern-wave");
    const arr = steps && steps.length ? steps : [3, 5, 4];
    const n = arr.length;
    const padY = 4;
    const gap = 2;
    const barW = Math.max(2, (w - gap * (n - 1)) / n);
    const maxI = 8;
    for (let i = 0; i < n; i++) {
      const v = Math.max(0, Math.min(maxI, Number(arr[i]) || 0));
      const barH = ((h - padY * 2) * v) / maxI;
      const x = i * (barW + gap);
      const y = h - padY - barH;
      const rect = document.createElementNS(ns, "rect");
      rect.setAttribute("x", x.toFixed(2));
      rect.setAttribute("y", y.toFixed(2));
      rect.setAttribute("width", barW.toFixed(2));
      rect.setAttribute("height", Math.max(1, barH).toFixed(2));
      rect.setAttribute("rx", "1.5");
      rect.setAttribute("class", "pattern-bar");
      rect.dataset.i = String(i);
      svg.appendChild(rect);
    }
    return svg;
  }

  function stopViz() {
    if (vizRaf) cancelAnimationFrame(vizRaf);
    vizRaf = null;
    document.querySelectorAll(".pattern-bar.is-lit").forEach(function (el) {
      el.classList.remove("is-lit");
    });
    if (els.ring) els.ring.classList.remove("is-live");
    const wave = ensureWavePreview();
    if (wave) wave.stop({ toIdle: true });
  }

  function tickCardBars(now) {
    if (!vizSteps.length) return;
    const iv = Math.max(80, vizInterval);
    const cycle = vizSteps.length * iv;
    const step = Math.floor(((now - vizStart) % cycle) / iv) % vizSteps.length;
    document
      .querySelectorAll(".is-selected .pattern-bar, .is-playing .pattern-bar")
      .forEach(function (bar) {
        const i = Number(bar.dataset.i);
        if (i === step) bar.classList.add("is-lit");
        else bar.classList.remove("is-lit");
      });
    vizRaf = requestAnimationFrame(tickCardBars);
  }

  function startViz(it) {
    stopViz();
    if (!it) return;
    vizSteps = it.steps && it.steps.length ? it.steps : [3, 5, 4];
    vizInterval = Math.max(120, Number(it.intervalMs) || 400);
    vizStart = performance.now();
    const wave = ensureWavePreview();
    if (wave) {
      wave.start({
        steps: vizSteps,
        intervalMs: vizInterval,
        loop: true,
      });
    }
    vizRaf = requestAnimationFrame(tickCardBars);
  }

  function rankedItems() {
    return (pack.items || []).slice().sort(function (a, b) {
      const ua = Number(a.priceUsd);
      const ub = Number(b.priceUsd);
      if (Number.isFinite(ua) && Number.isFinite(ub) && ua !== ub) return ua - ub;
      return Number(a.price) - Number(b.price);
    });
  }

  function salesPicks() {
    const ranked = rankedItems();
    if (!ranked.length) return [];
    const byId = {};
    ranked.forEach(function (it) {
      byId[it.id] = it;
    });
    const popularAuto =
      ranked[Math.min(ranked.length - 1, Math.floor(ranked.length * 0.62))];
    const sci = ranked.filter(function (it) {
      return it.science || it.tag === "science";
    });
    const premiumAuto = sci.length
      ? sci[sci.length - 1]
      : ranked[ranked.length - 1];
    const signatureAuto = sci.length
      ? sci[Math.min(sci.length - 1, Math.floor(sci.length * 0.55))]
      : popularAuto;
    const f = (pack && pack.featured) || {};
    function pick(id, fb) {
      return id && byId[id] ? byId[id] : fb;
    }
    const premium = pick(f.premiumId, premiumAuto);
    const popular = pick(f.popularId, popularAuto);
    const signature = pick(f.signatureId, signatureAuto);
    return [
      { it: premium, role: "premium", label: "Biggest" },
      { it: popular, role: "popular", label: "Most pick this" },
      { it: signature, role: "signature", label: "Great pick" },
    ];
  }

  function makePick(it, role, label) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "pick" + (role === "popular" ? " is-popular" : "");
    btn.dataset.id = it.id;
    const ph = priceHeadline(it);

    const r = document.createElement("span");
    r.className = "role";
    r.textContent = label;
    const name = document.createElement("span");
    name.className = "pick-name";
    name.textContent = it.name;
    const wave = document.createElement("div");
    wave.className = "wave";
    wave.appendChild(buildWaveSvg(it.steps, 160, 32));
    const out = document.createElement("p");
    out.className = "outcome";
    out.textContent = outcomeLine(it);
    const price = document.createElement("span");
    price.className = "price";
    price.textContent = ph.primary;

    btn.appendChild(r);
    btn.appendChild(name);
    btn.appendChild(wave);
    btn.appendChild(out);
    const exact = document.createElement("p");
    exact.className = "exact-tip";
    exact.textContent = shortExactTip(it);
    btn.appendChild(exact);
    btn.appendChild(price);
    btn.addEventListener("click", function () {
      selectItem(it.id);
    });
    return btn;
  }

  function makeCard(it) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "card";
    card.dataset.id = it.id;
    const ph = priceHeadline(it);
    const h = document.createElement("h3");
    h.textContent = it.name;
    const wave = document.createElement("div");
    wave.className = "wave";
    wave.appendChild(buildWaveSvg(it.steps, 120, 32));
    const out = document.createElement("p");
    out.className = "outcome";
    out.textContent = outcomeLine(it);
    const exact = document.createElement("p");
    exact.className = "exact-tip";
    exact.textContent = shortExactTip(it);
    const price = document.createElement("span");
    price.className = "price";
    price.textContent = ph.primary;
    card.appendChild(h);
    card.appendChild(wave);
    card.appendChild(out);
    card.appendChild(exact);
    card.appendChild(price);
    if (ph.secondary) {
      const sec = document.createElement("span");
      sec.className = "price-sub";
      sec.textContent = ph.secondary;
      card.appendChild(sec);
    }
    card.addEventListener("click", function () {
      selectItem(it.id);
    });
    return card;
  }

  function renderMenu() {
    if (els.featured) {
      els.featured.textContent = "";
      const seen = {};
      salesPicks().forEach(function (row) {
        if (!row.it || seen[row.it.id]) return;
        seen[row.it.id] = true;
        els.featured.appendChild(makePick(row.it, row.role, row.label));
      });
    }
    if (els.grid) {
      els.grid.textContent = "";
      rankedItems().forEach(function (it) {
        els.grid.appendChild(makeCard(it));
      });
    }
  }

  function updatePayButtons() {
    const it = selectedId ? itemById(selectedId) : null;
    const ph = it ? priceHeadline(it) : null;
    const ready = Boolean(payAllowed && freshnessOk && it && walletAccount && pack.tipAddress);
    document.body.classList.toggle("pay-ready", ready);
    text(els.selName, it ? it.name : "No pattern");
    text(els.selPrice, ph ? ph.primary : "—");
    text(els.stickName, it ? it.name : payAllowed ? "Pick a pattern" : "Menu locked");
    text(els.stickPrice, ph ? ph.primary : "—");
    if (els.exactTipLine) {
      const line = exactTipText(it);
      text(els.exactTipLine, line);
      els.exactTipLine.classList.toggle("is-empty", !it);
    }

    let label = "Pay";
    let mode = "pick";
    if (!payAllowed || !freshnessOk) {
      label = "Menu locked";
      mode = "locked";
    } else if (!walletAccount) {
      label = "Connect wallet";
      mode = "connect";
    } else if (!it) {
      label = "Pick a pattern";
      mode = "pick";
    } else if (ph && ph.primary.charAt(0) === "$") {
      label = "Pay exactly " + ph.primary + " · feel it";
      mode = "pay";
    } else {
      const hum = tipHumanAmount(it);
      const tok = selectedToken();
      label =
        "Pay exactly " +
        (hum != null ? hum : "") +
        " " +
        ((tok && tok.symbol) || pack.nativeSymbol || "PLS") +
        " · feel it";
      mode = "pay";
    }
    if (els.btnPay) {
      els.btnPay.disabled = mode === "locked" || mode === "pick";
      els.btnPay.textContent = label;
      els.btnPay.dataset.mode = mode;
    }
    if (els.stickPay) {
      els.stickPay.disabled = mode === "locked";
      els.stickPay.textContent = mode === "pay" ? "Pay exact" : label;
      els.stickPay.dataset.mode = mode;
    }
  }

  function selectItem(id, opts) {
    opts = opts || {};
    const soft = opts.soft === true;
    if (!payAllowed || !freshnessOk) {
      setStatus("This menu is locked. Ask the host for a new pack.", true);
      announce("Menu locked — ask the host for a new pack");
      return;
    }
    const it = itemById(id);
    if (!it) return;
    selectedId = id;
    document.body.classList.toggle("soft-popular", soft);
    document.querySelectorAll(".card, .pick").forEach(function (el) {
      el.classList.toggle("is-selected", el.dataset.id === id);
      el.classList.toggle("is-playing", !soft && el.dataset.id === id);
    });
    const hum = tipHumanAmount(it);
    if (els.tipAmount && hum != null) els.tipAmount.value = hum;
    const ph = priceHeadline(it);
    if (soft) {
      stopViz();
      if (els.ring) {
        els.ring.classList.remove("is-live");
        els.ring.classList.add("is-popular-idle");
        els.ring.style.setProperty("--fill", "8%");
      }
      text(els.intensity, "·");
      text(els.stageLine, "Popular · " + it.name);
      text(els.stageSub, exactTipText(it) + " · tap card to preview");
      setStatus("Most pick this · " + shortExactTip(it) + " · tap for a preview");
      updatePayButtons();
      return;
    }
    if (els.ring) els.ring.classList.remove("is-popular-idle");
    text(els.stageLine, "Preview · " + it.name);
    text(els.stageSub, exactTipText(it));
    startViz(it);
    updatePayButtons();
    setStatus(
      "Preview · then send exactly " +
        (ph.primary || hum || "the listed amount")
    );
    announce("Selected " + it.name + ". " + shortExactTip(it));
  }

  function fillTokens() {
    if (!els.tipToken || !pack) return;
    const cur = els.tipToken.value;
    els.tipToken.textContent = "";
    const o0 = document.createElement("option");
    o0.value = "native";
    o0.textContent = pack.nativeSymbol || "PLS";
    els.tipToken.appendChild(o0);
    (pack.tipTokens || []).forEach(function (t) {
      if (!t.address) return;
      const o = document.createElement("option");
      o.value = JSON.stringify({
        kind: "token",
        symbol: t.symbol || "TOK",
        address: t.address,
        decimals: t.decimals != null ? t.decimals : 18,
      });
      o.textContent = t.symbol || "TOK";
      els.tipToken.appendChild(o);
    });
    if (cur) {
      for (let i = 0; i < els.tipToken.options.length; i++) {
        if (els.tipToken.options[i].value === cur) {
          els.tipToken.selectedIndex = i;
          break;
        }
      }
    }
  }

  function evaluateExpiryLocal() {
    if (!pack || !pack.expiresAt) return { ok: true };
    const exp = Date.parse(pack.expiresAt);
    if (!Number.isFinite(exp)) return { ok: true };
    const now = Date.now();
    if (now >= exp) {
      return {
        ok: false,
        hard: true,
        title: "Menu expired",
        message:
          "This tip menu expired. Ask the host for the current menu link.",
      };
    }
    const day = 24 * 3600 * 1000;
    if (exp - now < day) {
      return {
        ok: true,
        warn:
          "Menu expires " +
          new Date(exp).toLocaleString() +
          " — host may send a new link.",
      };
    }
    return { ok: true };
  }

  async function checkFreshness() {
    const local = evaluateExpiryLocal();
    if (local.hard) {
      freshnessOk = false;
      payAllowed = false;
      showGate(local.title, local.message);
      chipFresh("Expired", "bad");
      updatePayButtons();
      return;
    }
    if (local.warn) showWarn(local.warn);
    else showWarn("");

    const mode = String((pack && pack.freshness) || "").toLowerCase();
    const url = pack && pack.checkUrl;
    // Normal static deploy: pack.json is the menu — no remote active.json
    if (!url || mode === "none" || mode === "off" || mode === "disabled") {
      freshnessOk = true;
      payAllowed = true;
      hideGate();
      chipFresh("Menu ready", "ok");
      if (els.chipRev) els.chipRev.hidden = true;
      if (pack && pack.message) showWarn(String(pack.message));
      updatePayButtons();
      return;
    }

    chipFresh("Checking…", "");
    try {
      const r = await fetch(url, {
        cache: "no-store",
        mode: "cors",
        headers: { accept: "application/json" },
      });
      if (!r.ok) throw new Error("HTTP " + r.status);
      const active = await r.json();
      firstFailAt = null;

      if (active.revoked) {
        freshnessOk = false;
        payAllowed = false;
        showGate(
          "Menu closed",
          active.message ||
            "The host turned this tip menu off. Ask them for a new link."
        );
        chipFresh("Closed", "bad");
        updatePayButtons();
        return;
      }

      const remoteRev = Number(active.catalogRevision);
      const packRev = Number(pack.catalogRevision);
      if (Number.isFinite(remoteRev) && remoteRev !== packRev) {
        freshnessOk = false;
        payAllowed = false;
        showGate(
          "Prices changed",
          active.message ||
            "The host updated prices. Open the current tip menu link."
        );
        chipFresh("Need new menu", "bad");
        updatePayButtons();
        return;
      }

      if (active.expiresAt) {
        const exp = Date.parse(active.expiresAt);
        if (Number.isFinite(exp) && Date.now() >= exp) {
          freshnessOk = false;
          payAllowed = false;
          showGate(
            "Menu expired",
            active.message || "Session is over. Ask the host for a new menu."
          );
          chipFresh("Expired", "bad");
          updatePayButtons();
          return;
        }
      }

      freshnessOk = true;
      payAllowed = true;
      hideGate();
      chipFresh("Menu ready", "ok");
      if (els.chipRev) {
        els.chipRev.hidden = true;
      }
      if (active.message) showWarn(active.message);
      updatePayButtons();
    } catch (e) {
      const failMin = Number(pack.freshnessFailMinutes) || 5;
      if (firstFailAt == null) firstFailAt = Date.now();
      const elapsed = Date.now() - firstFailAt;
      const allowGrace = elapsed < failMin * 60 * 1000;
      if (!allowGrace || (pack.freshness || "required") === "required") {
        const strict = (pack.freshness || "required") === "required";
        if (strict) {
          freshnessOk = false;
          payAllowed = false;
          if (allowGrace) {
            showGate(
              "Can't confirm menu",
              "Need a moment online to make sure this menu is still open. Retrying…"
            );
            chipFresh("Offline", "warn");
          } else {
            showGate(
              "Can't confirm menu",
              "Couldn't reach the host's menu check for a while. Ask the host for the current tip link, or check your connection."
            );
            chipFresh("Offline lock", "bad");
          }
        } else {
          freshnessOk = local.ok;
          payAllowed = local.ok;
          chipFresh("Offline soft", "warn");
        }
      }
      updatePayButtons();
    }
  }

  function chipFresh(label, cls) {
    if (!els.chipFresh) return;
    text(els.chipFresh, label);
    els.chipFresh.className = "chip" + (cls ? " is-" + cls : "");
  }

  function getEthereum() {
    return typeof window !== "undefined" ? window.ethereum : null;
  }

  async function ensureChain() {
    const eth = getEthereum();
    if (!eth) throw new Error("Install MetaMask (or another wallet)");
    const chainId = Number(pack.chainId) || 369;
    const hex = "0x" + chainId.toString(16);
    try {
      await eth.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: hex }],
      });
    } catch (e) {
      if (e && (e.code === 4902 || String(e.message || "").includes("Unrecognized"))) {
        await eth.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: hex,
              chainName: PULSE_CHAIN.chainName,
              nativeCurrency: PULSE_CHAIN.nativeCurrency,
              rpcUrls: PULSE_CHAIN.rpcUrls,
              blockExplorerUrls: PULSE_CHAIN.blockExplorerUrls,
            },
          ],
        });
      } else throw e;
    }
  }

  async function connectWallet() {
    const eth = getEthereum();
    if (!eth) {
      setStatus("Install MetaMask to send tips.", true);
      return;
    }
    try {
      setStatus("Connecting…");
      await ensureChain();
      const accounts = await eth.request({ method: "eth_requestAccounts" });
      walletAccount = accounts && accounts[0] ? String(accounts[0]) : null;
      text(
        els.tipWallet,
        walletAccount
          ? "Connected: " + walletAccount.slice(0, 6) + "…" + walletAccount.slice(-4)
          : ""
      );
      if (els.btnConnect) {
        els.btnConnect.textContent = walletAccount
          ? walletAccount.slice(0, 6) + "…"
          : "Connect wallet";
      }
      setStatus(
        walletAccount
          ? "Wallet ready · pick a pattern · send the exact amount"
          : "No account"
      );
      if (walletAccount) announce("Wallet connected");
      updatePayButtons();
    } catch (e) {
      setStatus(e.message || String(e), true);
    }
  }

  function humanToWeiHex(human, decimals) {
    const s = String(human || "0").trim();
    if (!/^\d+(\.\d+)?$/.test(s)) throw new Error("Invalid amount");
    const parts = s.split(".");
    const whole = parts[0] || "0";
    let frac = parts[1] || "";
    if (frac.length > decimals) frac = frac.slice(0, decimals);
    while (frac.length < decimals) frac += "0";
    const raw = (whole + frac).replace(/^0+(?=\d)/, "") || "0";
    let bi = BigInt(raw);
    return "0x" + bi.toString(16);
  }

  async function sendTip() {
    if (!payAllowed || !freshnessOk) {
      setStatus("Menu locked — cannot pay with this menu.", true);
      return;
    }
    await checkFreshness();
    if (!payAllowed || !freshnessOk) return;

    const eth = getEthereum();
    if (!eth) {
      setStatus("No wallet found.", true);
      return;
    }
    const to = pack.tipAddress;
    if (!to) {
      setStatus("Tip address missing in this menu.", true);
      return;
    }
    const it = selectedId ? itemById(selectedId) : null;
    if (!it) {
      setStatus("Pick a pattern first.", true);
      return;
    }
    const hum = els.tipAmount ? els.tipAmount.value : tipHumanAmount(it);
    const tok = selectedToken();
    try {
      await ensureChain();
      if (!walletAccount) {
        await connectWallet();
        if (!walletAccount) return;
      }
      let tx;
      if (tok.kind === "token") {
        const dec = tok.decimals != null ? Number(tok.decimals) : 18;
        const value = humanToWeiHex(hum, dec);
        // ERC-20 transfer(address,uint256)
        const method =
          "0xa9059cbb" +
          String(to).replace(/^0x/, "").toLowerCase().padStart(64, "0") +
          BigInt(value).toString(16).padStart(64, "0");
        tx = {
          from: walletAccount,
          to: tok.address,
          data: method,
          value: "0x0",
        };
      } else {
        const value = humanToWeiHex(hum, 18);
        tx = {
          from: walletAccount,
          to: to,
          value: value,
        };
      }
      setStatus("Confirm in wallet…");
      const hash = await eth.request({
        method: "eth_sendTransaction",
        params: [tx],
      });
      setStatus(
        "Tip sent · " +
          String(hash).slice(0, 12) +
          "… host feels it when the chain confirms"
      );
      announce("Tip sent");
      text(els.stageLine, "Tip sent");
      text(els.stageSub, it.name + " · exact amount · host is watching the chain");
    } catch (e) {
      setStatus(e.message || String(e), true);
    }
  }

  function onPayClick() {
    const mode =
      (els.stickPay && els.stickPay.dataset.mode) ||
      (els.btnPay && els.btnPay.dataset.mode) ||
      "pay";
    if (mode === "locked") return;
    if (mode === "connect") {
      connectWallet();
      return;
    }
    if (mode === "pick") {
      setStatus("Pick a pattern first", true);
      return;
    }
    sendTip();
  }

  async function loadPack() {
    // 1) Embedded in export (works with file:// — no CORS fetch)
    if (typeof window !== "undefined" && window.__CHAIN_HAPTIC_PACK__) {
      return window.__CHAIN_HAPTIC_PACK__;
    }
    const el = document.getElementById("pack-data");
    if (el && el.textContent) {
      try {
        return JSON.parse(el.textContent);
      } catch {
        /* fall through */
      }
    }
    // 2) HTTP(S) / host /menu — fetch pack.json beside this page
    if (typeof location !== "undefined" && /^https?:/i.test(location.protocol)) {
      const r = await fetch("pack.json", { cache: "no-store" });
      if (!r.ok) {
        throw new Error(
          "pack.json missing — redeploy the tip menu or open /menu on the host"
        );
      }
      return r.json();
    }
    throw new Error(
      "This menu needs pack-data.js (re-export from Admin). Opening index.html from an old zip cannot load pack.json in the browser."
    );
  }

  async function boot() {
    try {
      pack = await loadPack();
      if (!pack || typeof pack !== "object") {
        throw new Error("Menu data empty");
      }
    } catch (e) {
      showGate(
        "Menu missing",
        (e && e.message) ||
          "Could not load the tip menu. Re-export from Admin, or open http://127.0.0.1:3847/menu on the host."
      );
      chipFresh("No menu", "bad");
      return;
    }

    text(
      els.packMeta,
      pack.expiresAt
        ? "Expires " + new Date(pack.expiresAt).toLocaleString()
        : "Live menu"
    );
    if (els.chipRev) {
      els.chipRev.hidden = true;
    }
    if (els.tipAddress) {
      text(
        els.tipAddress,
        pack.tipAddress
          ? pack.tipAddress.slice(0, 8) + "…" + pack.tipAddress.slice(-6)
          : "—"
      );
      els.tipAddress.title = pack.tipAddress || "";
    }

    fillTokens();
    renderMenu();
    ensureWavePreview();
    await checkFreshness();

    // Default popular selection if unlocked
    if (payAllowed && freshnessOk) {
      const picks = salesPicks();
      const pop = picks.find(function (p) {
        return p.role === "popular";
      });
      if (pop && pop.it) selectItem(pop.it.id, { soft: true });
    }

    // Re-check periodically
    setInterval(function () {
      checkFreshness();
    }, 60 * 1000);
  }

  if (els.btnConnect) els.btnConnect.addEventListener("click", connectWallet);
  if (els.btnPay) els.btnPay.addEventListener("click", onPayClick);
  if (els.stickPay) els.stickPay.addEventListener("click", onPayClick);
    if (els.tipToken) {
      els.tipToken.addEventListener("change", function () {
        if (selectedId) {
          const it = itemById(selectedId);
          const hum = tipHumanAmount(it);
          if (els.tipAmount && hum != null) els.tipAmount.value = hum;
          // refresh exact copy on cards/dock after token change
          renderMenu();
          if (selectedId) {
            document.querySelectorAll(".card, .pick").forEach(function (el) {
              el.classList.toggle("is-selected", el.dataset.id === selectedId);
            });
          }
          updatePayButtons();
        }
      });
    }

  const eth = getEthereum();
  if (eth && eth.on) {
    eth.on("accountsChanged", function (accs) {
      walletAccount = accs && accs[0] ? String(accs[0]) : null;
      text(
        els.tipWallet,
        walletAccount
          ? "Connected: " + walletAccount.slice(0, 6) + "…" + walletAccount.slice(-4)
          : ""
      );
      updatePayButtons();
    });
  }

  boot();
})();
