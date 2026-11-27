/**
 * Minimal toy shape for tip-menu filter / pattern-fit planning.
 * Platform DeviceToy types should remain assignable to this.
 */
export type DeviceToySource =
  | 'lovense'
  | 'intiface'
  | 'preview'
  | 'bluetooth'
  | 'ble'

export type DeviceToy = {
  id: string
  name: string
  nickName?: string
  toyType?: string
  connected?: boolean
  status?: string
  battery?: number | null
  motors?: number
  functions?: string[]
  secondary?: {
    rotate?: boolean
    air?: boolean
    pump?: boolean
    thrust?: boolean
  }
  extra?: Record<string, string | number | boolean | null>
  /** Firmware / catalog version when known */
  version?: string | number | null
  source: DeviceToySource
}
