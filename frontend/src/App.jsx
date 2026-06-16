import { useState } from "react";
import axios from "axios";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import "./App.css";

const initialHistory = [
  { month: "2025-01", monthly_review_count: 2, monthly_avg_rating: 4.5 },
  { month: "2025-02", monthly_review_count: 1, monthly_avg_rating: 4.4 },
  { month: "2025-03", monthly_review_count: 3, monthly_avg_rating: 4.6 },
  { month: "2025-04", monthly_review_count: 2, monthly_avg_rating: 4.3 },
  { month: "2025-05", monthly_review_count: 4, monthly_avg_rating: 4.5 },
  { month: "2025-06", monthly_review_count: 2, monthly_avg_rating: 4.2 },
  { month: "2025-07", monthly_review_count: 5, monthly_avg_rating: 4.6 },
  { month: "2025-08", monthly_review_count: 3, monthly_avg_rating: 4.5 },
  { month: "2025-09", monthly_review_count: 2, monthly_avg_rating: 4.4 },
  { month: "2025-10", monthly_review_count: 1, monthly_avg_rating: 4.3 },
  { month: "2025-11", monthly_review_count: 2, monthly_avg_rating: 4.4 },
  { month: "2025-12", monthly_review_count: 3, monthly_avg_rating: 4.5 },
];

function App() {
  const [form, setForm] = useState({
    parent_asin: "B07GSH4FW5",
    title: "Back From Bali Womens Cropped Wide Leg Pants",
    price: 42.95,
    average_rating: 4.4,
    rating_number: 120,
  });

  const [history, setHistory] = useState(initialHistory);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleFormChange = (event) => {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]:
        name === "price" || name === "average_rating" || name === "rating_number"
          ? Number(value)
          : value,
    }));
  };

  const handleHistoryChange = (index, field, value) => {
    const updatedHistory = [...history];

    updatedHistory[index] = {
      ...updatedHistory[index],
      [field]:
        field === "month"
          ? value
          : Number(value),
    };

    setHistory(updatedHistory);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setErrorMessage("");
    setResult(null);

    try {
      const payload = {
        ...form,
        history,
      };

      const response = await axios.post("http://127.0.0.1:8000/predict", payload);
      setResult(response.data);
    } catch (error) {
      const message =
        error.response?.data?.detail || "Terjadi error saat memanggil API.";
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  const chartData = result
    ? [
        ...result.history.map((item) => ({
          month: item.month,
          historical_demand: item.monthly_review_count,
          predicted_demand: null,
        })),
        ...result.forecast.map((item) => ({
          month: item.month,
          historical_demand: null,
          predicted_demand: item.predicted_demand,
        })),
      ]
    : [];

  return (
    <div className="page">
      <header className="header">
        <h1>Dynamic Pricing Demand Forecasting</h1>
        <p>
          Demo web prediksi demand 12 bulan ke depan menggunakan GRU Delta Demand.
        </p>
      </header>

      <main className="container">
        <section className="panel">
          <h2>Input Produk</h2>

          <form onSubmit={handleSubmit}>
            <div className="grid">
              <div className="field">
                <label>Parent ASIN</label>
                <input
                  name="parent_asin"
                  value={form.parent_asin}
                  onChange={handleFormChange}
                />
              </div>

              <div className="field">
                <label>Title</label>
                <input
                  name="title"
                  value={form.title}
                  onChange={handleFormChange}
                />
              </div>

              <div className="field">
                <label>Price</label>
                <input
                  type="number"
                  step="0.01"
                  name="price"
                  value={form.price}
                  onChange={handleFormChange}
                />
              </div>

              <div className="field">
                <label>Average Rating</label>
                <input
                  type="number"
                  step="0.1"
                  name="average_rating"
                  value={form.average_rating}
                  onChange={handleFormChange}
                />
              </div>

              <div className="field">
                <label>Rating Number</label>
                <input
                  type="number"
                  name="rating_number"
                  value={form.rating_number}
                  onChange={handleFormChange}
                />
              </div>
            </div>

            <h2>Histori Demand 12 Bulan</h2>

            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Bulan</th>
                    <th>Monthly Review Count</th>
                    <th>Monthly Avg Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((row, index) => (
                    <tr key={index}>
                      <td>
                        <input
                          type="month"
                          value={row.month}
                          onChange={(e) =>
                            handleHistoryChange(index, "month", e.target.value)
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={row.monthly_review_count}
                          onChange={(e) =>
                            handleHistoryChange(
                              index,
                              "monthly_review_count",
                              e.target.value
                            )
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.1"
                          value={row.monthly_avg_rating}
                          onChange={(e) =>
                            handleHistoryChange(
                              index,
                              "monthly_avg_rating",
                              e.target.value
                            )
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button type="submit" disabled={loading}>
              {loading ? "Memproses..." : "Prediksi Demand & Harga"}
            </button>
          </form>

          {errorMessage && <div className="error">{errorMessage}</div>}
        </section>

        {result && (
          <>
            <section className="panel">
              <h2>Rekomendasi Harga</h2>

              <div className="cards">
                <div className="card">
                  <span>Pricing Decision</span>
                  <strong>{result.pricing.pricing_decision}</strong>
                </div>

                <div className="card">
                  <span>Base Price</span>
                  <strong>${result.pricing.base_price}</strong>
                </div>

                <div className="card">
                  <span>Recommended Price</span>
                  <strong>${result.pricing.recommended_price}</strong>
                </div>

                <div className="card">
                  <span>Demand Change</span>
                  <strong>
                    {(result.pricing.demand_change_pct * 100).toFixed(2)}%
                  </strong>
                </div>

                <div className="card">
                  <span>Price Adjustment</span>
                  <strong>
                    {(result.pricing.price_adjustment_pct * 100).toFixed(2)}%
                  </strong>
                </div>
              </div>
            </section>

            <section className="panel">
              <h2>Grafik Histori dan Prediksi Demand</h2>

              <div className="chart">
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="historical_demand"
                      name="Historical Demand"
                      strokeWidth={2}
                      connectNulls={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="predicted_demand"
                      name="Predicted Demand"
                      strokeWidth={2}
                      connectNulls={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="panel">
              <h2>Tabel Prediksi Demand 12 Bulan</h2>

              <table>
                <thead>
                  <tr>
                    <th>Bulan</th>
                    <th>Predicted Demand</th>
                  </tr>
                </thead>
                <tbody>
                  {result.forecast.map((item) => (
                    <tr key={item.month}>
                      <td>{item.month}</td>
                      <td>{item.predicted_demand.toFixed(4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export default App;