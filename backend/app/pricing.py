import numpy as np


def make_dynamic_pricing_recommendation(
    base_price: float,
    historical_mean_demand_12m: float,
    predicted_mean_demand_12m: float,
):
    if historical_mean_demand_12m <= 0:
        if predicted_mean_demand_12m > 0:
            demand_change_pct = 1.0
        else:
            demand_change_pct = 0.0
    else:
        demand_change_pct = (
            predicted_mean_demand_12m - historical_mean_demand_12m
        ) / historical_mean_demand_12m

    if demand_change_pct >= 0.20:
        pricing_decision = "Naikkan Harga"
    elif demand_change_pct <= -0.20:
        pricing_decision = "Turunkan Harga"
    else:
        pricing_decision = "Pertahankan Harga"

    if pricing_decision == "Pertahankan Harga":
        price_adjustment_pct = 0.0
        recommended_price = base_price
    else:
        price_adjustment_pct = demand_change_pct * 0.25
        price_adjustment_pct = float(np.clip(price_adjustment_pct, -0.15, 0.15))
        recommended_price = base_price * (1 + price_adjustment_pct)

    return {
        "base_price": round(float(base_price), 2),
        "recommended_price": round(float(recommended_price), 2),
        "historical_mean_demand_12m": round(float(historical_mean_demand_12m), 4),
        "predicted_mean_demand_12m": round(float(predicted_mean_demand_12m), 4),
        "demand_change_pct": round(float(demand_change_pct), 4),
        "price_adjustment_pct": round(float(price_adjustment_pct), 4),
        "pricing_decision": pricing_decision,
    }