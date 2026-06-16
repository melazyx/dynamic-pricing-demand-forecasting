from pathlib import Path

import joblib
import numpy as np
import pandas as pd

try:
    from tensorflow.keras.models import load_model
except Exception:
    from keras.models import load_model

from app.preprocessing import (
    load_model_config,
    get_feature_config,
    build_sequence_features,
    build_static_features,
)


class DemandForecastService:
    def __init__(self, artifact_dir: str = "artifacts"):
        self.artifact_dir = Path(artifact_dir)

        self.model_path = self.artifact_dir / "gru_delta_demand_model.keras"
        self.seq_scaler_path = self.artifact_dir / "seq_scaler.pkl"
        self.static_scaler_path = self.artifact_dir / "static_scaler.pkl"
        self.config_path = self.artifact_dir / "model_config.json"

        self.config = load_model_config(self.config_path)

        (
            self.time_series_features,
            self.static_features,
            self.sequence_length,
            self.forecast_horizon,
        ) = get_feature_config(self.config)

        self.model = load_model(self.model_path, compile=False)
        self.seq_scaler = joblib.load(self.seq_scaler_path)
        self.static_scaler = joblib.load(self.static_scaler_path)

    def predict(self, request_data: dict):
        sequence_array, history_df, last_input_log, historical_mean, last_month = build_sequence_features(
            request_data=request_data,
            time_series_features=self.time_series_features,
            sequence_length=self.sequence_length,
        )

        static_array = build_static_features(
            request_data=request_data,
            static_features=self.static_features,
        )

        # Scale sequence: dari bentuk (12, n_features) ke (1, 12, n_features)
        sequence_scaled = self.seq_scaler.transform(sequence_array)
        sequence_scaled = sequence_scaled.reshape(
            1,
            self.sequence_length,
            len(self.time_series_features),
        )

        # Scale static: bentuk (1, n_static_features)
        static_scaled = self.static_scaler.transform(static_array)

        # Model bisa saja single input atau multi-input.
        # Untuk arsitektur kamu kemungkinan besar multi-input: [sequence, static].
        if len(self.model.inputs) == 2:
            y_pred_delta = self.model.predict([sequence_scaled, static_scaled], verbose=0)
        else:
            y_pred_delta = self.model.predict(sequence_scaled, verbose=0)

        # Rapikan bentuk output menjadi array 12 horizon
        y_pred_delta = np.array(y_pred_delta).reshape(-1)

        if len(y_pred_delta) != self.forecast_horizon:
            y_pred_delta = y_pred_delta[: self.forecast_horizon]

        # Inference GRU Delta Demand
        y_pred_log = y_pred_delta + last_input_log
        y_pred_count = np.expm1(y_pred_log)

        # Demand tidak boleh negatif
        y_pred_count = np.clip(y_pred_count, 0, None)

        # Buat label bulan prediksi
        last_period = pd.Period(last_month, freq="M")
        forecast_months = [
            str(last_period + i)
            for i in range(1, self.forecast_horizon + 1)
        ]

        forecast = [
            {
                "month": month,
                "predicted_demand": round(float(value), 4),
            }
            for month, value in zip(forecast_months, y_pred_count)
        ]

        predicted_mean = float(np.mean(y_pred_count))

        return {
            "history_df": history_df,
            "forecast": forecast,
            "forecast_values": y_pred_count,
            "historical_mean_demand_12m": historical_mean,
            "predicted_mean_demand_12m": predicted_mean,
        }