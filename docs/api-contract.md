# FutureWell API contract

The four endpoints `futurewell-ui` calls, for the team building `futurewell-system`.

This is the frontend's view of the contract, and it is already implemented twice
over: the TypeScript DTOs in `src/core/api/wire.ts` mirror it field for field, and
`src/core/api/mock/handlers.ts` serves it from fixtures. **If you want an
executable reference, run the mock** — `npm run dev` and open the app; every
response below is what the browser actually receives today.

All payloads are `snake_case`. The frontend maps them to camelCase at the API
boundary and nowhere else.

---

## Two rules the frontend holds to

These shape the contract, so they are worth stating before the endpoints.

**1. No clinical or statistical logic runs in the browser.** No Framingham
implementation, no risk thresholds, no DOSM tables, no distance maths. Whatever
you send is rendered as given. The prototype this replaces derived risk *levels*
client-side from hardcoded 30/55 cutoffs; that is exactly what this contract
exists to prevent.

**2. No health data is persisted.** Blood pressure, cholesterol, smoking and
diabetes live in memory for the session only — no `localStorage`, no cookies. A
refresh restarts the assessment. If you add a session or a saved-results feature,
that is a product decision to make deliberately, not a storage detail.

---

## 4.1 `GET /api/awareness`

Population context for the pictograph, before any clinical input is collected.

**Query:** `sex=male|female`, `age=41..59`

```json
{
  "context": {
    "sex_label": "men",
    "age_band": "41 to 59",
    "cause_label": "ischaemic heart disease",
    "share_percent": 24.8,
    "rank_label": "number one",
    "one_in": 4
  },
  "reference_rows": [
    { "group_label": "Malaysian men, 41-59",   "share_percent": 24.8, "one_in": 4 },
    { "group_label": "Malaysian women, 41-59", "share_percent": 15.1, "one_in": 7 }
  ],
  "source_label": "Department of Statistics Malaysia (DOSM)"
}
```

| Field | Notes |
|---|---|
| `context.share_percent` | Drives the pictograph: the frontend highlights `round(share_percent)` of 100 marks and nothing else. |
| `context.one_in` | **Computed backend-side**, not derived from `share_percent` in the browser, so rounding stays consistent with whatever the database holds. |
| `reference_rows` | Rendered as a table in the order given, one row per group: `share_percent` and `one_in` share a single cell (`24.8% (about 1 in 4)`). Both sexes are shown deliberately, whichever was requested. |
| `source_label` | Rendered verbatim, so **send exactly what should appear on screen** — the frontend neither shortens nor reformats it. Currently the agency name alone; a figure with no attributed source should not ship. |

`context` must be specific to the requested `sex` and `age`. Showing men's figures
to a woman is a factual error, not a cosmetic one — the frontend discards cached
awareness data the moment the profile changes for this reason.

---

## 4.2 `POST /api/risk`

The eight-input risk estimate. Age and sex come from section 01; the other six
from section 03. The frontend composes them at submit time.

**Request:**

```json
{
  "age": 53,
  "sex": "male",
  "systolic_bp": 145,
  "total_cholesterol": 5.5,
  "hdl_cholesterol": 1.2,
  "smoking": true,
  "diabetes": false,
  "bp_treated": true
}
```

Client-side ranges (immediate feedback only — **the backend remains the
authority**): age 41–59, `systolic_bp` 80–240 mmHg, `total_cholesterol` 2–12
mmol/L, `hdl_cholesterol` 0.3–4 mmol/L.

**Response:**

```json
{
  "risk": {
    "percent": 21.4,
    "level": "medium",
    "level_label": "Medium",
    "horizon_years": 10
  },
  "model": {
    "name": "Framingham General CVD Risk (D'Agostino et al.)",
    "citation": "D'Agostino RB et al. General Cardiovascular Risk Profile for Use in Primary Care. Circulation. 2008.",
    "caveat": "May not be calibrated for every population.",
    "is_validated": true
  }
}
```

Three things to get right:

- **`level` is a stable machine value** (`low` | `medium` | `high`), with
  `level_label` carrying the display text. The frontend never re-derives it from
  `percent`, and a test asserts that a response saying `high` at 21.4% renders as
  High. Change the thresholds whenever the model says so; no frontend release is
  involved.
- **`model` is a disclosure, not decoration.** It is rendered as given. When
  `is_validated` is `false` the UI adds an "Illustrative estimate only — this
  number was not produced by a validated clinical model" treatment. **Send
  `is_validated: false` for anything that is not a real validated model**,
  including any placeholder or fallback, or the output reads as clinical advice.
- **There is no `recommendations` object.** An earlier draft returned `diet` and
  `lifestyle` arrays of tips, which the frontend rendered as cards beside the
  written guidance. They said the same thing twice, because both are built from
  the same guidance records. The records now stay in the backend and reach the
  reader only as the rewritten prose from `/api/guidance`.
- **There is no `reasoning` field.** An earlier draft had one, carrying a sentence
  that named the inputs used ("Based on age, sex, blood pressure…"). It was
  removed: the summary panel already lists every input *with its value*, so
  naming them again without values said less in more words. Prose explaining the
  result belongs in `/api/guidance`, which exists for exactly that and has its own
  lifecycle. Send it there, not here.

**Validation errors:** standard FastAPI 422. The frontend maps `detail[].loc` to
the offending form field — the last segment of `loc` is used, converted from
snake_case, so `["body", "systolic_bp"]` lands on the systolic blood-pressure
input with your `msg` beneath it. A 422 is treated as a field-level disagreement,
never a section-level failure.

```json
{ "detail": [ { "loc": ["body", "systolic_bp"], "msg": "Input should be less than or equal to 240", "type": "less_than_equal" } ] }
```

---

## 4.3 `POST /api/guidance`

**This response is the entire advice shown to the reader.** Nothing else on the
page tells them what to do about their estimate, so whatever this returns is what
they act on.

It is deliberately a **separate call** from `/api/risk`: a model call takes
seconds and the risk result must not wait on it. The frontend fires this
immediately after the risk response and does not await it before rendering the
estimate.

**Request:**

```json
{
  "risk_inputs": { },
  "level": "medium"
}
```

No record ids are sent. Which guidance records apply is a rule in your database,
and the level and inputs are enough to select them — **the frontend never sees
the records**, so sending ids would only move that decision into the browser.

**Response:**

```json
{ "summary": "…" }
```

`summary` is rendered verbatim as a single paragraph, with no provenance shown.
There is no `generated_by` or `model_label`: the reader cannot tell rewritten
text from rule-based text, so both paths must be equally safe to act on. Track
which one ran server-side if you need it.

This endpoint is allowed to fail. A failure shows "Guidance unavailable" and
states that the estimate is unaffected; the result stays on screen. It is given a
longer client timeout than the other three.

**Because this is now the only advice on the page, a failure leaves the reader
with a number and nothing to do about it.** Prefer returning your rule-based text
over returning an error — reserve failure for cases where you have nothing at
all.

---

## 4.4 `GET /api/clinics` and `GET /api/clinics/clusters`

**`GET /api/clinics?q=&state=&type=&limit=&offset=`** — filtering is server-side.
The real registry is ~2,900 rows and must not all ship to the browser.

```json
{
  "total": 2915,
  "filtered_total": 37,
  "items": [
    {
      "id": "kk-tanglin",
      "name": "Klinik Kesihatan Tanglin",
      "type": "KESIHATAN",
      "state": "Kuala Lumpur",
      "district": "Kuala Lumpur",
      "address": "…",
      "phone": "…",
      "services": "…",
      "lat": 3.14,
      "lng": 101.69
    }
  ],
  "facets": {
    "states": [ { "value": "Selangor", "count": 254 } ],
    "types":  [ { "value": "DESA", "count": 1573 } ]
  }
}
```

**`GET /api/clinics/clusters?q=&state=&type=&zoom=`** — map aggregates for the
same filters:

```json
{ "clusters": [ { "lat": 3.14, "lng": 101.69, "count": 254, "state": "Selangor" } ] }
```

Four expectations:

- **Order is yours, and `items` order is authoritative.** The frontend renders the
  array as received and never re-sorts it. Pick a stable default order (name or
  state, absent geolocation) and keep it **deterministic across pages** — an
  unstable sort makes `limit`/`offset` skip and duplicate rows. A user-facing sort
  control would be a `sort=` param: a contract addition, not a frontend change.
- **`filtered_total` is what the UI counts with**, never `items.length`. The page
  is one slice of the match set.
- **Facets should be counted with the *other* filters applied**, not the current
  one. Counting `states` with the state filter already applied returns a single
  entry and strands the user on a filter they cannot change. Same for `types`.
- **`q` matches name, district, address and state** in the mock. Match whatever
  the registry supports; the frontend only passes the string through.

Both endpoints are called together whenever the filters change, so they must
agree — a map showing clusters the list does not contain is worse than no map.

---

## 4.5 Configuration — relative URLs, no CORS

`nginx.conf` proxies `/api/` to `http://localhost:8000`, so the deployed frontend
and the API share an origin. Consequences:

- **Every request uses a relative path** (`/api/risk`). There is no API host to
  configure and no environment variable for one.
- **Production needs no CORS.** The backend's `cors_origins` matters only for
  direct browser access to the API, not for this app.
- **Development mirrors production** through Vite's proxy, so `npm run dev`
  forwards `/api` to `http://localhost:8000`. The mock layer answers first unless
  it is switched off with `?mock=off`, which is how you test against a real
  backend.

**One deployment detail worth confirming early:** `nginx.conf` uses
`proxy_pass http://localhost:8000;` with no URI path, which passes the request URI
through **unchanged**. So `/api/risk` in the browser arrives at the backend as
`/api/risk` — FastAPI must mount these routes under the `/api` prefix, not at the
root. If you would rather serve them at `/risk`, the proxy line becomes
`proxy_pass http://localhost:8000/;` (note the trailing slash) and nginx strips the
prefix instead. Either works; they just have to agree.

## Error handling the frontend already implements

You do not need to shape errors specially. `src/core/api/http.ts` normalises
everything into one type, and each panel fails independently — one failed call
never blanks the page.

| Condition | What the user sees |
|---|---|
| Network failure / unreachable | "We could not reach FutureWell. Check your connection and try again." + Retry |
| Timeout (15s default) | "That took longer than expected." + Retry |
| 422 | Per-field messages from `detail[].loc` |
| 4xx | "We could not process that request." + Retry |
| 5xx | "FutureWell is having trouble right now." + Retry |
| 200 with a non-JSON body | Treated as a server error (this catches proxy error pages) |

No status code, stack trace or raw error message is ever shown to a user. Every
Retry is a button that re-runs the original request — nothing retries on its own,
so a failing backend gets no automatic traffic from an abandoned tab.
