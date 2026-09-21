import { Howl, Howler } from 'howler';

export type AudioNotice =
  | { kind: 'ready'; message: string }
  | { kind: 'missing'; message: string }
  | { kind: 'error'; message: string };

type ProgressCallback = (progress: number, duration: number, playing: boolean) => void;

export class TraceAudioEngine {
  private context: AudioContext | null = null;
  private ambient: Howl | null = null;
  private ambientToken = 0;
  private hotspot: Howl | null = null;
  private progressFrame = 0;
  private unlocked = false;
  private muted = false;
  private ambientVolume = 0.42;
  private notice?: (notice: AudioNotice) => void;

  constructor(onNotice?: (notice: AudioNotice) => void) {
    this.notice = onNotice;
  }

  get isUnlocked() {
    return this.unlocked;
  }

  get isMuted() {
    return this.muted;
  }

  async unlock() {
    if (this.unlocked) {
      if (this.context?.state === 'suspended') await this.context.resume();
      if (Howler.ctx?.state === 'suspended') await Howler.ctx.resume();
      return;
    }

    const AudioContextCtor =
      window.AudioContext ??
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextCtor) {
      throw new Error('此瀏覽器不支援 Web Audio API。');
    }

    this.context = new AudioContextCtor();
    await this.context.resume();
    this.unlocked = true;
    this.muted = false;
    Howler.mute(false);
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    Howler.mute(muted);
    if (muted) this.stopHotspot();
  }

  async playAmbient(src: string, fadeMs = 900) {
    if (!this.unlocked || this.muted) return;
    const token = ++this.ambientToken;
    const previous = this.ambient;

    const next = new Howl({
      src: [src],
      loop: true,
      volume: 0,
      html5: false,
      preload: true,
      onload: () => {
        if (token !== this.ambientToken || this.muted) return;
        this.notice?.({ kind: 'ready', message: '環境聲已開啟' });
      },
      onloaderror: () => {
        if (token !== this.ambientToken) return;
        this.notice?.({ kind: 'missing', message: '此場景的環境聲尚待補充' });
        next.unload();
        if (this.ambient === next) this.ambient = null;
      },
      onplayerror: () => {
        this.notice?.({ kind: 'error', message: '聲音未能播放，請再次點擊聲音按鈕' });
      },
    });

    this.ambient = next;
    next.play();
    next.fade(0, this.ambientVolume, fadeMs);

    if (previous) {
      const from = previous.volume();
      previous.fade(typeof from === 'number' ? from : this.ambientVolume, 0, fadeMs);
      window.setTimeout(() => {
        previous.stop();
        previous.unload();
      }, fadeMs + 80);
    }
  }

  setAmbientVolume(volume: number) {
    this.ambientVolume = Math.max(0, Math.min(1, volume));
    if (this.ambient && !this.muted) {
      this.ambient.fade(this.ambient.volume() as number, this.ambientVolume, 300);
    }
  }

  playHotspot(
    src: string,
    pan: number,
    onProgress?: ProgressCallback,
    onMissing?: () => void,
  ) {
    if (!this.unlocked || this.muted) return false;
    this.stopHotspot();

    const sound = new Howl({
      src: [src],
      loop: false,
      volume: 0.78,
      html5: false,
      preload: true,
      onloaderror: () => {
        this.notice?.({ kind: 'missing', message: '此熱點的聲音尚待補充' });
        onMissing?.();
        sound.unload();
        if (this.hotspot === sound) this.hotspot = null;
      },
      onplay: () => this.watchProgress(sound, onProgress),
      onpause: () => this.watchProgress(sound, onProgress),
      onstop: () => this.cancelProgress(),
      onend: () => {
        this.cancelProgress();
        onProgress?.(sound.duration(), sound.duration(), false);
      },
      onplayerror: () => {
        this.notice?.({ kind: 'error', message: '聲音未能播放，請再次點擊聲音按鈕' });
      },
    });

    this.hotspot = sound;
    sound.stereo(Math.max(-1, Math.min(1, pan)));
    sound.play();
    return true;
  }

  toggleHotspot(onProgress?: ProgressCallback) {
    if (!this.hotspot) return false;
    if (this.hotspot.playing()) {
      this.hotspot.pause();
    } else {
      this.hotspot.play();
      this.watchProgress(this.hotspot, onProgress);
    }
    return this.hotspot.playing();
  }

  seekHotspot(seconds: number) {
    if (!this.hotspot) return;
    this.hotspot.seek(Math.max(0, Math.min(seconds, this.hotspot.duration() || seconds)));
  }

  stopHotspot() {
    this.cancelProgress();
    if (this.hotspot) {
      this.hotspot.stop();
      this.hotspot.unload();
      this.hotspot = null;
    }
  }

  destroy() {
    this.ambientToken += 1;
    this.stopHotspot();
    if (this.ambient) {
      this.ambient.stop();
      this.ambient.unload();
      this.ambient = null;
    }
    void this.context?.close();
    this.context = null;
    this.unlocked = false;
  }

  private watchProgress(sound: Howl, onProgress?: ProgressCallback) {
    this.cancelProgress();
    if (!onProgress) return;

    const tick = () => {
      const seek = sound.seek();
      onProgress(typeof seek === 'number' ? seek : 0, sound.duration() || 0, sound.playing());
      if (sound.playing()) this.progressFrame = window.requestAnimationFrame(tick);
    };
    tick();
  }

  private cancelProgress() {
    if (this.progressFrame) window.cancelAnimationFrame(this.progressFrame);
    this.progressFrame = 0;
  }
}
