import streamlit as st
import requests
import pandas as pd
import matplotlib.pyplot as plt
import numpy as np
from geopy.geocoders import Nominatim
import folium
from streamlit_folium import st_folium
import time

# ---------------- Gemini AI ----------------
import google.generativeai as genai
genai.configure(api_key="AIzaSyDA04TC4jRluq5pqsOni62ulDU8yFHF-uI")

def generate_gemini_insights(df, parameters, param_labels, param_units):
    """
    Generate natural language insights from NASA POWER data using Gemini.
    """
    try:
        # Prepare a simple summary of the data
        summary_text = ""
        for param in parameters.split(","):
            if param in df.columns:
                mean_val = df[param].mean()
                min_val = df[param].min()
                max_val = df[param].max()
                latest_val = df[param].iloc[-1]
                summary_text += (
                    f"{param_labels.get(param, param)}: mean={mean_val:.2f}{param_units.get(param,'')}, "
                    f"min={min_val:.2f}{param_units.get(param,'')}, "
                    f"max={max_val:.2f}{param_units.get(param,'')}, "
                    f"latest={latest_val:.2f}{param_units.get(param,'')}\n"
                )

        # Prompt for Gemini
        prompt = f"""
        Analyze this weather data and provide insights:
        {summary_text}
        Focus on trends and practical implications.
        """

        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(prompt)
        return response.text

    except Exception as e:
        raise Exception(f"Gemini API error: {str(e)}")

def create_animated_map(start_coords, end_coords, location_name=""):
    """Create a map with animated pin movement"""
    # Create map centered between start and end points
    center_lat = (start_coords[0] + end_coords[0]) / 2
    center_lon = (start_coords[1] + end_coords[1]) / 2
    
    m = folium.Map(location=[center_lat, center_lon], zoom_start=6)
    
    # Add custom CSS for pin animation
    animation_css = """
    <style>
    @keyframes movePin {
        0% { transform: translate(0, 0); }
        100% { transform: translate(""" + str((end_coords[1] - start_coords[1]) * 111320) + """px, """ + str((start_coords[0] - end_coords[0]) * 111320) + """px); }
    }
    .animated-pin {
        animation: movePin 2s ease-in-out forwards;
    }
    .pin-bounce {
        animation: bounce 0.5s ease-in-out 2s;
    }
    @keyframes bounce {
        0%, 20%, 60%, 100% { transform: translateY(0); }
        40% { transform: translateY(-10px); }
        80% { transform: translateY(-5px); }
    }
    </style>
    """
    
    # Add the CSS to the map
    m.get_root().html.add_child(folium.Element(animation_css))
    
    # Add animated marker
    folium.Marker(
        end_coords,
        popup=location_name or "Selected Location",
        icon=folium.Icon(color='red', icon='map-pin', prefix='fa')
    ).add_to(m)
    
    return m

# ---------------- NASA POWER Functions ----------------
def get_nasa_power_data(
    lat,
    lon,
    start,
    end,
    parameters="T2M,PRECTOT",
    community="AG",
    temporal="daily",
    as_dataframe=True,
):
    base_url = f"https://power.larc.nasa.gov/api/temporal/{temporal}/point"
    params = {
        "parameters": parameters,
        "community": community,
        "longitude": lon,
        "latitude": lat,
        "start": start,
        "end": end,
        "format": "JSON",
    }
    response = requests.get(base_url, params=params)
    data = response.json()
    if "messages" in data and data["messages"]:
        st.warning(f"⚠️ API returned message: {data['messages']}")
        return data
    if not as_dataframe:
        return data
    try:
        if "properties" in data and "parameter" in data["properties"]:
            param_data = data["properties"]["parameter"]
        elif "parameter" in data:
            param_data = data["parameter"]
        else:
            st.warning("⚠️ No parameter data found in response")
            return data

        rows = []
        dates = list(next(iter(param_data.values())).keys())
        for date in dates:
            row = {"Date": date}
            for param_name, param_values in param_data.items():
                row[param_name] = param_values[date]
            rows.append(row)
        df = pd.DataFrame(rows)
        df.replace(-999, np.nan, inplace=True)
        return df

    except Exception as e:
        st.error(f"Error converting to DataFrame: {e}")
        return data

def generate_forecast(df, column, forecast_days=7):
    from sklearn.linear_model import LinearRegression
    
    # Prepare data
    df_clean = df.dropna(subset=[column])
    if len(df_clean) < 3:
        return pd.DataFrame()
    
    # Use last 30 days or all available data if less
    recent_data = df_clean.tail(min(30, len(df_clean))).copy()
    recent_data['days'] = range(len(recent_data))
    
    # Fit linear regression
    X = recent_data[['days']]
    y = recent_data[column]
    model = LinearRegression().fit(X, y)
    
    # Generate forecast
    last_date = pd.to_datetime(df["Date"].iloc[-1], format='%Y%m%d')
    future_dates = [last_date + pd.Timedelta(days=i) for i in range(1, forecast_days + 1)]
    future_days = range(len(recent_data), len(recent_data) + forecast_days)
    forecast_values = model.predict([[day] for day in future_days])
    
    return pd.DataFrame({
        "Date": future_dates,
        column: forecast_values
    })

def plot_nasa_data(df, parameters=None, title="NASA POWER Data", param_units=None, param_labels=None, forecasts=None):
    if not isinstance(df, pd.DataFrame):
        st.warning("⚠️ No DataFrame to plot.")
        return
    if parameters is None:
        parameters = [col for col in df.columns if col != "Date"]
    df_plot = df.rename(columns=param_labels)
    df_plot["Date"] = pd.to_datetime(df_plot["Date"], format='%Y%m%d')
    plot_params_friendly = [param_labels.get(p, p) for p in parameters]

    fig, ax = plt.subplots(figsize=(12, 6))
    colors = plt.cm.tab10(np.linspace(0, 1, len(parameters)))
    
    for i, (param_code, param_name) in enumerate(zip(parameters, plot_params_friendly)):
        if param_name in df_plot.columns:
            unit = param_units.get(param_code, "")
            color = colors[i]
            
            # Plot historical data
            ax.plot(df_plot["Date"], df_plot[param_name], 
                   label=f"{param_name} ({unit})", color=color, linewidth=2)
            
            # Plot forecast
            if forecasts and param_code in forecasts and not forecasts[param_code].empty:
                forecast_df = forecasts[param_code]
                ax.plot(forecast_df["Date"], forecast_df[param_code], 
                       linestyle='--', color=color, linewidth=2, alpha=0.8,
                       label=f"{param_name} (Forecast)")
                
                # Add vertical line to separate historical and forecast
                last_date = df_plot["Date"].iloc[-1]
                ax.axvline(x=last_date, color='gray', linestyle=':', alpha=0.5)
    
    ax.set_xlabel("Date")
    ax.set_ylabel("Value")
    ax.set_title(title)
    plt.xticks(rotation=45)
    ax.legend()
    ax.grid(True, alpha=0.3)
    plt.tight_layout()
    st.pyplot(fig)

# ---------------- Streamlit App ----------------
st.title("NASA POWER Data Viewer + Gemini Insights")

st.sidebar.header("Query Parameters")
lat = None
lon = None

location_method = st.sidebar.radio("Location Input Method", ["Manual Lat/Lon", "Search by City", "Pin on Map"])

if location_method == "Manual Lat/Lon":
    lat = st.sidebar.number_input("Latitude", value=28.6)
    lon = st.sidebar.number_input("Longitude", value=77.2)
elif location_method == "Search by City":
    city = st.sidebar.text_input("Enter a city name", "New Delhi")
    if city:
        geolocator = Nominatim(user_agent="nasa-power-app")
        try:
            location = geolocator.geocode(city)
            if location:
                lat = location.latitude
                lon = location.longitude
                st.sidebar.success(f"Found location: {location.address}")
                st.sidebar.info(f"Latitude: {lat:.2f}, Longitude: {lon:.2f}")
            else:
                st.sidebar.warning("City not found.")
        except Exception as e:
            st.sidebar.error(f"Geocoding error: {e}")
else:  # Pin on Map
    if "marker" not in st.session_state:
        st.session_state["marker"] = [28.6, 77.2]  # Default location (New Delhi)
    if "location_name" not in st.session_state:
        st.session_state["location_name"] = "New Delhi, India"
    if "previous_marker" not in st.session_state:
        st.session_state["previous_marker"] = [28.6, 77.2]

    with st.sidebar:
        # Location search input
        search_location = st.text_input("🔍 Search location:", placeholder="Enter city or address")
        
        if search_location and st.button("📍 Go to Location", type="primary"):
            geolocator = Nominatim(user_agent="nasa-power-app")
            try:
                location = geolocator.geocode(search_location)
                if location:
                    # Store previous position for animation
                    st.session_state["previous_marker"] = st.session_state["marker"].copy()
                    
                    # Update to new position
                    st.session_state["marker"] = [location.latitude, location.longitude]
                    st.session_state["location_name"] = location.address
                    
                    # Show animation message
                    with st.spinner(f"Moving pin to {search_location}..."):
                        time.sleep(1)  # Brief pause for visual effect
                    
                    st.success(f"📍 Moved to: {location.address}")
                    st.rerun()
                else:
                    st.warning("❌ Location not found. Try a different search term.")
            except Exception as e:
                st.error(f"Search error: {e}")

        # Create map with current location
        m = folium.Map(location=st.session_state["marker"], zoom_start=10)
        
        # Add animated marker with custom styling
        folium.Marker(
            st.session_state["marker"], 
            popup=f"📍 {st.session_state['location_name']}",
            icon=folium.Icon(color='red', icon='map-pin', prefix='fa'),
            tooltip="Click and drag to move, or search above"
        ).add_to(m)
        
        # Add a circle to highlight the selected area
        folium.Circle(
            st.session_state["marker"],
            radius=5000,  # 5km radius
            color='red',
            fillColor='red',
            fillOpacity=0.1,
            weight=2,
            opacity=0.3
        ).add_to(m)
        
        # Display current location info
        st.info(f"📍 **Current Location:**\n{st.session_state['location_name']}")
        st.caption(f"Lat: {st.session_state['marker'][0]:.4f}, Lon: {st.session_state['marker'][1]:.4f}")
        
        lat = st.session_state["marker"][0]
        lon = st.session_state["marker"][1]
        
        st.markdown("---")
        st.caption("💡 **Tip:** Click on the map or use search above")
        
        # Display the map
        map_data = st_folium(m, width=400, height=400, key="folium_map")
        
        # Handle map clicks
        if map_data["last_clicked"]:
            new_coords = [map_data["last_clicked"]["lat"], map_data["last_clicked"]["lng"]]
            
            # Only update if coordinates actually changed
            if new_coords != st.session_state["marker"]:
                st.session_state["previous_marker"] = st.session_state["marker"].copy()
                st.session_state["marker"] = new_coords
                
                # Get location name for clicked coordinates
                geolocator = Nominatim(user_agent="nasa-power-app")
                try:
                    location = geolocator.reverse(new_coords)
                    st.session_state["location_name"] = location.address if location else f"Coordinates: {new_coords[0]:.3f}, {new_coords[1]:.3f}"
                except:
                    st.session_state["location_name"] = f"Lat: {new_coords[0]:.3f}, Lon: {new_coords[1]:.3f}"
                
                st.rerun()

temporal = st.sidebar.selectbox("Temporal", ["daily", "monthly"], key="temporal_select")
if temporal == "daily":
    start = st.sidebar.date_input("Start Date")
    end = st.sidebar.date_input("End Date")
else:
    start = st.sidebar.text_input("Start Date (YYYYMM)", "202401")
    end = st.sidebar.text_input("End Date (YYYYMM)", "202401")

param_options = {
    "Air temperature at 2 meters": "T2M",
    "Corrected total precipitation": "PRECTOTCORR",
    "Wind speed at 2 meters": "WS2M",
    "Relative Humidity (2m)": "RH2M",
    "Snow Depth": "SNODP"
}
param_units = {
    "T2M": "°C",
    "PRECTOTCORR": "mm/day",
    "WS2M": "m/s",
    "RH2M": "%",
    "SNODP": "m"
}
selected_params_names = st.sidebar.multiselect(
    "Select weather variables",
    options=list(param_options.keys()),
    default=list(param_options.keys())[:3]
)
parameters = ",".join([param_options[p] for p in selected_params_names])

if st.sidebar.button("Get Data"):
    if lat is None or lon is None:
        st.warning("⚠️ Please provide a valid location.")
        st.stop()
    st.header("NASA POWER Data")

    if temporal == "daily":
        start_str = start.strftime("%Y%m%d")
        end_str = end.strftime("%Y%m%d")
    else:
        start_str = start
        end_str = end
        if not (len(start_str) == 6 and start_str.isdigit() and len(end_str) == 6 and end_str.isdigit()):
            st.warning("⚠️ For monthly data, please use YYYYMM format (e.g., 202401)")
            st.stop()
    
    df = get_nasa_power_data(lat=lat, lon=lon, start=start_str, end=end_str, parameters=parameters, temporal=temporal)
    
    if isinstance(df, pd.DataFrame):
        st.dataframe(df)
        param_labels = {v: k for k, v in param_options.items()}

        st.header("Summary Statistics")
        for param_code in parameters.split(","):
            if param_code in df.columns:
                param_name = param_labels.get(param_code, param_code)
                param_unit = param_units.get(param_code, "")
                st.subheader(f"{param_name}")
                mean_val = df[param_code].mean()
                min_val = df[param_code].min()
                max_val = df[param_code].max()
                col1, col2, col3 = st.columns(3)
                col1.metric("Mean", f"{mean_val:.2f} {param_unit}")
                col2.metric("Min", f"{min_val:.2f} {param_unit}")
                col3.metric("Max", f"{max_val:.2f} {param_unit}")

        st.header("Data Visualization")
        forecasts = {param: generate_forecast(df, param) for param in parameters.split(",") if param in df.columns}
        plot_nasa_data(df, parameters=parameters.split(","), title=f"{temporal.capitalize()} Weather Data", param_units=param_units, param_labels=param_labels, forecasts=forecasts)

        # ---------------- Gemini AI Insights ----------------
        st.header("Gemini AI Insights")
        try:
            insights = generate_gemini_insights(df, parameters, param_labels, param_units)
            st.write(insights)
        except Exception as e:
            error_msg = str(e)
            if "quota" in error_msg.lower() or "429" in error_msg:
                st.warning("🧠 Gemini API quota exceeded. Please try again later.")
            else:
                st.error("🧠 Could not load AI insights. Is the server running?")
            
            st.info("💡 **Manual Analysis Tips:**")
            for param in parameters.split(","):
                if param in df.columns:
                    param_name = param_labels.get(param, param)
                    mean_val = df[param].mean()
                    latest_val = df[param].iloc[-1]
                    trend = "↗️ Rising" if latest_val > mean_val else "↘️ Falling" if latest_val < mean_val else "➡️ Stable"
                    st.write(f"- **{param_name}**: {trend} (Current: {latest_val:.1f}, Average: {mean_val:.1f})")
