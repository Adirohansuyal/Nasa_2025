import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';

const Chatbot = ({ weatherData, insights }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { type: 'bot', text: '🤖 Hi! I\'m your NASA Weather Assistant powered by Gemini AI. Ask me anything about your weather data!' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    // Initialize speech recognition with simpler config
    if ('webkitSpeechRecognition' in window) {
      const recognition = new window.webkitSpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        console.log('Speech recognition started');
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        setInput(finalTranscript + interimTranscript);
      };

      recognition.onend = () => {
        console.log('Speech recognition ended');
        setIsListening(false);
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          alert('Please allow microphone access in your browser settings');
        } else if (event.error === 'no-speech') {
          alert('No speech detected. Please try again.');
        }
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const startListening = async () => {
    if (!recognitionRef.current) {
      alert('Speech recognition not supported in this browser');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      return;
    }

    try {
      // Request microphone permission first
      await navigator.mediaDevices.getUserMedia({ audio: true });
      recognitionRef.current.start();
    } catch (error) {
      console.error('Microphone access error:', error);
      alert('Please allow microphone access to use voice input');
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  const speakText = (text) => {
    if ('speechSynthesis' in window) {
      // Stop any ongoing speech
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 0.8;
      
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      
      window.speechSynthesis.speak(utterance);
    }
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const generateSmartFallback = (question) => {
    const q = question.toLowerCase();
    const { data, parameters, forecasts, location } = weatherData;
    
    // Outdoor activity questions
    if (q.includes('outside') || q.includes('go out') || q.includes('outdoor') || q.includes('should i')) {
      const latest = data[data.length - 1];
      let advice = "🌤️ Outdoor Conditions Assessment:\n\n";
      
      if (latest.T2M !== null) {
        const temp = latest.T2M;
        advice += `🌡️ Temperature: ${temp.toFixed(1)}°C - `;
        if (temp > 30) advice += "Hot! Stay hydrated and seek shade.\n";
        else if (temp > 20) advice += "Pleasant for outdoor activities.\n";
        else if (temp > 10) advice += "Cool, consider a light jacket.\n";
        else advice += "Cold, dress warmly.\n";
      }
      
      if (latest.PRECTOTCORR !== null) {
        const precip = latest.PRECTOTCORR;
        advice += `🌧️ Precipitation: ${precip.toFixed(1)}mm - `;
        if (precip > 5) advice += "Rainy, bring an umbrella!\n";
        else if (precip > 0.1) advice += "Light rain possible.\n";
        else advice += "No rain expected.\n";
      }
      
      if (latest.WS2M !== null) {
        const wind = latest.WS2M;
        advice += `💨 Wind: ${wind.toFixed(1)} m/s - `;
        if (wind > 10) advice += "Very windy, secure loose items.\n";
        else if (wind > 5) advice += "Breezy conditions.\n";
        else advice += "Calm winds.\n";
      }
      
      // Overall recommendation
      const temp = latest.T2M || 20;
      const precip = latest.PRECTOTCORR || 0;
      const wind = latest.WS2M || 3;
      
      if (precip > 5) advice += "\n🏠 Recommendation: Stay indoors due to rain.";
      else if (temp < 5 || temp > 35) advice += "\n⚠️ Recommendation: Extreme temperature, limit outdoor time.";
      else if (wind > 15) advice += "\n💨 Recommendation: Very windy, be cautious outdoors.";
      else advice += "\n✅ Recommendation: Good conditions for outdoor activities!";
      
      return advice;
    }

    // Temperature questions
    if (q.includes('temperature') || q.includes('temp') || q.includes('hot') || q.includes('cold')) {
      const tempData = data.map(d => d.T2M).filter(t => t !== null);
      if (tempData.length > 0) {
        const avg = (tempData.reduce((sum, t) => sum + t, 0) / tempData.length).toFixed(1);
        const max = Math.max(...tempData).toFixed(1);
        const min = Math.min(...tempData).toFixed(1);
        const latest = tempData[tempData.length - 1].toFixed(1);
        return `🌡️ Temperature Analysis:\n• Current: ${latest}°C\n• Average: ${avg}°C\n• Range: ${min}°C to ${max}°C\n\nThe location shows ${avg > 25 ? 'warm' : avg > 15 ? 'moderate' : 'cool'} temperatures overall.`;
      }
    }

    // Precipitation questions
    if (q.includes('rain') || q.includes('precipitation') || q.includes('wet') || q.includes('dry')) {
      const precipData = data.map(d => d.PRECTOTCORR).filter(p => p !== null);
      if (precipData.length > 0) {
        const total = precipData.reduce((sum, p) => sum + p, 0).toFixed(1);
        const avg = (total / precipData.length).toFixed(2);
        const rainyDays = precipData.filter(p => p > 0.1).length;
        const latest = precipData[precipData.length - 1].toFixed(2);
        return `🌧️ Precipitation Analysis:\n• Latest: ${latest}mm\n• Total: ${total}mm\n• Daily average: ${avg}mm\n• Rainy days: ${rainyDays}\n\nThis location is ${rainyDays > data.length * 0.3 ? 'quite wet' : 'relatively dry'}.`;
      }
    }

    // Forecast questions
    if (q.includes('forecast') || q.includes('predict') || q.includes('future') || q.includes('tomorrow')) {
      if (forecasts && Object.keys(forecasts).length > 0) {
        let response = '🔮 ML Forecast Summary:\n';
        Object.entries(forecasts).forEach(([param, forecast]) => {
          if (forecast && forecast.length > 0) {
            const nextValue = forecast[0][param].toFixed(1);
            const confidence = (forecast[0].confidence * 100).toFixed(0);
            const paramName = param === 'T2M' ? 'Temperature' : param === 'PRECTOTCORR' ? 'Precipitation' : param;
            response += `• ${paramName}: ${nextValue} (${confidence}% confidence)\n`;
          }
        });
        return response;
      }
      return "No forecast data available. The ML model needs more data to make predictions! 🤖";
    }

    // Wind questions
    if (q.includes('wind') || q.includes('windy') || q.includes('breeze')) {
      const windData = data.map(d => d.WS2M).filter(w => w !== null);
      if (windData.length > 0) {
        const avg = (windData.reduce((sum, w) => sum + w, 0) / windData.length).toFixed(1);
        const max = Math.max(...windData).toFixed(1);
        const latest = windData[windData.length - 1].toFixed(1);
        return `💨 Wind Analysis:\n• Current: ${latest} m/s\n• Average: ${avg} m/s\n• Maximum: ${max} m/s\n\nWind conditions are ${avg > 5 ? 'breezy' : avg > 2 ? 'light' : 'calm'}.`;
      }
    }

    // Trend questions
    if (q.includes('trend') || q.includes('changing') || q.includes('pattern')) {
      const tempData = data.map(d => d.T2M).filter(t => t !== null);
      if (tempData.length > 7) {
        const recent = tempData.slice(-7).reduce((sum, t) => sum + t, 0) / 7;
        const earlier = tempData.slice(0, 7).reduce((sum, t) => sum + t, 0) / 7;
        const trend = recent > earlier ? 'increasing' : recent < earlier ? 'decreasing' : 'stable';
        const change = Math.abs(recent - earlier).toFixed(1);
        return `📈 Trend Analysis:\nTemperature is ${trend} over the data period (${change}°C change).\n\n${insights ? 'AI Insights: ' + insights.slice(0, 200) + '...' : 'Run AI analysis for more detailed insights!'}`;
      }
    }

    // General questions
    if (q.includes('summary') || q.includes('overview') || q.includes('tell me')) {
      const paramCount = parameters.length;
      const dataPoints = data.length;
      return `📊 Data Overview:\n• Location: ${location.lat}°, ${location.lon}°\n• Parameters: ${paramCount} weather variables\n• Data points: ${dataPoints} days\n• ML forecasts: ${forecasts ? 'Available' : 'Not available'}\n\nAsk me about temperature, rain, wind, or forecasts!`;
    }

    return `🤖 I understand you're asking about "${question}". I can help with:\n• Outdoor activity advice ("Should I go outside?")\n• Temperature analysis\n• Precipitation data\n• Wind conditions\n• Weather forecasts\n• Trend analysis\n\nNote: Gemini AI quota exceeded, using smart fallback responses.`;
  };

  const generateGeminiResponse = async (question) => {
    if (!weatherData || !weatherData.data) {
      return "I need weather data to answer your questions. Please fetch some data first! 🛰️";
    }

    try {
      // Prepare context for Gemini
      const context = {
        location: weatherData.location,
        parameters: weatherData.parameters,
        dataPoints: weatherData.data.length,
        weatherData: weatherData.data.slice(-10),
        forecasts: weatherData.forecasts,
        insights: insights || "No AI insights available",
        statistics: {}
      };

      // Calculate basic statistics for context
      weatherData.parameters.forEach(param => {
        const values = weatherData.data.map(d => d[param]).filter(v => v !== null && !isNaN(v));
        if (values.length > 0) {
          context.statistics[param] = {
            average: (values.reduce((sum, v) => sum + v, 0) / values.length).toFixed(2),
            min: Math.min(...values).toFixed(2),
            max: Math.max(...values).toFixed(2),
            latest: values[values.length - 1]?.toFixed(2)
          };
        }
      });

      const response = await axios.post('http://localhost:3001/api/chat', {
        question: question,
        context: context
      }, { timeout: 10000 });

      return response.data.response || "I received an empty response. Please try rephrasing your question! 🤖";

    } catch (error) {
      console.error('Gemini API error:', error);
      
      // Use smart fallback instead of basic error message
      return generateSmartFallback(question);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { type: 'user', text: input };
    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    setIsTyping(true);

    try {
      const response = await generateGeminiResponse(currentInput);
      const botMessage = { type: 'bot', text: response };
      setMessages(prev => [...prev, botMessage]);
      
      // Auto-speak bot response if speech synthesis is available
      if ('speechSynthesis' in window && response.length < 500) {
        speakText(response);
      }
    } catch (error) {
      const errorMessage = { 
        type: 'bot', 
        text: "Sorry, I encountered an error processing your question. Please try again! 🤖" 
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  return (
    <>
      {/* Chat Toggle Button */}
      <div 
        className={`chat-toggle ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? '✕' : '🤖'}
      </div>

      {/* Chat Window */}
      <div className={`chatbot-container ${isOpen ? 'open' : ''}`}>
        <div className="chat-header">
          <span>🛰️ NASA Weather Assistant</span>
        </div>
        
        <div className="chat-messages">
          {messages.map((message, index) => (
            <div key={index} className={`message ${message.type}`}>
              <div className="message-content">
                {message.text.split('\n').map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
                {message.type === 'bot' && 'speechSynthesis' in window && (
                  <button
                    onClick={() => speakText(message.text)}
                    className="speak-button"
                    title="Read aloud"
                  >
                    🔊
                  </button>
                )}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="message bot">
              <div className="message-content typing">
                🤖 Analyzing data...
              </div>
            </div>
          )}
          {isListening && (
            <div className="message user">
              <div className="message-content listening">
                🎤 Listening...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about your weather data..."
          />
          <button
            onClick={startListening}
            className={`voice-button ${isListening ? 'listening' : ''}`}
            title={isListening ? 'Listening... Speak now!' : 'Click to start voice input'}
            disabled={!('webkitSpeechRecognition' in window)}
          >
            {isListening ? '🔴' : '🎤'}
          </button>
          <button onClick={handleSend}>🚀</button>
          {isSpeaking && (
            <button
              onClick={stopSpeaking}
              className="voice-button speaking"
              title="Stop speaking"
            >
              🔇
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default Chatbot;
