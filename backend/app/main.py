from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.schemas import PredictRequest
from app.inference import DemandForecastService
from app.pricing import make_dynamic_pricing_recommendation


app = FastAPI(
    title="Dynamic Pricing Demand Forecasting API",
    description="API demo untuk prediksi demand 12 bulan dan rekomendasi harga dinamis.",
    version="1.0.0",
)

# Izinkan frontend React mengakses backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

forecast_service = DemandForecastService(artifact_dir="artifacts")


@app.get("/")
def root():
    return {
        "message": "Dynamic Pricing ML API is running",
        "endpoint": "POST /predict",
    }


@app.post("/predict")
def predict(request: PredictRequest):
    try:
        request_data = request.model_dump() if hasattr(request, "model_dump") else request.dict()

        prediction_result = forecast_service.predict(request_data)

        pricing_result = make_dynamic_pricing_recommendation(
            base_price=request_data["price"],
            historical_mean_demand_12m=prediction_result["historical_mean_demand_12m"],
            predicted_mean_demand_12m=prediction_result["predicted_mean_demand_12m"],
        )

        history = [
            {
                "month": str(row["month"])[:7],
                "monthly_review_count": float(row["monthly_review_count"]),
                "monthly_avg_rating": float(row["monthly_avg_rating"]),
            }
            for _, row in prediction_result["history_df"].iterrows()
        ]

        return {
            "product": {
                "parent_asin": request_data["parent_asin"],
                "title": request_data["title"],
                "price": request_data["price"],
                "average_rating": request_data["average_rating"],
                "rating_number": request_data["rating_number"],
            },
            "history": history,
            "forecast": prediction_result["forecast"],
            "pricing": pricing_result,
            "model_info": {
                "model_name": "GRU Delta Demand 12 Bulan - Filtered Dataset",
                "target": "future_delta = future_log_demand - last_input_log_demand",
                "forecast_horizon": 12,
            },
        }

    except Exception as error:
        raise HTTPException(status_code=400, detail=str(error))