import {
  getClientDeviceSnapshot,
  resolveClientDeviceProfile,
  type ClientDeviceSnapshot,
} from "@/features/app-shell/device/clientDeviceModel";

export type PlaneHunterClientDevice = ClientDeviceSnapshot;

export function shouldEnablePlaneHunterForClientDevice(
  device: PlaneHunterClientDevice | null | undefined,
) {
  const profile = resolveClientDeviceProfile(device);
  return profile.isMobileDevice && profile.hasCamera;
}

export function getPlaneHunterClientDevice(): PlaneHunterClientDevice | null {
  return getClientDeviceSnapshot();
}
