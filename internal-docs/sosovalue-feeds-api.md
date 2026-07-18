# SoSoValue Feeds API Notes for SoNarr

For the first Narrative Radar implementation, use only:

- GET /news/hot
- GET /news/search

Do not use GET /news or GET /news/featured yet unless explicitly requested.

Purpose:
- /news/hot is the primary source for current market narratives.
- /news/search is used to query specific narrative categories such as AI, Bitcoin ETF, RWA, DeFi, Stablecoin, and Layer 2.

The /radar page should be real-data-first.
Fallback data should only be used if the API key is missing, the API fails, rate limits, or the response shape is incompatible.

# 6.2 Hot News

```
GET /news/hot
```

**Query Parameters**

| Parameter   | Type    | Required | Description                                                                          |
| ----------- | ------- | -------- | ------------------------------------------------------------------------------------ |
| page        | integer | No       | Page number, starting from 1                                                         |
| page\_size  | integer | No       | Items per page, max 100                                                              |
| language    | string  | No       | Response language; defaults to English                                               |
| start\_time | long    | No       | Start time filter (millisecond timestamp). Only the most recent 7 days are supported |
| end\_time   | long    | No       | End time filter (millisecond timestamp). Only the most recent 7 days are supported   |

**Response Example**

```json
{
    "page": 1,
    "page_size": 20,
    "total": 48,
    "list": [
        {
            "id": 123456,
            "source_link": "https://sosovalue.xyz/news/cluster/123456",
            "create_time": 1677151845000,
            "title": "Bitcoin Surges Past $70,000",
            "content": "<p>HTML formatted content...</p>"
        }
    ]
}
```

**Response Fields - list item**

| Field        | Type   | Description                                      |
| ------------ | ------ | ------------------------------------------------ |
| id           | Long   | Hot news cluster ID                              |
| source\_link | String | SoSoValue platform link                          |
| create\_time | Long   | News ingestion time, millisecond timestamp       |
| title        | String | News title (in requested language)               |
| content      | String | News body in HTML format (in requested language) |

**Notes**

* `start_time` / `end_time` only support the most recent 7 days.


---

# Agent Instructions: Querying This Documentation

If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter:

```
GET https://sosovalue-1.gitbook.io/sosovalue-api-doc/6.-feeds/hot-news.md?ask=<question>
```

The question should be specific, self-contained, and written in natural language.
The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.


# 6.4 News Search

```
GET /news/search
```

**Query Parameters**

| Parameter  | Type    | Required | Default   | Description                                               |
| ---------- | ------- | -------- | --------- | --------------------------------------------------------- |
| keyword    | string  | Yes      | -         | Search keyword (title / content / tags)                   |
| page       | integer | No       | 1         | Page number, starting from 1                              |
| page\_size | integer | No       | 20        | Items per page, max 50                                    |
| category   | integer | No       | -         | Category filter                                           |
| sort       | string  | No       | relevance | Sort order: relevance descending, publish time descending |

**Response Example**

```json
{
    "code": 0,
    "message": "success",
    "data": {
        "page": 1,
        "page_size": 20,
        "total": 86,
        "list": [
            {
                "id": "news456",
                "source_link": "https://sosovalue.xyz/research/xxx",
                "release_time": 1677151845000,
                "title": "Latest Bitcoin ETF Developments",
                "content": "<p>HTML formatted body...</p>",
                "author": "Researcher A",
                "author_description": "Crypto Analyst",
                "author_avatar_url": "https://...",
                "nick_name": "Analyst ®",
                "is_blue_verified": 1,
                "verified_type": "Business",
                "category": 3,
                "feature_image": "https://xxx.png",
                "matched_currencies": [
                    {
                    "id": "1673723677362319866",
                    "full_name": "BITCOIN",
                    "name": "BTC"
                    }
                ],
                "tags": ["ETF", "BTC"],
                "media_info": [],
                "quote_info": null,
                "type": 3,
                "highlight": {
                    "title": "<em>Bitcoin</em> ETF Latest Developments",
                    "content": "<p>...<em>Bitcoin</em> ETF ...</p>"
                }
            }
        ]
    }
}
```


---

# Agent Instructions: Querying This Documentation

If you need additional information that is not directly available in this page, you can query the documentation dynamically by asking a question.

Perform an HTTP GET request on the current page URL with the `ask` query parameter:

```
GET https://sosovalue-1.gitbook.io/sosovalue-api-doc/6.-feeds/search.md?ask=<question>
```

The question should be specific, self-contained, and written in natural language.
The response will contain a direct answer to the question and relevant excerpts and sources from the documentation.

Use this mechanism when the answer is not explicitly present in the current page, you need clarification or additional context, or you want to retrieve related documentation sections.
