// Where the app finds the backend and the videos.
//
// Browser dev (npm run dev): leave both unset. /api and /media go through the Vite proxy.
//
// Android APK (Capacitor): the app runs from the phone itself, so it needs the
// backend's full address, e.g. in frontend/.env.production:
//   VITE_API_BASE=http://192.168.43.10:8787     (laptop IP on the hotspot)
// and, to put the 50 videos inside the APK so the feed works with no network:
//   VITE_BUNDLED_MEDIA=true                      (then run: npm run bundle:media)

export const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/+$/, '');
export const BUNDLED_MEDIA = import.meta.env.VITE_BUNDLED_MEDIA === 'true';

/** Turn a reel/thumb path from reels.json into a URL this build can load. */
export function mediaUrl(src) {
  if (!src) return src;
  if (/^https?:\/\//i.test(src)) return src;
  if (BUNDLED_MEDIA) {
    // Videos copied into the app by `npm run bundle:media`
    return src.replace(/^\/media\/reels\//, './reels/').replace(/^\/media\/thumbs\//, './thumbs/');
  }
  return API_BASE + src;
}
