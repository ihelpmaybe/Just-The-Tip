/**
 * Self-contained Browser Source page for the always-on tip menu.
 */
import { APP_NAME } from '../version.ts'
import { OVERLAY_MENU_CSS } from './menuRender.ts'
import { defaultOverlayMenuStyle } from './menuStyle.ts'

export function overlayMenuPageHtml(): string {
  const seed = JSON.stringify(defaultOverlayMenuStyle)
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex" />
  <title>${APP_NAME} · Tip menu overlay</title>
  <style>
    html, body {
      margin: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: transparent !important;
      font-family: "Segoe UI", system-ui, sans-serif;
    }
    html.preview, html.preview body {
      background: #0a0e14 !important;
    }
    html.preview body::before {
      content: "Tip menu preview (dark) · paste the URL without ?preview into OBS for transparency";
      position: fixed;
      top: 10px;
      left: 12px;
      right: 12px;
      z-index: 2;
      font-size: 11px;
      letter-spacing: 0.02em;
      color: rgba(180, 200, 220, 0.45);
      font-family: ui-monospace, monospace;
      pointer-events: none;
    }
    * { box-sizing: border-box; }
    ${OVERLAY_MENU_CSS}
  </style>
</head>
<body>
  <div id="menu-stage" class="menu-stage layout-waves pos-top-left size-normal theme-cyan">
    <div class="menu-panel" id="menu-panel" style="--menu-panel-a:0.78"></div>
  </div>
  <script>
    (function () {
      if (/[?&]preview=1(?:&|$)/.test(location.search)) {
        document.documentElement.classList.add('preview')
      }
      var style = ${seed}
      var ladder = []
      var stage = document.getElementById('menu-stage')
      var panel = document.getElementById('menu-panel')

      var focusKey = ''
      function esc(s) {
        return String(s || '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
      }
      function coinOf(row) {
        var parts = String(row.amountLabel || '').trim().split(/\\s+/)
        return parts.length > 1 ? parts[parts.length - 1] : ''
      }
      function focusId(row) {
        return String(row.name || '').toLowerCase() + '|' + String(row.amountLabel || '').toLowerCase()
      }
      function metaHtml(row) {
        var bits = []
        if (style.showNote && row.note) bits.push('<span class="menu-note">' + esc(row.note) + '</span>')
        if (style.showBlurb && row.name) bits.push('<span class="menu-tag">' + esc(row.name) + '</span>')
        return bits.length ? '<p class="menu-meta">' + bits.join(' · ') + '</p>' : ''
      }
      function holdOf(row) {
        var t = Math.round(Number(row.timeSec) || 0)
        if (t > 0) return t + 's'
        var m = String(row.sellPitch || '').match(/^(\\d+)\\s*s\\b/i)
        return m ? m[1] + 's' : '—'
      }
      function waveSvg(steps) {
        var raw = Array.isArray(steps) ? steps.slice(0, 16) : []
        var seq = []
        for (var i = 0; i < raw.length; i++) {
          var v = Math.round(Number(raw[i]) || 0)
          seq.push(v < 0 ? 0 : v > 8 ? 8 : v)
        }
        if (!seq.length) seq = [1.5, 5.5, 2, 6.5, 1.5]
        var w = 54, h = 18, padX = 2, padY = 2.4
        var n = seq.length
        var spanX = w - padX * 2
        var spanY = h - padY * 2
        var pts = []
        for (var j = 0; j < n; j++) {
          var x = n === 1 ? padX + spanX / 2 : padX + (j / Math.max(1, n - 1)) * spanX
          var y = h - padY - (seq[j] / 8) * spanY
          pts.push(x.toFixed(1) + ' ' + y.toFixed(1))
        }
        if (n === 1) {
          var mx = padX + spanX / 2
          pts.unshift((mx - 4).toFixed(1) + ' ' + (h - padY).toFixed(1))
          pts.push((mx + 4).toFixed(1) + ' ' + (h - padY).toFixed(1))
        }
        var d = ''
        for (var k = 0; k < pts.length; k++) d += (k === 0 ? 'M' : 'L') + pts[k]
        return '<svg class="menu-wave-svg" viewBox="0 0 ' + w + ' ' + h +
          '" width="' + w + '" height="' + h + '" fill="none" aria-hidden="true">' +
          '<path d="' + d + '" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round"/></svg>'
      }
      function waveRow(row) {
        var feat = row.featured ? ' feat' : ''
        var hot = focusKey && focusId(row) === focusKey ? ' is-focus' : ''
        return '<li class="menu-row' + feat + hot + '" data-focus="' + esc(focusId(row)) +
          '"><span class="menu-amt">' + esc(row.amountLabel) +
          '<span class="menu-cta">Scan</span></span><span class="menu-hold">' +
          esc(holdOf(row)) + '</span><span class="menu-wave">' + waveSvg(row.strengths) +
          '</span>' + metaHtml(row) + '</li>'
      }
      function colsHead() {
        return '<div class="menu-cols-head" aria-hidden="true"><span>Price</span><span>Time</span><span>Feel</span></div>'
      }
      function headHtml() {
        var brand = String(style.brand || '').trim()
        var headline = String(style.headline || '').trim()
        if (!brand && !headline) return ''
        return '<header class="menu-head">' +
          (brand ? '<p class="menu-brand">' + esc(brand) + '</p>' : '') +
          (headline ? '<h1 class="menu-title">' + esc(headline) + '</h1>' : '') +
          '</header>'
      }
      function slim(raw) {
        if (!Array.isArray(raw)) return []
        var limit = Math.min(32, Math.max(1, Math.round(Number(style.maxRows) || 16)))
        var out = []
        var seen = {}
        for (var i = 0; i < raw.length; i++) {
          var o = raw[i]
          if (!o || typeof o !== 'object') continue
          var name = String(o.name || '').trim().slice(0, 48)
          var amountLabel = String(o.amountLabel || o.amount || '').trim().slice(0, 24)
          if (!name || !amountLabel) continue
          var note = String(o.note || '').trim().slice(0, 40)
          var id = String(o.id || '').trim().slice(0, 96)
          var key = id || name.toLowerCase() + '|' + amountLabel.toLowerCase() + '|' + note.toLowerCase()
          if (seen[key]) continue
          seen[key] = 1
          var row = { name: name, amountLabel: amountLabel, featured: o.featured || undefined }
          if (id) row.id = id
          if (note) row.note = note
          var blurb = String(o.blurb || '').trim().slice(0, 80)
          if (blurb) row.blurb = blurb
          var sellPitch = String(o.sellPitch || '').trim().slice(0, 56)
          if (sellPitch) row.sellPitch = sellPitch
          var timeSec = Math.round(Number(o.timeSec))
          if (isFinite(timeSec) && timeSec > 0) row.timeSec = timeSec
          var amountN = Number(o.amount)
          if (isFinite(amountN)) row.amount = amountN
          if (Array.isArray(o.strengths) && o.strengths.length) {
            var steps = []
            for (var si = 0; si < o.strengths.length && si < 16; si++) {
              var sv = Math.round(Number(o.strengths[si]) || 0)
              steps.push(sv < 0 ? 0 : sv > 8 ? 8 : sv)
            }
            if (steps.length) row.strengths = steps
          }
          out.push(row)
          if (out.length >= limit) break
        }
        var want = style.visibleOfferIds
        if (Array.isArray(want)) {
          var set = {}
          for (var w = 0; w < want.length; w++) set[String(want[w])] = 1
          var filtered = []
          for (var f = 0; f < out.length; f++) {
            if (out[f].id && set[out[f].id]) filtered.push(out[f])
          }
          out = filtered
        }
        out.sort(function (a, b) {
          return String(a.note || '').localeCompare(String(b.note || '')) ||
            (Number(a.amount) || 0) - (Number(b.amount) || 0) ||
            String(a.name).localeCompare(String(b.name))
        })
        return out
      }
      function groupRows(rows) {
        var map = {}
        var order = []
        for (var j = 0; j < rows.length; j++) {
          var key = rows[j].note || coinOf(rows[j]) || 'Tips'
          if (!map[key]) { map[key] = []; order.push(key) }
          map[key].push(rows[j])
        }
        return order.map(function (title) { return { title: title, rows: map[title] } })
      }
      function paint() {
        stage.className = 'menu-stage layout-waves pos-' + (style.position || 'top-left') +
          ' size-' + (style.size || 'normal') +
          ' theme-' + (style.theme || 'cyan')
        var a = Number(style.opacity)
        if (!isFinite(a)) a = 0.78
        panel.style.setProperty('--menu-panel-a', String(a))
        var rows = slim(ladder)
        if (!rows.length) {
          panel.innerHTML = headHtml() +
            '<p class="menu-empty">Tick treats on Stream Alerts to show them here</p>'
          return
        }
        var html = headHtml() + colsHead()
        html += groupRows(rows).map(function (g) {
          return '<section class="menu-group">' +
            (g.title ? '<h2 class="menu-group-title">' + esc(g.title) + '</h2>' : '') +
            '<ol class="menu-list">' + g.rows.map(waveRow).join('') + '</ol></section>'
        }).join('')
        panel.innerHTML = html
      }
      function applyStyle(next) {
        if (!next || typeof next !== 'object') return
        style = Object.assign({}, style, next)
        paint()
      }
      function applyLadder(next) {
        ladder = Array.isArray(next) ? next : []
        paint()
      }
      function applyFocus(next) {
        var name = next && next.name ? String(next.name) : ''
        var amountLabel = next && next.amountLabel ? String(next.amountLabel) : ''
        focusKey = name && amountLabel
          ? name.toLowerCase() + '|' + amountLabel.toLowerCase()
          : ''
        paint()
      }
      paint()
      var es = new EventSource('/api/overlay/stream?role=menu')
      es.addEventListener('menuStyle', function (ev) {
        try { applyStyle(JSON.parse(ev.data)) } catch (e) {}
      })
      es.addEventListener('ladder', function (ev) {
        try {
          var j = JSON.parse(ev.data)
          applyLadder(j && j.ladder ? j.ladder : j)
        } catch (e) {}
      })
      es.addEventListener('focus', function (ev) {
        try { applyFocus(JSON.parse(ev.data)) } catch (e) {}
      })
      fetch('/api/overlay/menu-style', { cache: 'no-store' }).then(function (r) { return r.json() }).then(function (j) {
        if (j && j.style) applyStyle(j.style)
      }).catch(function () {})
      fetch('/api/overlay/status', { cache: 'no-store' }).then(function (r) { return r.json() }).then(function (j) {
        if (j && Array.isArray(j.ladder)) applyLadder(j.ladder)
        if (j && j.focus) applyFocus(j.focus)
      }).catch(function () {})
    })()
  </script>
</body>
</html>`
}
