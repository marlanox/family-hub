import { savePushSubscription } from "./sync";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

export const pushSupported =
  typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64Safe);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export type PushSetupResult = "subscribed" | "denied" | "unsupported" | "no-key" | "error";

/**
 * Only ever called from a button tap (see docs/ARCHITECTURE.md
 * "Notifications" — never request permission on load). Registers this
 * device for push and saves the subscription against `memberId`.
 */
export async function enablePushForMember(memberId: string): Promise<PushSetupResult> {
  if (!pushSupported) return "unsupported";
  // Reported separately from "unsupported": a build missing this key used
  // to show "your browser doesn't support notifications" on a perfectly
  // capable iPhone, which sent debugging in completely the wrong direction.
  if (!VAPID_PUBLIC_KEY) return "no-key";

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return "denied";

  try {
    const subscription = await getOrCreateSubscription();
    const ok = await savePushSubscription(memberId, subscription.toJSON());
    return ok ? "subscribed" : "error";
  } catch {
    return "error";
  }
}

async function getOrCreateSubscription(): Promise<PushSubscription> {
  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  if (existing) return existing;
  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
  });
}

/**
 * Silently (no prompt) saves this device's subscription against the
 * current member, if notifications are already allowed. Onboarding asks
 * for notifications before the device has joined the family cloud, so
 * that first subscription had nowhere to be saved — and once "who am I"
 * switches to the real cloud member after joining, it would never be
 * tied to them otherwise. Upserting by endpoint also re-points a
 * subscription that was saved under a stale member id.
 */
export async function resyncPushSubscription(memberId: string): Promise<void> {
  if (!pushSupported || !VAPID_PUBLIC_KEY) return;
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  try {
    const subscription = await getOrCreateSubscription();
    await savePushSubscription(memberId, subscription.toJSON());
  } catch {
    // Best-effort; the Settings button is still there as the explicit path.
  }
}

export async function currentPushPermission(): Promise<NotificationPermission | "unsupported"> {
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.permission;
}
