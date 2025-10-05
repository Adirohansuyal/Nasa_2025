# NASA POWER Data Explorer

A full-stack weather analytics platform integrating NASA POWER API with Google Gemini AI for meteorological data analysis, machine learning forecasting, and intelligent insights generation.

## System Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React SPA     │    │   Express.js     │    │   NASA POWER    │
│   (Port 3000)   │◄──►│   API Gateway    │◄──►│      API        │
│                 │    │   (Port 3001)    │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │                       ▼                       │
         │              ┌──────────────────┐             │
         │              │   Google Gemini  │             │
         └──────────────┤   AI Service     │─────────────┘
                        │   (LLM Engine)   │
                        └──────────────────┘
                                 │
                        ┌──────────────────┐
                        │   Streamlit      │
                        │   Dashboard      │
                        │   (Port 8501)    │
                        └──────────────────┘
```

## Technology Stack

### Frontend Layer
- **React 19.1.1**: Component-based UI framework
- **Chart.js 4.5.0**: Data visualization library
- **Leaflet 1.9.4**: Interactive mapping
- **Axios**: HTTP client for API communication
- **HTML2Canvas + jsPDF**: Report generation

### Backend Layer
- **Express.js 4.18.2**: RESTful API server
- **CORS**: Cross-origin resource sharing
- **Body-parser**: Request parsing middleware
- **dotenv**: Environment configuration

### AI/ML Services
- **Google Generative AI (@google/generative-ai)**: LLM integration
- **Gemini-1.5-flash**: Model for insights generation
- **Custom ML Forecasting**: Scikit-learn based predictions

### Alternative Interface
- **Streamlit**: Python-based dashboard
- **Pandas**: Data manipulation
- **Matplotlib**: Statistical plotting
- **Folium**: Geospatial visualization

## API Specifications

### NASA POWER API Integration
```
Endpoint: https://power.larc.nasa.gov/api/temporal/daily/point
Parameters:
- longitude: [-180, 180]
- latitude: [-90, 90]
- start: YYYYMMDD format
- end: YYYYMMDD format
- parameters: T2M,PRECTOTCORR,WS2M,RH2M,SNODP
- community: RE (Renewable Energy)
- format: JSON
```

### Internal API Endpoints

#### Weather Data Proxy
```http
GET /api/nasa-proxy
Query Parameters:
  - parameters: string (comma-separated)
  - longitude: float
  - latitude: float
  - start: string (YYYYMMDD)
  - end: string (YYYYMMDD)
  - format: string (JSON)

Response:
{
  "properties": {
    "parameter": {
      "T2M": { "20240101": 25.3, ... },
      "PRECTOTCORR": { "20240101": 0.5, ... }
    }
  },
  "parameters": {
    "T2M": { "units": "C", "longname": "Temperature at 2 Meters" }
  }
}
```

#### AI Insights Generation
```http
POST /api/insights
Content-Type: application/json

Request Body:
{
  "data": [
    { "date": "20240101", "T2M": 25.3, "PRECTOTCORR": 0.5 }
  ],
  "parameters": ["T2M", "PRECTOTCORR"],
  "units": { "T2M": { "units": "C" } },
  "location": { "lat": 40.7128, "lon": -74.0060 }
}

Response:
{
  "insights": "TREND ANALYSIS: Temperature shows increasing pattern...\nPREDICTIONS: Expected conditions..."
}
```

#### Parameter-Specific Analysis
```http
POST /api/parameter-insights
Content-Type: application/json

Request Body:
{
  "param": "T2M",
  "values": [25.3, 26.1, 24.8],
  "unit": "°C",
  "location": { "lat": 40.7128, "lon": -74.0060 }
}

Response:
{
  "interpretation": "Temperature Analysis: Current value is 24.8°C..."
}
```

## Data Processing Pipeline

### 1. Data Ingestion
```javascript
// NASA API response transformation
const processedData = dates.map(date => {
  const row = { date };
  Object.keys(paramData).forEach(param => {
    row[param] = paramData[param][date] === -999 ? null : paramData[param][date];
  });
  return row;
});
```

### 2. Statistical Analysis
```javascript
// Real-time metrics calculation
const statistics = {
  mean: values.reduce((a, b) => a + b, 0) / values.length,
  min: Math.min(...values),
  max: Math.max(...values),
  stdDev: calculateStandardDeviation(values),
  variance: calculateVariance(values)
};
```

### 3. ML Forecasting Algorithm
```javascript
// Time series forecasting implementation
class MLForecaster {
  generateForecast(data, parameter, days, aiContext) {
    const values = this.extractValues(data, parameter);
    const trend = this.calculateTrend(values);
    const seasonality = this.detectSeasonality(values);
    const forecast = this.applyMLModel(values, trend, seasonality, days);
    return this.enhanceWithAI(forecast, aiContext);
  }
}
```

## Environment Configuration

### Required Environment Variables
```bash
# .env file in nasa-weather-app/
GEMINI_API_KEY=your_google_gemini_api_key
NODE_ENV=development
PORT=3001
CORS_ORIGIN=http://localhost:3000
```

### Python Dependencies
```txt
streamlit>=1.28.0
pandas>=2.0.0
requests>=2.31.0
matplotlib>=3.7.0
geopy>=2.3.0
folium>=0.14.0
streamlit-folium>=0.13.0
google-generativeai>=0.3.0
scikit-learn>=1.3.0
numpy>=1.24.0
```

### Node.js Dependencies
```json
{
  "dependencies": {
    "@google/generative-ai": "^0.1.3",
    "axios": "^1.12.2",
    "body-parser": "^1.20.2",
    "chart.js": "^4.5.0",
    "cors": "^2.8.5",
    "express": "^4.18.2",
    "react": "^19.1.1",
    "react-chartjs-2": "^5.3.0"
  }
}
```

## Deployment Architecture

### Development Environment
```bash
# Terminal 1: Backend API Server
cd nasa-weather-app && node server.js

# Terminal 2: React Development Server
cd nasa-weather-app && npm start

# Terminal 3: Streamlit Dashboard
streamlit run app.py --server.port 8501
```

### Production Deployment
```bash
# Build React application
npm run build

# Serve static files with Express
app.use(express.static(path.join(__dirname, 'build')));

# PM2 process management
pm2 start ecosystem.config.js
```

## Performance Optimization

### Caching Strategy
```javascript
// In-memory caching for API responses
const cache = {};
const cacheKey = JSON.stringify(requestBody);
if (cache[cacheKey]) {
  return res.json({ insights: cache[cacheKey] });
}
```

### Error Handling & Fallbacks
```javascript
// Graceful degradation for AI services
try {
  const aiInsights = await generateGeminiInsights(data);
  return aiInsights;
} catch (error) {
  console.error('AI service unavailable:', error);
  return generateStatisticalFallback(data);
}
```

## Security Considerations

### API Key Management
- Environment variable isolation
- No client-side API key exposure
- Server-side proxy pattern for external APIs

### CORS Configuration
```javascript
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
```

### Input Validation
```javascript
// Parameter validation middleware
const validateWeatherRequest = (req, res, next) => {
  const { latitude, longitude, start, end } = req.query;
  if (!isValidCoordinate(latitude, longitude)) {
    return res.status(400).json({ error: 'Invalid coordinates' });
  }
  next();
};
```

## Monitoring & Logging

### Server Logging
```javascript
// Structured logging implementation
console.log(`[${new Date().toISOString()}] ${method} ${url} - ${statusCode}`);
```

### Error Tracking
```javascript
// Comprehensive error handling
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});
```

## Testing Strategy

### Unit Testing
```bash
# React component testing
npm test

# API endpoint testing
npm run test:api
```

### Integration Testing
```bash
# End-to-end testing with Cypress
npm run test:e2e
```

## Contributing Guidelines

### Code Standards
- ESLint configuration for JavaScript
- Prettier for code formatting
- Conventional commits for version control

### Development Workflow
1. Fork repository
2. Create feature branch: `git checkout -b feature/enhancement`
3. Implement changes with tests
4. Submit pull request with detailed description

## License

MIT License - see LICENSE file for details.

---

**Technical Support**: For implementation details and API documentation, refer to the inline code comments and JSDoc annotations.
