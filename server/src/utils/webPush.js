
import webpush from 'web-push';

const publicKey = process.env.VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;

if (publicKey && privateKey) {
  webpush.setVapidDetails(
    'mailto:bloodbridge@example.com',
    publicKey,
    privateKey
  );
}

export { webpush };
