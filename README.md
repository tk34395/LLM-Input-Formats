## LLM Input Formats CLI

This project demonstrates seven high-efficiency serialization formats (CSV, ASON, JDON, TONL, TOON, YAML, and XML) alongside a simple Anthropic messaging client. The `main.js` script acts as an interactive CLI that keeps prompting until you explicitly exit, allowing you to:

- Convert arbitrary JSON into one of the supported formats
- Dispatch a prompt to Anthropic's `/v1/messages` endpoint with the exact headers requested (`x-api-key`, `anthropic-version`, `anthropic-beta`)

### Prerequisites

- Node.js 18+ (tested with v22.21.0)
- npm (comes with Node)
- An Anthropic API key if you plan to call the API (conversion mode works without it)

### Setup & Run

1. Clone the repository:
   ```
   git clone https://github.com/tk34395/LLM-Input-Formats.git
   cd LLM-Input-Formats
   ```
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file alongside `main.js` and add:
   ```
   ANTHROPIC_API_KEY=your-anthropic-api-key
   NETSUITE_ACCOUNT_ID=account_id
   NETSUITE_AUTHORIZATION_TOKEN=bearer-token
   ```
   The NetSuite variables are only required if you want the MCP server information included in the payload.
4. Place the JSON you want to convert into `input.txt` (same directory as `main.js`). Each run overwrites `output.txt` with the latest encoded payload.
5. Author any Anthropic prompt in `llm-query.txt` (the file is read verbatim when you choose option 2). You can include payloads using the `<CONVERTED_FORMAT_PAYLOAD>` placeholder (automatically replaced with content from `output.txt`) or by directly pasting the payload into the file. See the "Including Payloads in LLM Queries" section below for details. Responses are persisted to `llm-query-response.txt`.
6. Start the CLI:
   ```
   node main.js
   ```

After every action the CLI asks *“Do you want to exit? (Y/y to exit, anything else to continue)”*. It will loop until you respond with `Y` or `y`.

### CLI Flow

1. **Main Menu** – choose between:
   - `1` Convert JSON into a format
   - `2` Send a prompt to Anthropic
2. **Conversion Menu** – if you picked option 1 you can select:
   - `CSV`, `ASON`, `JDON`, `TONL`, `TOON`, `YAML`, `XML`, or `B` to go back
3. **Input files** – Conversion mode reads JSON from `input.txt`; Anthropic mode reads the message from `llm-query.txt`. Blank or missing files cancel the operation with an error.
4. **Output** – Conversion results are written to `output.txt` (and the path is logged). Anthropic calls write the complete JSON response to `llm-query-response.txt` in addition to console logs.

### Format Modules

Each format has a small dedicated module that exposes focused encode/decode helpers:

- `ason.js`
  - Uses `SmartCompressor` from `@ason-format/ason`
  - `encodeAson(data)` compresses JSON objects into the binary-safe ASON string
  - `decodeAson(asonString)` restores the original object
- `JDON.js`
  - Implements the JDON parser and serializer
  - `encodeJdon(data)` turns any JSON value into compact JDON (columnar arrays by default)
  - `decodeJdon(jdonString)` returns the parsed JavaScript value
- `tonl.js`
  - Wraps `encodeTONL` / `decodeTONL` from the `tonl` package
  - `encodeTonl(data)` emits TONL text, `decodeTonl(tonlString)` rebuilds the object
- `toon.js`
  - Wraps `@toon-format/toon`
  - `encodeToon(data)` → TOON string, `decodeToon(toonString)` → JavaScript value
- `csv.js`
  - Uses `json-2-csv` package
  - `encodeCsv(data)` converts JSON objects/arrays to CSV format
  - `decodeCsv(csvString)` converts CSV back to JSON array
- `yaml.js`
  - Uses `@catalystic/json-to-yaml` for encoding and `js-yaml` for decoding
  - `encodeYaml(data)` converts JSON objects/arrays to YAML format
  - `decodeYaml(yamlString)` converts YAML back to JSON
- `xml.js`
  - Uses `jstoxml` for encoding and `fast-xml-parser` for decoding
  - `encodeXml(data)` converts JSON objects/arrays to XML format
  - `decodeXml(xmlString)` converts XML back to JSON

These helpers are imported into `main.js`, keeping the CLI logic decoupled from individual encoding libraries.

### Anthropic Requests

- Endpoint: `https://api.anthropic.com/v1/messages`
- Headers: `x-api-key`, `anthropic-version: 2023-06-01`, `anthropic-beta: mcp-client-2025-04-04`
- Payload:
  - Model: `claude-sonnet-4-5-20250929`
  - Messages contain a single user block with cache-control metadata
  - Optional `mcp_servers` entry is added when `NETSUITE_ACCOUNT_ID` and `NETSUITE_AUTHORIZATION_TOKEN` are available

#### Including Payloads in LLM Queries

You have two options for including payloads in your LLM queries:

##### Option A: Using the `<CONVERTED_FORMAT_PAYLOAD>` Placeholder

This method automatically inserts the content from `output.txt` into your query:

1. **Convert your JSON** – Use option 1 to convert JSON from `input.txt` to any format. The result is saved to `output.txt`.
2. **Add the placeholder** – In `llm-query.txt`, include `<CONVERTED_FORMAT_PAYLOAD>` where you want the payload to appear. For example:
   ```
   Create a sales order in NetSuite with below data:
   <CONVERTED_FORMAT_PAYLOAD>
   ```
3. **Send the request** – When you choose option 2, the system will:
   - Detect the `<CONVERTED_FORMAT_PAYLOAD>` placeholder in `llm-query.txt`
   - Read the content from `output.txt`
   - Replace all occurrences of `<CONVERTED_FORMAT_PAYLOAD>` with the actual payload
   - Send the complete query to the Anthropic API

**Validations:**
- If `<CONVERTED_FORMAT_PAYLOAD>` is present in `llm-query.txt`, `output.txt` must exist and not be empty
- If `output.txt` is missing or empty when `<CONVERTED_FORMAT_PAYLOAD>` is used, the operation will fail with a descriptive error message

##### Option B: Direct Payload Insertion

Alternatively, you can directly paste the payload content into `llm-query.txt`:

1. **Copy your payload** – Copy the payload content from `output.txt` or any other source.
2. **Paste directly** – In `llm-query.txt`, remove `<CONVERTED_FORMAT_PAYLOAD>` (if present) and paste your payload directly. For example:
   ```
   Create a sales order in NetSuite with below data:
   <entity><id>44247</id></entity><tranDate>2024-01-15</tranDate>...
   ```
3. **Send the request** – When you choose option 2, the query will be sent as-is without any modifications.

**Note:** If `<CONVERTED_FORMAT_PAYLOAD>` is not present in `llm-query.txt`, the query is sent as-is without any modifications, regardless of whether `output.txt` exists.

If the API key is missing the CLI shows guidance and returns to the menu instead of crashing.

### Troubleshooting

- **`require` is not defined** – the project uses ES modules (`"type": "module"` in `package.json`). Ensure all imports use `import ... from`.
- **Missing `.env`** – conversions still work, but Anthropic calls will be disabled until the key is provided.
- **Invalid JSON** – the CLI reports the parse error and asks again; paste minified JSON to keep input on a single line.

