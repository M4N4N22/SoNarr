# SoSoValue Signal Stack API Notes for SoNarr

Use these endpoints to build the Narrative Signal Stack.

Primary goal:
Do not build another news feed. Use SoSoValue APIs to cross-check a narrative across:
- news attention
- market momentum
- trading pair availability
- sector/category relevance
- index relevance
- historical movement

Real-data-first rule:
Use live SoSoValue API responses first.
Fallback data is only allowed if:
- API key is missing
- API fails
- API rate-limits
- response shape is incompatible

For this feature, use only the pasted endpoint docs below.
Do not invent undocumented endpoint paths.
Keep endpoint paths isolated in constants so they are easy to adjust.
# 1.3 Market Snapshot

```
GET /currencies/{currency_id}/market-snapshot
```

**Path Parameters**

| Parameter    | Type   | Required | Description |
| ------------ | ------ | -------- | ----------- |
| currency\_id | String | Yes      | Currency ID |

**Response Example**

```json
{
    "price": 458.0000000000000000,
    "change_pct_24h": -0.12,
    "turnover_24h": 4381082458.0000000000000000,
    "turnover_rate": 0.123,
    "high_24h": 208.320000000000000000,
    "low_24h": 195.140000000000000000,
    "marketcap": 98187284636.4000000000000000,
    "fdv": 119634407517.24000000,
    "max_supply": "593383314",
    "total_supply": "593383314",
    "circulating_supply": "487043475",
    "ath": 295.830000000000000000,
    "ath_date": "1737244800000",
    "down_from_ath": "",
    "cycle_low": 175.890000000000000000,
    "cycle_low_date": "1738540800000",
    "up_from_cycle_low": "",
    "marketcap_rank": 4
}
```

**Response Fields**

| Field                | Type       | Description                              |
| -------------------- | ---------- | ---------------------------------------- |
| price                | BigDecimal | Current price (USD)                      |
| change\_pct\_24h     | BigDecimal | 24-hour price change percentage          |
| turnover\_24h        | BigDecimal | 24-hour trading volume (USD)             |
| turnover\_rate       | BigDecimal | Turnover rate                            |
| high\_24h            | BigDecimal | 24-hour high price                       |
| low\_24h             | BigDecimal | 24-hour low price                        |
| marketcap            | BigDecimal | Market capitalization                    |
| fdv                  | BigDecimal | Fully diluted valuation (FDV)            |
| max\_supply          | String     | Maximum supply; null indicates unlimited |
| total\_supply        | String     | Total supply                             |
| circulating\_supply  | String     | Circulating supply                       |
| ath                  | BigDecimal | All-time high (ATH)                      |
| ath\_date            | String     | ATH date (timestamp)                     |
| down\_from\_ath      | String     | Percentage declined from ATH             |
| cycle\_low           | BigDecimal | Cycle low price                          |
| cycle\_low\_date     | String     | Cycle low date (timestamp)               |
| up\_from\_cycle\_low | String     | Percentage recovered from cycle low      |
| marketcap\_rank      | Integer    | Market cap rank                          |


---

# Agent Instructions: Querying This Documentation

If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter:

```
GET https://sosovalue-1.gitbook.io/sosovalue-api-doc/1.-currency-and-pairs/market-snapshot.md?ask=<question>
```

The question should be specific, self-contained, and written in natural language.
The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.

# 1.5 Historical Klines

```
GET /currencies/{currency_id}/klines
```

**Path Parameters**

| Parameter    | Type   | Required | Description |
| ------------ | ------ | -------- | ----------- |
| currency\_id | String | Yes      | Currency ID |

**Query Parameters**

| Parameter   | Type      | Required | Description                           |
| ----------- | --------- | -------- | ------------------------------------- |
| interval    | string    | Yes      | Time interval. Only `1d` is supported |
| start\_time | timestamp | No       | Start time                            |
| end\_time   | timestamp | No       | End time                              |
| limit       | integer   | No       | Default 100, max 500                  |

**Response Example**

```json
[
    {
        "timestamp": 1710000000000,
        "open": 123,
        "high": 130,
        "low": 120,
        "close": 125,
        "volume": 100000
    }
]
```

**Response Fields**

| Field     | Type   | Description              |
| --------- | ------ | ------------------------ |
| timestamp | Long   | Timestamp (milliseconds) |
| open      | Number | Open price               |
| high      | Number | High price               |
| low       | Number | Low price                |
| close     | Number | Close price              |
| volume    | Number | Trading volume           |

**Notes**

* Only daily (`1d`) klines are available.
* The query range is limited to the most recent 3 months.


---

# Agent Instructions: Querying This Documentation

If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter:

```
GET https://sosovalue-1.gitbook.io/sosovalue-api-doc/1.-currency-and-pairs/klines.md?ask=<question>
```

The question should be specific, self-contained, and written in natural language.
The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.

# 1.7 Trading Pairs

```
GET /currencies/{currency_id}/pairs
```

**Path Parameters**

| Parameter    | Type   | Required | Description |
| ------------ | ------ | -------- | ----------- |
| currency\_id | String | Yes      | Currency ID |

**Query Parameters**

| Parameter  | Type    | Required | Description                                   |
| ---------- | ------- | -------- | --------------------------------------------- |
| page       | integer | No       | Page number                                   |
| page\_size | integer | No       | Items per page, default 20, max 100           |
| order\_by  | string  | No       | Sort field; defaults to 24h volume descending |
| exchange   | string  | No       | Filter by exchange                            |

**Response Example**

```json
{
    "list": [
        {
            "base": "BTC",
            "target": "USDT",
            "market": "Binance",
            "price": 69476,
            "turnover_24h": 20242,
            "cost_to_move_up_usd": 19320706.3958517,
            "cost_to_move_down_usd": 16360235.3694131
        }
    ],
    "page": 1,
    "page_size": 100,
    "total": 542
}
```

**Response Fields**

| Field                     | Type   | Description                                |
| ------------------------- | ------ | ------------------------------------------ |
| base                      | String | Base currency                              |
| target                    | String | Quote currency                             |
| market                    | String | Exchange name                              |
| price                     | Number | Latest price                               |
| turnover\_24h             | Number | 24-hour trading volume                     |
| cost\_to\_move\_up\_usd   | Number | +2% depth (USD cost to push price up 2%)   |
| cost\_to\_move\_down\_usd | Number | -2% depth (USD cost to push price down 2%) |


---

# Agent Instructions: Querying This Documentation

If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter:

```
GET https://sosovalue-1.gitbook.io/sosovalue-api-doc/1.-currency-and-pairs/pairs.md?ask=<question>
```

The question should be specific, self-contained, and written in natural language.
The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.

# 1.8 Sector & Spotlight

```
GET /currencies/sector-spotlight
```

**Request Parameters**

No parameters.

**Response Example**

```json
{
    "sector": [
        {
            "name": "btc",
            "24h_change_pct": -0.0012,
            "marketcap_dom": 0.58
        }
    ],
    "spotlight": [
        {
            "name": "perpdex",
            "24h_change_pct": -0.0012
        }
    ]
}
```

**Response Fields**

| Field                         | Type           | Description                     |
| ----------------------------- | -------------- | ------------------------------- |
| sector                        | Array\[Object] | Sector list                     |
| sector\[].name                | String         | Sector name                     |
| sector\[].24h\_change\_pct    | Number         | 24-hour price change percentage |
| sector\[].marketcap\_dom      | Number         | Market cap dominance            |
| spotlight                     | Array\[Object] | Spotlight list                  |
| spotlight\[].name             | String         | Spotlight name                  |
| spotlight\[].24h\_change\_pct | Number         | 24-hour price change percentage |


---

# Agent Instructions: Querying This Documentation

If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter:

```
GET https://sosovalue-1.gitbook.io/sosovalue-api-doc/1.-currency-and-pairs/sector-spotlight.md?ask=<question>
```

The question should be specific, self-contained, and written in natural language.
The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.

# 3.1 Index List

```
GET /indices
```

**Request Parameters**

No parameters.

**Response Example**

```json
["ssimag7", "ssilayer1"]
```

**Response Fields**

| Field | Type           | Description                        |
| ----- | -------------- | ---------------------------------- |
| -     | Array\[String] | List of index tickers (bare array) |


---

# Agent Instructions: Querying This Documentation

If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter:

```
GET https://sosovalue-1.gitbook.io/sosovalue-api-doc/3.-sosovalue-index/list.md?ask=<question>
```

The question should be specific, self-contained, and written in natural language.
The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.

# 3.2 Index Constituents

```
GET /indices/{index_ticker}/constituents
```

**Path Parameters**

| Parameter | Type           | Required | Description                |
| --------- | -------------- | -------- | -------------------------- |
| ticker    | Array\[String] | Yes      | Index ticker, e.g. ssimag7 |

**Response Example**

```json
[
    {
        "currency_id": "1673723677362319867",
        "symbol": "btc",
        "weight": 0.31
    }
]
```

**Response Fields**

| Field        | Type   | Description                 |
| ------------ | ------ | --------------------------- |
| currency\_id | String | Currency ID                 |
| symbol       | String | Constituent currency symbol |
| weight       | Number | Weight (0-1)                |


---

# Agent Instructions: Querying This Documentation

If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter:

```
GET https://sosovalue-1.gitbook.io/sosovalue-api-doc/3.-sosovalue-index/constituents.md?ask=<question>
```

The question should be specific, self-contained, and written in natural language.
The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.

# 3.3 Index Market Snapshot

```
GET /indices/{index_ticker}/market-snapshot
```

**Request Parameters**

| Parameter | Type   | Required | Description                |
| --------- | ------ | -------- | -------------------------- |
| ticker    | string | Yes      | Index ticker, e.g. ssimag7 |

**Response Example**

```json
{
    "price": 20.93,
    "24h_change_pct": -0.0016,
    "7day_roi": 0.0056,
    "1month_roi": 0.062,
    "3month_roi": 0.275,
    "1year_roi": 0.15,
    "ytd": -0.243
}
```

**Response Fields**

| Field            | Type   | Description               |
| ---------------- | ------ | ------------------------- |
| price            | Number | Current index price       |
| 24h\_change\_pct | Number | 24-hour change percentage |
| 7day\_roi        | Number | 7-day return              |
| 1month\_roi      | Number | 1-month return            |
| 3month\_roi      | Number | 3-month return            |
| 1year\_roi       | Number | 1-year return             |
| ytd              | Number | Year-to-date return       |


---

# Agent Instructions: Querying This Documentation

If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter:

```
GET https://sosovalue-1.gitbook.io/sosovalue-api-doc/3.-sosovalue-index/market-snapshot.md?ask=<question>
```

The question should be specific, self-contained, and written in natural language.
The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.
