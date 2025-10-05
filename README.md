# 🌌 NASA POWER Data Explorer

A comprehensive weather data analysis platform powered by NASA POWER API and Google Gemini AI, featuring both Streamlit and React interfaces with machine learning forecasting capabilities.

## 🚀 Features

- **NASA POWER API Integration**: Access to global weather and climate data
- **AI-Powered Insights**: Google Gemini AI analysis of weather patterns
- **Machine Learning Forecasting**: 7-day weather predictions
- **Interactive Visualizations**: Charts, maps, and statistical analysis
- **Location Comparison**: Compare weather data across multiple locations
- **Export Capabilities**: Generate PDF reports and export data
- **Real-time Chatbot**: AI assistant for weather queries
- **Dual Interface**: Both Streamlit and React frontends

## 🏗️ Architecture

```
nasa/
├── app.py                    # Streamlit application
├── requirements.txt          # Python dependencies
├── nasa-weather-app/         # React application
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── services/         # ML forecasting services
│   │   └── App.js           # Main React app
│   ├── server.js            # Express.js API server
│   ├── package.json         # Node.js dependencies
│   └── .env                 # Environment variables
└── README.md
```

## 🛠️ Prerequisites

- **Python 3.8+**
- **Node.js 16+**
- **npm or yarn**
- **Google Gemini API Key**

## ⚡ Quick Start

### 1. Clone and Setup

```bash
git clone <repository-url>
cd nasa
```

### 2. Backend Setup (Python/Streamlit)

```bash
# Install Python dependencies
pip install -r requirements.txt
```

### 3. Frontend Setup (React/Node.js)

```bash
cd nasa-weather-app

# Install Node.js dependencies
npm install

# Configure environment variables
echo "GEMINI_API_KEY=your_gemini_api_key_here" > .env
```

### 4. Start All Services

```bash
# Terminal 1: Start Streamlit (port 8501)
streamlit run app.py

# Terminal 2: Start Express API (port 3001)
cd nasa-weather-app
node server.js

# Terminal 3: Start React frontend (port 3000)
cd nasa-weather-app
npm start
```

**Or use the convenient script:**
```bash
cd nasa-weather-app
npm run dev  # Starts both API server and React app
```

## 🌐 Access Points

- **React App**: http://localhost:3000
- **Streamlit App**: http://localhost:8501
- **API Server**: http://localhost:3001

## 🔧 Configuration

### Environment Variables

Create `.env` file in `nasa-weather-app/`:

```env
GEMINI_API_KEY=your_google_gemini_api_key
```

### API Keys Setup

1. **Google Gemini API**:
   - Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Generate API key
   - Add to `.env` file

## 📊 Usage

### React Interface (Recommended)

1. Navigate to http://localhost:3000
2. Select weather parameters (Temperature, Precipitation, Wind Speed, etc.)
3. Choose location (coordinates or search)
4. Set date range
5. Click "Fetch Data" to get:
   - Statistical analysis
   - Interactive charts
   - ML forecasts
   - AI insights
   - Exportable reports

### Streamlit Interface

1. Navigate to http://localhost:8501
2. Use the sidebar to configure parameters
3. View data visualizations and AI insights

## 🤖 AI Features

- **Weather Pattern Analysis**: Gemini AI analyzes trends and anomalies
- **ML Forecasting**: 7-day predictions using scikit-learn
- **Interactive Chatbot**: Ask questions about weather data
- **Automated Insights**: Natural language explanations of data

## 📈 Available Parameters

- **T2M**: Temperature at 2 Meters (°C)
- **PRECTOTCORR**: Precipitation (mm/day)
- **WS2M**: Wind Speed at 2 Meters (m/s)
- **RH2M**: Relative Humidity at 2 Meters (%)
- **SNODP**: Snow Depth (cm)

## 🔄 API Endpoints

### Express.js Server (port 3001)

- `GET /api/nasa-proxy` - Proxy to NASA POWER API
- `POST /api/insights` - Generate AI insights
- `POST /api/probabilities` - Calculate weather probabilities

## 🛠️ Development

### Project Structure

```
src/
├── components/
│   ├── WeatherForm.js       # Data input form
│   ├── WeatherChart.js      # Chart visualizations
│   ├── WeatherStats.js      # Statistical analysis
│   ├── GeminiInsights.js    # AI insights display
│   ├── MLMetrics.js         # ML forecasting
│   ├── Chatbot.js          # AI chatbot
│   └── ...
├── services/
│   └── mlForecasting.js     # ML algorithms
└── App.js                   # Main application
```

### Adding New Features

1. **New Weather Parameter**: Update parameter mappings in `server.js`
2. **New ML Model**: Extend `mlForecasting.js`
3. **New Visualization**: Add component in `src/components/`

## 🚨 Troubleshooting

### Common Issues

**"Failed to fetch weather data"**
- Ensure all three services are running
- Check API key configuration
- Verify network connectivity

**Port conflicts**
- Change ports in respective config files
- Kill existing processes: `pkill -f "node\|streamlit"`

**Missing dependencies**
- Run `pip install -r requirements.txt`
- Run `npm install` in nasa-weather-app/

### Service Status Check

```bash
# Check running services
lsof -i :3000  # React app
lsof -i :3001  # Express API
lsof -i :8501  # Streamlit app
```

## 📝 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📞 Support

For issues and questions:
- Check troubleshooting section
- Review API documentation
- Open GitHub issue

## 🙏 Acknowledgments

- **NASA POWER API** for weather data
- **Google Gemini AI** for insights generation
- **React & Streamlit** for user interfaces
- **Chart.js** for visualizations

---

**Made with ❤️ and powered by NASA data 🛰️**
