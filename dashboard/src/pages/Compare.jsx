import React, { useState } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { getKPIComparison } from '../api/getKPI';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const S = {
  page: { maxWidth: '900px', margin: '0 auto', padding: '32px 24px' },
  card: { background: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', padding: '24px', marginBottom: '24px' },
  label: { display: 'block', fontSize: '13px', fontWeight: 500, color: '#475569', marginBottom: '6px' },
  select: { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', background: 'white' },
  btn: { width: '100%', padding: '12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 600, cursor: 'pointer', marginTop: '12px' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' },
  stat: { background: '#f8fafc', borderRadius: '8px', padding: '16px', textAlign: 'center' },
};

const arrondissements = Array.from({ length: 20 }, (_, i) => i + 1);

const kpiOptions = [
  { value: 'prix_m2', label: 'Prix au m² (€)' },
  { value: 'logements_sociaux_pct', label: 'Logements sociaux (%)' },
  { value: 'population', label: 'Population' },
];

const Compare = () => {
  const [arr1, setArr1] = useState('1');
  const [arr2, setArr2] = useState('12');
  const [kpi, setKpi] = useState('prix_m2');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleCompare = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getKPIComparison(arr1, arr2, kpi);
      setResult(data);
    } catch (e) {
      setError('Erreur lors de la comparaison. Vérifiez que l\'API est démarrée.');
    } finally {
      setLoading(false);
    }
  };

  const kpiLabel = kpiOptions.find(k => k.value === kpi)?.label || kpi;

  const barData = result ? {
    labels: [`${result.arr1}e arr.`, `${result.arr2}e arr.`],
    datasets: [{
      label: kpiLabel,
      data: [result.arr1_value, result.arr2_value],
      backgroundColor: ['#3b82f6', '#ef4444'],
      borderRadius: 6,
    }],
  } : null;

  return (
    <div style={S.page}>
      <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#1e293b', marginBottom: '24px' }}>
        Comparaison d'arrondissements
      </h1>

      <div style={S.card}>
        <div style={S.grid}>
          <div>
            <label style={S.label}>Premier arrondissement</label>
            <select style={S.select} value={arr1} onChange={(e) => setArr1(e.target.value)}>
              {arrondissements.map(a => <option key={a} value={a}>{a}e arrondissement</option>)}
            </select>
          </div>
          <div>
            <label style={S.label}>Second arrondissement</label>
            <select style={S.select} value={arr2} onChange={(e) => setArr2(e.target.value)}>
              {arrondissements.map(a => <option key={a} value={a}>{a}e arrondissement</option>)}
            </select>
          </div>
        </div>

        <div style={{ marginTop: '16px' }}>
          <label style={S.label}>Indicateur à comparer</label>
          <select style={S.select} value={kpi} onChange={(e) => setKpi(e.target.value)}>
            {kpiOptions.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}
          </select>
        </div>

        <button style={{ ...S.btn, background: loading ? '#94a3b8' : '#3b82f6' }} onClick={handleCompare} disabled={loading}>
          {loading ? 'Chargement...' : 'Comparer'}
        </button>
      </div>

      {error && (
        <div style={{ background: '#fee2e2', color: '#dc2626', padding: '14px', borderRadius: '8px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {result && !loading && (
        <>
          <div style={S.card}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#1e293b', marginBottom: '20px' }}>
              Résultats — {kpiLabel}
            </h2>
            <div style={S.grid}>
              <div style={{ ...S.stat, borderLeft: '4px solid #3b82f6' }}>
                <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '8px' }}>{result.arr1}e arrondissement</div>
                <div style={{ fontSize: '28px', fontWeight: 700, color: '#1e293b' }}>
                  {result.arr1_value?.toLocaleString('fr-FR')}
                </div>
              </div>
              <div style={{ ...S.stat, borderLeft: '4px solid #ef4444' }}>
                <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '8px' }}>{result.arr2}e arrondissement</div>
                <div style={{ fontSize: '28px', fontWeight: 700, color: '#1e293b' }}>
                  {result.arr2_value?.toLocaleString('fr-FR')}
                </div>
              </div>
            </div>

            {result.difference_pct != null && (
              <div style={{
                marginTop: '16px',
                padding: '12px 16px',
                borderRadius: '8px',
                background: result.difference >= 0 ? '#fef2f2' : '#f0fdf4',
                color: result.difference >= 0 ? '#dc2626' : '#16a34a',
                fontWeight: 500,
                textAlign: 'center',
              }}>
                Le {result.arr2}e est {Math.abs(result.difference_pct).toFixed(1)}%{' '}
                {result.difference >= 0 ? 'plus élevé' : 'moins élevé'} que le {result.arr1}e
              </div>
            )}
          </div>

          <div style={S.card}>
            <Bar
              data={barData}
              options={{
                responsive: true,
                plugins: { legend: { display: false }, title: { display: false } },
                scales: { y: { beginAtZero: false } },
              }}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default Compare;
