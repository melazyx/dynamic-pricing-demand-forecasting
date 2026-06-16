import json
from pathlib import Path

import numpy as np
import pandas as pd


DEFAULT_TIME_SERIES_FEATURES = [
    "monthly_review_count_log",
    "monthly_avg_rating",
    "lag_1",
    "lag_2",
    "lag_3",
    "lag_6",
    "lag_12",
    "rolling_mean_3",
    "rolling_mean_6",
    "rolling_mean_12",
    "rolling_std_3",
    "rolling_std_6",
    "rolling_std_12",
    "diff_1",
    "diff_3",
    "diff_6",
    "rolling_mean_3_vs_12",
    "is_active",
    "cumulative_review",
    "product_age_month",
    "month_sin",
    "month_cos",
]

DEFAULT_STATIC_FEATURES = [
    "price",
    "average_rating",
    "rating_number",
]

FEATURE_BASE_COL = "monthly_review_count_log"


def load_model_config(config_path: Path) -> dict:
    if not config_path.exists():
        return {}

    with open(config_path, "r", encoding="utf-8") as file:
        return json.load(file)


def get_feature_config(config: dict):
    """
    Fungsi ini fleksibel terhadap nama key config.
    Kalau model_config.json kamu memakai nama key berbeda,
    fallback tetap memakai daftar fitur default.
    """
    time_series_features = (
        config.get("time_series_features")
        or config.get("seq_features")
        or config.get("sequence_features")
        or DEFAULT_TIME_SERIES_FEATURES
    )

    static_features = (
        config.get("static_features")
        or DEFAULT_STATIC_FEATURES
    )

    sequence_length = int(config.get("sequence_length", 12))
    forecast_horizon = int(config.get("forecast_horizon", 12))

    return time_series_features, static_features, sequence_length, forecast_horizon


def parse_month(value: str):
    value = str(value)

    if len(value) == 7:
        return pd.to_datetime(value + "-01")

    return pd.to_datetime(value)


def build_sequence_features(request_data: dict, time_series_features: list, sequence_length: int = 12):
    history = request_data["history"]

    if len(history) != sequence_length:
        raise ValueError(f"History harus berisi tepat {sequence_length} bulan.")

    df = pd.DataFrame(history)
    df["month"] = df["month"].apply(parse_month)
    df = df.sort_values("month").reset_index(drop=True)

    df["monthly_review_count"] = pd.to_numeric(df["monthly_review_count"], errors="coerce").fillna(0)
    df["monthly_avg_rating"] = pd.to_numeric(df["monthly_avg_rating"], errors="coerce").fillna(0)

    # Demand log sesuai target training
    df["monthly_review_count_log"] = np.log1p(df["monthly_review_count"])

    base = df[FEATURE_BASE_COL]

    # Lag features
    for lag in [1, 2, 3, 6, 12]:
        df[f"lag_{lag}"] = base.shift(lag)

    # Rolling mean
    for window in [3, 6, 12]:
        df[f"rolling_mean_{window}"] = base.rolling(window=window, min_periods=1).mean()

    # Rolling std
    for window in [3, 6, 12]:
        df[f"rolling_std_{window}"] = base.rolling(window=window, min_periods=1).std()

    # Difference features
    for diff in [1, 3, 6]:
        df[f"diff_{diff}"] = base.diff(diff)

    # Ratio rolling 3 vs 12
    eps = 1e-8
    df["rolling_mean_3_vs_12"] = df["rolling_mean_3"] / (df["rolling_mean_12"] + eps)

    # Activity feature
    df["is_active"] = (df["monthly_review_count"] > 0).astype(int)

    # Cumulative review dari raw count
    df["cumulative_review"] = df["monthly_review_count"].cumsum()

    # Umur produk dalam window input
    df["product_age_month"] = np.arange(1, len(df) + 1)

    # Month cyclic encoding
    month_num = df["month"].dt.month
    df["month_sin"] = np.sin(2 * np.pi * month_num / 12)
    df["month_cos"] = np.cos(2 * np.pi * month_num / 12)

    # Bersihkan NaN/inf
    df = df.replace([np.inf, -np.inf], 0).fillna(0)

    # Pastikan semua fitur tersedia
    missing_features = [col for col in time_series_features if col not in df.columns]
    if missing_features:
        raise ValueError(f"Fitur berikut belum tersedia dari preprocessing: {missing_features}")

    sequence_array = df[time_series_features].values.astype("float32")

    last_input_log = float(df["monthly_review_count_log"].iloc[-1])
    historical_mean_demand_12m = float(df["monthly_review_count"].mean())
    last_month = df["month"].iloc[-1]

    return sequence_array, df, last_input_log, historical_mean_demand_12m, last_month


def build_static_features(request_data: dict, static_features: list):
    static_data = {
        "price": request_data["price"],
        "average_rating": request_data["average_rating"],
        "rating_number": request_data["rating_number"],
    }

    missing_features = [col for col in static_features if col not in static_data]
    if missing_features:
        raise ValueError(f"Fitur statis berikut belum tersedia: {missing_features}")

    static_array = np.array([[static_data[col] for col in static_features]], dtype="float32")

    return static_array