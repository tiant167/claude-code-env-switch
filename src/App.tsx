import { useState, useEffect } from 'react';
import { Settings, CheckCircle2, Save, LayoutDashboard } from 'lucide-react';
import './index.css';

interface ProviderEnv {
  id: string;
  name: string;
  env: Record<string, string>;
  apiKey?: string;
  readonly?: boolean;
  updatedAt?: string;
}

function App() {
  const [providers, setProviders] = useState<ProviderEnv[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [view, setView] = useState<'dashboard' | 'settings'>('dashboard');

  // Settings State
  const [editProvider, setEditProvider] = useState<ProviderEnv | null>(null);
  const [envJsonText, setEnvJsonText] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const provs = await window.ipcRenderer.invoke('get-providers');
    const active = await window.ipcRenderer.invoke('get-active-provider');
    setProviders(provs);
    setActiveId(active);
  };

  const selectProvider = async (id: string) => {
    const prov = providers.find(p => p.id === id);
    if (id !== 'backup' && !prov?.env?.['ANTHROPIC_AUTH_TOKEN']) {
      alert("Cannot switch: The configuration is missing a valid 'ANTHROPIC_AUTH_TOKEN'. Please add it to the JSON payload first.");
      return;
    }
    const success = await window.ipcRenderer.invoke('set-active-provider', id);
    if (success) {
      setActiveId(id);
      await loadData(); // Force fetching the new updated `providers` list from store
    }
  };

  const saveSettings = async () => {
    if (editProvider) {
      try {
        const parsed = JSON.parse(envJsonText);
        if (!parsed.env || typeof parsed.env !== 'object') {
          throw new Error("JSON must contain an 'env' object.");
        }
        
        const updated = {
          ...editProvider,
          env: parsed.env
        };
        await window.ipcRenderer.invoke('update-provider', updated);
        await loadData();
        setView('dashboard');
      } catch (e: any) {
        alert("Invalid JSON format: " + e.message);
      }
    }
  };

  const createNewProvider = async () => {
    const newProv: ProviderEnv = {
      id: `custom-${Date.now()}`,
      name: 'New Provider ' + (providers.length + 1),
      env: {}
    };
    await window.ipcRenderer.invoke('add-provider', newProv);
    await loadData();
    setEditProvider(newProv);
  };

  const deleteProv = async () => {
    if (!editProvider) return;
    if (!confirm(`Are you sure you want to delete ${editProvider.name}?`)) return;
    await window.ipcRenderer.invoke('delete-provider', editProvider.id);
    setEditProvider(null);
    await loadData();
  };

  return (
    <>
      <div className="title-bar">
        <h1>Claude Env Switcher</h1>
        <div className="header-actions">
          {view === 'settings' ? (
            <button className="btn btn--icon" onClick={() => setView('dashboard')}>
              <LayoutDashboard size={14} />
            </button>
          ) : (
            <button className="btn btn--icon" onClick={() => setView('settings')}>
              <Settings size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="content-area">
        {view === 'dashboard' ? (
          <div style={{ paddingBottom: '24px' }}>
            <div className="section-label">Providers</div>
            {providers.map(p => (
              <div 
                key={p.id} 
                className={`provider-item ${activeId === p.id ? 'active' : ''}`}
                onClick={() => selectProvider(p.id)}
              >
                <div className="provider-info" style={{ width: '100%' }}>
                  <div className="provider-name" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                    <span>{p.name}</span>
                    {activeId === p.id && <CheckCircle2 size={14} color="#10b981" style={{ flexShrink: 0 }} />}
                    {p.readonly && <span style={{fontSize:'10px', background:'rgba(255,255,255,0.1)', padding:'2px 6px', borderRadius:'10px'}}>System</span>}
                  </div>
                  <div className="provider-status" style={{ marginTop: '4px' }}>
                    <div className={`status-dot ${p.env?.['ANTHROPIC_AUTH_TOKEN'] ? 'active' : ''}`} />
                    {p.env?.['ANTHROPIC_AUTH_TOKEN'] ? 'Token Ready' : 'Token Missing'}
                  </div>
                  {p.updatedAt && <div style={{ marginTop: '4px', fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>Backed up at: {p.updatedAt}</div>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div>
            <div className="section-label" style={{ marginBottom: '12px' }}>Provider Settings</div>
            
            <div style={{ marginBottom: '16px', display: 'flex', gap: '8px' }}>
              <select 
                style={{ flex: 1, padding: '8px', background: 'rgba(0,0,0,0.3)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px' }}
                value={editProvider?.id || ''}
                onChange={(e) => {
                  const p = providers.find(prov => prov.id === e.target.value);
                  if (p) {
                    setEditProvider({ ...p });
                    setEnvJsonText(JSON.stringify({ env: p.env }, null, 2));
                  }
                }}
              >
                <option value="" disabled>Select a provider to edit...</option>
                {providers.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <button className="btn" onClick={() => {
                createNewProvider().then(() => {
                  setEnvJsonText(JSON.stringify({ env: {} }, null, 2));
                });
              }} title="Add New">+</button>
              {editProvider && !editProvider.readonly && <button className="btn" onClick={deleteProv} title="Delete" style={{color: '#ff6b6b'}}>-</button>}
            </div>

            {editProvider && (
              <div className="settings-panel">
                <div className="form-group">
                  <label>Provider Name (e.g. My Kimi, Work Zhipu)</label>
                  <input 
                    type="text" 
                    value={editProvider.name}
                    disabled={editProvider.readonly}
                    onChange={e => setEditProvider({...editProvider, name: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Environment Variables (JSON)</label>
                  <textarea 
                    value={envJsonText}
                    onChange={e => setEnvJsonText(e.target.value)}
                    disabled={editProvider.readonly}
                    style={{ 
                      width: '100%', 
                      height: '140px', 
                      background: 'rgba(0,0,0,0.3)', 
                      border: '1px solid rgba(255,255,255,0.1)', 
                      color: '#ddd',
                      padding: '8px',
                      borderRadius: '6px',
                      fontFamily: 'monospace',
                      fontSize: '12px',
                      resize: 'vertical',
                      outline: 'none'
                    }}
                  />
                </div>
                
                <button className="btn btn--primary" disabled={editProvider.readonly} style={{ width: '100%', marginTop: '8px' }} onClick={saveSettings}>
                  <Save size={14} /> {editProvider.readonly ? "Read Only Configuration" : "Save Configuration"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

export default App;
