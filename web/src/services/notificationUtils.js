export const updateBadge = (count) => {
  try {
    if (navigator.setAppBadge) {
      navigator.setAppBadge(count);
    } else if (navigator.setExperimentalAppBadge) {
      navigator.setExperimentalAppBadge(count);
    }
  } catch {}
};

export const clearBadge = () => {
  try {
    if (navigator.clearAppBadge) {
      navigator.clearAppBadge();
    } else if (navigator.setExperimentalAppBadge) {
      navigator.setExperimentalAppBadge(0);
    }
  } catch {}
};

export const showNotification = (title, options) => {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    new Notification(title, options);
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then((permission) => {
      if (permission === 'granted') new Notification(title, options);
    });
  }
};

export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const permission = await Notification.requestPermission();
  return permission === 'granted';
};