import streamlit as st
import requests
import pandas as pd
import matplotlib.pyplot as plt
import numpy as np
from geopy.geocoders import Nominatim
import folium
from streamlit_folium import st_folium

# ---------------- Gemini AI ----------------
import google.generativeai as genai
genai.configure(api_key="AIzaSyCPfjKP6TS69xBRvBJyqUYv50q1H4iu4FI")

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
        You are a climate expert. Analyze this weather dataset summary and provide easy-to-understand insights:
        {summary_text}
        Include trends, extremes, and practical implications for outdoor activities.
        """

        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(prompt)
        return response.text

    except Exception as e:
        return f"⚠️ Gemini error: {e}"

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

def generate_forecast(df, column, window_size=3, forecast_days=3):
    moving_avg = df[column].rolling(window=window_size).mean()
    last_ma_value = moving_avg.iloc[-1]
    last_date = pd.to_datetime(df["Date"].iloc[-1], format='%Y%m%d')
    future_dates = [last_date + pd.Timedelta(days=i) for i in range(1, forecast_days + 1)]
    forecast_df = pd.DataFrame({
        "Date": future_dates,
        column: [last_ma_value] * forecast_days
    })
    return forecast_df

def plot_nasa_data(df, parameters=None, title="NASA POWER Data", param_units=None, param_labels=None, forecasts=None):
    if not isinstance(df, pd.DataFrame):
        st.warning("⚠️ No DataFrame to plot.")
        return
    if parameters is None:
        parameters = [col for col in df.columns if col != "Date"]
    df_plot = df.rename(columns=param_labels)
    df_plot["Date"] = pd.to_datetime(df_plot["Date"], format='%Y%m%d')
    plot_params_friendly = [param_labels.get(p, p) for p in parameters]

    fig, ax = plt.subplots(figsize=(10, 5))
    for param_code, param_name in zip(parameters, plot_params_friendly):
        if param_name in df_plot.columns:
            unit = param_units.get(param_code, "")
            ax.plot(df_plot["Date"], df_plot[param_name], label=f"{param_name} ({unit})")
            if forecasts and param_code in forecasts:
                forecast_df = forecasts[param_code]
                ax.plot(forecast_df["Date"], forecast_df[param_code], linestyle='--', label=f"{param_name} (Forecast)")
    ax.set_xlabel("Date")
    ax.set_ylabel("Value")
    ax.set_title(title)
    plt.xticks(rotation=45)
    ax.legend()
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
        st.session_state["marker"] = None
    if "location_name" not in st.session_state:
        st.session_state["location_name"] = ""

    with st.sidebar:
        m = folium.Map(location=[28.6, 77.2], zoom_start=4)
        if st.session_state["marker"]:
            folium.Marker(st.session_state["marker"], popup=st.session_state["location_name"]).add_to(m)
            lat = st.session_state["marker"][0]
            lon = st.session_state["marker"][1]
            st.write(f"Selected: {st.session_state['location_name']}")
        st.info("Click on the map to select a location.")
        map_data = st_folium(m, width=400, height=400, key="folium_map")
        if map_data["last_clicked"]:
            st.session_state["marker"] = [map_data["last_clicked"]["lat"], map_data["last_clicked"]["lng"]]
            geolocator = Nominatim(user_agent="nasa-power-app")
            location = geolocator.reverse(st.session_state["marker"])
            st.session_state["location_name"] = location.address if location else "Unknown location"
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
        insights = generate_gemini_insights(df, parameters, param_labels, param_units)
        st.write(insights)
