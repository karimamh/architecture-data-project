import React from 'react';

const S = {
  page: { maxWidth: '900px', margin: '0 auto', padding: '32px 24px' },
  card: { background: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', padding: '24px', marginBottom: '24px' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' },
  tag: { display: 'inline-block', padding: '4px 12px', background: '#f1f5f9', borderRadius: '99px', fontSize: '13px', color: '#475569', margin: '4px' },
  li: { padding: '10px 0', borderBottom: '1px solid #f1f5f9' },
};

const About = () => {
  const sources = [
    { name: 'OpenStreetMap', desc: 'Données des rues de Paris', license: 'ODbL' },
    { name: 'Paris Data', desc: 'Arrondissements, hotspots Wi-Fi', license: 'Open License' },
    { name: 'ANFR', desc: 'Antennes mobiles (4G/5G)', license: 'Open Data' },
    { name: 'DVF', desc: 'Transactions immobilières', license: 'Open License' },
  ];

  const kpis = [
    { name: 'Accessibilité transport', desc: 'Score d\'accessibilité aux transports en commun par rue' },
    { name: 'Cyclabilité', desc: 'Score de praticabilité à vélo par rue' },
    { name: 'Accès aux marchés', desc: 'Proximité aux marchés alimentaires' },
    { name: 'Connectivité', desc: 'Densité Wi-Fi et antennes mobiles' },
  ];

  const techs = ['React', 'MapLibre GL', 'Chart.js', 'Node.js / Express', 'Python / Pandas', 'GeoJSON'];

  return (
    <div style={S.page}>
      <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#1e293b', marginBottom: '24px' }}>
        A propos du projet
      </h1>

      <div style={S.card}>
        <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#1e293b', marginBottom: '12px' }}>
          Urban Data Explorer — Paris
        </h2>
        <p style={{ color: '#475569', lineHeight: 1.7, marginBottom: '12px' }}>
          Dashboard interactif pour explorer les données urbaines de Paris :
          accessibilité transport, cyclabilité, marchés et connectivité numérique.
        </p>
        <p style={{ color: '#475569', lineHeight: 1.7 }}>
          Architecture : pipeline ETL Python (Bronze → Silver → Gold) → API REST Node.js → Dashboard React.
        </p>
      </div>

      <div style={S.grid}>
        <div style={S.card}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>🗺️ Sources de données</h3>
          {sources.map((s) => (
            <div key={s.name} style={S.li}>
              <div style={{ fontWeight: 500, color: '#1e293b' }}>{s.name}</div>
              <div style={{ fontSize: '13px', color: '#64748b' }}>{s.desc}</div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>Licence : {s.license}</div>
            </div>
          ))}
        </div>

        <div style={S.card}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>📊 Indicateurs KPI</h3>
          {kpis.map((k) => (
            <div key={k.name} style={S.li}>
              <div style={{ fontWeight: 500, color: '#1e293b' }}>{k.name}</div>
              <div style={{ fontSize: '13px', color: '#64748b' }}>{k.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={S.card}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>🛠️ Technologies</h3>
        <div>
          {techs.map(t => <span key={t} style={S.tag}>{t}</span>)}
        </div>
        <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
          Projet EFREI — Architecture Data 2025-2026
        </p>
      </div>
    </div>
  );
};

export default About;
