import requests
import pandas as pd
import matplotlib.pyplot as plt

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
    """
    Fetch data from NASA POWER API.
    """
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

    # Handle API errors
    if "messages" in data and data["messages"]:
        print("⚠️ API returned message:", data["messages"])
        return data

    if not as_dataframe:
        return data

    try:
        # Check if we have parameter data in properties
        if "properties" in data and "parameter" in data["properties"]:
            param_data = data["properties"]["parameter"]
            
            # Create a list to store rows
            rows = []
            dates = list(next(iter(param_data.values())).keys())  # Get dates from first parameter
            
            for date in dates:
                row = {"Date": date}
                for param_name, param_values in param_data.items():
                    row[param_name] = param_values[date]
                rows.append(row)
            
            df = pd.DataFrame(rows)
            return df
        
        # Check if we have parameter data directly
        elif "parameter" in data:
            param_data = data["parameter"]
            
            # Create a list to store rows
            rows = []
            dates = list(next(iter(param_data.values())).keys())  # Get dates from first parameter
            
            for date in dates:
                row = {"Date": date}
                for param_name, param_values in param_data.items():
                    row[param_name] = param_values[date]
                rows.append(row)
            
            df = pd.DataFrame(rows)
            return df
        
        else:
            print("⚠️ No parameter data found in response")
            return data

    except Exception as e:
        print("Error converting to DataFrame:", e)
        return data


def plot_nasa_data(df, parameters=None, title="NASA POWER Data"):
    """Plot selected parameters from the DataFrame."""
    if not isinstance(df, pd.DataFrame):
        print("⚠️ No DataFrame to plot.")
        return

    if parameters is None:
        parameters = [col for col in df.columns if col != "Date"]

    plt.figure(figsize=(10, 5))
    for param in parameters:
        if param in df.columns:
            plt.plot(df["Date"], df[param], label=param)

    plt.xlabel("Date")
    plt.ylabel("Value")
    plt.title(title)
    plt.xticks(rotation=45)
    plt.legend()
    plt.tight_layout()
    plt.show()


# -----------------------------
# Example usage
# -----------------------------
if __name__ == "__main__":
    # ✅ Daily Data
    df_daily = get_nasa_power_data(
        lat=28.6, lon=77.2,
        start="20240101", end="20240107",
        parameters="T2M,PRECTOTCORR,WS2M",
        temporal="daily"
    )
    print("\nDaily Data Sample:")
    if isinstance(df_daily, pd.DataFrame):
        print(df_daily.head())
        df_daily.to_csv("nasa_daily.csv", index=False)
        print("✅ Saved daily data to nasa_daily.csv")
        plot_nasa_data(df_daily, parameters=["T2M", "PRECTOTCORR"], title="Daily Weather (New Delhi)")

    # ✅ Monthly Data - Currently has date format issues
    # df_monthly = get_nasa_power_data(
    #     lat=28.6, lon=77.2,
    #     start="202301", end="202312",
    #     parameters="T2M",
    #     temporal="monthly"
    # )
    # print("\nMonthly Data Sample:")
    # if isinstance(df_monthly, pd.DataFrame):
    #     print(df_monthly.head())
    #     df_monthly.to_csv("nasa_monthly.csv", index=False)
    #     print("✅ Saved monthly data to nasa_monthly.csv")
    #     plot_nasa_data(df_monthly, parameters=["T2M"], title="Monthly Weather (New Delhi)")
