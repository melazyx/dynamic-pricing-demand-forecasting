import { useState } from "react";
import axios from "axios";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

import "./App.css";

function App() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const [formData, setFormData] = useState({
    parent_asin: "B07GSH4FW5",
    title: "Back From Bali Womens Pants",
    price: 42.95,
    average_rating: 4.4,
    rating_number: 120,
  });

  const [history, setHistory] = useState([
    { month: "2025-01", monthly_review_count: 2, monthly_avg_rating: 4.4 },
    { month: "2025-02", monthly_review_count: 3, monthly_avg_rating: 4.5 },
    { month: "2025-03", monthly_review_count: 2, monthly_avg_rating: 4.4 },
    { month: "2025-04", monthly_review_count: 4, monthly_avg_rating: 4.6 },
    { month: "2025-05", monthly_review_count: 3, monthly_avg_rating: 4.5 },
    { month: "2025-06", monthly_review_count: 5, monthly_avg_rating: 4.6 },
    { month: "2025-07", monthly_review_count: 2, monthly_avg_rating: 4.4 },
    { month: "2025-08", monthly_review_count: 3, monthly_avg_rating: 4.5 },
    { month: "2025-09", monthly_review_count: 4, monthly_avg_rating: 4.6 },
    { month: "2025-10", monthly_review_count: 3, monthly_avg_rating: 4.5 },
    { month: "2025-11", monthly_review_count: 2, monthly_avg_rating: 4.4 },
    { month: "2025-12", monthly_review_count: 5, monthly_avg_rating: 4.7 },
  ]);

  const handleProductChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]:
        e.target.type === "number"
          ? Number(e.target.value)
          : e.target.value,
    });
  };

  const handleHistoryChange = (index, field, value) => {
    const updated = [...history];
    updated[index][field] = value;
    setHistory(updated);
  };

  const handlePredict = async () => {
    try {
      setLoading(true);

      const payload = {
        ...formData,
        history,
      };

      const response = await axios.post(
        "http://127.0.0.1:8000/predict",
        payload
      );

      setResult(response.data);
    } catch (error) {
      console.error(error);
      alert("Gagal melakukan prediksi");
    } finally {
      setLoading(false);
    }
  };

  const chartData = result
    ? [
        ...result.history.map((item) => ({
          month: item.month,
          historical: item.monthly_review_count,
        })),
        ...result.forecast.map((item) => ({
          month: item.month,
          predicted: item.predicted_demand,
        })),
      ]
    : [];

  return (
    <div className="container">
      <div className="hero">
        <h1>Dynamic Pricing Demand Forecasting</h1>

        <p>
          Prediksi Demand 12 Bulan dan Rekomendasi Dynamic Pricing
          menggunakan GRU Delta Demand
        </p>

        {result && (
          <p style={{ marginTop: "15px" }}>
            <strong>
              {result.model_info.model_name}
            </strong>
          </p>
        )}
      </div>

      <div className="grid-2">
        <div className="card">
          <h2 className="section-title">Input Produk</h2>

          <div className="input-group">
            <label>Parent ASIN</label>
            <input
              name="parent_asin"
              value={formData.parent_asin}
              onChange={handleProductChange}
            />
          </div>

          <div className="input-group">
            <label>Title</label>
            <input
              name="title"
              value={formData.title}
              onChange={handleProductChange}
            />
          </div>

          <div className="input-group">
            <label>Price ($)</label>
            <input
              type="number"
              name="price"
              value={formData.price}
              onChange={handleProductChange}
            />
          </div>

          <div className="input-group">
            <label>Average Rating</label>
            <input
              type="number"
              step="0.1"
              name="average_rating"
              value={formData.average_rating}
              onChange={handleProductChange}
            />
          </div>

          <div className="input-group">
            <label>Rating Number</label>
            <input
              type="number"
              name="rating_number"
              value={formData.rating_number}
              onChange={handleProductChange}
            />
          </div>

          <button onClick={handlePredict}>
            {loading ? "Predicting..." : "Predict Demand"}
          </button>
        </div>

        <div className="card recommendation">
          <h2 className="section-title">Pricing Recommendation</h2>

          {result ? (
            <>
              <h1>
                {result.pricing.pricing_decision}
              </h1>

              <div className="price">
                $
                {result.pricing.recommended_price}
              </div>

              <p>
                Base Price :
                <strong>
                  {" "}
                  ${result.pricing.base_price}
                </strong>
              </p>

              <p>
                Historical Demand :
                <strong>
                  {" "}
                  {result.pricing.historical_mean_demand_12m}
                </strong>
              </p>

              <p>
                Predicted Demand :
                <strong>
                  {" "}
                  {result.pricing.predicted_mean_demand_12m}
                </strong>
              </p>

              <p
                className={
                  result.pricing.demand_change_pct >= 0
                    ? "change-positive"
                    : "change-negative"
                }
              >
                Demand Change :
                {" "}
                {(result.pricing.demand_change_pct * 100).toFixed(2)}
                %
              </p>
            </>
          ) : (
            <p>Belum ada hasil prediksi</p>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: "30px" }}>
        <h2 className="section-title">Histori Demand 12 Bulan</h2>

        <table>
          <thead>
            <tr>
              <th>Bulan</th>
              <th>Review Count</th>
              <th>Avg Rating</th>
            </tr>
          </thead>

          <tbody>
            {history.map((item, index) => (
              <tr key={index}>
                <td>{item.month}</td>

                <td>
                  <input
                    type="number"
                    value={item.monthly_review_count}
                    onChange={(e) =>
                      handleHistoryChange(
                        index,
                        "monthly_review_count",
                        Number(e.target.value)
                      )
                    }
                  />
                </td>

                <td>
                  <input
                    type="number"
                    step="0.1"
                    value={item.monthly_avg_rating}
                    onChange={(e) =>
                      handleHistoryChange(
                        index,
                        "monthly_avg_rating",
                        Number(e.target.value)
                      )
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {result && (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <h3>Base Price</h3>
              <p>${result.pricing.base_price}</p>
            </div>

            <div className="stat-card">
              <h3>Recommended Price</h3>
              <p>${result.pricing.recommended_price}</p>
            </div>

            <div className="stat-card">
              <h3>Demand Change</h3>
              <p>
                {(result.pricing.demand_change_pct * 100).toFixed(2)}%
              </p>
            </div>

            <div className="stat-card">
              <h3>Forecast Horizon</h3>
              <p>12 Mo</p>
            </div>
          </div>

          <div className="chart-card">
            <h2 className="section-title">Demand Forecast</h2>

            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />

                <XAxis dataKey="month" />

                <YAxis />

                <Tooltip />

                <Legend />

                <Line
                  type="monotone"
                  dataKey="historical"
                  stroke="#4f46e5"
                  strokeWidth={3}
                  name="Historical Demand"
                />

                <Line
                  type="monotone"
                  dataKey="predicted"
                  stroke="#10b981"
                  strokeWidth={3}
                  strokeDasharray="5 5"
                  name="Predicted Demand"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="table-card">
            <h2 className="section-title">Forecast 12 Bulan</h2>

            <table>
              <thead>
                <tr>
                  <th>Bulan</th>
                  <th>Predicted Demand</th>
                </tr>
              </thead>

              <tbody>
                {result.forecast.map((item, index) => (
                  <tr key={index}>
                    <td>{item.month}</td>

                    <td>
                      {Number(
                        item.predicted_demand
                      ).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export default App;