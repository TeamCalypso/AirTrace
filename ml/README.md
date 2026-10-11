# ML

- `airtrace_ml/`: shared package (grid, feature engineering, AQI conversion, model wrappers), used by training and inference
- `training/`: training and evaluation entry points (local and SageMaker script mode)
- `notebooks/`: exploration and validation analysis

Model: LightGBM quantile regression (p10 / p50 / p90) for PM2.5 at 1–48 h lead, trained on past winters of CPCB station data with weather, CAMS and fire features. Evaluated against persistence and raw CAMS baselines.
