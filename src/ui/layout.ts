import { APP_LOGO, APP_NAME, APP_VERSION, DONATION_ADDRESS } from '../version'
import { streamTipAlertPageHtml } from '../overlay'
import { LOVENSE_CONNECT_DOWNLOAD_URL } from '../device/lovense'

/** Full app shell HTML (pages + drawer + footer). */
export function appShellHtml(): string {
  return `
    <div class="atmosphere" aria-hidden="true"></div>
    <button
      type="button"
      class="menu-btn"
      id="btn-menu"
      aria-label="Menu"
      aria-expanded="false"
      aria-controls="app-drawer"
      title="Menu"
    >
      <span class="burger" aria-hidden="true"></span>
    </button>
    <div class="shell">
      <header class="brand-bar">
        <span class="menu-btn-slot" aria-hidden="true"></span>
        <button type="button" class="brand-lockup" id="btn-home-brand" title="Home" aria-label="Go to Home">
            <img
              class="brand-mark brand-mark-app"
              src="${APP_LOGO}"
              width="128"
              height="128"
              alt="${APP_NAME}"
              decoding="async"
            />
            <div class="brand-text">
              <p class="brand visually-hidden">${APP_NAME}</p>
              <p class="brand-chain">
                <span class="pls-dot" aria-hidden="true"></span>
                PulseChain tip-to-buzz
              </p>
            </div>
        </button>
        <div class="header-tools">
          <button
            type="button"
            class="btn primary btn-header-watch"
            id="btn-watch"
            title="Start or stop listening for tips and chain events"
            aria-pressed="false"
          >
            Start watching
          </button>
          <div class="link-lights" id="link-lights" role="status" aria-label="Toy connection">
          <span
            class="link-light"
            id="link-light-lovense"
            data-backend="lovense"
            title="Lovense Connect"
          >
            <svg class="link-light-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="currentColor"
                d="M12 20.4S4.8 15.6 4.8 10.1A4.4 4.4 0 0 1 12 6.6a4.4 4.4 0 0 1 7.2 3.5c0 5.5-7.2 10.3-7.2 10.3z"
              />
            </svg>
            <span class="visually-hidden">Lovense Connect</span>
          </span>
          <span
            class="link-light"
            id="link-light-lovense-remote"
            data-backend="lovense-remote"
            title="Lovense Remote"
          >
            <svg class="link-light-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M12 3v3M12 18v3M3 12h3M18 12h3M6.2 6.2l2.1 2.1M15.7 15.7l2.1 2.1M17.8 6.2l-2.1 2.1M8.3 15.7l-2.1 2.1"
              />
              <circle
                cx="12"
                cy="12"
                r="3.2"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              />
            </svg>
            <span class="visually-hidden">Lovense Remote</span>
          </span>
          <span
            class="link-light"
            id="link-light-bluetooth"
            data-backend="bluetooth"
            title="Bluetooth"
          >
            <svg class="link-light-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="none"
                stroke="currentColor"
                stroke-width="2.1"
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M7 7l10 10-5 5V2l5 5L7 17"
              />
            </svg>
            <span class="visually-hidden">Bluetooth</span>
          </span>
          <span
            class="link-light"
            id="link-light-intiface"
            data-backend="intiface"
            title="Intiface"
          >
            <svg class="link-light-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="none"
                stroke="currentColor"
                stroke-width="2.1"
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M8 3.5v6.5M16 3.5v6.5M6.5 10h11v3.2a5.5 5.5 0 0 1-11 0V10zM12 18.7V21"
              />
            </svg>
            <span class="visually-hidden">Intiface</span>
          </span>
          </div>
        </div>
        <p class="tag" id="page-tag">Home</p>
      </header>

      <div id="page-main">
      <ol class="setup-steps" aria-label="Setup">
        <li>
          <section class="panel panel-address" aria-labelledby="home-wallet-h">
            <div class="panel-head">
              <h2 id="home-wallet-h"><span class="step-num">1</span> Tip wallet</h2>
              <span class="pill" id="address-pill">required</span>
            </div>
            <div class="wallet-watch-row">
              <label class="field address-field">
                <span>Paste the PulseChain address tippers send to</span>
                <input id="receive" type="text" inputmode="text" placeholder="0x…" spellcheck="false" autocomplete="off" autocapitalize="off" />
              </label>
              <label class="field wallet-name-field">
                <span>Name (optional)</span>
                <input
                  id="receive-label"
                  type="text"
                  maxlength="48"
                  placeholder="e.g. Main show"
                  spellcheck="false"
                  autocomplete="off"
                />
              </label>
              <button type="button" class="btn ghost" id="btn-save-wallet" title="Save this address + name to your list">Save</button>
            </div>
            <p class="hint">This is your tip jar address — not a private key. Saved wallets live in Settings.</p>
            <p class="settings-flash home-flash" id="home-wallet-status" role="status"></p>
          </section>
        </li>

        <li>
          <section class="panel" id="device-panel" aria-labelledby="device-h">
            <div class="panel-head">
              <h2 id="device-h"><span class="step-num">2</span> Toy</h2>
              <div class="panel-head-tools">
                <span class="pill" id="device-pill">idle</span>
                <button
                  type="button"
                  class="panel-min-btn"
                  id="btn-device-min"
                  aria-expanded="true"
                  aria-controls="device-body"
                  title="Minimize Device"
                >
                  <span class="panel-min-icon" aria-hidden="true"></span>
                  <span class="visually-hidden" id="device-min-label">Minimize Device</span>
                </button>
              </div>
            </div>
            <div class="panel-body" id="device-body">
              <p class="hint" id="device-summary"></p>
              <p class="hint device-coop" id="device-coop">
                <strong>Chaturbate tippers?</strong>
                Use <strong>Lovense Connect</strong> so site tips and PulseChain tips share the same toy.
              </p>
              <div class="device-setup settings-grid" id="device-setup">
                <div class="field backend-field">
                  <span>How to connect</span>
                  <div class="backend-picks" role="radiogroup" aria-label="How to connect">
                    <button
                      type="button"
                      class="backend-pick"
                      id="backend-pick-lovense"
                      data-backend="lovense"
                      aria-pressed="false"
                      title="Lovense Connect (recommended)"
                    >
                      <span class="link-light" data-backend="lovense">
                        <svg class="link-light-icon" viewBox="0 0 24 24" aria-hidden="true">
                          <path
                            fill="currentColor"
                            d="M12 20.4S4.8 15.6 4.8 10.1A4.4 4.4 0 0 1 12 6.6a4.4 4.4 0 0 1 7.2 3.5c0 5.5-7.2 10.3-7.2 10.3z"
                          />
                        </svg>
                      </span>
                      <span class="backend-pick-name">Connect</span>
                    </button>
                    <button
                      type="button"
                      class="backend-pick"
                      id="backend-pick-lovense-remote"
                      data-backend="lovense-remote"
                      aria-pressed="false"
                      title="Lovense Remote Game Mode"
                    >
                      <span class="link-light" data-backend="lovense-remote">
                        <svg class="link-light-icon" viewBox="0 0 24 24" aria-hidden="true">
                          <path
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M12 3v3M12 18v3M3 12h3M18 12h3M6.2 6.2l2.1 2.1M15.7 15.7l2.1 2.1M17.8 6.2l-2.1 2.1M8.3 15.7l-2.1 2.1"
                          />
                          <circle
                            cx="12"
                            cy="12"
                            r="3.2"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                          />
                        </svg>
                      </span>
                      <span class="backend-pick-name">Remote</span>
                    </button>
                    <button
                      type="button"
                      class="backend-pick"
                      id="backend-pick-bluetooth"
                      data-backend="bluetooth"
                      aria-pressed="false"
                      title="Bluetooth (this PC)"
                    >
                      <span class="link-light" data-backend="bluetooth">
                        <svg class="link-light-icon" viewBox="0 0 24 24" aria-hidden="true">
                          <path
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2.1"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M7 7l10 10-5 5V2l5 5L7 17"
                          />
                        </svg>
                      </span>
                      <span class="backend-pick-name">Bluetooth</span>
                    </button>
                    <button
                      type="button"
                      class="backend-pick"
                      id="backend-pick-intiface"
                      data-backend="intiface"
                      aria-pressed="false"
                      title="Intiface (advanced)"
                    >
                      <span class="link-light" data-backend="intiface">
                        <svg class="link-light-icon" viewBox="0 0 24 24" aria-hidden="true">
                          <path
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2.1"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="M8 3.5v6.5M16 3.5v6.5M6.5 10h11v3.2a5.5 5.5 0 0 1-11 0V10zM12 18.7V21"
                          />
                        </svg>
                      </span>
                      <span class="backend-pick-name">Intiface</span>
                    </button>
                  </div>
                  <select id="backend" class="visually-hidden" aria-hidden="true" tabindex="-1">
                    <option value="lovense">Lovense Connect (recommended)</option>
                    <option value="lovense-remote">Lovense Remote (Game Mode)</option>
                    <option value="bluetooth">Bluetooth (this PC)</option>
                    <option value="intiface">Intiface (advanced)</option>
                  </select>
                </div>
                <label class="field grow" id="url-field" hidden>
                  <span id="url-label">Local IP</span>
                  <input id="device-url" type="text" spellcheck="false" autocomplete="off" />
                </label>
                <label class="field narrow" id="appid-field" hidden>
                  <span>APPID <em>(optional)</em></span>
                  <input id="lovense-appid" type="text" spellcheck="false" autocomplete="off" />
                </label>
              </div>
              <p class="hint" id="device-hint"></p>
              <details class="hint lovense-more" id="lovense-download" hidden>
                <summary>Windows PC app</summary>
                <p>
                  Needs Lovense’s USB adapter — phone Connect does not.
                  Skip Stream Master.
                  <a
                    href="${LOVENSE_CONNECT_DOWNLOAD_URL}"
                    target="_blank"
                    rel="noopener noreferrer"
                  >Connect download</a>
                  (<code>Lovense_Connect.exe</code>).
                </p>
              </details>
              <div class="ble-relink" id="ble-relink" hidden>
                <button type="button" class="ble-relink-close" id="btn-ble-dismiss" title="Hide this tip" aria-label="Hide this tip">×</button>
                <p class="ble-relink-title" id="ble-relink-title"></p>
                <p class="ble-relink-body" id="ble-relink-body"></p>
                <div class="actions">
                  <button type="button" class="btn tiny" id="btn-ble-flag" title="Copy the desktop Chrome/Edge flag link (browser builds only)">Keep toys after refresh</button>
                  <button type="button" class="btn ghost tiny" id="btn-ble-lovense" hidden title="Lovense Connect survives refresh">Use Lovense Connect</button>
                </div>
              </div>
              <div class="actions">
                <button type="button" class="btn primary" id="btn-connect">Connect</button>
                <button type="button" class="btn danger" id="btn-disconnect" hidden title="Stop this page talking to the toy. Stays off after refresh.">Disconnect</button>
                <button type="button" class="btn" id="btn-test" title="Full tip test: alert, feed, queue, and toy">Test</button>
                <button type="button" class="btn ghost" id="btn-stop">Stop</button>
                <button type="button" class="btn" id="btn-scan" hidden title="Refresh the toy list">Refresh</button>
              </div>
              <div class="toy-box" id="toy-box">
                <span class="toy-label">Linked toys</span>
                <div class="toy-list" id="toy-list"></div>
                <p class="toy-empty" id="toy-empty">Not connected</p>
              </div>
              <p class="status" id="device-status"></p>
            </div>
          </section>
        </li>
      </ol>
      </div>

      <div id="page-live" class="page-settings" hidden>
        <p class="settings-intro">
          One watch session for wallet tips and PulseChain events (PulseX swaps, LP add/remove, OmniBridge, custom logs) — all buzz the same tip ladder.
        </p>

        <section class="panel" id="watch-panel" aria-labelledby="watch-h">
          <div class="panel-head">
            <h2 id="watch-h">Go live</h2>
            <div class="panel-head-tools">
              <span class="pill" id="watch-pill">stopped</span>
              <span class="live-flash" id="live-flash" aria-hidden="true"></span>
              <button
                type="button"
                class="panel-min-btn"
                id="btn-watch-min"
                aria-expanded="true"
                aria-controls="watch-body"
                title="Minimize Go live"
              >
                <span class="panel-min-icon" aria-hidden="true"></span>
                <span class="visually-hidden" id="watch-min-label">Minimize Go live</span>
              </button>
            </div>
          </div>
          <div class="panel-body" id="watch-body">
            <p class="hint" id="session-line"></p>
            <div class="actions go-live-actions">
              <button type="button" class="btn primary" id="btn-simulate" title="Test the list, menu, and toy without a real payment. Shift+click for a longer pattern test.">Fake a tip</button>
            </div>
            <p class="status" id="watch-status"></p>
            <p class="hint">Fake a tip is the full test: feed, menu match, and toy. Shift+click runs a longer pattern test.</p>
          </div>
        </section>

        <section class="panel feed-panel" aria-labelledby="feed-h">
          <div class="panel-head">
            <h2 id="feed-h">Wallet tips</h2>
            <span class="pill" id="queue-pill">queue idle</span>
            <div class="feed-actions">
              <button type="button" class="btn ghost tiny" id="btn-clear">Clear</button>
            </div>
          </div>
          <div class="pay-earnings" id="pay-earnings" aria-live="polite">
            <div class="pay-earnings-label">Earned</div>
            <div class="pay-earnings-total" id="pay-earnings-total">0</div>
            <div class="pay-earnings-meta" id="pay-earnings-meta">No tips yet</div>
          </div>
          <p class="status queue-status" id="queue-status">Each toy buzzes its own queue</p>
          <ul class="feed" id="feed"></ul>
          <p class="empty feed-empty-idle" id="feed-empty">Ready and listening — your first tip will appear here.</p>
          <details class="advanced-fold" id="feed-advanced">
            <summary>Backup tip list</summary>
            <p class="hint feed-backup-hint">Wallet tips and pool swaps auto-save in this browser (last 200). Export backs up both. Settings Export does not include this list.</p>
            <div class="actions">
              <button type="button" class="btn ghost tiny" id="btn-export-payments-json" title="Download payments log as JSON backup">Export JSON</button>
              <button type="button" class="btn ghost tiny" id="btn-export-payments-csv" title="Download payments as spreadsheet CSV">Export CSV</button>
            </div>
          </details>
        </section>

        <section class="settings-block" id="live-pools" aria-labelledby="set-pools-h">
          <div class="settings-block-head">
            <h2 id="set-pools-h">Chain triggers <span class="tab-hint">optional</span></h2>
          </div>
          <p class="hint">
            Watch PulseX pairs (swaps and LP add/remove), the PulseChain OmniBridge, or any contract event you paste.
            Quote size drives buzzes. PulseX pairs are verified against official factories before they can trigger.
            No tip wallet needed — enable Watch chain events, tick targets On, then Start watching in the header.
          </p>
          <label class="field settings-toggle-field">
            <span>Watch chain events</span>
            <input type="checkbox" id="pool-watch-enabled" />
          </label>
          <p class="setup-note" id="pool-watch-hint">Off · not listening for chain events</p>
          <div class="pool-add cardish">
            <p class="pool-add-kicker">PulseX pair</p>
            <label class="field">
              <span>Pair address</span>
              <input id="pool-address" type="text" placeholder="0x…" spellcheck="false" autocomplete="off" />
            </label>
            <div class="settings-grid">
              <label class="field">
                <span>Label</span>
                <input id="pool-label" type="text" placeholder="PLSX/WPLS" autocomplete="off" />
              </label>
              <label class="field narrow">
                <span>Min quote</span>
                <input id="pool-min" type="number" min="0" step="any" value="50000" inputmode="decimal" />
              </label>
              <label class="field narrow">
                <span>Quote symbol</span>
                <input id="pool-quote-sym" type="text" value="WPLS" autocomplete="off" />
              </label>
              <label class="field">
                <span>Swap side</span>
                <select id="pool-side">
                  <option value="all">All swaps</option>
                  <option value="buy">Buy (spend quote)</option>
                  <option value="sell">Sell (receive quote)</option>
                </select>
              </label>
            </div>
            <label class="field grow">
              <span>Quote token (default WPLS)</span>
              <input id="pool-quote" type="text" value="0xa1077a294dde1b09bb078844df40758a5d0f9a27" spellcheck="false" autocomplete="off" />
            </label>
            <div class="actions">
              <button type="button" class="btn primary tiny" id="btn-pool-add">Add pool</button>
              <button type="button" class="btn ghost tiny" id="btn-pool-presets">Load PulseX presets</button>
            </div>
            <p class="setup-note" id="pool-form-status"></p>
          </div>
          <div class="pool-list-tools actions">
            <button type="button" class="btn ghost tiny" id="btn-pools-all" title="Tick every listed pool On">All on</button>
            <button type="button" class="btn ghost tiny" id="btn-pools-none" title="Untick every listed pool">All off</button>
          </div>
          <ul class="pool-list" id="pool-list"></ul>
          <p class="setup-note" id="pool-list-empty">No pools yet — paste a pair address or load presets (presets start Off — tick to watch). Open Alert to enable LP add/remove.</p>

          <div class="pool-add cardish" id="bridge-add">
            <p class="pool-add-kicker">Bridge</p>
            <p class="hint">PulseChain OmniBridge ERC-20 deposits (in) and withdrawals (out). Sized in the bridged token. Token transfers (mint/burn to the mediator) are a backup if OmniBridge logs miss — not the primary trigger.</p>
            <label class="field">
              <span>Mediator address</span>
              <input id="bridge-address" type="text" placeholder="0x4fD0aaa7…" spellcheck="false" autocomplete="off" />
            </label>
            <div class="settings-grid">
              <label class="field">
                <span>Label</span>
                <input id="bridge-label" type="text" placeholder="OmniBridge" autocomplete="off" />
              </label>
              <label class="field narrow">
                <span>Min amount</span>
                <input id="bridge-min" type="number" min="0" step="any" value="100" inputmode="decimal" />
              </label>
              <label class="field">
                <span>Direction</span>
                <select id="bridge-dir">
                  <option value="both">In and out</option>
                  <option value="in">Deposits in</option>
                  <option value="out">Withdrawals out</option>
                </select>
              </label>
            </div>
            <label class="field grow">
              <span>Token filter (optional)</span>
              <input id="bridge-token" type="text" placeholder="any token" spellcheck="false" autocomplete="off" />
            </label>
            <div class="actions">
              <button type="button" class="btn primary tiny" id="btn-bridge-add">Add bridge</button>
              <button type="button" class="btn ghost tiny" id="btn-bridge-presets">Load OmniBridge</button>
            </div>
            <p class="setup-note" id="bridge-form-status"></p>
          </div>
          <ul class="pool-list" id="bridge-list"></ul>
          <p class="setup-note" id="bridge-list-empty">No bridges yet — load the official OmniBridge preset or paste a mediator.</p>

          <div class="pool-add cardish" id="log-add">
            <p class="pool-add-kicker">Custom event</p>
            <p class="hint">Any contract log on PulseChain. Bound to one address. Amount field is optional (empty = fire on every match).</p>
            <label class="field">
              <span>Contract</span>
              <input id="log-address" type="text" placeholder="0x…" spellcheck="false" autocomplete="off" />
            </label>
            <label class="field">
              <span>Event ABI</span>
              <input id="log-abi" type="text" placeholder="Transfer(address indexed from, address indexed to, uint256 value)" spellcheck="false" autocomplete="off" />
            </label>
            <div class="settings-grid">
              <label class="field">
                <span>Label</span>
                <input id="log-label" type="text" placeholder="Whale transfer" autocomplete="off" />
              </label>
              <label class="field narrow">
                <span>Amount arg</span>
                <input id="log-amount-arg" type="text" value="value" autocomplete="off" />
              </label>
              <label class="field narrow">
                <span>Min amount</span>
                <input id="log-min" type="number" min="0" step="any" value="0" inputmode="decimal" />
              </label>
              <label class="field narrow">
                <span>Decimals</span>
                <input id="log-decimals" type="number" min="0" max="36" step="1" value="18" inputmode="numeric" />
              </label>
              <label class="field narrow">
                <span>Symbol</span>
                <input id="log-symbol" type="text" value="TOKEN" autocomplete="off" />
              </label>
            </div>
            <div class="actions">
              <button type="button" class="btn primary tiny" id="btn-log-add">Add event</button>
            </div>
            <p class="setup-note" id="log-form-status"></p>
          </div>
          <ul class="pool-list" id="log-list"></ul>
          <p class="setup-note" id="log-list-empty">No custom events yet — paste a contract and event signature.</p>
        </section>

        <section class="panel feed-panel pool-feed-panel" aria-labelledby="pool-feed-h">
          <div class="panel-head">
            <h2 id="pool-feed-h">Chain events</h2>
            <span class="pill" id="pool-feed-pill">no events</span>
            <div class="feed-actions">
              <button type="button" class="btn ghost tiny" id="btn-clear-pools" title="Clear chain events from this list (wallet tips stay above)">Clear</button>
            </div>
          </div>
          <div class="pay-earnings" id="pool-earnings" aria-live="polite">
            <div class="pay-earnings-label">Chain volume</div>
            <div class="pay-earnings-total" id="pool-earnings-total">0</div>
            <div class="pay-earnings-meta" id="pool-earnings-meta">No chain events yet</div>
          </div>
          <ul class="feed" id="pool-feed"></ul>
          <p class="empty" id="pool-feed-empty">No chain events yet. Enable Watch chain events, tick verified targets On, then Start watching in the header.</p>
        </section>
      </div>

      <div id="page-settings" class="page-settings" hidden>
        <p class="settings-intro">
          Saved wallets, extras, and backups. Everyday setup is on Home.
        </p>
        <p class="settings-flash" id="settings-status" role="status"></p>

        <section class="settings-block" aria-labelledby="set-wallet-h">
          <div class="settings-block-head">
            <h2 id="set-wallet-h">Saved wallets</h2>
          </div>
          <div class="saved-wallets" id="saved-wallets" hidden>
            <p class="saved-wallets-label">Tap a row to watch it</p>
            <ul class="wallet-list" id="wallet-list"></ul>
          </div>
          <p class="hint">
            Change the active tip address on Home. Names make this list easier to read.
          </p>
        </section>

        <section class="settings-block" aria-labelledby="set-chain-h">
          <div class="settings-block-head">
            <h2 id="set-chain-h">Chain &amp; RPC</h2>
          </div>
          <div class="settings-grid">
            <label class="field">
              <span>Chain</span>
              <input type="text" value="PulseChain (PLS)" readonly disabled title="Just The Tip is PulseChain-only" />
              <input type="hidden" id="chain" value="pulsechain" />
            </label>
            <label class="field">
              <span>Min tip amount</span>
              <input id="min-amount" type="number" min="0" step="any" />
            </label>
          </div>
          <label class="field rpc-field">
            <span>RPC list <em id="rpc-count" class="rpc-count"></em></span>
            <textarea
              id="rpc-list"
              rows="5"
              spellcheck="false"
              placeholder="One https://… URL per line (paste / import a list)"
            ></textarea>
          </label>
          <div class="actions rpc-actions">
            <button type="button" class="btn ghost tiny" id="btn-rpc-defaults">Load chain defaults</button>
            <label class="btn ghost tiny file-btn">
              Import file
              <input id="rpc-file" type="file" accept=".txt,.csv,.json,text/*" hidden />
            </label>
            <button type="button" class="btn ghost tiny" id="btn-rpc-clear">Clear</button>
          </div>
          <p class="hint">Leave empty to use built-in PulseChain RPCs. Multiple lines = automatic failover.</p>
        </section>

        <section class="settings-block" aria-labelledby="set-appear-h">
          <div class="settings-block-head">
            <h2 id="set-appear-h">Look &amp; feel</h2>
          </div>
          <div class="settings-grid">
            <label class="field settings-toggle-field">
              <span>Night mode</span>
              <label class="toggle">
                <input type="checkbox" id="set-night" />
                <span>Dark theme (off = day)</span>
              </label>
            </label>
          </div>
        </section>

        <section class="settings-block" aria-labelledby="set-perf-h">
          <div class="settings-block-head">
            <h2 id="set-perf-h">Buzz timing</h2>
          </div>
          <div class="settings-grid">
            <label class="field">
              <span>Gap between tips on the same toy (ms)</span>
              <input id="set-queue-gap" type="number" min="0" max="10000" step="50" />
            </label>
            <label class="field">
              <span>Max waiting tips</span>
              <input id="set-max-queue" type="number" min="1" max="256" step="1" />
            </label>
            <label class="field">
              <span>Chain check interval (ms)</span>
              <input id="set-poll-ms" type="number" min="1500" max="30000" step="100" />
            </label>
          </div>
          <p class="hint">Lower interval = faster tip detection, more RPC load. Restart watching after changing interval.</p>
        </section>

        <section class="settings-block" aria-labelledby="set-data-h">
          <div class="settings-block-head">
            <h2 id="set-data-h">Backup</h2>
          </div>
          <p class="hint">Save or restore preferences on this device. Never includes private keys.</p>
          <div class="actions">
            <button type="button" class="btn primary" id="btn-settings-save">Save</button>
            <button type="button" class="btn" id="btn-settings-export">Export</button>
            <label class="btn file-btn">
              Import
              <input id="set-import-file" type="file" accept=".json,application/json" hidden />
            </label>
            <button type="button" class="btn ghost" id="btn-settings-reset">Reset defaults</button>
          </div>
        </section>
      </div>

      ${streamTipAlertPageHtml()}

      <div id="page-menu" class="page-settings" hidden>
        <section class="settings-block menu-token-block" aria-labelledby="menu-token-h">
          <div class="settings-block-head">
            <h2 id="menu-token-h">Whitelist</h2>
            <p class="settings-block-note">
              Pick PLS from Suggestions, or paste a contract and Save token.
            </p>
          </div>
          <div class="menu-token-board">
            <div class="settings-grid token-tips-grid">
              <label class="field grow">
                <span>ERC/PRC-20</span>
                <input id="token" type="text" placeholder="0x… — leave empty for native PLS" spellcheck="false" autocomplete="off" />
              </label>
              <label class="field narrow">
                <span>Decimals</span>
                <input id="token-dec" type="number" min="0" max="36" />
              </label>
              <label class="field narrow">
                <span>Symbol</span>
                <input id="token-sym" type="text" placeholder="HEX" maxlength="16" spellcheck="false" />
              </label>
              <label class="field token-label-field">
                <span>Token name</span>
                <input
                  id="token-label"
                  type="text"
                  maxlength="48"
                  placeholder="Optional nickname"
                  spellcheck="false"
                  autocomplete="off"
                />
              </label>
              <div class="token-tip-actions">
                <button type="button" class="btn primary tiny" id="btn-save-token" title="Save this token to your list">Save token</button>
              </div>
            </div>
            <div class="menu-coin-prices" id="menu-coin-price" aria-live="polite"></div>
          </div>
          <div class="actions menu-coin-matrix-actions">
            <button type="button" class="btn primary tiny" id="btn-coin-csv-export" title="Download current coin reward CSV">Export CSV</button>
            <button type="button" class="btn ghost tiny" id="btn-coin-csv-starter" title="Download a starter CSV from saved tokens × patterns">Starter CSV</button>
            <label class="btn ghost tiny file-btn" title="Replace rewards from a CSV file">
              Import CSV
              <input id="coin-csv-import" type="file" accept=".csv,text/csv,text/plain" hidden />
            </label>
            <button type="button" class="btn ghost tiny" id="btn-coin-csv-clear" title="Remove all coin reward rows">Clear CSV</button>
          </div>
        </section>

        <section class="settings-block menu-catalog-block" aria-labelledby="menu-toys-h">
          <div class="menu-toys-compact" aria-labelledby="menu-toys-h">
            <div class="settings-block-head menu-toys-head">
              <h2 id="menu-toys-h">Toys</h2>
              <div class="menu-toy-picker" id="menu-toy-ticks" aria-label="Search toys for tip menu">
                <div class="menu-toy-chips" id="menu-toy-chips" hidden></div>
                <div class="menu-toy-search-row">
                  <label class="field menu-toy-search-field">
                    <span class="visually-hidden">Search toys</span>
                    <input
                      id="menu-toy-search"
                      type="search"
                      placeholder="Search…"
                      autocomplete="off"
                      spellcheck="false"
                    />
                  </label>
                  <p class="menu-toy-loading" id="menu-toy-loading" hidden role="status" aria-live="polite">
                    <span class="menu-toy-loading-spin" aria-hidden="true"></span>
                    <span class="menu-toy-loading-text">Loading…</span>
                  </p>
                </div>
                <div class="menu-toy-results" id="menu-toy-results" role="listbox" aria-label="Matching toys" hidden></div>
              </div>
              <div class="actions menu-toy-actions">
                <button type="button" class="btn ghost tiny" id="btn-menu-share" title="Name, socials, Export HTML / JPG">Share</button>
                <button type="button" class="btn ghost tiny" id="btn-pattern-catalog" title="Browse and re-add tip menu patterns">Catalog</button>
                <button type="button" class="btn primary tiny" id="btn-pattern-create" title="Create a custom pattern">Create</button>
                <button type="button" class="btn ghost tiny" id="btn-menu-toys-import" title="Show only toys currently linked on Device">Use linked</button>
                <button type="button" class="btn ghost tiny" id="btn-menu-toys-none" title="Clear selected toys">Clear</button>
              </div>
              <select id="menu-sort" class="menu-sort-select" aria-label="Sort patterns"></select>
            </div>
          </div>

          <article class="pattern-card menu-pattern-tools-card" id="menu-pattern-tools-card" aria-label="Pattern tools">
            <div class="pattern-card-main menu-pattern-tools-main">
              <label class="field menu-base-field pattern-toy-currency-field">
                <span id="menu-tools-currency-label">Currency</span>
                <select
                  id="menu-tip-currency"
                  aria-label="Tip coin for this toy"
                  title="Only selected coin chips appear here. Pick one to set that tip coin on every pattern for this toy."
                >
                  <option value="">Select coins above</option>
                </select>
              </label>
              <div class="menu-usd-range-row">
                <label class="field menu-base-field menu-usd-lo-field">
                  <span id="menu-tools-lo-label">Low</span>
                  <div class="menu-usd-input">
                    <span class="menu-usd-affix" aria-hidden="true">$</span>
                    <input id="menu-base-price" type="number" min="0" step="0.01" inputmode="decimal" aria-label="Lowest tip in USD" />
                  </div>
                </label>
                <label class="field menu-base-field menu-top-field menu-usd-hi-field">
                  <span id="menu-tools-hi-label">High</span>
                  <div class="menu-usd-input">
                    <span class="menu-usd-affix" aria-hidden="true">$</span>
                    <input id="menu-top-price" type="number" min="0" step="0.01" inputmode="decimal" aria-label="Highest tip in USD" />
                  </div>
                </label>
              </div>
              <label class="field menu-base-field menu-max-vibe-field">
                <span id="menu-tools-max-vibe-label">Max vibe</span>
                <div class="menu-max-vibe-control">
                  <input
                    id="menu-max-vibe"
                    type="range"
                    min="1"
                    max="8"
                    step="1"
                    value="8"
                    aria-label="Maximum vibration strength"
                    title="Caps every pattern peak for this toy (1 = soft … 8 = full)"
                  />
                  <output id="menu-max-vibe-val" for="menu-max-vibe">8/8</output>
                </div>
              </label>
              <div class="pattern-card-actions menu-pattern-tools-actions">
                <button
                  type="button"
                  class="btn primary tiny"
                  id="btn-menu-base-apply"
                  title="Enter cheapest / most expensive in USD for the active toy tab. Scale converts to the tip coin and prices by duration — shortest → cheapest, longest → most expensive. Each toy keeps its own ladder."
                >
                  Scale menu
                </button>
              </div>
            </div>
          </article>

          <input type="file" id="menu-toy-pack-import" accept="application/json,.json" hidden />
          <div class="pattern-list" id="pattern-list"></div>
        </section>

        <div id="menu-share-modal" class="pattern-wizard menu-share-modal" hidden>
          <div
            class="pattern-wizard-panel menu-share-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="menu-share-h"
          >
            <div class="pattern-catalog-head">
              <h3 id="menu-share-h">Share card</h3>
              <button type="button" class="btn ghost tiny" id="btn-menu-share-close" aria-label="Close share card">Close</button>
            </div>
            <div class="actions menu-export-actions">
              <button type="button" class="btn ghost tiny" id="btn-export-menu-html" title="Download index.html for fans (drag to Netlify Drop)">Export HTML</button>
              <div class="menu-jpg-export">
                <button type="button" class="btn primary tiny" id="btn-export-menu-jpg" title="Download tip menu as JPG">Export JPG</button>
                <div class="menu-orient-row" role="group" aria-label="JPG orientation">
                  <label class="menu-orient-tick">
                    <input type="radio" name="export-orient" id="export-orient-landscape" value="landscape" checked />
                    <span>Landscape</span>
                  </label>
                  <label class="menu-orient-tick">
                    <input type="radio" name="export-orient" id="export-orient-portrait" value="portrait" />
                    <span>Portrait</span>
                  </label>
                </div>
              </div>
            </div>
            <p class="hint menu-html-host-hint">
              <strong>Export HTML</strong> downloads <code>index.html</code> for
              <a href="https://app.netlify.com/drop" target="_blank" rel="noopener noreferrer">Netlify Drop</a>,
              <a href="https://pages.cloudflare.com/" target="_blank" rel="noopener noreferrer">Cloudflare Pages</a>,
              or
              <a href="https://pages.github.com/" target="_blank" rel="noopener noreferrer">GitHub Pages</a>.
              Tip coin is set on this page. Export needs a tip wallet on Home so the QR and amounts work.
            </p>
          </div>
        </div>

        <div id="export-need-wallet-modal" class="pattern-wizard export-need-wallet-modal" hidden>
          <div
            class="pattern-wizard-panel export-need-wallet-panel"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="export-need-wallet-h"
          >
            <h3 id="export-need-wallet-h">PLEASE ADD A TIP WALLET FIRST</h3>
            <p class="hint">Set a receive address on Home, then export again.</p>
            <div class="actions">
              <button type="button" class="btn primary" id="btn-export-need-wallet-ok">OK</button>
            </div>
          </div>
        </div>

      </div>

        <div id="pattern-catalog" class="pattern-wizard pattern-catalog-modal" hidden>
          <div class="pattern-wizard-panel pattern-catalog-panel" role="dialog" aria-labelledby="pattern-catalog-title">
            <div class="pattern-catalog-head">
              <h3 id="pattern-catalog-title">Pattern catalog</h3>
              <button type="button" class="btn ghost tiny" id="btn-pattern-catalog-close" aria-label="Close catalog">Close</button>
            </div>
            <p class="hint" id="pattern-catalog-count">Built-in stock patterns · browse, test, edit, or duplicate</p>
            <div class="pattern-catalog-toolbar">
              <label class="field grow">
                <span class="sr-only">Search patterns</span>
                <input
                  id="pattern-catalog-search"
                  type="search"
                  placeholder="Search name, tag, id…"
                  autocomplete="off"
                />
              </label>
              <label class="field">
                <span class="sr-only">Toy</span>
                <select id="pattern-catalog-toy" aria-label="Filter by toy">
                  <option value="">All toys</option>
                </select>
              </label>
            </div>
            <div class="pattern-catalog-body" id="pattern-catalog-body"></div>
          </div>
        </div>

        <div id="pattern-wizard" class="pattern-wizard" hidden>
          <div class="pattern-wizard-panel" role="dialog" aria-labelledby="pattern-wizard-title" aria-modal="true">
            <h3 id="pattern-wizard-title">Create pattern</h3>
            <input type="hidden" id="wizard-mode" value="create" />
            <input type="hidden" id="wizard-id" value="" />

            <div class="wizard-form">
              <label class="field">
                <span>Name</span>
                <input id="wizard-name" type="text" maxlength="48" autocomplete="off" />
              </label>
              <label class="field">
                <span>Blurb</span>
                <input id="wizard-blurb" type="text" maxlength="120" autocomplete="off" />
              </label>
              <label class="field">
                <span>Tag</span>
                <input id="wizard-tag" type="text" list="wizard-tag-list" maxlength="24" autocomplete="off" />
                <datalist id="wizard-tag-list"></datalist>
              </label>
              <label class="field">
                <span>Tip price</span>
                <input id="wizard-price" type="number" min="0" step="any" inputmode="decimal" />
              </label>
              <div class="field wizard-needs">
                <span>Requires (for toy filter)</span>
                <div class="wizard-need-row" id="wizard-needs">
                  <label class="wizard-need"><input type="checkbox" value="multi" /> Multi-motor</label>
                  <label class="wizard-need"><input type="checkbox" value="rotate" /> Rotate</label>
                  <label class="wizard-need"><input type="checkbox" value="air" /> Air / pump</label>
                  <label class="wizard-need"><input type="checkbox" value="thrust" /> Thrust</label>
                </div>
                <p class="hint">Tick <strong>Multi-motor</strong> for Gemini / Edge (M1 + M2). Leave empty for single-vibe toys.</p>
              </div>
              <label class="field">
                <span>Step length (ms)</span>
                <input id="wizard-interval" type="number" min="80" max="2000" step="10" />
              </label>
              <div class="field wizard-strength-field">
                <span id="wizard-strength-label">Strength steps (0–8)</span>
                <p class="hint" id="wizard-strength-hint">
                  Each box is one beat. With Multi-motor, pick Both / L / R per beat.
                </p>
                <div class="wizard-strengths" id="wizard-strengths"></div>
                <div class="actions wizard-strength-actions">
                  <button type="button" class="btn ghost tiny" id="btn-wizard-add-step">Add step</button>
                  <button type="button" class="btn ghost tiny" id="btn-wizard-rm-step">Remove last</button>
                </div>
              </div>
              <div class="field wizard-preview-field">
                <span>Preview</span>
                <div class="wizard-preview pattern-viz pattern-viz-multi" id="wizard-preview" aria-live="polite"></div>
              </div>
            </div>

            <p class="err" id="wizard-err" hidden role="alert"></p>
            <div class="actions pattern-wizard-actions">
              <button type="button" class="btn ghost" id="btn-wizard-cancel">Cancel</button>
              <button type="button" class="btn primary" id="btn-wizard-save">Save</button>
            </div>
          </div>
        </div>

      <p class="err shell-err" id="err" hidden role="alert"></p>
      <footer class="foot shell-foot">
        <p class="foot-brand-line">
          <img class="foot-mark foot-mark-app" src="${APP_LOGO}" width="36" height="36" alt="" decoding="async" />
          <span>${APP_NAME}</span>
          <span class="foot-sep">·</span>
          <img class="foot-mark" src="/brand/pulsechain-mark.svg" width="18" height="18" alt="" decoding="async" />
          <a class="foot-pls" href="https://pulsechain.com" target="_blank" rel="noreferrer">PulseChain</a>
        </p>
        <p>
          v${APP_VERSION} · local only · no private keys.
        </p>
        <p class="foot-donate">
          <span class="foot-donate-label">Donate (PLS / PulseChain)</span>
          <code class="foot-donate-addr" id="donate-addr" title="Donation address">${DONATION_ADDRESS}</code>
          <button type="button" class="btn ghost tiny" id="btn-copy-donate" title="Copy donation address">Copy</button>
          <span class="foot-donate-status" id="donate-copy-status" aria-live="polite"></span>
        </p>
      </footer>
    </div>

    <div class="drawer-scrim" id="drawer-scrim" hidden></div>
    <aside class="app-drawer" id="app-drawer" hidden aria-label="Menu">
      <p class="drawer-title">Menu</p>
      <button type="button" class="nav-item" id="nav-home"><span class="nav-num">1</span> Home</button>
      <button type="button" class="nav-item" id="nav-tip-menu" title="Tip menu"><span class="nav-num">2</span> Tip menu</button>
      <button type="button" class="nav-item" id="nav-obs"><span class="nav-num">3</span> Stream alerts</button>
      <button type="button" class="nav-item" id="nav-live"><span class="nav-num">4</span> Go live</button>
      <button type="button" class="nav-item" id="nav-settings">Settings</button>
      <p class="drawer-title drawer-title-sub">Ecosystem</p>
      <a
        class="nav-item nav-item-link"
        id="nav-provex"
        href="https://provex.com"
        target="_blank"
        rel="noreferrer"
      >
        <span class="nav-item-copy">
          <span class="nav-item-name">ProveX</span>
          <span class="nav-item-desc">Stable Coins to Dollars</span>
        </span>
      </a>
      <a
        class="nav-item nav-item-link"
        id="nav-pulsex"
        href="https://pulsex.com"
        target="_blank"
        rel="noreferrer"
      >
        <span class="nav-item-copy">
          <span class="nav-item-name">PulseX</span>
          <span class="nav-item-desc">Crypto to Stable Coins</span>
        </span>
      </a>
      <a
        class="nav-item nav-item-link"
        id="nav-pulsechain"
        href="https://pulsechain.com"
        target="_blank"
        rel="noreferrer"
      >
        <span class="nav-item-copy">
          <span class="nav-item-name">PulseChain</span>
          <span class="nav-item-desc">Network</span>
        </span>
      </a>
      <a
        class="nav-item nav-item-link"
        id="nav-hex"
        href="https://hex.com"
        target="_blank"
        rel="noreferrer"
      >
        <span class="nav-item-copy">
          <span class="nav-item-name">HEX</span>
          <span class="nav-item-desc">Saving Account</span>
        </span>
      </a>
    </aside>
  `
}
