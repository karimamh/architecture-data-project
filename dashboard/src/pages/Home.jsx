import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import MapContainer from '../maps/MapContainer';
import KpiCard from '../components/KpiCard';
import apiClient from '../api/client';

const KPI_OPTIONS = [
  { value: 'transport',    label: '🚌 Transport',    color: '#ef4444' },
  { value: 'cyclable',     label: '🚲 Cyclable',     color: '#10b981' },
  { value: 'marche',       label: '🛒 Marché',       color: '#f59e0b' },
  { value: 'connectivite', label: '📶 Connectivité', color: '#3b82f6' },
];

// Calcule les scores moyens à partir d'une liste de features GeoJSON
function computeAvg(features) {
  if (!features || features.length === 0) return null;
  const acc = { transport: [], cyclable: [], marche: [], connectivite: [] };
  for (const f of features) {
    const p = f.properties;
    if (p.transport_score    != null) acc.transport.push(p.transport_score);
    if (p.cyclable_score     != null) acc.cyclable.push(p.cyclable_score);
    if (p.marche_score       != null) acc.marche.push(p.marche_score);
    if (p.connectivite_score != null) acc.connectivite.push(p.connectivite_score);
  }
  const avg = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
  return {
    score_transport_moyen:   avg(acc.transport),
    score_cyclable_moyen:    avg(acc.cyclable),
    score_marche_moyen:      avg(acc.marche),
    score_connectivite_moyen: avg(acc.connectivite),
    nb_rues: features.length,
  };
}

const Home = () => {
  const [streetsData, setStreetsData]       = useState(null);
  const [globalKpi, setGlobalKpi]           = useState(null);
  const [localKpi, setLocalKpi]             = useState(null);
  const [loading, setLoading]               = useState(true);
  const [sidebarOpen, setSidebarOpen]       = useState(true);
  const [arrFilter, setArrFilter]           = useState('');
  const [activeKPI, setActiveKPI]           = useState('transport');
  const [selectedStreet, setSelectedStreet] = useState(null);

  // Recherche par nom de rue
  const [streetSearch, setStreetSearch]     = useState('');
  const [searchResults, setSearchResults]   = useState([]);
  const [searchLoading, setSearchLoading]   = useState(false);
  const [showDropdown, setShowDropdown]     = useState(false);

  const sidebarRef = useRef(null);

  // ── Chargement initial ──────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [kpi, streets] = await Promise.allSettled([
        apiClient.get('/kpi'),
        apiClient.get('/rues?limit=2000'),
      ]);
      if (kpi.status     === 'fulfilled') setGlobalKpi(kpi.value);
      if (streets.status === 'fulfilled') {
        setStreetsData(streets.value);
        setLocalKpi(null); // Paris entier → pas de KPI local
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Auto-scroll sidebar en haut quand une rue est sélectionnée
  useEffect(() => {
    if (selectedStreet && sidebarRef.current) {
      sidebarRef.current.scrollTop = 0;
    }
  }, [selectedStreet]);

  // Recherche debounce : appel API quand l'utilisateur tape
  useEffect(() => {
    if (!streetSearch.trim() || streetSearch.length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    const t = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const data = await apiClient.get(`/rues?name=${encodeURIComponent(streetSearch)}&limit=10`);
        setSearchResults(data.features || []);
        setShowDropdown(true);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [streetSearch]);

  // ── Appliquer le filtre arrondissement ──────────────────────
  const applyFilter = async () => {
    setLoading(true);
    setSelectedStreet(null);
    try {
      const url = arrFilter
        ? `/rues?arrondissement=${arrFilter}&limit=2000`
        : '/rues?limit=2000';
      const data = await apiClient.get(url);
      setStreetsData(data);

      // Calcul KPI moyen pour l'arrondissement
      if (arrFilter && data.features?.length) {
        setLocalKpi(computeAvg(data.features));
      } else {
        setLocalKpi(null);
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Clic sur une rue dans la carte ─────────────────────────
  const handleStreetClick = useCallback((feature) => {
    setSelectedStreet(feature);
  }, []);

  const clearStreet = () => setSelectedStreet(null);

  // Sélection depuis la liste de recherche
  const handleSearchSelect = useCallback((feature) => {
    setStreetSearch('');
    setSearchResults([]);
    setShowDropdown(false);
    handleStreetClick(feature);
  }, [handleStreetClick]);

  // Centre de la rue sélectionnée pour faire voler la carte
  const flyTarget = useMemo(() => {
    if (!selectedStreet?.geometry) return null;
    const geom = selectedStreet.geometry;
    const coords = geom.type === 'LineString' ? geom.coordinates
                 : geom.type === 'MultiLineString' ? geom.coordinates[0]
                 : null;
    if (!coords?.length) return null;
    const mid = coords[Math.floor(coords.length / 2)];
    return { lng: mid[0], lat: mid[1] };
  }, [selectedStreet]);

  // KPI à afficher : rue sélectionnée > arrondissement > Paris
  const kpi = localKpi || globalKpi;
  const arrondissements = Array.from({ length: 20 }, (_, i) => i + 1);
  const activeOpt = KPI_OPTIONS.find(k => k.value === activeKPI);

  // ── Composant carte KPI locale ──────────────────────────────
  const KpiSection = () => {
    if (!kpi) return (
      <p style={{ color: '#94a3b8', fontSize: '13px' }}>
        {loading ? 'Chargement...' : 'API non disponible'}
      </p>
    );

    const title = arrFilter && localKpi
      ? `${arrFilter}e arrondissement`
      : 'Paris (moyenne)';

    return (
      <>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <span style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>{title}</span>
          {localKpi && (
            <span style={{ fontSize: '11px', background: '#f1f5f9', padding: '2px 8px', borderRadius: '99px', color: '#475569' }}>
              {localKpi.nb_rues} rues
            </span>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <KpiCard title="Score transport"    value={kpi.score_transport_moyen    != null ? kpi.score_transport_moyen.toFixed(2)    : 'N/A'} unit="/100" icon="🚌" color="#ef4444" />
          <KpiCard title="Score cyclable"     value={kpi.score_cyclable_moyen     != null ? kpi.score_cyclable_moyen.toFixed(2)     : 'N/A'} unit="/100" icon="🚲" color="#10b981" />
          <KpiCard title="Score marché"       value={kpi.score_marche_moyen       != null ? kpi.score_marche_moyen.toFixed(2)       : 'N/A'} unit="/100" icon="🛒" color="#f59e0b" />
          <KpiCard title="Score connectivité" value={kpi.score_connectivite_moyen != null ? kpi.score_connectivite_moyen.toFixed(2) : 'N/A'} unit="/100" icon="📶" color="#3b82f6" />
          {!localKpi && globalKpi && (
            <>
              <KpiCard title="Hotspots Wi-Fi"   value={globalKpi.wifi_count?.toLocaleString('fr-FR') ?? 'N/A'} icon="📡" color="#8b5cf6" />
              <KpiCard title="Antennes mobiles" value={globalKpi.antennes_count?.toLocaleString('fr-FR') ?? 'N/A'} icon="📱" color="#ec4899" />
            </>
          )}
        </div>
      </>
    );
  };

  // ── Panneau rue sélectionnée ────────────────────────────────
  const StreetPanel = () => {
    if (!selectedStreet) return null;
    const p = selectedStreet.properties || {};

    const scores = [
      { label: 'Transport',    value: p.transport_score,    unit: '/100', color: '#ef4444' },
      { label: 'Cyclable',     value: p.cyclable_score,     unit: '/100', color: '#10b981' },
      { label: 'Marché',       value: p.marche_score,       unit: '/100', color: '#f59e0b' },
      { label: 'Connectivité', value: p.connectivite_score, unit: '/100', color: '#3b82f6' },
    ];

    return (
      <div style={{
        background: '#f8fafc', borderRadius: '10px',
        padding: '14px', marginBottom: '16px',
        border: '1px solid #e2e8f0',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b' }}>
              {p.name || 'Rue sans nom'}
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
              {p.arrondissement ? p.arrondissement + 'e arr.' : ''}
              {p.length_km ? '  ·  ' + Number(p.length_km).toFixed(2) + ' km' : ''}
            </div>
          </div>
          <button
            onClick={clearStreet}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '18px', lineHeight: 1, padding: '0 4px' }}
          >×</button>
        </div>

        {/* Barres de score */}
        {scores.map(({ label, value, unit, color }) => (
          <div key={label} style={{ marginBottom: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '3px' }}>
              <span style={{ color: '#475569' }}>{label}</span>
              <span style={{ fontWeight: 600, color: value != null ? color : '#94a3b8' }}>
                {value != null ? Number(value).toFixed(1) + unit : 'N/D'}
              </span>
            </div>
            {value != null && (
              <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min(100, value)}%`,
                  background: color,
                  borderRadius: '3px',
                  transition: 'width 0.4s ease',
                }} />
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 56px)', overflow: 'hidden', position: 'relative' }}>

      {/* ── Panneau latéral ── */}
      <aside ref={sidebarRef} style={{
        width: sidebarOpen ? '300px' : '0',
        minWidth: sidebarOpen ? '300px' : '0',
        background: 'white',
        boxShadow: '2px 0 8px rgba(0,0,0,0.1)',
        overflowY: 'auto', overflowX: 'hidden',
        transition: 'all 0.25s ease',
        zIndex: 20,
      }}>
        {sidebarOpen && (
          <div style={{ padding: '16px 16px 24px', minWidth: '268px' }}>

            {/* ── Rue sélectionnée (en haut, si présente) ── */}
            {selectedStreet && (
              <>
                <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', marginBottom: '10px' }}>
                  Rue sélectionnée
                </h2>
                <StreetPanel />
                <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', marginBottom: '14px' }} />
              </>
            )}

            {/* ── Sélecteur KPI ── */}
            <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', marginBottom: '10px' }}>
              KPI affiché sur la carte
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '16px' }}>
              {KPI_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setActiveKPI(opt.value)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '8px 12px',
                    background: activeKPI === opt.value ? opt.color : '#f8fafc',
                    color: activeKPI === opt.value ? 'white' : '#475569',
                    border: `2px solid ${activeKPI === opt.value ? opt.color : '#e2e8f0'}`,
                    borderRadius: '8px',
                    fontSize: '13px', fontWeight: 500,
                    cursor: 'pointer', textAlign: 'left',
                    transition: 'all 0.15s',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', marginBottom: '14px' }} />

            {/* ── Recherche par nom de rue ── */}
            <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', marginBottom: '10px' }}>
              Rechercher une rue
            </h2>
            <div style={{ position: 'relative', marginBottom: '16px' }}>
              <input
                type="text"
                placeholder="Ex : Rivoli, Pigalle..."
                value={streetSearch}
                onChange={(e) => { setStreetSearch(e.target.value); setShowDropdown(true); }}
                onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '8px 32px 8px 10px',
                  border: '1px solid #d1d5db', borderRadius: '6px',
                  fontSize: '14px',
                }}
              />
              {searchLoading && (
                <span style={{ position: 'absolute', right: '10px', top: '9px', fontSize: '11px', color: '#94a3b8' }}>…</span>
              )}
              {showDropdown && searchResults.length > 0 && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0,
                  background: 'white', border: '1px solid #e2e8f0',
                  borderRadius: '0 0 6px 6px', zIndex: 100,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                  maxHeight: '200px', overflowY: 'auto',
                }}>
                  {searchResults.map((feat) => (
                    <div
                      key={feat.properties.street_id}
                      onMouseDown={() => handleSearchSelect(feat)}
                      style={{
                        padding: '8px 12px', cursor: 'pointer', fontSize: '13px',
                        borderBottom: '1px solid #f1f5f9',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                      onMouseLeave={e => e.currentTarget.style.background = 'white'}
                    >
                      <div style={{ fontWeight: 500, color: '#1e293b' }}>{feat.properties.name}</div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '1px' }}>
                        {feat.properties.arrondissement ? `${feat.properties.arrondissement}e arr.` : ''}
                        {feat.properties.length_km ? ` · ${Number(feat.properties.length_km).toFixed(2)} km` : ''}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {showDropdown && !searchLoading && streetSearch.length >= 2 && searchResults.length === 0 && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0,
                  background: 'white', border: '1px solid #e2e8f0',
                  borderRadius: '0 0 6px 6px', padding: '10px 12px',
                  fontSize: '13px', color: '#94a3b8',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                }}>
                  Aucune rue trouvée
                </div>
              )}
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', marginBottom: '14px' }} />

            {/* ── Filtre arrondissement ── */}
            <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', marginBottom: '10px' }}>
              Filtrer par arrondissement
            </h2>
            <select
              value={arrFilter}
              onChange={(e) => setArrFilter(e.target.value)}
              style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', marginBottom: '8px' }}
            >
              <option value="">Tous les arrondissements</option>
              {arrondissements.map(a => (
                <option key={a} value={a}>{a}e arrondissement</option>
              ))}
            </select>

            <button
              onClick={applyFilter}
              disabled={loading}
              style={{
                width: '100%', padding: '9px',
                background: loading ? '#94a3b8' : '#3b82f6',
                color: 'white', border: 'none', borderRadius: '6px',
                fontSize: '14px', fontWeight: 500,
                cursor: loading ? 'not-allowed' : 'pointer',
                marginBottom: '16px',
              }}
            >
              {loading ? 'Chargement...' : 'Appliquer'}
            </button>

            <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', marginBottom: '14px' }} />

            {/* ── KPI scores ── */}
            <h2 style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', marginBottom: '10px' }}>
              Indicateurs moyens
            </h2>
            <KpiSection />
          </div>
        )}
      </aside>

      {/* ── Toggle sidebar ── */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        style={{
          position: 'absolute', top: '16px',
          left: sidebarOpen ? '312px' : '12px',
          zIndex: 30, background: 'white', border: 'none',
          borderRadius: '6px', padding: '8px 10px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          cursor: 'pointer', fontSize: '16px',
          transition: 'left 0.25s ease',
        }}
      >
        {sidebarOpen ? '◀' : '▶'}
      </button>

      {/* ── Carte ── */}
      <main style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>

        {loading && !streetsData && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            background: 'rgba(248,250,252,0.9)', zIndex: 10,
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '40px', height: '40px', margin: '0 auto 12px',
                border: '4px solid #e2e8f0', borderTop: `4px solid ${activeOpt?.color || '#3b82f6'}`,
                borderRadius: '50%', animation: 'spin 0.8s linear infinite',
              }} />
              <p style={{ color: '#64748b', fontSize: '14px' }}>Chargement des données...</p>
            </div>
          </div>
        )}

        <MapContainer
          streetsData={streetsData}
          activeKPI={activeKPI}
          selectedStreetId={selectedStreet?.properties?.street_id ?? null}
          onFeatureClick={handleStreetClick}
          fitToData={!!arrFilter}
          centerOn={flyTarget}
        />

        {/* Badge KPI actif */}
        {streetsData && activeOpt && (
          <div style={{
            position: 'absolute', top: '16px', right: '60px', zIndex: 10,
            background: activeOpt.color, color: 'white',
            padding: '6px 14px', borderRadius: '20px',
            fontSize: '13px', fontWeight: 500,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }}>
            {activeOpt.label}
          </div>
        )}

        {/* Compteur rues */}
        {streetsData && (
          <div style={{
            position: 'absolute', bottom: '16px', right: '16px', zIndex: 10,
            background: 'white', padding: '6px 12px', borderRadius: '20px',
            fontSize: '12px', boxShadow: '0 2px 6px rgba(0,0,0,0.12)', color: '#475569',
          }}>
            {streetsData.features?.length?.toLocaleString('fr-FR') || 0} rues
            {arrFilter ? ` · ${arrFilter}e arr.` : ''}
          </div>
        )}

        {loading && streetsData && (
          <div style={{
            position: 'absolute', bottom: '44px', right: '16px', zIndex: 10,
            background: 'rgba(59,130,246,0.9)', color: 'white',
            padding: '6px 12px', borderRadius: '20px', fontSize: '12px',
          }}>
            Mise à jour...
          </div>
        )}
      </main>
    </div>
  );
};

export default Home;
