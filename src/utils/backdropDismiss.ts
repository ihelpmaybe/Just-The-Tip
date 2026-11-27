/**
 * Close a modal only when the user presses *and* releases on the backdrop.
 * Prevents the classic bug: highlight text inside the panel, drag outside,
 * mouseup/click on the scrim → modal closes.
 */
export function onBackdropDismiss(
  backdrop: HTMLElement,
  onDismiss: () => void,
): () => void {
  let pressedOnBackdrop = false

  const onPointerDown = (e: PointerEvent) => {
    pressedOnBackdrop = e.target === backdrop
  }

  const onClick = (e: MouseEvent) => {
    const releaseOnBackdrop = e.target === backdrop
    if (pressedOnBackdrop && releaseOnBackdrop) onDismiss()
    pressedOnBackdrop = false
  }

  const onPointerCancel = () => {
    pressedOnBackdrop = false
  }

  backdrop.addEventListener('pointerdown', onPointerDown)
  backdrop.addEventListener('click', onClick)
  backdrop.addEventListener('pointercancel', onPointerCancel)

  return () => {
    backdrop.removeEventListener('pointerdown', onPointerDown)
    backdrop.removeEventListener('click', onClick)
    backdrop.removeEventListener('pointercancel', onPointerCancel)
  }
}
