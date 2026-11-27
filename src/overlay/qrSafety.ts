/**
 * Overlay / OBS QR sanitizers — same rules as the shared fan QR helpers.
 */
export {
  extractEthAddresses,
  fanSafeCreatorWalletUri,
  isCreatorWalletQrPayload,
  isWebsiteLinkQrPayload,
  overlayQrPayloadLooksUnsafe,
  sanitizeCreatorWalletQrPayload,
  sanitizeWebsiteLinkQrPayload,
} from '../../shared/src/utils/fanQr.ts'
