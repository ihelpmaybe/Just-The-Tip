/** Ship version — keep in lockstep with package.json */
export const APP_NAME = 'Just The Tip'
/** Filenames / npm / Lovense platform header. Not a localStorage key. */
export const APP_SLUG = 'just-the-tip'
export const APP_VERSION = '2.0.29'
/** App lockup (PNG). PulseChain mark stays under public/brand/. */
function appLogoPath() {
  try {
    const base = import.meta.env?.BASE_URL || '/'
    return `${base}brand/just-the-tip-logo.png`
  } catch {
    return '/brand/just-the-tip-logo.png'
  }
}
export const APP_LOGO = appLogoPath()

/**
 * Project tip jar (PulseChain / EVM). Display only — not the tip-receive wallet.
 * 2026-11-27: was 0x391B…A5Ff (empty / keys not found). Now bich Trezor #2 bunker slot.
 */
export const DONATION_ADDRESS = '0x64fB4919D9336a059cbD5F4428E319d0F232F64d'
