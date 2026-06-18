import {
  type ClientDeviceProfile,
  resolveClientDeviceProfile,
  type ClientDeviceSnapshot,
} from "@/features/app-shell/device/clientDeviceModel";

export type PlaneHunterClientDevice = ClientDeviceSnapshot;

export function shouldEnablePlaneHunterForClientDeviceProfile(
  profile:
    | Pick<ClientDeviceProfile, "hasCamera" | "isMobileDevice">
    | null
    | undefined,
) {
  return profile?.isMobileDevice === true && profile.hasCamera === true;
}

export function shouldEnablePlaneHunterForClientDevice(
  device: PlaneHunterClientDevice | null | undefined,
) {
  const profile = resolveClientDeviceProfile(device);
  return shouldEnablePlaneHunterForClientDeviceProfile(profile);
}
