/**
 * Stream tip alert — modular component package.
 *
 * - style: look & filter types + samples
 * - publish: client POST/PUT to local hub
 * - browserHtml: OBS Browser Source page
 * - operatorPanel: operator settings page + mount API
 * - server/overlay-hub: SSE hub used by vite + host
 */
export {
  defaultOverlayStyle,
  normalizeOverlayStyle,
  isCustomWindowStyle,
  SAMPLE_CUSTOM_CSS,
  SAMPLE_CUSTOM_HTML,
  type OverlayPosition,
  type OverlaySize,
  type OverlayStyle,
  type OverlayTheme,
} from './style'

export {
  defaultOverlayQr,
  normalizeOverlayQr,
  applyOverlayQrUpdate,
  OVERLAY_MENU_OFFER_LIMIT,
  takeOverlayMenuOffersEvenly,
  type OverlayQr,
  type OverlayQrSize,
  type OverlayQrTheme,
  type OverlayMenuOffer,
} from './qrState'

export {
  defaultOverlayMenuStyle,
  normalizeOverlayMenuStyle,
  OVERLAY_MENU_LAYOUTS,
  OVERLAY_MENU_MAX_ROWS,
  OVERLAY_MENU_DEFAULT_ROWS,
  getOverlayMenuLayout,
  type OverlayMenuLayout,
  type OverlayMenuStyle,
  type OverlayMenuTheme,
  type OverlayMenuLayoutInfo,
} from './menuStyle'

export { overlayMenuPageHtml } from './menuPageHtml'

export {
  overlayQrBrowserUrl,
  overlayQrPreviewUrl,
  pushOverlayQr,
} from './qrPublish'

export { overlayQrPageHtml } from './qrPageHtml'

export {
  OVERLAY_TEMPLATES,
  getOverlayTemplate,
  type OverlayTemplate,
} from './templates'

export {
  publishOverlayTip,
  publishOverlayTipDetailed,
  pushOverlayStyle,
  pushOverlayPulse,
  pushOverlayLadder,
  pushOverlayMenuStyle,
  fetchOverlayStatus,
  overlayBrowserUrl,
  overlayPreviewUrl,
  overlayMenuBrowserUrl,
  overlayMenuPreviewUrl,
  openOverlayPreview,
  type OverlayTipPayload,
  type PublishOverlayResult,
} from './publish'

export {
  slimOverlayLadder,
  overlayHitFromUsd,
  overlayHoldMs,
  OVERLAY_HIT_USD,
  type OverlayLadderRow,
  type OverlayPulseHit,
} from './stage'

export {
  ecosystemLogosHtml,
  ecosystemLogoItems,
  pulsechainMarkSvg,
} from './ecosystem'

export {
  BRAND_KIT_LINKS,
  PULSE_PACK,
  pulsePackEcoItems,
  pulsePackLogoItems,
  pulsePackStreamQrItems,
  brandAssetUrl,
  TIP_WALLET_URL,
  type PulsePackItem,
} from './pulseBundle'

export { overlayPageHtml } from './browserHtml'

export {
  overlayMenuInnerHtml,
  overlayMenuPanelHtml,
  overlayMenuStageClass,
  prepareOverlayMenuRows,
  OVERLAY_MENU_CSS,
} from './menuRender'

export {
  streamTipAlertPageHtml,
  mountStreamTipAlert,
  type StreamTipAlertApi,
  type StreamTipAlertHost,
} from './operatorPanel'
