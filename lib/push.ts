export function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function subscribeToPush(): Promise<{ success: boolean; error?: string }> {
  try {
    if (typeof window === 'undefined') return { success: false, error: 'Window undefined' };
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return { success: false, error: 'Push messaging not supported' };
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { success: false, error: 'Permission not granted' };
    }

    const registration = await navigator.serviceWorker.ready;

    const vapidPublicKey =
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
      'BIX5fwMU2LWlC5Kl_ZsEgHQ5mi6HbvmrWJIhG6TnQTQfvQgKlrCzThjQIhtQp7u8jambKXsES-C2zEcDtZDKzx8';

    if (!vapidPublicKey) {
      return { success: false, error: 'VAPID key not configured' };
    }

    const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey,
      });
    }

    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(subscription),
    });

    if (res.ok) {
      console.log('Push subscription successfully synced with server.');
      return { success: true };
    } else {
      const data = await res.json();
      return { success: false, error: data?.error || 'Server error' };
    }
  } catch (error: any) {
    console.error('Failed to subscribe to push notifications:', error);
    return { success: false, error: error?.message || 'Unknown error' };
  }
}
