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

export type PushSetupResult = "subscribed" | "denied" | "unsupported" | "error";

/**
 * Only ever called from a button tap (see docs/ARCHITECTURE.md
 * "Notifications" — never request permission on load). Registers this
 * device for push and saves the subscription against `memberId`.
 */
export async function enablePushForMember(memberId: string): Promise<PushSetupResult> {
  if (!pushSupported || !VAPID_PUBLIC_KEY) return "unsupported";

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return "denied";

  try {
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      });
    }
    const ok = await savePushSubscription(memberId, subscription.toJSON());
    return ok ? "subscribed" : "error";
  } catch {
    return "error";
  }
}

export async function currentPushPermission(): Promise<NotificationPermission | "unsupported"> {
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.permission;
}
