import React, { useState, useEffect } from 'react';
import axios from 'axios';

const WeatherSummary = ({ data }) => {
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);

  const generateLocalSummary = () => {
    if (!data || !data.data || data.data.length === 0) {
      return 'No weather data available for summary generation.';
    }

    const { data: weatherData, parameters, location, forecasts } = data;
    const paramNames = {
      "T2M": "temperature",
      "PRECTOTCORR": "precipitation", 
      "WS2M": "wind speed",
      "RH2M": "humidity",
      "SNODP": "snow depth"
    };

    // Data period
    const startDate = weatherData[0].date;
    const endDate = weatherData[weatherData.length - 1].date;
    const startFormatted = `${startDate.slice(6,8)}/${startDate.slice(4,6)}/${startDate.slice(0,4)}`;
    const endFormatted = `${endDate.slice(6,8)}/${endDate.slice(4,6)}/${endDate.slice(0,4)}`;
    
    let summary = `This weather analysis covers the period from ${startFormatted} to ${endFormatted} for the location at ${location.lat}°N, ${location.lon}°E.\n\n`;

    // Temperature analysis
    if (parameters.includes('T2M')) {
      const values = weatherData.map(d => d.T2M).filter(v => v !== null && !isNaN(v));
      if (values.length > 0) {
        const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
        const min = Math.min(...values);
        const max = Math.max(...values);
        
        summary += `The temperature during this period has been quite ${avg > 25 ? 'warm' : avg > 15 ? 'moderate' : 'cool'}, averaging ${avg.toFixed(1)}°C. `;
        summary += `The warmest day reached ${max.toFixed(1)}°C, while the coolest dropped to ${min.toFixed(1)}°C. `;
        
        // Trend
        const recent = values.slice(-7);
        const earlier = values.slice(0, 7);
        if (recent.length > 0 && earlier.length > 0) {
          const recentAvg = recent.reduce((sum, v) => sum + v, 0) / recent.length;
          const earlierAvg = earlier.reduce((sum, v) => sum + v, 0) / earlier.length;
          if (recentAvg > earlierAvg + 1) {
            summary += `Recently, temperatures have been trending upward. `;
          } else if (recentAvg < earlierAvg - 1) {
            summary += `Recently, temperatures have been cooling down. `;
          } else {
            summary += `Temperature patterns have remained relatively stable. `;
          }
        }
        
        // Forecast
        if (forecasts && forecasts.T2M && forecasts.T2M.length > 0) {
          const forecastTemp = forecasts.T2M[0].T2M;
          const confidence = forecasts.T2M[0].confidence;
          summary += `Looking ahead, our ML model predicts temperatures around ${forecastTemp.toFixed(1)}°C with ${(confidence * 100).toFixed(0)}% confidence.\n\n`;
        } else {
          summary += `\n\n`;
        }
      }
    }

    // Precipitation analysis
    if (parameters.includes('PRECTOTCORR')) {
      const values = weatherData.map(d => d.PRECTOTCORR).filter(v => v !== null && !isNaN(v));
      if (values.length > 0) {
        const total = values.reduce((sum, v) => sum + v, 0);
        const avg = total / values.length;
        const rainyDays = values.filter(v => v > 0.1).length;
        const maxRain = Math.max(...values);
        
        if (total < 10) {
          summary += `This has been a relatively dry period with only ${total.toFixed(1)}mm of total rainfall. `;
        } else if (total < 50) {
          summary += `Rainfall has been moderate during this period, totaling ${total.toFixed(1)}mm. `;
        } else {
          summary += `This has been quite a wet period with ${total.toFixed(1)}mm of total precipitation. `;
        }
        
        summary += `There were ${rainyDays} days with measurable rainfall, `;
        if (maxRain > 20) {
          summary += `including one particularly heavy day with ${maxRain.toFixed(1)}mm. `;
        } else {
          summary += `with the heaviest day receiving ${maxRain.toFixed(1)}mm. `;
        }
        
        // Forecast
        if (forecasts && forecasts.PRECTOTCORR && forecasts.PRECTOTCORR.length > 0) {
          const forecastRain = forecasts.PRECTOTCORR[0].PRECTOTCORR;
          if (forecastRain > 5) {
            summary += `Rain is expected in the coming days. `;
          } else if (forecastRain > 0.1) {
            summary += `Light precipitation is possible in the forecast. `;
          } else {
            summary += `Dry conditions are expected to continue. `;
          }
        }
        summary += `\n\n`;
      }
    }

    // Wind analysis
    if (parameters.includes('WS2M')) {
      const values = weatherData.map(d => d.WS2M).filter(v => v !== null && !isNaN(v));
      if (values.length > 0) {
        const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
        const max = Math.max(...values);
        
        if (avg < 2) {
          summary += `Wind conditions have been generally calm, averaging ${avg.toFixed(1)} m/s. `;
        } else if (avg < 5) {
          summary += `There's been a light breeze throughout the period, with average wind speeds of ${avg.toFixed(1)} m/s. `;
        } else {
          summary += `It's been quite breezy, with average wind speeds reaching ${avg.toFixed(1)} m/s. `;
        }
        
        if (max > 10) {
          summary += `The windiest moment peaked at ${max.toFixed(1)} m/s. `;
        }
        summary += `\n\n`;
      }
    }

    // Overall assessment
    summary += `Overall, this location has experienced `;
    const tempAvg = parameters.includes('T2M') ? weatherData.map(d => d.T2M).filter(v => v !== null).reduce((sum, v) => sum + v, 0) / weatherData.filter(d => d.T2M !== null).length : null;
    const rainTotal = parameters.includes('PRECTOTCORR') ? weatherData.map(d => d.PRECTOTCORR).filter(v => v !== null).reduce((sum, v) => sum + v, 0) : null;
    
    if (tempAvg && tempAvg > 25 && rainTotal && rainTotal < 20) {
      summary += `warm and dry conditions, ideal for outdoor activities.`;
    } else if (tempAvg && tempAvg > 25 && rainTotal && rainTotal > 50) {
      summary += `warm and humid conditions with significant rainfall.`;
    } else if (tempAvg && tempAvg < 15 && rainTotal && rainTotal > 30) {
      summary += `cool and wet weather patterns.`;
    } else if (tempAvg && tempAvg < 15) {
      summary += `cooler weather conditions.`;
    } else {
      summary += `typical seasonal weather patterns for this geographic region.`;
    }

    return summary;
  };

  useEffect(() => {
    const fetchSummary = async () => {
      setLoading(true);
      try {
        // Try Gemini API first
        const response = await axios.post('http://localhost:3001/api/gemini-summary', {
          data: data.data,
          parameters: data.parameters,
          units: data.units,
          location: data.location,
          forecasts: data.forecasts
        });
        setSummary(response.data.summary);
      } catch (error) {
        console.log('Gemini summary failed, generating local summary');
        setSummary(generateLocalSummary());
      } finally {
        setLoading(false);
      }
    };

    if (data) {
      fetchSummary();
    }
  }, [data]);

  return (
    <div className="chart-container" style={{position: 'relative'}}>
      <div style={{
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        gap: '15px', 
        marginBottom: '20px'
      }}>
        <div style={{fontSize: '2rem'}}>🌤️</div>
        <h2 style={{
          color: '#fff', 
          fontFamily: 'Orbitron, monospace', 
          margin: 0,
          textAlign: 'center'
        }}>
          Weather Summary
        </h2>
        <div style={{fontSize: '2rem'}}>📝</div>
      </div>
      
      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '15px',
        padding: '25px',
        backdropFilter: 'blur(5px)'
      }}>
        {loading ? (
          <div style={{
            color: '#ffd23f',
            textAlign: 'center',
            fontStyle: 'italic',
            fontSize: '1.1rem',
            fontFamily: 'Orbitron, monospace'
          }}>
            🤖 Generating plain English summary...
          </div>
        ) : (
          <div style={{
            color: '#fff',
            lineHeight: '1.8',
            fontSize: '1.1rem',
            fontFamily: 'Inter, sans-serif'
          }}>
            {summary.split('\n\n').map((paragraph, index) => (
              <p key={index} style={{
                margin: '15px 0',
                textAlign: 'justify'
              }}>
                {paragraph}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WeatherSummary;
