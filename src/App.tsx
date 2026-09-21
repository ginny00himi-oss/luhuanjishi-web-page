import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Viewer } from '@photo-sphere-viewer/core';
import {
  MarkersPlugin,
  type MarkerConfig,
} from '@photo-sphere-viewer/markers-plugin';
import {
  VirtualTourPlugin,
  type VirtualTourNode,
} from '@photo-sphere-viewer/virtual-tour-plugin';
import { GyroscopePlugin } from '@photo-sphere-viewer/gyroscope-plugin';
import '@photo-sphere-viewer/core/index.css';
import '@photo-sphere-viewer/markers-plugin/index.css';
import '@photo-sphere-viewer/virtual-tour-plugin/index.css';
import { HotspotEditor } from './components/HotspotEditor';
import {
  hotspotById,
  scenes as initialScenes,
  type Hotspot,
  type Scene,
} from './data/scenes';
import { useMicrophoneTrace } from './hooks/useMicrophoneTrace';
import { TraceAudioEngine, type AudioNotice } from './lib/audio';
import { clearTraceState, readTraceState, writeTraceState } from './lib/storage';

const introduction =
  '從屠場前地出發，穿過船人街的樹蔭、棚屋與魚舖，最後走到路環碼頭。九個場景記錄的不只是一條路線，也是路環漁村留在街道、建築、海風與居民生活中的痕跡。請點擊畫面中的物件，聆聽它們所保存的故事。';

const wait = (duration: number) => new Promise<void>((resolve) => window.setTimeout(resolve, duration));

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const normalizeYaw = (yaw: number) => {
  let next = yaw;
  while (next > Math.PI) next -= Math.PI * 2;
  while (next < -Math.PI) next += Math.PI * 2;
  return next;
};

const markerConfig = (hotspot: Hotspot, explored: Set<string>): MarkerConfig => ({
  id: hotspot.id,
  position: { yaw: hotspot.yaw, pitch: hotspot.pitch },
  html: `<span class="marker-ring" aria-hidden="true"><span>${escapeHtml(hotspot.icon)}</span></span>`,
  anchor: 'center center',
  size: { width: 54, height: 54 },
  tooltip: hotspot.label,
  data: { hotspotId: hotspot.id },
  className: [
    'trace-marker',
    `trace-marker--${hotspot.type}`,
    explored.has(hotspot.id) ? 'is-explored' : '',
  ]
    .filter(Boolean)
    .join(' '),
});

const sceneNode = (scene: Scene, explored: Set<string>): VirtualTourNode => {
  const links: VirtualTourNode['links'] = [];
  if (scene.previousScene) {
    links.push({
      nodeId: scene.previousScene,
      position: {
        yaw: normalizeYaw(scene.initialView.yaw + Math.PI),
        pitch: -0.2,
      },
    });
  }
  if (scene.nextScene) {
    const entrance = scene.hotspots.find((hotspot) => hotspot.targetScene === scene.nextScene);
    links.push({
      nodeId: scene.nextScene,
      position: entrance
        ? { yaw: entrance.yaw, pitch: entrance.pitch }
        : { yaw: scene.initialView.yaw, pitch: -0.2 },
    });
  }

  return {
    id: scene.id,
    panorama: scene.panorama,
    name: scene.title,
    caption: scene.subtitle,
    links,
    markers: scene.hotspots.map((hotspot) => markerConfig(hotspot, explored)),
    data: { sceneId: scene.id },
  };
};

const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds)) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const remaining = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remaining}`;
};

interface AudioProgress {
  current: number;
  duration: number;
  playing: boolean;
  missing: boolean;
}

const emptyAudioProgress: AudioProgress = {
  current: 0,
  duration: 0,
  playing: false,
  missing: false,
};

export default function App() {
  const initialStored = useMemo(() => readTraceState(), []);
  const editorMode = useMemo(() => new URLSearchParams(window.location.search).get('edit') === '1', []);
  const [sceneData, setSceneData] = useState<Scene[]>(() => structuredClone(initialScenes));
  const [currentSceneId, setCurrentSceneId] = useState('01');
  const [entered, setEntered] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [gyroEnabled, setGyroEnabled] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement));
  const [loading, setLoading] = useState(0);
  const [panoramaError, setPanoramaError] = useState('');
  const [transitioning, setTransitioning] = useState(false);
  const [transitionTitle, setTransitionTitle] = useState('');
  const [activeHotspot, setActiveHotspot] = useState<Hotspot | null>(null);
  const [audioProgress, setAudioProgress] = useState<AudioProgress>(emptyAudioProgress);
  const [subtitleVisible, setSubtitleVisible] = useState(true);
  const [explored, setExplored] = useState<Set<string>>(() => new Set(initialStored.explored));
  const [reduceMotion, setReduceMotion] = useState(initialStored.reduceMotion);
  const [helpOpen, setHelpOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [routeOpen, setRouteOpen] = useState(false);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [shadeEffect, setShadeEffect] = useState(false);
  const [duskEffect, setDuskEffect] = useState(false);
  const [tideEffect, setTideEffect] = useState(false);
  const [seaVolumeHigh, setSeaVolumeHigh] = useState(false);
  const [toast, setToast] = useState('');
  const [selectedEditorHotspot, setSelectedEditorHotspot] = useState<string | null>(null);
  const [editorStatus, setEditorStatus] = useState('');

  const experienceRef = useRef<HTMLElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const markersRef = useRef<MarkersPlugin | null>(null);
  const tourRef = useRef<VirtualTourPlugin | null>(null);
  const gyroRef = useRef<GyroscopePlugin | null>(null);
  const scenesRef = useRef(sceneData);
  const exploredRef = useRef(explored);
  const currentSceneIdRef = useRef(currentSceneId);
  const audioEnabledRef = useRef(audioEnabled);
  const reduceMotionRef = useRef(reduceMotion);
  const transitionTokenRef = useRef(0);
  const transitioningRef = useRef(false);
  const toastTimerRef = useRef(0);
  const preloadImagesRef = useRef<HTMLImageElement[]>([]);
  const hotspotActionRef = useRef<(hotspot: Hotspot) => void>(() => undefined);
  const dragRef = useRef<{
    id: string;
    moved: boolean;
    position: { yaw: number; pitch: number };
  } | null>(null);

  const showToast = useCallback((message: string) => {
    window.clearTimeout(toastTimerRef.current);
    setToast(message);
    toastTimerRef.current = window.setTimeout(() => setToast(''), 4200);
  }, []);

  const audioRef = useRef<TraceAudioEngine | null>(null);
  if (!audioRef.current) {
    audioRef.current = new TraceAudioEngine((notice: AudioNotice) => showToast(notice.message));
  }

  const microphone = useMicrophoneTrace(showToast);
  const currentScene = sceneData.find((scene) => scene.id === currentSceneId) ?? sceneData[0];

  useEffect(() => {
    scenesRef.current = sceneData;
  }, [sceneData]);

  useEffect(() => {
    exploredRef.current = explored;
  }, [explored]);

  useEffect(() => {
    currentSceneIdRef.current = currentSceneId;
  }, [currentSceneId]);

  useEffect(() => {
    audioEnabledRef.current = audioEnabled;
  }, [audioEnabled]);

  useEffect(() => {
    reduceMotionRef.current = reduceMotion;
  }, [reduceMotion]);

  const preloadAdjacent = useCallback((scene: Scene) => {
    for (const image of preloadImagesRef.current) image.src = '';
    preloadImagesRef.current = [];
    const ids = [scene.previousScene, scene.nextScene].filter((id): id is string => Boolean(id));
    for (const id of ids) {
      const adjacent = scenesRef.current.find((item) => item.id === id);
      if (!adjacent) continue;
      const image = new Image();
      image.decoding = 'async';
      image.src = adjacent.panorama;
      image.onload = image.onerror = () => {
        preloadImagesRef.current = preloadImagesRef.current.filter((item) => item !== image);
      };
      preloadImagesRef.current.push(image);
    }
  }, []);

  const decorateMarkers = useCallback((scene: Scene) => {
    const markers = markersRef.current;
    if (!markers) return;
    for (const hotspot of scene.hotspots) {
      try {
        const marker = markers.getMarker(hotspot.id);
        const element = marker.domElement as HTMLElement;
        element.tabIndex = 0;
        element.setAttribute('role', 'button');
        element.setAttribute('aria-label', hotspot.type === 'navigation' ? `前往：${hotspot.label}` : `探索：${hotspot.label}`);
        element.onkeydown = (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            hotspotActionRef.current(hotspot);
          }
        };
      } catch {
        // A marker can be outside the current node while a transition is still finishing.
      }
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const viewer = new Viewer({
      container: containerRef.current,
      navbar: false,
      defaultYaw: initialScenes[0].initialView.yaw,
      defaultPitch: initialScenes[0].initialView.pitch,
      defaultZoomLvl: initialScenes[0].initialView.zoom,
      minFov: 35,
      maxFov: 95,
      mousewheel: true,
      mousewheelCtrlKey: false,
      touchmoveTwoFingers: false,
      keyboard: 'fullscreen',
      plugins: [
        MarkersPlugin.withConfig({ clickEventOnMarker: false }),
        VirtualTourPlugin.withConfig({
          dataMode: 'client',
          positionMode: 'manual',
          renderMode: '3d',
          nodes: scenesRef.current.map((scene) => sceneNode(scene, exploredRef.current)),
          startNodeId: '01',
          preload: false,
          linksOnCompass: false,
          showLinkTooltip: false,
          transitionOptions: { showLoader: true, effect: 'none', rotation: false },
        }),
        GyroscopePlugin.withConfig({
          touchmove: true,
          roll: true,
          absolutePosition: false,
          moveMode: 'smooth',
        }),
      ],
    });

    viewerRef.current = viewer;
    const markers = viewer.getPlugin<MarkersPlugin>(MarkersPlugin);
    const tour = viewer.getPlugin<VirtualTourPlugin>(VirtualTourPlugin);
    const gyro = viewer.getPlugin<GyroscopePlugin>(GyroscopePlugin);
    markersRef.current = markers;
    tourRef.current = tour;
    gyroRef.current = gyro;

    viewer.addEventListener('load-progress', ({ progress }) => setLoading(Math.round(progress)));
    viewer.addEventListener('panorama-loaded', () => {
      setLoading(100);
      setPanoramaError('');
      const scene = scenesRef.current.find((item) => item.id === currentSceneIdRef.current);
      if (scene) window.setTimeout(() => decorateMarkers(scene), 0);
    });
    viewer.addEventListener('panorama-error', () => {
      setPanoramaError('全景圖載入失敗，請檢查素材路徑後再試。');
    });
    viewer.addEventListener('click', ({ data }) => {
      if (!editorMode || data.marker || dragRef.current?.moved) return;
      const sceneId = currentSceneIdRef.current;
      const newHotspot: Hotspot = {
        id: `${sceneId}-hotspot-${Date.now().toString(36)}`,
        type: 'story',
        label: '新熱點',
        description: '請在編輯面板補充這個位置保存的故事。',
        yaw: Number(data.yaw.toFixed(4)),
        pitch: Number(data.pitch.toFixed(4)),
        audio: null,
        subtitle: '',
        icon: '＋',
        targetScene: null,
      };
      const nextScenes = scenesRef.current.map((scene) =>
        scene.id === sceneId ? { ...scene, hotspots: [...scene.hotspots, newHotspot] } : scene,
      );
      scenesRef.current = nextScenes;
      setSceneData(nextScenes);
      setSelectedEditorHotspot(newHotspot.id);
      markers.addMarker(markerConfig(newHotspot, exploredRef.current));
      const updated = nextScenes.find((scene) => scene.id === sceneId)!;
      tour.updateNode(sceneNode(updated, exploredRef.current));
      setEditorStatus(`已新增 ${newHotspot.id}`);
      window.setTimeout(() => decorateMarkers(updated), 0);
    });

    markers.addEventListener('select-marker', ({ marker }) => {
      const id = marker.data?.hotspotId ?? marker.id;
      const scene = scenesRef.current.find((item) => item.id === currentSceneIdRef.current);
      const hotspot = scene?.hotspots.find((item) => item.id === id);
      if (!hotspot) return;
      if (editorMode) {
        setSelectedEditorHotspot(hotspot.id);
        setEditorStatus(`已選擇 ${hotspot.id}`);
        return;
      }
      hotspotActionRef.current(hotspot);
    });

    tour.addEventListener('node-changed', ({ node }) => {
      const scene = scenesRef.current.find((item) => item.id === node.id);
      if (!scene) return;
      currentSceneIdRef.current = scene.id;
      setCurrentSceneId(scene.id);
      window.setTimeout(() => decorateMarkers(scene), 0);
    });

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches('input, textarea, select, button, [contenteditable="true"]')) return;
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
      const position = viewer.getPosition();
      const delta = event.shiftKey ? 0.16 : 0.08;
      if (event.key === 'ArrowLeft') position.yaw -= delta;
      if (event.key === 'ArrowRight') position.yaw += delta;
      if (event.key === 'ArrowUp') position.pitch += delta * 0.7;
      if (event.key === 'ArrowDown') position.pitch -= delta * 0.7;
      viewer.rotate(position);
      event.preventDefault();
    };
    window.addEventListener('keydown', onKeyDown);

    const onPointerDown = (event: PointerEvent) => {
      if (!editorMode) return;
      const markerElement = (event.target as Element | null)?.closest('.psv-marker') as HTMLElement | null;
      if (!markerElement?.id.startsWith('psv-marker-')) return;
      const id = markerElement.id.replace('psv-marker-', '');
      const scene = scenesRef.current.find((item) => item.id === currentSceneIdRef.current);
      const hotspot = scene?.hotspots.find((item) => item.id === id);
      if (!hotspot) return;
      dragRef.current = {
        id,
        moved: false,
        position: { yaw: hotspot.yaw, pitch: hotspot.pitch },
      };
      setSelectedEditorHotspot(id);
      event.preventDefault();
      event.stopPropagation();
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!dragRef.current || !containerRef.current) return;
      const bounds = containerRef.current.getBoundingClientRect();
      const position = viewer.dataHelper.viewerCoordsToSphericalCoords({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      });
      dragRef.current.moved = true;
      dragRef.current.position = position;
      markers.updateMarker({ id: dragRef.current.id, position });
      setEditorStatus(`yaw ${position.yaw.toFixed(4)} · pitch ${position.pitch.toFixed(4)}`);
      event.preventDefault();
      event.stopPropagation();
    };

    const onPointerUp = (event: PointerEvent) => {
      const dragging = dragRef.current;
      if (!dragging) return;
      dragRef.current = null;
      if (dragging.moved) {
        const sceneId = currentSceneIdRef.current;
        const nextScenes = scenesRef.current.map((scene) =>
          scene.id === sceneId
            ? {
                ...scene,
                hotspots: scene.hotspots.map((hotspot) =>
                  hotspot.id === dragging.id
                    ? {
                        ...hotspot,
                        yaw: Number(dragging.position.yaw.toFixed(4)),
                        pitch: Number(dragging.position.pitch.toFixed(4)),
                      }
                    : hotspot,
                ),
              }
            : scene,
        );
        scenesRef.current = nextScenes;
        setSceneData(nextScenes);
        const updated = nextScenes.find((scene) => scene.id === sceneId)!;
        tour.updateNode(sceneNode(updated, exploredRef.current));
        setEditorStatus(`已移動 ${dragging.id}`);
      }
      event.preventDefault();
      event.stopPropagation();
    };

    containerRef.current.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('pointermove', onPointerMove, true);
    window.addEventListener('pointerup', onPointerUp, true);

    const onFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFullscreenChange);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      containerRef.current?.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('pointermove', onPointerMove, true);
      window.removeEventListener('pointerup', onPointerUp, true);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      markersRef.current = null;
      tourRef.current = null;
      gyroRef.current = null;
      viewerRef.current = null;
      viewer.destroy();
    };
  }, [decorateMarkers, editorMode]);

  useEffect(() => {
    return () => {
      window.clearTimeout(toastTimerRef.current);
      audioRef.current?.destroy();
      for (const image of preloadImagesRef.current) image.src = '';
      preloadImagesRef.current = [];
    };
  }, []);

  const markExplored = useCallback((id: string) => {
    const next = new Set(exploredRef.current);
    next.add(id);
    exploredRef.current = next;
    setExplored(next);
    writeTraceState(next, reduceMotionRef.current);
    try {
      const hotspot = scenesRef.current
        .flatMap((scene) => scene.hotspots)
        .find((item) => item.id === id);
      if (hotspot) markersRef.current?.updateMarker(markerConfig(hotspot, next));
    } catch {
      // The marker can disappear during a node transition.
    }
  }, []);

  const switchScene = useCallback(
    async (targetId: string) => {
      const target = scenesRef.current.find((scene) => scene.id === targetId);
      const tour = tourRef.current;
      if (!target || !tour || targetId === currentSceneIdRef.current || transitioningRef.current) return;

      const token = ++transitionTokenRef.current;
      const reduced = reduceMotionRef.current;
      transitioningRef.current = true;
      setTransitionTitle(target.title);
      setTransitioning(true);
      setLoading(0);
      setActiveHotspot(null);
      setAudioProgress(emptyAudioProgress);
      setShadeEffect(false);
      setDuskEffect(false);
      setTideEffect(false);
      setSeaVolumeHigh(false);
      audioRef.current?.stopHotspot();
      if (audioEnabledRef.current) {
        void audioRef.current?.playAmbient(target.ambientAudio, reduced ? 120 : 900);
      }

      if (!reduced) await wait(260);
      try {
        const loaded = await tour.setCurrentNode(targetId, {
          showLoader: true,
          effect: 'none',
          rotation: false,
          rotateTo: { yaw: target.initialView.yaw, pitch: target.initialView.pitch },
          zoomTo: target.initialView.zoom,
        });
        if (!loaded || token !== transitionTokenRef.current) return;
        currentSceneIdRef.current = targetId;
        setCurrentSceneId(targetId);
        if (entered) preloadAdjacent(target);
        await wait(reduced ? 40 : 480);
      } catch {
        setPanoramaError('場景切換失敗，請再試一次。');
      } finally {
        if (token === transitionTokenRef.current) {
          transitioningRef.current = false;
          setTransitioning(false);
        }
      }
    },
    [entered, preloadAdjacent],
  );

  const updateAudioProgress = useCallback((current: number, duration: number, playing: boolean) => {
    setAudioProgress({ current, duration, playing, missing: false });
  }, []);

  const playHotspotAudio = useCallback(
    async (hotspot: Hotspot) => {
      if (!hotspot.audio) return;
      const engine = audioRef.current!;
      try {
        if (!engine.isUnlocked) await engine.unlock();
        engine.setMuted(false);
        if (!audioEnabledRef.current) {
          audioEnabledRef.current = true;
          setAudioEnabled(true);
          void engine.playAmbient(currentScene.ambientAudio, reduceMotionRef.current ? 120 : 700);
        }
        setAudioProgress(emptyAudioProgress);
        const viewYaw = viewerRef.current?.getPosition().yaw ?? hotspot.yaw;
        const pan = Math.sin(hotspot.yaw - viewYaw);
        engine.playHotspot(hotspot.audio, pan, updateAudioProgress, () => {
          setAudioProgress({ ...emptyAudioProgress, missing: true });
        });
      } catch {
        showToast('此瀏覽器暫時無法開啟聲音；文字內容仍可閱讀');
      }
    },
    [currentScene.ambientAudio, showToast, updateAudioProgress],
  );

  const handleHotspotAction = useCallback(
    (hotspot: Hotspot) => {
      markExplored(hotspot.id);
      setSubtitleVisible(true);
      if (hotspot.targetScene) {
        void switchScene(hotspot.targetScene);
        return;
      }

      setActiveHotspot(hotspot);
      setAudioProgress(emptyAudioProgress);

      if (hotspot.effect === 'shade') setShadeEffect((value) => !value);
      if (hotspot.effect === 'dusk') setDuskEffect((value) => !value);
      if (hotspot.effect === 'tide') setTideEffect((value) => !value);
      if (hotspot.effect === 'sea-volume') {
        setSeaVolumeHigh((value) => {
          audioRef.current?.setAmbientVolume(value ? 0.38 : 0.66);
          return !value;
        });
      }
      if (hotspot.effect === 'route') setRouteOpen(true);
      if (hotspot.effect === 'archive') setArchiveOpen(true);

      if (hotspot.audio && hotspot.type !== 'interview' && audioEnabledRef.current) {
        void playHotspotAudio(hotspot);
      }
    },
    [markExplored, playHotspotAudio, switchScene],
  );

  hotspotActionRef.current = handleHotspotAction;

  const enterExperience = useCallback(
    async (withSound: boolean) => {
      setEntered(true);
      preloadAdjacent(currentScene);
      if (!withSound) {
        setAudioEnabled(false);
        showToast('已靜音進入；可隨時從右上角開啟聲音');
        return;
      }
      try {
        const engine = audioRef.current!;
        await engine.unlock();
        engine.setMuted(false);
        audioEnabledRef.current = true;
        setAudioEnabled(true);
        void engine.playAmbient(currentScene.ambientAudio, 900);
      } catch {
        setAudioEnabled(false);
        showToast('聲音未能開啟；全景與文字內容仍可正常使用');
      }
    },
    [currentScene, preloadAdjacent, showToast],
  );

  const toggleSound = useCallback(async () => {
    const engine = audioRef.current!;
    if (audioEnabledRef.current) {
      engine.setMuted(true);
      audioEnabledRef.current = false;
      setAudioEnabled(false);
      showToast('聲音已關閉');
      return;
    }

    try {
      await engine.unlock();
      engine.setMuted(false);
      audioEnabledRef.current = true;
      setAudioEnabled(true);
      void engine.playAmbient(currentScene.ambientAudio, reduceMotionRef.current ? 120 : 700);
    } catch {
      showToast('聲音未能開啟；請檢查瀏覽器的媒體權限');
    }
  }, [currentScene.ambientAudio, showToast]);

  const toggleMicrophone = useCallback(() => {
    if (microphone.state === 'active' || microphone.state === 'requesting') {
      microphone.stop();
      showToast('聲音尋跡已關閉，麥克風連線已停止');
    } else {
      void microphone.start();
    }
  }, [microphone, showToast]);

  const toggleGyroscope = useCallback(async () => {
    const gyro = gyroRef.current;
    if (!gyro) return;
    if (gyroEnabled) {
      gyro.stop();
      setGyroEnabled(false);
      showToast('陀螺儀已關閉');
      return;
    }
    try {
      await gyro.start();
      setGyroEnabled(true);
      showToast('陀螺儀已開啟，可移動裝置觀看全景');
    } catch {
      setGyroEnabled(false);
      showToast('未能使用陀螺儀；仍可用手指拖動全景');
    }
  }, [gyroEnabled, showToast]);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (experienceRef.current?.requestFullscreen) {
        await experienceRef.current.requestFullscreen();
      } else {
        showToast('此瀏覽器不支援網頁全屏，可使用裝置的顯示控制');
      }
    } catch {
      showToast('全屏模式未能開啟');
    }
  }, [showToast]);

  const setMotionPreference = useCallback((next: boolean) => {
    reduceMotionRef.current = next;
    setReduceMotion(next);
    writeTraceState(exploredRef.current, next);
  }, []);

  const clearProgress = useCallback(() => {
    const next = new Set<string>();
    exploredRef.current = next;
    setExplored(next);
    clearTraceState();
    writeTraceState(next, reduceMotionRef.current);
    setClearConfirmOpen(false);
    const scene = scenesRef.current.find((item) => item.id === currentSceneIdRef.current);
    if (scene) markersRef.current?.setMarkers(scene.hotspots.map((hotspot) => markerConfig(hotspot, next)));
    showToast('跡事記錄已清除');
  }, [showToast]);

  const updateEditorHotspot = useCallback((id: string, patch: Partial<Hotspot>) => {
    const sceneId = currentSceneIdRef.current;
    const nextScenes = scenesRef.current.map((scene) =>
      scene.id === sceneId
        ? {
            ...scene,
            hotspots: scene.hotspots.map((hotspot) =>
              hotspot.id === id ? { ...hotspot, ...patch } : hotspot,
            ),
          }
        : scene,
    );
    scenesRef.current = nextScenes;
    setSceneData(nextScenes);
    const updated = nextScenes.find((scene) => scene.id === sceneId)!;
    tourRef.current?.updateNode(sceneNode(updated, exploredRef.current));
    markersRef.current?.setMarkers(updated.hotspots.map((hotspot) => markerConfig(hotspot, exploredRef.current)));
    setEditorStatus(`已更新 ${id}`);
    window.setTimeout(() => decorateMarkers(updated), 0);
  }, [decorateMarkers]);

  const addEditorHotspotAtView = useCallback(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;
    const position = viewer.getPosition();
    const sceneId = currentSceneIdRef.current;
    const hotspot: Hotspot = {
      id: `${sceneId}-hotspot-${Date.now().toString(36)}`,
      type: 'story',
      label: '新熱點',
      description: '請在編輯面板補充這個位置保存的故事。',
      yaw: Number(position.yaw.toFixed(4)),
      pitch: Number(position.pitch.toFixed(4)),
      audio: null,
      subtitle: '',
      icon: '＋',
      targetScene: null,
    };
    const scene = scenesRef.current.find((item) => item.id === sceneId)!;
    const next = { ...scene, hotspots: [...scene.hotspots, hotspot] };
    const nextScenes = scenesRef.current.map((item) => (item.id === sceneId ? next : item));
    scenesRef.current = nextScenes;
    setSceneData(nextScenes);
    setSelectedEditorHotspot(hotspot.id);
    tourRef.current?.updateNode(sceneNode(next, exploredRef.current));
    markersRef.current?.setMarkers(next.hotspots.map((item) => markerConfig(item, exploredRef.current)));
    setEditorStatus(`已在目前視線新增 ${hotspot.id}`);
    window.setTimeout(() => decorateMarkers(next), 0);
  }, [decorateMarkers]);

  const deleteEditorHotspot = useCallback((id: string) => {
    const sceneId = currentSceneIdRef.current;
    const scene = scenesRef.current.find((item) => item.id === sceneId)!;
    const next = { ...scene, hotspots: scene.hotspots.filter((hotspot) => hotspot.id !== id) };
    const nextScenes = scenesRef.current.map((item) => (item.id === sceneId ? next : item));
    scenesRef.current = nextScenes;
    setSceneData(nextScenes);
    setSelectedEditorHotspot(next.hotspots[0]?.id ?? null);
    tourRef.current?.updateNode(sceneNode(next, exploredRef.current));
    markersRef.current?.setMarkers(next.hotspots.map((item) => markerConfig(item, exploredRef.current)));
    setEditorStatus(`已刪除 ${id}`);
    window.setTimeout(() => decorateMarkers(next), 0);
  }, [decorateMarkers]);

  const copyScenesJson = useCallback(async () => {
    const json = JSON.stringify(scenesRef.current, null, 2);
    try {
      await navigator.clipboard.writeText(json);
      setEditorStatus('完整九場景 JSON 已複製');
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = json;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const copied = document.execCommand('copy');
      textarea.remove();
      setEditorStatus(copied ? '完整九場景 JSON 已複製' : '無法使用剪貼簿，請改用「匯出」');
    }
  }, []);

  const exportScenesJson = useCallback(() => {
    const blob = new Blob([JSON.stringify(scenesRef.current, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'scenes.json';
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    setEditorStatus('已匯出 scenes.json');
  }, []);

  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();

    const register = (tool: WebMcpToolDefinition) => {
      try {
        void Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(() => undefined);
      } catch {
        // WebMCP is optional and the visible experience remains fully functional.
      }
    };

    register({
      name: 'navigate_trace_scene',
      title: '前往《路環跡事》場景',
      description: 'Open one of the nine Coloane panorama scenes by its two-digit scene ID and update the visible tour.',
      inputSchema: {
        type: 'object',
        properties: {
          sceneId: {
            type: 'string',
            enum: scenesRef.current.map((scene) => scene.id),
            description: 'Two-digit scene ID from 01 to 09.',
          },
        },
        required: ['sceneId'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      async execute(input) {
        const sceneId =
          input && typeof input === 'object' && 'sceneId' in input
            ? (input as { sceneId?: unknown }).sceneId
            : undefined;
        if (typeof sceneId !== 'string' || !scenesRef.current.some((scene) => scene.id === sceneId)) {
          throw new Error('sceneId must be one of 01 through 09.');
        }
        if (!entered) {
          setEntered(true);
          const scene = scenesRef.current.find((item) => item.id === currentSceneIdRef.current);
          if (scene) preloadAdjacent(scene);
        }
        await switchScene(sceneId);
        const scene = scenesRef.current.find((item) => item.id === sceneId)!;
        return { sceneId: scene.id, title: scene.title, subtitle: scene.subtitle };
      },
    });

    register({
      name: 'read_trace_progress',
      title: '讀取《路環跡事》探索進度',
      description: 'Read the current panorama scene and the hotspot IDs already explored on this device.',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute(input) {
        if (!input || typeof input !== 'object' || Array.isArray(input)) {
          throw new Error('Input must be an empty object.');
        }
        return {
          currentSceneId: currentSceneIdRef.current,
          exploredHotspotIds: Array.from(exploredRef.current),
          exploredCount: exploredRef.current.size,
        };
      },
    });

    return () => lifecycle.abort();
  }, [entered, preloadAdjacent, switchScene]);

  const exploredContent = useMemo(
    () =>
      sceneData
        .slice(0, 8)
        .map((scene) => ({
          scene,
          hotspots: scene.hotspots.filter(
            (hotspot) => explored.has(hotspot.id) && hotspot.type !== 'navigation',
          ),
        }))
        .filter((group) => group.hotspots.length > 0),
    [explored, sceneData],
  );

  const contentHotspots = useMemo(
    () => sceneData.flatMap((scene) => scene.hotspots).filter((hotspot) => hotspot.type !== 'navigation'),
    [sceneData],
  );
  const exploredCount = contentHotspots.filter((hotspot) => explored.has(hotspot.id)).length;
  const progressPercent = Math.round((exploredCount / Math.max(1, contentHotspots.length)) * 100);

  const rootClasses = [
    'experience',
    entered ? 'is-entered' : 'is-at-threshold',
    transitioning ? 'is-transitioning' : '',
    reduceMotion ? 'reduce-motion' : '',
    microphone.state === 'active' ? 'mic-active' : '',
    editorMode ? 'has-editor' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <main ref={experienceRef} className={rootClasses}>
      <div ref={containerRef} className="panorama" aria-label="路環漁村 360 度互動全景" />

      <div className={`environment-effect environment-effect--shade ${shadeEffect ? 'is-visible' : ''}`} aria-hidden="true" />
      <div className={`environment-effect environment-effect--dusk ${duskEffect ? 'is-visible' : ''}`} aria-hidden="true" />
      <div className={`environment-effect environment-effect--tide ${tideEffect ? 'is-visible' : ''}`} aria-hidden="true" />
      <div className="microphone-ripple" aria-hidden="true">{'≈ ~ ≈ · '.repeat(30)}</div>

      {loading < 100 && !panoramaError && (
        <div className="loading-readout" role="status" aria-live="polite">
          <span className="loading-glyph">░▒▓</span>
          <span>載入場景 {loading}%</span>
        </div>
      )}
      {panoramaError && <div className="error-notice" role="alert">{panoramaError}</div>}

      {!entered && (
        <section className="threshold" aria-labelledby="site-title">
          <div className="threshold__grain" aria-hidden="true" />
          <p className="eyebrow">COLOANE · 01—09 · DIGITAL TRACE</p>
          <h1 id="site-title">路環跡事</h1>
          <p className="subtitle">Traces and Stories of Coloane</p>
          <p className="introduction">{introduction}</p>
          <div className="entry-actions">
            <button
              type="button"
              className="primary-action"
              onClick={() => void enterExperience(true)}
              aria-label="進入路環並開啟環境聲"
            >
              <span>進入路環並開啟聲音</span>
              <span aria-hidden="true">↗</span>
            </button>
            <button
              type="button"
              className="quiet-action"
              onClick={() => void enterExperience(false)}
              aria-label="靜音進入路環"
            >
              靜音進入
            </button>
          </div>
          <p className="drag-hint">拖動全景 · 尋找發光的字符痕跡</p>
        </section>
      )}

      {entered && (
        <>
          <header className="scene-heading">
            <div className="scene-number">{currentScene.id} / 09</div>
            <div>
              <h1>{currentScene.title}</h1>
              <p className="scene-heading__english">{currentScene.subtitle}</p>
              <p className="scene-heading__intro">{currentScene.intro}</p>
            </div>
          </header>

          <nav className="utility-controls" aria-label="體驗控制">
            <button
              type="button"
              className={audioEnabled ? 'is-active' : ''}
              onClick={() => void toggleSound()}
              aria-label={audioEnabled ? '關閉聲音' : '開啟聲音'}
              aria-pressed={audioEnabled}
            >
              <span aria-hidden="true">{audioEnabled ? '聲◉' : '聲○'}</span>
              <span>聲音</span>
            </button>
            <button
              type="button"
              className={microphone.state === 'active' ? 'is-active' : ''}
              onClick={toggleMicrophone}
              aria-label={microphone.state === 'active' ? '關閉聲音尋跡模式' : '開啟聲音尋跡模式'}
              aria-pressed={microphone.state === 'active'}
            >
              <span aria-hidden="true">麥{microphone.state === 'active' ? '◉' : '○'}</span>
              <span>尋跡</span>
            </button>
            <button
              type="button"
              className={gyroEnabled ? 'is-active' : ''}
              onClick={() => void toggleGyroscope()}
              aria-label={gyroEnabled ? '關閉陀螺儀' : '開啟陀螺儀'}
              aria-pressed={gyroEnabled}
            >
              <span aria-hidden="true">陀{gyroEnabled ? '◉' : '○'}</span>
              <span>陀螺儀</span>
            </button>
            <button
              type="button"
              className={isFullscreen ? 'is-active' : ''}
              onClick={() => void toggleFullscreen()}
              aria-label={isFullscreen ? '離開全屏' : '進入全屏'}
              aria-pressed={isFullscreen}
            >
              <span aria-hidden="true">{isFullscreen ? '⊡' : '□'}</span>
              <span>全屏</span>
            </button>
            <button
              type="button"
              className={helpOpen ? 'is-active' : ''}
              onClick={() => setHelpOpen((value) => !value)}
              aria-label="開啟操作說明與設定"
              aria-expanded={helpOpen}
            >
              <span aria-hidden="true">?</span>
              <span>說明</span>
            </button>
          </nav>

          <div className="mic-meter" aria-label={`麥克風反應強度 ${Math.round(microphone.level * 100)}%`}>
            <span style={{ width: `${Math.max(3, microphone.level * 100)}%` }} />
          </div>

          <nav className="route-bar" aria-label="九場景探索路線">
            <button
              className="route-direction"
              type="button"
              onClick={() => currentScene.previousScene && void switchScene(currentScene.previousScene)}
              disabled={!currentScene.previousScene || transitioning}
              aria-label="前往上一場景"
            >
              <span aria-hidden="true">←</span>
              <span>上一場景</span>
            </button>
            <div className="route-progress">
              <div className="route-progress__meta">
                <span>由陸地走向海面</span>
                <span>{exploredCount} / {contentHotspots.length} 跡 · {progressPercent}%</span>
              </div>
              <div className="route-nodes">
                {sceneData.map((scene) => {
                  const sceneExplored = scene.hotspots.some((hotspot) => explored.has(hotspot.id));
                  return (
                    <button
                      key={scene.id}
                      type="button"
                      className={`${scene.id === currentScene.id ? 'is-current' : ''} ${sceneExplored ? 'is-explored' : ''}`}
                      onClick={() => void switchScene(scene.id)}
                      disabled={transitioning}
                      aria-label={`前往場景 ${scene.id}：${scene.title}${sceneExplored ? '，已有探索記錄' : ''}`}
                      aria-current={scene.id === currentScene.id ? 'step' : undefined}
                    >
                      <span>{scene.id}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <button
              className="route-direction route-direction--next"
              type="button"
              onClick={() => currentScene.nextScene && void switchScene(currentScene.nextScene)}
              disabled={!currentScene.nextScene || transitioning}
              aria-label="前往下一場景"
            >
              <span>下一場景</span>
              <span aria-hidden="true">→</span>
            </button>
          </nav>
        </>
      )}

      {activeHotspot && entered && !editorMode && (
        <aside className="story-panel" aria-labelledby="hotspot-title">
          <button
            className="panel-close"
            type="button"
            onClick={() => {
              setActiveHotspot(null);
              audioRef.current?.stopHotspot();
            }}
            aria-label="關閉熱點資料"
          >
            ×
          </button>
          <p className="panel-kicker">TRACE / {currentScene.id} · {activeHotspot.type.toUpperCase()}</p>
          <div className="story-panel__title-row">
            <span className="story-panel__icon" aria-hidden="true">{activeHotspot.icon}</span>
            <h2 id="hotspot-title">{activeHotspot.label}</h2>
          </div>
          <p className="story-panel__description">{activeHotspot.description}</p>
          {activeHotspot.subtitle && subtitleVisible && (
            <blockquote className="subtitle-line">{activeHotspot.subtitle}</blockquote>
          )}

          {activeHotspot.audio && (
            <div className="audio-player" aria-label={`${activeHotspot.label}音訊控制`}>
              <div className="audio-player__controls">
                <button
                  type="button"
                  disabled={audioProgress.missing}
                  onClick={() => {
                    if (audioProgress.duration > 0) {
                      const playing = audioRef.current?.toggleHotspot(updateAudioProgress) ?? false;
                      setAudioProgress((progress) => ({ ...progress, playing }));
                    } else {
                      void playHotspotAudio(activeHotspot);
                    }
                  }}
                  aria-label={audioProgress.playing ? '暫停音訊' : '播放音訊'}
                >
                  {audioProgress.missing ? '—' : audioProgress.playing ? 'Ⅱ' : '▶'}
                </button>
                <input
                  type="range"
                  min={0}
                  max={Math.max(0, audioProgress.duration)}
                  step={0.1}
                  value={Math.min(audioProgress.current, audioProgress.duration)}
                  disabled={audioProgress.duration <= 0}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    audioRef.current?.seekHotspot(next);
                    setAudioProgress((progress) => ({ ...progress, current: next }));
                  }}
                  aria-label="音訊播放進度"
                />
                <span>{formatTime(audioProgress.current)} / {formatTime(audioProgress.duration)}</span>
              </div>
              <div className="audio-player__status">
                <span>{audioProgress.missing ? '音訊待補充' : activeHotspot.type === 'interview' ? '訪談音訊' : '方向聲音'}</span>
                <button
                  type="button"
                  onClick={() => setSubtitleVisible((value) => !value)}
                  aria-pressed={subtitleVisible}
                >
                  字幕 {subtitleVisible ? '開' : '關'}
                </button>
              </div>
            </div>
          )}

          <p className="explored-stamp"><span>✓</span> 已留下探索痕跡</p>
        </aside>
      )}

      {helpOpen && entered && (
        <aside className="help-panel" aria-labelledby="help-title">
          <button className="panel-close" type="button" onClick={() => setHelpOpen(false)} aria-label="關閉操作說明">×</button>
          <p className="panel-kicker">GUIDE / SETTINGS</p>
          <h2 id="help-title">如何尋跡</h2>
          <ul>
            <li>拖動或滑動旋轉全景；滾輪或雙指縮放。</li>
            <li>鍵盤方向鍵可改變視線，Shift 可加快移動。</li>
            <li>點擊呼吸字符展開故事、聲音或場景入口。</li>
            <li>聲音尋跡只分析即時音量，不錄音、不保存、不上傳。</li>
          </ul>
          <label className="setting-switch">
            <span>
              <strong>減少動態效果</strong>
              <small>縮短場景溶解，停止裝飾動畫</small>
            </span>
            <input
              type="checkbox"
              checked={reduceMotion}
              onChange={(event) => setMotionPreference(event.target.checked)}
            />
          </label>
          <div className="help-panel__progress">
            <span>已探索 {exploredCount} 個內容熱點</span>
            <span>{progressPercent}%</span>
          </div>
          <button className="clear-record" type="button" onClick={() => setClearConfirmOpen(true)}>
            清除跡事記錄
          </button>
        </aside>
      )}

      {routeOpen && (
        <section className="modal-layer" role="dialog" aria-modal="true" aria-labelledby="route-title">
          <div className="archive-card route-card">
            <button className="panel-close" type="button" onClick={() => setRouteOpen(false)} aria-label="關閉九場景路線">×</button>
            <p className="panel-kicker">LOOKING BACK / 01—09</p>
            <h2 id="route-title">由屠場前地走到碼頭盡端</h2>
            <div className="route-recap">
              {sceneData.map((scene, index) => (
                <div key={scene.id} className={scene.hotspots.some((hotspot) => explored.has(hotspot.id)) ? 'is-explored' : ''}>
                  <span>{scene.id}</span>
                  <div>
                    <strong>{scene.title}</strong>
                    <small>{scene.subtitle}</small>
                  </div>
                  {index < sceneData.length - 1 && <i aria-hidden="true">···</i>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {archiveOpen && (
        <section className="modal-layer" role="dialog" aria-modal="true" aria-labelledby="archive-title">
          <div className="archive-card">
            <button className="panel-close" type="button" onClick={() => setArchiveOpen(false)} aria-label="關閉跡事檔案">×</button>
            <p className="panel-kicker">YOUR TRACE ARCHIVE / {exploredCount}</p>
            <h2 id="archive-title">跡事檔案</h2>
            <p className="archive-intro">這份檔案只收錄你在前八個場景中實際打開過的痕跡。</p>
            <div className="archive-groups">
              {exploredContent.length === 0 ? (
                <p className="archive-empty">沿途尚未打開任何內容熱點。你可以回到街道，再從樹木、建築與聲音開始。</p>
              ) : (
                exploredContent.map(({ scene, hotspots }) => (
                  <section key={scene.id}>
                    <header><span>{scene.id}</span><h3>{scene.title}</h3></header>
                    <ul>
                      {hotspots.map((hotspot) => (
                        <li key={hotspot.id}>
                          <span aria-hidden="true">{hotspot.icon}</span>
                          <div><strong>{hotspot.label}</strong><p>{hotspot.description}</p></div>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))
              )}
            </div>
            <button
              className="restart-trace"
              type="button"
              onClick={() => {
                setArchiveOpen(false);
                void switchScene('01');
              }}
            >
              再次尋跡 <span aria-hidden="true">↺</span>
            </button>
          </div>
        </section>
      )}

      {clearConfirmOpen && (
        <section className="modal-layer modal-layer--confirm" role="alertdialog" aria-modal="true" aria-labelledby="clear-title">
          <div className="confirm-card">
            <p className="panel-kicker">CLEAR TRACE</p>
            <h2 id="clear-title">清除全部探索記錄？</h2>
            <p>已亮起的熱點、路線標記與跡事檔案會回到未探索狀態。</p>
            <div>
              <button type="button" onClick={() => setClearConfirmOpen(false)}>保留記錄</button>
              <button type="button" className="danger" onClick={clearProgress}>確認清除</button>
            </div>
          </div>
        </section>
      )}

      {editorMode && entered && (
        <HotspotEditor
          scene={currentScene}
          selectedId={selectedEditorHotspot}
          status={editorStatus}
          onSelect={setSelectedEditorHotspot}
          onUpdate={updateEditorHotspot}
          onAddAtView={addEditorHotspotAtView}
          onDelete={deleteEditorHotspot}
          onCopy={() => void copyScenesJson()}
          onExport={exportScenesJson}
        />
      )}

      {transitioning && (
        <div className="scene-transition" aria-live="polite" aria-busy="true">
          <div className="scene-transition__noise" aria-hidden="true">{'░▒▓ · 跡 · × + 事 · '.repeat(80)}</div>
          <div>
            <span>MEMORY NODE</span>
            <strong>{transitionTitle}</strong>
          </div>
        </div>
      )}

      {toast && <div className="toast" role="status" aria-live="polite">{toast}</div>}

      <div className="ascii-edge" aria-hidden="true">
        {'░ · × + 跡 · ▒ · 事 · + × · '.repeat(12)}
      </div>
    </main>
  );
}
