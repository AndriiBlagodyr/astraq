import styles from "../layout.module.css";

export const metadata = {
  title: "Predictions",
};

export default function PredictionsPage() {
  return (
    <section className={styles.page}>
      <div className={styles.hero}>
        <p className={styles.eyebrow}>Prediction engine</p>
        <h2 className={styles.title}>Model outputs, confidence bands, and analyst review</h2>
        <p className={styles.lead}>
          This route is intended for forecast cards, model ensemble outputs, deployment status, and scenario
          validation before signals hit execution surfaces.
        </p>
      </div>

      <div className={styles.grid}>
        <article className={styles.card}>
          <h3>Model registry</h3>
          <p>Track active forecasting models, version lineage, retraining cadence, and confidence thresholds.</p>
        </article>
        <article className={styles.card}>
          <h3>Scenario boards</h3>
          <p>Compare base, upside, and downside cases across instruments and time horizons.</p>
        </article>
      </div>

      <div className={styles.table}>
        <table>
          <thead>
            <tr>
              <th>Model</th>
              <th>Window</th>
              <th>Confidence</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Momentum Ensemble</td>
              <td>4h</td>
              <td className={styles.positive}>91%</td>
            </tr>
            <tr>
              <td>Macro Rotation</td>
              <td>1d</td>
              <td>74%</td>
            </tr>
            <tr>
              <td>Risk Reversal Alert</td>
              <td>30m</td>
              <td className={styles.warning}>63%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
