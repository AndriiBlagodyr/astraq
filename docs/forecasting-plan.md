# Forecasting plan — what Veracand predicts, and how it gets better

Goal: forecasts that are **useful and honestly measured**. Not a price oracle.

This is the detailed plan behind [ROADMAP.md](../ROADMAP.md) Phase 8. The roadmap says when; this file says what is built, in which order, and how each step is judged. Written 2026-11-21, before any of it exists: nothing here runs yet. Revised the same day: charts that need no model, the Model lab, the forecast time machine, VIX and the macro calendar, and corrections to the volatility, band, and validation steps.

---

## The problem this plan answers

A forecast made only from a symbol's own past prices has very little power to say where the price goes next. Past prices are public, so most of what they say is already in the price. News, earnings, rates, and what other investors do move prices, and none of that is in a candle.

So "more precision" cannot mean "the line on the chart lands closer to tomorrow's close". It means four things that can be done:

1. **Predict what is predictable.** How much a price will move (volatility) is far more predictable than which way.
2. **Say how sure the forecast is.** A range with a stated probability, checked against what happened, instead of one number.
3. **Use more than the symbol's own prices.** The market, the sector, the calendar of events, fundamentals, news.
4. **Measure every model out of sample**, against a naive forecast, and show the score beside the forecast.

## What to expect, honestly

| Target | Realistic result | Why |
|---|---|---|
| Volatility over the next 1 to 20 days | Clearly better than naive | Volatility clusters: calm days follow calm days. This is the best-established result in the field. |
| A price range (for example 80%) that holds as often as it says | Achievable, and can be verified | It follows from a good volatility forecast plus calibration. |
| Direction over 5 to 20 days | 51% to 55% right at best, often no better than the base rate | The signal is weak and unstable. A model that claims 70% is leaking future data. |
| Which stocks do better than others (ranking) | A small, measurable edge is possible | Momentum, value, and quality effects are documented, and weaker after costs. |
| The exact price on a date | Not attempted | No model does this better than "today's price, plus or minus the range". |

If a model does not beat naive out of sample, the product says "no edge found" and keeps the range forecast. That is a valid result (ROADMAP Phase 8, kill/pivot trigger).

---

## Rules (they apply to every model)

1. **Naive first.** Each target has a naive forecast (below). A model is shown only next to its score against it.
2. **Walk-forward only.** A model is trained on the past and scored on the days after it, never on days it has seen. No shuffled train/test split, ever.
3. **Point in time.** A feature for day *t* uses only what was known at the close of day *t*. Fundamentals count from their filing date, not the quarter they describe. News counts from its publication time.
4. **A forecast is a distribution.** Every forecast has a range and a probability. A single number is only ever the middle of one.
5. **One model card per served model:** the data window, the validation method, the out-of-sample score against naive, and the date it was last retrained.
6. **Every forecast is kept and scored later.** When the day a forecast was about arrives, it is scored against what happened. This live record is the only score that cannot be overfit.
7. **Count the experiments.** Trying fifty models and keeping the best one finds luck, not skill. The number of variants tried is recorded with the result.
8. **Simple before complex.** Each target starts with the simplest model that could work, built by hand where it teaches something (AGENTS.md: learning over shipping), and a library version is then used to check it.

---

## The algorithms, by target

### A. Volatility (the foundation)

Predicts: the standard deviation of daily returns over the next 1, 5, and 20 sessions.

| Step | Model | Notes |
|---|---|---|
| Naive | Trailing 20-day standard deviation | The baseline everything must beat. |
| 1 | **EWMA** (exponentially weighted, decay 0.94) | A dozen lines, by hand. Reacts faster than a flat window. |
| 2 | **Range-based estimators** (Parkinson, Garman-Klass, then Yang-Zhang) | Use the high and low of each bar, which we already store. Several times more information per day than close-to-close returns. The first two ignore the jump between one close and the next open; Yang-Zhang counts it. |
| 3 | **GARCH(1,1)**, then **GJR-GARCH** | Fit by maximum likelihood, by hand first, then checked against the `arch` library. Gives volatility that returns to a long-run level. GJR adds one term so that a fall raises volatility more than a rise of the same size, which is what stocks do. |
| 4 | **HAR** (daily, weekly, and monthly averages of realized volatility in one linear regression) | Simple, and hard to beat in practice. |
| 5 | **HAR with VIX** (the same regression with one more input) | VIX is the market's own estimate of volatility over the next month, taken from option prices. It is the strongest single input a volatility model can be given. Needs the FRED data below, so it is not part of the core. |

Scored by: QLIKE loss and mean squared error against realized volatility, per horizon.

### B. Price ranges (what the chart shows)

Predicts: a band for the price 1, 5, and 20 sessions ahead, at 50% and 80%.

1. **From the volatility forecast:** the band is centred on today's price (no drift), as wide as the forecast volatility says.
2. **Conformal calibration:** the band is widened or narrowed by the errors it made in the recent past, so an 80% band really holds about 80% of the time. This needs no assumption about the shape of returns, which have fatter tails than a normal distribution. The adjustment keeps running (adaptive conformal inference): each day the band missed, it widens a little, and each day it held, it narrows a little, so it follows the market from calm to stressed instead of trusting one fixed window. The lower and upper edges are adjusted separately, because falls are larger than rises.
3. **Quantile regression** (gradient boosting with pinball loss) on the features of section F, if it beats step 2.

Naive: a band from the trailing 20-day volatility.
Scored by: coverage (does the 80% band hold 80% of the time?) and width (narrower is better at equal coverage), together as the Winkler score. Coverage is also reported per regime and for earnings and macro days: a band that holds 80% overall by being too wide in calm markets and too narrow in stressed ones is not calibrated.

### C. Direction

Predicts: the probability that the return over the next 5 or 20 sessions is positive.

1. **Logistic regression** on a handful of features: a model that can be read.
2. **Gradient boosting** (LightGBM) on the full feature set, only if step 1 shows any signal.

Both are trained on all tracked symbols together, not one model per symbol: one symbol has about 250 rows a year, far too few, and the tracked universe has that many per symbol. The symbol's sector and its own volatility are features, so the model can still treat symbols differently.

Naive: the base rate (the share of up periods in the training window).
Scored by: Brier score and log loss against the base rate, and the hit rate with its confidence interval. A hit rate without an interval is not reported.

### D. Ranking across stocks

Predicts: for the tracked universe, which symbols are likelier to do better than the rest over the next month. This replaces "what will NVDA cost" with "is NVDA in the stronger or the weaker half", which is a question with a known, small answer.

1. **Single factors:** 12-month momentum skipping the last month, 1-month reversal, low volatility.
2. **Fundamental factors** once the data exists: value (earnings and sales against price), quality (margins, debt), growth.
3. **A combined rank:** the average of the factor ranks, then a boosted ranking model if it adds anything.

Naive: a random ranking (rank correlation of zero).
Scored by: rank correlation between forecast and outcome (the information coefficient) per month, and the return of the top fifth less the bottom fifth, run through the Phase 5 backtester with costs.

**Needs a larger universe first.** A ranking is scored by comparing many symbols with each other. With 20 or 30 symbols the rank correlation is mostly luck; it takes a few hundred (for example the S&P 500, with the members as they were on each date) before the score means anything. Until the tracked universe is that large, this target is not built.

### E. Events

Not a model of its own: knowledge that changes the other forecasts.

- **Earnings dates:** a band that spans an earnings day is widened by how much the symbol has moved on past earnings days. Without this, every band is too narrow exactly when it matters most.
- **Macro days:** interest-rate decisions, inflation reports, and jobs reports move the whole market. A band that spans one is widened by how much the symbol has moved on past days of that kind, the same way as for earnings.
- **After earnings:** the surprise and the first day's move become features for C and D.
- **Dividends and splits:** already stored; ex-dates become features.

### F. Features shared by C and D

All computed point in time, in one pipeline the backtester also uses.

- **The symbol's own prices:** returns over several windows, volatility, RSI, MACD, ATR, OBV, distance from its 52-week high.
- **The market:** the same for a broad index ETF, and the symbol's return relative to it.
- **The sector:** the symbol's return relative to its sector ETF.
- **The regime:** is the index above its 200-day average, and is market volatility (VIX) high or low. Models are also scored per regime, because one that works only in calm markets should say so.
- **Events (E), fundamentals (D), and news (G)** as they arrive.

### G. News

Needs the news stored in ROADMAP Phase 6.

- A sentiment score per headline, then per symbol and day.
- Used as a feature for C and D, and scored as an increment: the model with it against the model without it.

### H. Combining models

- **Averaging:** the mean of the models for a target, weighted by their recent out-of-sample scores. Averages of honest models usually beat the best single one.
- **Signals for strategies:** each served forecast becomes an input of the strategy DSL, so the Phase 5 backtester judges it in money terms, with costs.

---

## What you look at

A forecast nobody can inspect is not trusted, and some useful questions need no model at all.

### Charts that need no model (ROADMAP Phase 6)

They use only stored candles, so they do not wait for Phase 8.

- **Year over year.** One chart, January to December, one line per year, each starting at 0% on its first session. The current year is highlighted over the median and the middle half of the past years. It answers "does this stock tend to do the same thing at the same time of year?". Two guards against reading noise as a pattern: each week or month says "up in N of M years", and a toggle shows the return relative to the index, so a pattern of the whole market is not taken for the stock's own. History is as deep as the provider's bars, so the number of lines is small and the chart says how many it has.
- **After a move like this.** Pick the last week's move, or any size, and see every past time the symbol moved that much and what the next 5 and 20 sessions brought: each case as a line, and their spread. It answers "it just fell 8%, what usually follows?", with the count of cases in view so that three cases are not read as a rule.

Both later become features for the direction model (section C), each scored by its increment like any other. Expect little from them as predictors; their value is in the looking.

### Forecast time machine (Phase 8, with the scorecard)

Pick a past date on the stock chart and see the band that was forecast on that day, and the candles that followed. It reads the stored forecasts of rule 6, never a model re-run with today's knowledge. This is the scorecard for someone who does not read statistics.

### Model lab (Phase 8)

One page for all served models:

- per target and horizon, each model's out-of-sample score against naive, and its live score since it was first served;
- the score over time and per regime, so a model that stopped working is visible;
- a calibration chart: for each stated probability, how often it happened;
- for the direction model, what moved a forecast: the coefficients of the logistic model, and feature contributions for the boosted one;
- a rule, not a judgement: a model whose live score falls below naive for a set period is marked "not beating naive" and is no longer the one shown by default.

---

## Data each step needs

| Data | Have it? | Source | Used by |
|---|---|---|---|
| Daily OHLCV, splits, dividends | Yes | Alpaca (ROADMAP Phases 1 and 4) | A, B, C, D |
| Index and sector ETF bars | No: add the tickers to the tracked universe | Same pipeline | F |
| VIX, daily | No | FRED (free, one API with a key). Check its terms against "Data licensing" in the ROADMAP before use | A (step 5), F |
| Macro calendar: inflation and jobs report dates, rate decision dates | No | FRED's release dates; the Federal Reserve's published meeting calendar for rate decisions | E |
| Earnings dates and results | No | A provider to be chosen, recorded in an ADR | E |
| Fundamentals, by filing date | No | SEC EDGAR's company facts, or the same provider as earnings | D |
| News headlines | Phase 6 | Phase 6's source | G |
| Symbols that were delisted | Partly | Kept in `symbols` as inactive | D (without them a ranking is tested only on survivors) |

`services/ml` reads market data and never writes domain tables (AGENTS.md). A forecast is the result of a job: the api stores it.

---

## The validation harness (built before any model)

- **Expanding window:** train on everything up to a date, forecast the next block, move the date forward, repeat.
- **Embargo:** a gap between training and test as long as the forecast horizon, so a 20-day label in training cannot overlap the test period.
- **Purging:** training rows whose label period overlaps the test block are dropped.
- **"Beats naive" is a test, not a glance:** the Diebold-Mariano test on the two forecasts' losses. A difference that fails it is reported as "no difference". Forecasts 5 and 20 sessions ahead overlap each other, which makes the plain test find differences that are not there, so it is run with the correction for overlapping horizons (Harvey, Leybourne, and Newbold).
- **Many models, one winner:** when several variants are compared, the best one is tested against the chance of being best by luck (the model confidence set), using the count of rule 7.
- **Leakage canaries, run in CI:**
  - a model trained on shuffled targets must score no better than naive;
  - a feature deliberately built from tomorrow's close must be caught by the point-in-time check.
- **Results are stored** with the model, its parameters, the data window, and the count of variants tried.

---

## Order of work

Each row is a step of ROADMAP Phase 8. A step is done when its "judged by" holds.

| # | Step | Depends on | Judged by |
|---|---|---|---|
| 1 | `services/ml` structure and read-only access to candles | Phase 4 | A test reads a symbol's adjusted bars |
| 2 | Feature pipeline, point in time (the symbol's own prices) | 1 | The future-feature canary fails as intended |
| 3 | Walk-forward harness, naive forecasts, leakage canaries, ADR 0015 | 2 | The shuffled-target canary scores at naive |
| 4 | Volatility: EWMA, range-based (to Yang-Zhang), GARCH(1,1) and GJR, HAR | 3 | At least one beats trailing volatility out of sample (Diebold-Mariano, corrected) |
| 5 | Calibrated price bands (adaptive, each edge on its own); forecasts stored through the api; model cards | 4 | The 80% band holds between 75% and 85% of the time out of sample, overall and in each regime |
| 6 | Bands on the stock chart and the Forecast tab, each with its score | 5 | The product check of Phase 8 |
| 7 | Forecast scorecard: every stored forecast scored when its day arrives; the time machine; the Model lab | 5 | A month of live scores on the Forecast tab; a past forecast can be replayed on the chart |
| 8 | Market, sector, and regime features; VIX from FRED and HAR with VIX; direction model, trained across symbols | 3, ETF bars, FRED | HAR with VIX against HAR; direction reported against the base rate, whatever the result |
| 9 | Earnings and macro calendars; event-aware bands | 5, earnings data, macro dates | Coverage on earnings and macro days is no worse than on other days |
| 10 | Ranking: price factors, then fundamentals | 3, fundamentals, a universe of a few hundred symbols | Monthly rank correlation with its confidence interval |
| 11 | News sentiment as a feature | 8, Phase 6 news | The increment over the same model without it |
| 12 | Model averaging; forecasts as strategy DSL inputs | 4 to 11, Phase 5 | A strategy using a signal is backtested with costs |

Steps 1 to 7 are the core and need only the data we already have. If time runs out, they ship alone: bands that are honest about their width are the product. Steps 8 to 12 each stand or fall by their own score.

The two charts that need no model (year over year, after a move like this) are not in this table: they are ROADMAP Phase 6 work.

## Later, if measured

Considered on 2026-11-21 and left out. Each is added only after the core runs, and only if its increment can be scored the way news is in section G.

| Idea | Why it waits |
|---|---|
| Insider trades (SEC Form 4), short interest (FINRA), Wikipedia page views, analyst estimates | Each is one more source to load and keep healthy, for a small and uncertain gain. |
| Volatility implied by each symbol's own options | The best volatility input there is, but good free data is hard to find. VIX covers the market as a whole meanwhile. |
| Other markets as features (bond, gold, oil, and dollar ETFs) | Cheap, since the bars come through the existing pipeline. Add with step 8 if the direction model shows any signal. |
| Analog finder (the past stretches most like the last 30 days), earnings event study, volatility cone, regime ribbon | Charts worth having that change no decision. A visualization project for when one is wanted. |
| A pretrained time-series model (for example Chronos), run through the harness with no training | A fair test of "no deep learning" below, and an experiment rather than a feature. |

## What this plan does not do

- Intraday forecasts: the data is daily bars until ROADMAP Phase 9.
- Deep learning on price series: it needs far more data than one symbol's daily bars, and rarely beats the models above on them.
- Trading real money on any of it.
