import React, { useState } from 'react';
import axios from 'axios';

const UNSPLASH_ACCESS_KEY = 'bJk5bsmCC_MxSgL3tjkFw1t6h2tV73qR-qrRKz89BUA';

const LocationComparison = () => {
  const [location1, setLocation1] = useState({ name: 'New Delhi', lat: 28.6, lon: 77.2 });
  const [location2, setLocation2] = useState({ name: 'Shimla', lat: 31.1, lon: 77.2 });
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cityImages, setCityImages] = useState({});
  const [purpose, setPurpose] = useState('');
  const [aiRecommendation, setAiRecommendation] = useState('');

  const fetchCityImage = async (cityName) => {
    try {
      const response = await axios.get(`https://api.unsplash.com/search/photos`, {
        params: {
          query: `${cityName} city skyline`,
          per_page: 1,
          orientation: 'landscape'
        },
        headers: {
          Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`
        }
      });
      
      if (response.data.results && response.data.results.length > 0) {
        return response.data.results[0].urls.regular;
      }
      return null;
    } catch (error) {
      console.error('Failed to fetch city image:', error);
      return null;
    }
  };

  const fetchLocationData = async (location) => {
    const endDate = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0].replace(/-/g, '');
    
    const response = await axios.get('https://power.larc.nasa.gov/api/temporal/daily/point', {
      params: {
        parameters: 'T2M,PRECTOTCORR,WS2M',
        community: 'AG',
        longitude: location.lon,
        latitude: location.lat,
        start: startDate,
        end: endDate,
        format: 'JSON'
      }
    });
    
    const paramData = response.data.properties.parameter;
    const temps = Object.values(paramData.T2M).filter(v => v !== -999);
    const precip = Object.values(paramData.PRECTOTCORR).filter(v => v !== -999);
    const wind = Object.values(paramData.WS2M).filter(v => v !== -999);
    
    return {
      avgTemp: temps.reduce((a, b) => a + b, 0) / temps.length,
      hotDays: temps.filter(t => t > 30).length / temps.length * 100,
      avgPrecip: precip.reduce((a, b) => a + b, 0) / precip.length,
      rainyDays: precip.filter(p => p > 1).length / precip.length * 100,
      avgWind: wind.reduce((a, b) => a + b, 0) / wind.length
    };
  };

  const getAIRecommendation = async (data1, data2, userPurpose) => {
    try {
      const response = await axios.post('http://localhost:3001/api/city-recommendation', {
        location1: { name: location1.name, data: data1 },
        location2: { name: location2.name, data: data2 },
        purpose: userPurpose
      });
      return response.data.recommendation;
    } catch (error) {
      console.error('AI recommendation failed:', error);
      return generateBasicRecommendation(data1, data2, userPurpose);
    }
  };

  const generateBasicRecommendation = (data1, data2, userPurpose) => {
    const p = userPurpose.toLowerCase();
    let winner = '';
    let reason = '';
    
    if (p.includes('vacation') || p.includes('holiday') || p.includes('tourism')) {
      winner = data1.avgTemp > 20 && data1.avgTemp < 30 && data1.rainyDays < 30 ? location1.name : location2.name;
      reason = `${winner} offers better vacation weather with comfortable temperatures and fewer rainy days, ideal for outdoor sightseeing and activities.`;
    } else if (p.includes('work') || p.includes('job') || p.includes('business')) {
      winner = data1.avgTemp < data2.avgTemp ? location1.name : location2.name;
      reason = `${winner} has more comfortable temperatures that enhance productivity and reduce heat-related stress during work hours.`;
    } else if (p.includes('health') || p.includes('medical')) {
      winner = data1.avgTemp > 15 && data1.avgTemp < 28 ? location1.name : location2.name;
      reason = `${winner} offers moderate temperatures that are generally better for health and well-being, avoiding extreme heat or cold.`;
    } else {
      winner = data1.hotDays < data2.hotDays ? location1.name : location2.name;
      reason = `${winner} has fewer extremely hot days, providing more comfortable overall weather conditions.`;
    }
    
    return `🏆 WINNER: ${winner}\n\nREASON: ${reason}`;
  };

  const compareLocations = async () => {
    if (!purpose.trim()) {
      alert('Please tell us why you\'re comparing these cities first! 🤔');
      return;
    }

    setLoading(true);
    try {
      // Fetch weather data and city images in parallel
      const [data1, data2, image1, image2] = await Promise.all([
        fetchLocationData(location1),
        fetchLocationData(location2),
        fetchCityImage(location1.name),
        fetchCityImage(location2.name)
      ]);
      
      setCityImages({
        [location1.name]: image1,
        [location2.name]: image2
      });

      // Get AI recommendation based on purpose
      const aiRec = await getAIRecommendation(data1, data2, purpose);
      setAiRecommendation(aiRec);
      
      const winner = data1.hotDays < data2.hotDays ? location1.name : location2.name;
      const recommendation = data1.hotDays < data2.hotDays 
        ? `${location1.name} is cooler with ${data1.hotDays.toFixed(0)}% hot days vs ${data2.hotDays.toFixed(0)}%`
        : `${location2.name} is cooler with ${data2.hotDays.toFixed(0)}% hot days vs ${data1.hotDays.toFixed(0)}%`;
      
      setComparison({ data1, data2, winner, recommendation });
    } catch (error) {
      console.error('Comparison failed:', error);
    }
    setLoading(false);
  };

  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.05)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '15px',
      padding: '20px',
      marginBottom: '20px'
    }}>
      <h3 style={{ color: '#ffd23f', fontFamily: 'Orbitron, monospace', marginBottom: '15px' }}>
        🌍 Compare Multiple Locations
      </h3>
      
      <div style={{ marginBottom: '15px' }}>
        <label style={{ color: '#fff', display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
          🤔 Why are you comparing these cities?
        </label>
        <textarea
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          placeholder="e.g., Planning a vacation, considering relocation for work, health reasons, business trip..."
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            background: 'rgba(255, 255, 255, 0.9)',
            color: '#333',
            fontSize: '14px',
            minHeight: '60px',
            resize: 'vertical',
            fontFamily: 'inherit'
          }}
        />
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
        <div>
          <label style={{ color: '#fff', display: 'block', marginBottom: '5px' }}>Location 1</label>
          <input 
            type="text" 
            value={location1.name}
            onChange={(e) => setLocation1({...location1, name: e.target.value})}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              background: 'rgba(255, 255, 255, 0.9)',
              color: '#333',
              fontSize: '14px'
            }}
          />
        </div>
        <div>
          <label style={{ color: '#fff', display: 'block', marginBottom: '5px' }}>Location 2</label>
          <input 
            type="text" 
            value={location2.name}
            onChange={(e) => setLocation2({...location2, name: e.target.value})}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              background: 'rgba(255, 255, 255, 0.9)',
              color: '#333',
              fontSize: '14px'
            }}
          />
        </div>
      </div>

      <button 
        onClick={compareLocations}
        disabled={loading}
        style={{
          width: '100%',
          padding: '10px',
          background: '#ff6b35',
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontFamily: 'Orbitron, monospace'
        }}
      >
        {loading ? '🔄 Comparing...' : '⚡ Compare Locations'}
      </button>

      {comparison && (
        <div style={{ marginTop: '20px', color: '#fff' }}>
          {aiRecommendation && (
            <div style={{ 
              background: 'linear-gradient(135deg, rgba(255, 107, 53, 0.2), rgba(247, 147, 30, 0.2))', 
              padding: '20px', 
              borderRadius: '12px',
              marginBottom: '20px',
              border: '1px solid rgba(255, 107, 53, 0.3)'
            }}>
              <h4 style={{ color: '#ffd23f', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🤖 AI Recommendation for: "{purpose}"
              </h4>
              <p style={{ margin: 0, fontSize: '1rem', lineHeight: '1.6', fontStyle: 'italic' }}>
                {aiRecommendation}
              </p>
            </div>
          )}
          
          <div style={{ 
            background: 'rgba(255, 210, 63, 0.1)', 
            padding: '15px', 
            borderRadius: '10px',
            marginBottom: '15px'
          }}>
            <h4 style={{ color: '#ffd23f', margin: '0 0 10px 0' }}>📊 Weather Comparison</h4>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>{comparison.recommendation}</p>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '15px', borderRadius: '10px' }}>
              {cityImages[location1.name] && (
                <div style={{ marginBottom: '15px' }}>
                  <img 
                    src={cityImages[location1.name]} 
                    alt={location1.name}
                    style={{
                      width: '100%',
                      height: '120px',
                      objectFit: 'cover',
                      borderRadius: '8px',
                      border: '2px solid rgba(255, 107, 53, 0.3)'
                    }}
                  />
                </div>
              )}
              <h5 style={{ color: '#ff6b35', margin: '0 0 10px 0' }}>{location1.name}</h5>
              <div>🌡️ Avg Temp: {comparison.data1.avgTemp.toFixed(1)}°C</div>
              <div>🔥 Hot Days: {comparison.data1.hotDays.toFixed(0)}%</div>
              <div>🌧️ Rainy Days: {comparison.data1.rainyDays.toFixed(0)}%</div>
              <div>💨 Avg Wind: {comparison.data1.avgWind.toFixed(1)}m/s</div>
            </div>
            
            <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '15px', borderRadius: '10px' }}>
              {cityImages[location2.name] && (
                <div style={{ marginBottom: '15px' }}>
                  <img 
                    src={cityImages[location2.name]} 
                    alt={location2.name}
                    style={{
                      width: '100%',
                      height: '120px',
                      objectFit: 'cover',
                      borderRadius: '8px',
                      border: '2px solid rgba(255, 107, 53, 0.3)'
                    }}
                  />
                </div>
              )}
              <h5 style={{ color: '#ff6b35', margin: '0 0 10px 0' }}>{location2.name}</h5>
              <div>🌡️ Avg Temp: {comparison.data2.avgTemp.toFixed(1)}°C</div>
              <div>🔥 Hot Days: {comparison.data2.hotDays.toFixed(0)}%</div>
              <div>🌧️ Rainy Days: {comparison.data2.rainyDays.toFixed(0)}%</div>
              <div>💨 Avg Wind: {comparison.data2.avgWind.toFixed(1)}m/s</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationComparison;
