import type { Page } from 'playwright'
import {
  MEME_TOKEN_PRESETS,
  PDAI_TIP_ADDRESS,
  STABLE_TOKEN_PRESETS,
  TOKEN_PRESETS,
  type TokenPreset,
} from '../../shared/src/state/tokens.ts'

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function chipFor(page: Page, label: string) {
  return page
    .locator('.menu-coin-price-chip')
    .filter({ hasText: new RegExp(`^\\s*${escapeRegExp(label)}\\b`) })
}

const KNOWN_BY_LABEL = new Map<string, TokenPreset>()
for (const p of [
  ...TOKEN_PRESETS,
  ...MEME_TOKEN_PRESETS,
  ...STABLE_TOKEN_PRESETS,
  {
    address: PDAI_TIP_ADDRESS,
    symbol: 'DAI',
    decimals: 18,
    label: 'PornDai',
  },
]) {
  KNOWN_BY_LABEL.set(p.label, p)
  KNOWN_BY_LABEL.set(p.symbol, p)
}

async function saveKnownToken(page: Page, label: string): Promise<boolean> {
  const preset = KNOWN_BY_LABEL.get(label)
  if (!preset) return false
  await page.locator('#token').fill(preset.address)
  await page.locator('#token-dec').fill(String(preset.decimals))
  await page.locator('#token-sym').fill(preset.symbol)
  await page.locator('#token-label').fill(preset.label)
  await page.locator('#btn-save-token').click()
  await page.waitForTimeout(350)
  return true
}

/** Turn a whitelist coin on/off — Suggestions only has PLS; others Save token first. */
export async function setWhitelistCoin(
  page: Page,
  label: string,
  on: boolean,
  pauseMs = 400,
): Promise<void> {
  const chip = chipFor(page, label).first()
  if (await chip.count()) {
    const pressed = (await chip.getAttribute('aria-pressed')) === 'true'
    if (pressed !== on) {
      await chip.click()
      await page.waitForTimeout(pauseMs)
    }
    return
  }
  if (!on) return
  const select = page.locator('#menu-coin-suggest')
  if (await select.count()) {
    const option = select
      .locator('option')
      .filter({ hasText: new RegExp(`^${escapeRegExp(label)}\\b`) })
    const value = await option.getAttribute('value')
    if (value) {
      await select.selectOption(value)
      await page.waitForTimeout(pauseMs)
      return
    }
  }
  if (await saveKnownToken(page, label)) {
    const after = chipFor(page, label).first()
    if (await after.count()) {
      const pressed = (await after.getAttribute('aria-pressed')) === 'true'
      if (!pressed) {
        await after.click()
        await page.waitForTimeout(pauseMs)
      }
      return
    }
  }
  throw new Error(`No chip, Suggestions entry, or Save-token preset for ${label}`)
}
