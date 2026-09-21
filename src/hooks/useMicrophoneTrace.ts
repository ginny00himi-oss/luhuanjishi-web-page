import { useCallback, useEffect, useRef, useState } from 'react';

export type MicrophoneState = 'off' | 'requesting' | 'active' | 'denied' | 'unsupported';

export function useMicrophoneTrace(onMessage: (message: string) => void) {
  const [state, setState] = useState<MicrophoneState>('off');
  const [level, setLevel] = useState(0);
  const streamRef = useRef<MediaStream | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const frameRef = useRef(0);
  const smoothRef = useRef(0);
  const lastReactUpdateRef = useRef(0);
  const requestTokenRef = useRef(0);
  const mountedRef = useRef(true);

  const stop = useCallback(() => {
    requestTokenRef.current += 1;
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = 0;
    sourceRef.current?.disconnect();
    analyserRef.current?.disconnect();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    const context = contextRef.current;
    if (context && context.state !== 'closed') void context.close().catch(() => undefined);
    streamRef.current = null;
    sourceRef.current = null;
    analyserRef.current = null;
    contextRef.current = null;
    smoothRef.current = 0;
    lastReactUpdateRef.current = 0;
    document.documentElement.style.setProperty('--mic-level', '0');
    document.documentElement.style.setProperty('--mic-speed', '2.4s');
    if (mountedRef.current) {
      setLevel(0);
      setState('off');
    }
  }, []);

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setState('unsupported');
      onMessage('此裝置不支援麥克風互動；全景仍可正常瀏覽');
      return;
    }

    if (!window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      setState('unsupported');
      onMessage('聲音尋跡需要在 HTTPS 或 localhost 開啟');
      return;
    }

    setState('requesting');
    const requestToken = ++requestTokenRef.current;
    let stream: MediaStream | null = null;
    let context: AudioContext | null = null;
    let source: MediaStreamAudioSourceNode | null = null;
    let analyser: AnalyserNode | null = null;

    const releaseLocalResources = () => {
      try {
        source?.disconnect();
      } catch {
        // The node may already have been disconnected by stop().
      }
      try {
        analyser?.disconnect();
      } catch {
        // The node may already have been disconnected by stop().
      }
      stream?.getTracks().forEach((track) => track.stop());
      if (context && context.state !== 'closed') void context.close().catch(() => undefined);
      if (streamRef.current === stream) streamRef.current = null;
      if (contextRef.current === context) contextRef.current = null;
      if (sourceRef.current === source) sourceRef.current = null;
      if (analyserRef.current === analyser) analyserRef.current = null;
    };

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      if (requestToken !== requestTokenRef.current) {
        releaseLocalResources();
        return;
      }

      streamRef.current = stream;
      const AudioContextCtor =
        window.AudioContext ??
        (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextCtor) throw new Error('Web Audio API is unavailable.');

      context = new AudioContextCtor();
      contextRef.current = context;
      analyser = context.createAnalyser();
      source = context.createMediaStreamSource(stream);
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.82;
      source.connect(analyser);

      sourceRef.current = source;
      analyserRef.current = analyser;
      await context.resume();
      if (requestToken !== requestTokenRef.current) {
        releaseLocalResources();
        return;
      }
      if (!analyser) throw new Error('Audio analyser initialization failed.');
      const activeAnalyser = analyser;

      setState('active');
      onMessage('聲音尋跡已開啟；聲音只在此裝置即時分析，不會錄音或上傳');

      const timeData = new Uint8Array(activeAnalyser.fftSize);
      const frequencyData = new Uint8Array(activeAnalyser.frequencyBinCount);

      const analyse = (time: number) => {
        if (requestToken !== requestTokenRef.current || analyserRef.current !== activeAnalyser) return;
        activeAnalyser.getByteTimeDomainData(timeData);
        activeAnalyser.getByteFrequencyData(frequencyData);

        let squareSum = 0;
        for (const sample of timeData) {
          const normal = (sample - 128) / 128;
          squareSum += normal * normal;
        }
        const rms = Math.sqrt(squareSum / timeData.length);

        let spectralSum = 0;
        const upper = Math.max(8, Math.floor(frequencyData.length * 0.55));
        for (let index = 2; index < upper; index += 1) spectralSum += frequencyData[index];
        const spectral = spectralSum / Math.max(1, upper - 2) / 255;
        const target = Math.min(1, rms * 5.4 + spectral * 0.6);
        smoothRef.current += (target - smoothRef.current) * (target > smoothRef.current ? 0.25 : 0.075);
        const next = Math.max(0, Math.min(1, smoothRef.current));
        document.documentElement.style.setProperty('--mic-level', next.toFixed(3));
        document.documentElement.style.setProperty('--mic-speed', `${Math.max(0.75, 2.4 - next * 1.65).toFixed(2)}s`);

        if (time - lastReactUpdateRef.current > 120) {
          lastReactUpdateRef.current = time;
          setLevel(next);
        }
        frameRef.current = requestAnimationFrame(analyse);
      };
      frameRef.current = requestAnimationFrame(analyse);
    } catch {
      releaseLocalResources();
      if (requestToken === requestTokenRef.current && mountedRef.current) {
        setLevel(0);
        setState('denied');
        onMessage('未能使用麥克風；全景、文字與其他控制仍可正常使用');
      }
    }
  }, [onMessage]);

  useEffect(() => {
    mountedRef.current = true;
    const beforeUnload = () => stop();
    window.addEventListener('beforeunload', beforeUnload);
    return () => {
      mountedRef.current = false;
      window.removeEventListener('beforeunload', beforeUnload);
      stop();
    };
  }, [stop]);

  return { state, level, start, stop };
}
