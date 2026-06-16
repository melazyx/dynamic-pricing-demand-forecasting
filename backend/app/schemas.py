from pydantic import BaseModel, Field
from typing import List


class HistoryItem(BaseModel):
    month: str = Field(..., example="2025-01")
    monthly_review_count: float = Field(..., ge=0, example=3)
    monthly_avg_rating: float = Field(..., ge=0, le=5, example=4.5)


class PredictRequest(BaseModel):
    parent_asin: str = Field(..., example="B07GSH4FW5")
    title: str = Field(..., example="Back From Bali Womens Pants")
    price: float = Field(..., gt=0, example=42.95)
    average_rating: float = Field(..., ge=0, le=5, example=4.4)
    rating_number: float = Field(..., ge=0, example=120)
    history: List[HistoryItem]


class ForecastItem(BaseModel):
    month: str
    predicted_demand: float


class PricingResult(BaseModel):
    base_price: float
    recommended_price: float
    historical_mean_demand_12m: float
    predicted_mean_demand_12m: float
    demand_change_pct: float
    price_adjustment_pct: float
    pricing_decision: str