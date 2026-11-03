import type { Hotspot, HotspotType, Scene } from '../data/scenes';

interface HotspotEditorProps {
  scene: Scene;
  selectedId: string | null;
  status: string;
  onSelect: (id: string) => void;
  onUpdate: (id: string, patch: Partial<Hotspot>) => void;
  onAddAtView: () => void;
  onDelete: (id: string) => void;
  onCopy: () => void;
  onExport: () => void;
}

const hotspotTypes: { value: HotspotType; label: string }[] = [
  { value: 'story', label: '文字資料' },
  { value: 'navigation', label: '場景入口' },
  { value: 'effect', label: '畫面效果' },
  { value: 'scan', label: '外部掃描' },
  { value: 'route', label: '路線' },
  { value: 'archive', label: '檔案' },
];

export function HotspotEditor({
  scene,
  selectedId,
  status,
  onSelect,
  onUpdate,
  onAddAtView,
  onDelete,
  onCopy,
  onExport,
}: HotspotEditorProps) {
  const selected = scene.hotspots.find((hotspot) => hotspot.id === selectedId) ?? null;
  const updateText = (key: keyof Hotspot, value: string) => onUpdate(selected!.id, { [key]: value });

  return (
    <aside className="editor-panel" aria-label="熱點編輯模式">
      <div className="editor-panel__heading">
        <div>
          <span className="editor-badge">EDIT / {scene.id}</span>
          <h2>熱點座標編輯</h2>
        </div>
        <span className="editor-count">{scene.hotspots.length}</span>
      </div>

      <p className="editor-help">
        點擊全景新增熱點；拖動畫面中的熱點可改變 yaw / pitch。瀏覽器只保存本次編輯，請匯出 JSON 後更新專案資料。
      </p>

      <div className="editor-actions">
        <button type="button" onClick={onAddAtView} aria-label="在目前視線中央新增熱點">
          ＋ 視線中央
        </button>
        <button type="button" onClick={onCopy} aria-label="複製完整場景 JSON">
          複製 JSON
        </button>
        <button type="button" onClick={onExport} aria-label="匯出完整 scenes.json">
          匯出
        </button>
      </div>

      {status && <p className="editor-status" role="status">{status}</p>}

      <label className="editor-field">
        <span>目前熱點</span>
        <select value={selectedId ?? ''} onChange={(event) => onSelect(event.target.value)}>
          <option value="" disabled>選擇熱點</option>
          {scene.hotspots.map((hotspot) => (
            <option key={hotspot.id} value={hotspot.id}>
              {hotspot.icon} {hotspot.label} · {hotspot.id}
            </option>
          ))}
        </select>
      </label>

      {selected && (
        <div className="editor-form">
          <div className="editor-grid editor-grid--coords">
            <label className="editor-field">
              <span>Yaw</span>
              <input
                type="number"
                step="0.001"
                value={selected.yaw}
                onChange={(event) => onUpdate(selected.id, { yaw: Number(event.target.value) })}
              />
            </label>
            <label className="editor-field">
              <span>Pitch</span>
              <input
                type="number"
                step="0.001"
                value={selected.pitch}
                onChange={(event) => onUpdate(selected.id, { pitch: Number(event.target.value) })}
              />
            </label>
            <label className="editor-field editor-field--icon">
              <span>字符</span>
              <input value={selected.icon} maxLength={2} onChange={(event) => updateText('icon', event.target.value)} />
            </label>
          </div>

          <label className="editor-field">
            <span>ID</span>
            <input value={selected.id} disabled />
          </label>
          <label className="editor-field">
            <span>類型</span>
            <select
              value={selected.type}
              onChange={(event) => onUpdate(selected.id, { type: event.target.value as HotspotType })}
            >
              {hotspotTypes.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </label>
          <label className="editor-field">
            <span>標題</span>
            <input value={selected.label} onChange={(event) => updateText('label', event.target.value)} />
          </label>
          <label className="editor-field">
            <span>描述</span>
            <textarea value={selected.description} rows={4} onChange={(event) => updateText('description', event.target.value)} />
          </label>
          <label className="editor-field">
            <span>字幕</span>
            <textarea value={selected.subtitle} rows={2} onChange={(event) => updateText('subtitle', event.target.value)} />
          </label>
          <label className="editor-field">
            <span>目標場景</span>
            <select
              value={selected.targetScene ?? ''}
              onChange={(event) => onUpdate(selected.id, { targetScene: event.target.value || null })}
            >
              <option value="">無</option>
              {Array.from({ length: 9 }, (_, index) => String(index + 1).padStart(2, '0')).map((id) => (
                <option key={id} value={id}>{id}</option>
              ))}
            </select>
          </label>
          <button className="editor-delete" type="button" onClick={() => onDelete(selected.id)}>
            刪除此熱點
          </button>
        </div>
      )}
    </aside>
  );
}
