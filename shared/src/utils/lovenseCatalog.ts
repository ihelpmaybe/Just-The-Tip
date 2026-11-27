/**
 * Tip-menu virtual Lovense catalog (tile picker / filters).
 * Independent of the standalone lovense-connect-emulator catalog.
 */

export type LovenseCatalogEntry = {
  /** Stable id (emu + tip filter share these). */
  id: string
  name: string
  toyType: string
  /** Connect-style feature list, e.g. "Vibrate,Thrusting" */
  f: string
  vibrationMotors: number
  battery?: number
  version?: string
}

function entry(
  id: string,
  name: string,
  toyType: string,
  f: string,
  vibrationMotors: number,
  battery = 70,
  version = '1',
): LovenseCatalogEntry {
  return { id, name, toyType, f, vibrationMotors, battery, version }
}

/** Broad virtual catalog for multi-device UI / pattern-family demos. */
export const LOVENSE_CATALOG: LovenseCatalogEntry[] = [
  // Single-motor vibes
  entry('a10000000001', 'Lush 3', 'lush', 'Vibrate', 1, 87, '3'),
  entry('a10000000002', 'Lush 2', 'lush', 'Vibrate', 1, 81, '2'),
  entry('a10000000003', 'Hush 2', 'hush', 'Vibrate', 1, 76, '2'),
  entry('a10000000004', 'Hush', 'hush', 'Vibrate', 1, 70, '1'),
  entry('a10000000005', 'Domi 2', 'domi', 'Vibrate', 1, 92, '2'),
  entry('a10000000006', 'Ambi', 'ambi', 'Vibrate', 1, 88, '1'),
  entry('a10000000007', 'Osci 3', 'osci', 'Vibrate', 1, 74, '3'),
  entry('a10000000008', 'Ferri', 'ferri', 'Vibrate', 1, 69, '1'),
  entry('a10000000009', 'Exomoon', 'exomoon', 'Vibrate', 1, 85, '1'),
  entry('a1000000000a', 'Diamo', 'diamo', 'Vibrate', 1, 78, '1'),
  entry('a1000000000b', 'Flexer', 'flexer', 'Vibrate', 1, 73, '1'),
  entry('a1000000000c', 'Vulse', 'vulse', 'Vibrate', 1, 80, '1'),
  entry('a1000000000d', 'Hyphy', 'hyphy', 'Vibrate', 1, 77, '1'),
  entry('a1000000000e', 'Tenera', 'tenera', 'Vibrate', 1, 71, '1'),
  entry('a1000000000f', 'Mission 2', 'mission', 'Vibrate', 1, 66, '2'),
  entry('a10000000010', 'Ridge', 'ridge', 'Vibrate,Thrusting', 1, 68, '1'),
  entry('a10000000011', 'Gush 2', 'gush', 'Vibrate,Thrusting', 1, 75, '2'),
  entry('a10000000012', 'Calor', 'calor', 'Vibrate', 1, 82, '1'),
  entry('a10000000013', 'Gravity', 'gravity', 'Vibrate,Thrusting', 1, 64, '1'),

  // Dual / multi motor
  entry('a20000000001', 'Edge 2', 'edge', 'Vibrate,Vibrate1,Vibrate2', 2, 64, '2'),
  entry('a20000000002', 'Edge', 'edge', 'Vibrate,Vibrate1,Vibrate2', 2, 60, '1'),
  entry('a20000000003', 'Dolce', 'dolce', 'Vibrate,Vibrate1,Vibrate2', 2, 71, '1'),
  entry('a20000000004', 'Gemini', 'gemini', 'Vibrate,Vibrate1,Vibrate2', 2, 79, '1'),
  entry('a20000000005', 'Lapis', 'lapis', 'Vibrate,Vibrate1,Vibrate2', 2, 73, '1'),
  entry(
    'a20000000006',
    'Sex Machine',
    'sexmachine',
    'Vibrate,Vibrate1,Vibrate2,Thrusting',
    2,
    58,
    '1',
  ),

  // Secondary features (rotate / air / thrust)
  entry('a30000000001', 'Nora', 'nora', 'Vibrate,Rotate', 1, 72, '1'),
  entry('a30000000002', 'Max 2', 'max', 'Vibrate,Air', 1, 55, '2'),
  entry('a30000000003', 'Max', 'max', 'Vibrate,Air', 1, 50, '1'),
  entry(
    'a30000000004',
    'Solace Pro',
    'solace',
    'Vibrate,Vibrate1,Vibrate2,Thrusting',
    2,
    62,
    '2',
  ),
  entry('a30000000005', 'Solace', 'solace', 'Vibrate,Thrusting', 1, 59, '1'),
  entry('a30000000006', 'Solace Demo', 'solace', 'Vibrate,Thrusting', 1, 95, '1'),

  // Clamps / panty / wearable secondary
  entry('a40000000001', 'Lush Flex', 'lush', 'Vibrate', 1, 83, '1'),
  entry('a40000000002', 'Edge Flex', 'edge', 'Vibrate,Vibrate1,Vibrate2', 2, 67, '1'),
  entry('a40000000003', 'Panty Vibe', 'panty', 'Vibrate', 1, 90, '1'),
  entry('a40000000004', 'Vulse Adjustable', 'vulse', 'Vibrate', 1, 86, '1'),
  entry(
    'a40000000005',
    'Magnet Clips',
    'clamps',
    'Vibrate,Vibrate1,Vibrate2',
    2,
    84,
    '1',
  ),
  entry('a40000000006', 'Bloom', 'bloom', 'Vibrate', 1, 65, '1'),
  entry('a40000000007', 'Amaze', 'amaze', 'Vibrate', 1, 70, '1'),
]

export function catalogSecondary(f: string): {
  rotate: boolean
  air: boolean
  pump: boolean
  thrust: boolean
} {
  const blob = f.toLowerCase()
  return {
    rotate: /\brotate\b/.test(blob),
    air: /\bair\b|absoluteair|pump/.test(blob),
    pump: /\bpump\b|\bair\b/.test(blob),
    thrust: /\bthrust/.test(blob),
  }
}
