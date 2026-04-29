import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { getKPITimeline } from '../api/getKPI';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const S = {
  page: { maxWidth: '900px', margin: '0 auto', padding: '32px 24px' },
  card: { background: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', padding: '24px', marginBottom: '24px' },
  label: { display: 'block', fontSize: '13px', fontWeight: 500, color: '#475569', marginBottom: '6px' },
  select: { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', background: 'white' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' },
};

const kpiOptions = [
  { value: 'prix_m2', label: 'Prix au m²' },
  { value: 'logements_sociaux_pct', label: 'Logements sociaux (%)' },
  { value: 'wifi_density', label: 'Densité Wi-Fi' },
  { value: 'antennes_count', label: 'Antennes mobiles' },
];

const arrondissements = Array.from({ length: 20 }, (_, i) => i + 1);

const Timeline = () => {
  const [selectedKPI, setSelectedKPI] = useState('prix_m2');
  const [selectedArr, setSelectedArr] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await getKPITimeline(selectedKPI, selectedArr || null);
        setData(result);
      } catch (e) {
        setError('Impossible de charger les données. Vérifiez que l\'API est démarrée.');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [selectedKPI, selectedArr]);

  const kpiLabel = kpiOptions.find(k => k.value === selectedKPI)?.label || selectedKPI;

  const chartData = data ? {
    labels: data.years,
    datasets: [{
      label: selectedArr ? `${selectedArr}e arrondissement` : 'Paris (moyenne)',
      data: data.values,
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59,130,246,0.1)',
      fill: true,
      tension: 0.4,
      pointRadius: 5,
      pointHoverRadius: 7,
    }],
  } : null;

  return (
    <div style={S.page}>
      <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#1e293b', marginBottom: '24px' }}>
        Evolution temporelle
      </h1>

      <div style={S.card}>
        <div style={S.grid}>
          <div>
            <label style={S.label}>Indicateur</label>
            <select style={S.select} value={selectedKPI} onChange={(e) => setSelectedKPI(e.target.value)}>
              {kpiOptions.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}
            </select>
          </div>
          <div>
            <label style={S.label}>Arrondissement (optionnel)</label>
            <select style={S.select} value={selectedArr} onChange={(e) => setSelectedArr(e.target.value)}>
              <option value="">Paris (moyenne)</option>
              {arrondissements.map(a => <option key={a} value={a}>{a}e arrondissement</option>)}
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ background: '#fee2e2', color: '#dc2626', padding: '14px', borderRadius: '8px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
          Chargement...
        </div>
      )}

      {!loading && chartData && (
        <div style={S.card}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', marginBottom: '20px' }}>
            {kpiLabel} — {selectedArr ? `${selectedArr}e arrondissement` : 'Paris (moyenne)'}
          </h2>
          <Line
            data={chartData}
            options={{
              responsive: true,
              plugins: {
                legend: { position: 'top' },
                tooltip: { mode: 'index', intersect: false },
              },
              scales: {
                y: {
                  beginAtZero: false,
                  title: { display: true, text: kpiLabel },
                },
                x: {
                  title: { display: true, text: 'Année' },
                },
              },
            }}
          />
        </div>
      )}

      {!loading && !chartData && !error && (
        <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
          Aucune donnée disponible
        </div>
      )}
    </div>
  );
};

export default Timeline;
