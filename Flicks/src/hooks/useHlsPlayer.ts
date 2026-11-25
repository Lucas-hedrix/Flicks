import { useEffect, type RefObject } from 'react';
import Hls from 'hls.js';

const isHls = (url: string) => /\.m3u8(\?|$)/i.test(url) || url.includes('/api/proxy/m3u8');

/**
 * Attach a stream URL to a <video> element.
 *
 * - `.m3u8` (or our m3u8 proxy) → drive it with hls.js where MSE is supported,
 *   or fall back to the browser's native HLS (Safari/iOS) when it isn't.
 * - anything else (mp4, or a native-HLS URL) → set `video.src` directly.
 *
 * Fatal, unrecoverable errors bubble up through `onFatal` so the player can
 * fall back to the iframe embed.
 *
 * @param videoRef ref to the target <video>
 * @param url      the (proxied) stream URL, or null when nothing should play
 * @param onFatal  called once when playback fails unrecoverably
 */
export function useHlsPlayer(
  videoRef: RefObject<HTMLVideoElement | null>,
  url: string | null,
  onFatal?: () => void,
) {
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !url) return;

    let hls: Hls | null = null;
    let recoverAttempts = 0;
    const MAX_RECOVER = 2;

    const fail = () => {
      if (onFatal) onFatal();
    };

    if (isHls(url) && Hls.isSupported()) {
      hls = new Hls({
        // Keep buffering modest; proxied segments can be slow to first byte.
        maxBufferLength: 30,
        enableWorker: true,
      });

      hls.loadSource(url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {
          /* autoplay may be blocked; user can press play */
        });
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal) return;

        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            if (recoverAttempts < MAX_RECOVER) {
              recoverAttempts += 1;
              hls?.startLoad();
            } else {
              fail();
            }
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            if (recoverAttempts < MAX_RECOVER) {
              recoverAttempts += 1;
              hls?.recoverMediaError();
            } else {
              fail();
            }
            break;
          default:
            fail();
            break;
        }
      });
    } else {
      // Direct playback: mp4, or native HLS (Safari) via the <video> element.
      video.src = url;
      const onError = () => fail();
      video.addEventListener('error', onError);
      video.play().catch(() => {
        /* autoplay may be blocked */
      });

      return () => {
        video.removeEventListener('error', onError);
        video.removeAttribute('src');
        video.load();
      };
    }

    return () => {
      if (hls) {
        hls.destroy();
        hls = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);
}
