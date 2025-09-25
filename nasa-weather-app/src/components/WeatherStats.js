import React, { useState, useEffect } from 'react';
import axios from 'axios';

const paramIcons = {
  'T2M': '🌡️',
  'PRECTOTCORR': '🌧️',
  'WS2M': '💨',
  'RH2M': '💧',
  'SNODP': '❄️'
};

const getParameterDisplayName = (param) => {
  const names = {
    "T2M": "Temperature",
    "PRECTOTCORR": "Precipitation", 
    "WS2M": "Wind Speed",
    "RH2M": "Humidity",
    "SNODP": "Snow Depth"
  };
  return names[param] || param;
};

const WeatherStats = ({ data }) => {
  const [interpretations, setInterpretations] = useState({});

  useEffect(() => {
    const fetchInterpretations = async () => {
      const newInterpretations = {};
      
      for (const param of data.parameters) {
        try {
          const values = data.data.map(row => row[param]).filter(v => v !== null);
          if (values.length === 0) {
            newInterpretations[param] = 'No data available for analysis';
            continue;
          }
          
          const response = await axios.post('http://localhost:3001/api/parameter-insights', {
            param,
            values,
            unit: data.units[param]?.units || '',
            location: data.location
          });
          newInterpretations[param] = response.data.interpretation;
        } catch (error) {
          console.error(`Error fetching insights for ${param}:`, error);
          newInterpretations[param] = 'Generating AI insights...';
        }
      }
      
      setInterpretations(newInterpretations);
    };

    if (data && data.location) {
      fetchInterpretations();
    }
  }, [data]);

  const calculateStats = (values) => {
    const validValues = values.filter(v => v !== null && !isNaN(v));
    if (validValues.length === 0) return { mean: 'N/A', min: 'N/A', max: 'N/A' };
    
    const sum = validValues.reduce((a, b) => a + b, 0);
    return {
      mean: (sum / validValues.length).toFixed(2),
      min: Math.min(...validValues).toFixed(2),
      max: Math.max(...validValues).toFixed(2)
    };
  };

  return (
    <div className="stats-container">
      <h2 style={{
        color: '#ffd23f', 
        fontFamily: 'Orbitron, monospace', 
        textAlign: 'center', 
        marginBottom: '25px',
        fontSize: '2rem',
        textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
        background: 'rgba(255, 210, 63, 0.1)',
        padding: '2px 5px',
        borderRadius: '8px',
        border: '1px solid rgba(255, 210, 63, 0.3)',
        position: 'relative',
        zIndex: 10,
        display: 'inline-block',
        margin: '0 auto 25px auto',
        lineHeight: '1'
      }}>
        📊 Atmospheric Data 🛰️
      </h2>
      <div className="stats-grid">
        {data.parameters.map(param => {
          const values = data.data.map(row => row[param]);
          const stats = calculateStats(values);
          const unit = data.units[param]?.units || '';
          const displayName = getParameterDisplayName(param);
          const icon = paramIcons[param] || '📈';
          
          return (
            <div key={param} className="stat-card" style={{position: 'relative'}}>
              <div style={{
                position: 'absolute',
                top: '15px',
                right: '15px',
                fontSize: '1.5rem',
                opacity: 0.7
              }}>
                {icon}
              </div>
              
              <h3 style={{
                color: '#fff',
                fontFamily: 'Orbitron, monospace',
                fontSize: '1rem',
                marginBottom: '20px',
                paddingRight: '40px'
              }}>
                {displayName}
              </h3>
              
              <div className="stat-metrics" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '15px',
                marginTop: '15px'
              }}>
                <div className="metric" style={{textAlign: 'center', minWidth: '0'}}>
                  <div className="metric-value" style={{
                    fontSize: '1.4rem',
                    fontWeight: 'bold',
                    color: '#ffd23f',
                    fontFamily: 'Orbitron, monospace',
                    textShadow: '0 0 10px rgba(255, 210, 63, 0.5)',
                    wordBreak: 'break-word'
                  }}>
                    {stats.mean}
                  </div>
                  <div className="metric-label" style={{
                    fontSize: '0.8rem',
                    color: 'rgba(255, 255, 255, 0.8)',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    marginTop: '5px'
                  }}>
                    📊 Mean {unit}
                  </div>
                </div>
                
                <div className="metric" style={{textAlign: 'center', minWidth: '0'}}>
                  <div className="metric-value" style={{
                    fontSize: '1.4rem',
                    fontWeight: 'bold',
                    color: '#74b9ff',
                    fontFamily: 'Orbitron, monospace',
                    textShadow: '0 0 10px rgba(116, 185, 255, 0.5)',
                    wordBreak: 'break-word'
                  }}>
                    {stats.min}
                  </div>
                  <div className="metric-label" style={{
                    fontSize: '0.8rem',
                    color: 'rgba(255, 255, 255, 0.8)',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    marginTop: '5px'
                  }}>
                    ❄️ Min {unit}
                  </div>
                </div>
                
                <div className="metric" style={{textAlign: 'center', minWidth: '0'}}>
                  <div className="metric-value" style={{
                    fontSize: '1.4rem',
                    fontWeight: 'bold',
                    color: '#ff6b35',
                    fontFamily: 'Orbitron, monospace',
                    textShadow: '0 0 10px rgba(255, 107, 53, 0.5)',
                    wordBreak: 'break-word'
                  }}>
                    {stats.max}
                  </div>
                  <div className="metric-label" style={{
                    fontSize: '0.8rem',
                    color: 'rgba(255, 255, 255, 0.8)',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    marginTop: '5px'
                  }}>
                    🔥 Max {unit}
                  </div>
                </div>
              </div>
              
              {interpretations[param] && (
                <div style={{
                  marginTop: '15px',
                  padding: '12px',
                  background: 'rgba(255, 210, 63, 0.1)',
                  border: '1px solid rgba(255, 210, 63, 0.3)',
                  borderRadius: '8px'
                }}>
                  <div style={{
                    fontSize: '0.75rem',
                    color: '#ffd23f',
                    fontWeight: 'bold',
                    marginBottom: '5px',
                    textTransform: 'uppercase',
                    letterSpacing: '1px'
                  }}>
                    🤖 AI Analysis
                  </div>
                  <div style={{
                    fontSize: '0.85rem',
                    color: '#fff',
                    lineHeight: '1.4'
                  }}>
                    {interpretations[param]}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WeatherStats;