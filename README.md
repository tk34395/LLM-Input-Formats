## LLM Input Formats CLI

This project demonstrates four high-efficiency serialization formats (ASON, JDON, TONL and TOON) alongside a simple Anthropic messaging client. The `main.js` script acts as an interactive CLI that keeps prompting until you explicitly exit, allowing you to:

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
   cd LLM Input Formats
   ```
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file alongside `main.js` and add:
   ```
   ANTHROPIC_API_KEY=your-api-key
   NETSUITE_ACCOUNT_ID=optional-account
   NETSUITE_AUTHORIZATION_TOKEN=optional-token
   ```
   The NetSuite variables are only required if you want the MCP server information included in the payload.
4. Place the JSON you want to convert into `input.txt` (same directory as `main.js`). Each run overwrites `output.txt` with the latest encoded payload.
5. Start the CLI:
   ```
   node main.js
   ```

After every action the CLI asks *“Do you want to exit? (Y/y to exit, anything else to continue)”*. It will loop until you respond with `Y` or `y`.

### CLI Flow

1. **Main Menu** – choose between:
   - `1` Convert JSON into a format
   - `2` Send a prompt to Anthropic
2. **Conversion Menu** – if you picked option 1 you can select:
   - `ASON`, `JDON`, `TONL`, `TOON`, or `B` to go back
3. **Input files** – Conversion mode reads the entire JSON payload from `input.txt`; blank files or invalid JSON abort the conversion.
4. **Output** – Conversion results are written to `output.txt` (and the path is logged). Anthropic calls still print either the first text block or the raw JSON response to the console.

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

These helpers are imported into `main.js`, keeping the CLI logic decoupled from individual encoding libraries.

### Anthropic Requests

- Endpoint: `https://api.anthropic.com/v1/messages`
- Headers: `x-api-key`, `anthropic-version: 2023-06-01`, `anthropic-beta: mcp-client-2025-04-04`
- Payload:
  - Model: `claude-sonnet-4-20250514`
  - Messages contain a single user block with cache-control metadata
  - Optional `mcp_servers` entry is added when `NETSUITE_ACCOUNT_ID` and `NETSUITE_AUTHORIZATION_TOKEN` are available

If the API key is missing the CLI shows guidance and returns to the menu instead of crashing.

### Troubleshooting

- **`require` is not defined** – the project uses ES modules (`"type": "module"` in `package.json`). Ensure all imports use `import ... from`.
- **Missing `.env`** – conversions still work, but Anthropic calls will be disabled until the key is provided.
- **Invalid JSON** – the CLI reports the parse error and asks again; paste minified JSON to keep input on a single line.

