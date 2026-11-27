/// <reference types="vite/client" />

/** Minimal Web Bluetooth types used by Lovense desktop BLE. */
interface BluetoothLEScanFilter {
  services?: BluetoothServiceUUID[]
  name?: string
  namePrefix?: string
}

interface RequestDeviceOptions {
  filters?: BluetoothLEScanFilter[]
  optionalServices?: BluetoothServiceUUID[]
  acceptAllDevices?: boolean
}

type BluetoothServiceUUID = number | string

interface Bluetooth {
  requestDevice(options?: RequestDeviceOptions): Promise<BluetoothDevice>
  getDevices?(): Promise<BluetoothDevice[]>
}

interface BluetoothDevice extends EventTarget {
  readonly id: string
  readonly name?: string | null
  readonly gatt?: BluetoothRemoteGATTServer
  watchAdvertisements?(options?: { signal?: AbortSignal }): Promise<void>
  addEventListener(
    type: 'gattserverdisconnected' | 'advertisementreceived',
    listener: (ev: Event) => void,
    options?: boolean | AddEventListenerOptions,
  ): void
  removeEventListener(
    type: 'gattserverdisconnected' | 'advertisementreceived',
    listener: (ev: Event) => void,
    options?: boolean | EventListenerOptions,
  ): void
}

interface BluetoothRemoteGATTServer {
  readonly device: BluetoothDevice
  readonly connected: boolean
  connect(): Promise<BluetoothRemoteGATTServer>
  disconnect(): void
  getPrimaryService(
    service: BluetoothServiceUUID,
  ): Promise<BluetoothRemoteGATTService>
  getPrimaryServices(
    service?: BluetoothServiceUUID,
  ): Promise<BluetoothRemoteGATTService[]>
}

interface BluetoothRemoteGATTService {
  readonly uuid: string
  getCharacteristic(
    characteristic: BluetoothServiceUUID,
  ): Promise<BluetoothRemoteGATTCharacteristic>
  getCharacteristics(
    characteristic?: BluetoothServiceUUID,
  ): Promise<BluetoothRemoteGATTCharacteristic[]>
}

interface BluetoothCharacteristicProperties {
  readonly write: boolean
  readonly writeWithoutResponse: boolean
  readonly notify: boolean
  readonly indicate?: boolean
  readonly read: boolean
}

interface BluetoothRemoteGATTCharacteristic extends EventTarget {
  readonly uuid: string
  readonly service?: BluetoothRemoteGATTService
  readonly properties: BluetoothCharacteristicProperties
  readonly value?: DataView | null
  writeValue(value: BufferSource): Promise<void>
  writeValueWithResponse(value: BufferSource): Promise<void>
  writeValueWithoutResponse(value: BufferSource): Promise<void>
  startNotifications(): Promise<BluetoothRemoteGATTCharacteristic>
  stopNotifications(): Promise<BluetoothRemoteGATTCharacteristic>
  addEventListener(
    type: 'characteristicvaluechanged',
    listener: (ev: Event) => void,
    options?: boolean | AddEventListenerOptions,
  ): void
  removeEventListener(
    type: 'characteristicvaluechanged',
    listener: (ev: Event) => void,
    options?: boolean | EventListenerOptions,
  ): void
}

interface Navigator {
  bluetooth: Bluetooth
}
