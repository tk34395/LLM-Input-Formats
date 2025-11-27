/**
 * JDON Parser - JSON-Delimited Object Notation
 * Supports columnar array format for extreme token efficiency
 */

class JDONParser {
  parse(input) {
    input = input.trim();

    if (!input) return null;

    // Handle objects
    if (input.startsWith("{")) {
      return this.parseObject(input);
    }

    // Handle arrays
    if (input.startsWith("[")) {
      return this.parseArray(input);
    }

    // Handle pipe-delimited format (top-level)
    if (input.includes("|") && input.includes(":")) {
      return this.parsePipeDelimited(input);
    }

    // Single value
    return this.parseValue(input);
  }

  parsePipeDelimited(input) {
    const obj = {};
    const pairs = this.splitByPipe(input);

    for (const pair of pairs) {
      if (!pair.trim()) continue;

      const colonIdx = this.findTopLevelColon(pair);
      if (colonIdx === -1) continue;

      const key = pair.substring(0, colonIdx).trim();
      const value = pair.substring(colonIdx + 1).trim();

      obj[key] = this.parseValue(value);
    }

    return obj;
  }

  parseObject(input) {
    input = input.trim();

    if (!input.startsWith("{") || !input.endsWith("}")) {
      throw new Error("Invalid object syntax");
    }

    const content = input.slice(1, -1).trim();

    if (!content) return {};

    return this.parsePipeDelimited(content);
  }

  parseArray(input) {
    input = input.trim();

    if (!input.startsWith("[") || !input.endsWith("]")) {
      throw new Error("Invalid array syntax");
    }

    const content = input.slice(1, -1).trim();

    if (!content) return [];

    // Check if it's columnar format (contains pipes and colons)
    if (content.includes("|") && content.includes(":")) {
      return this.parseColumnarArray(content);
    }

    // Standard array format
    const items = this.splitArrayItems(content);
    return items
      .map((item) => this.parseValue(item.trim()))
      .filter((v) => v !== undefined);
  }

  parseColumnarArray(input) {
    // Parse columnar format: key:val1,val2,val3|key:val1,val2,val3
    const columns = {};
    const pairs = this.splitByPipe(input);

    for (const pair of pairs) {
      if (!pair.trim()) continue;

      const colonIdx = this.findTopLevelColon(pair);
      if (colonIdx === -1) continue;

      const key = pair.substring(0, colonIdx).trim();
      const valuesStr = pair.substring(colonIdx + 1).trim();

      // Split values by comma
      const values = this.splitArrayItems(valuesStr);
      columns[key] = values.map((v) => this.parseValue(v.trim()));
    }

    // Convert columnar to row format
    const keys = Object.keys(columns);
    if (keys.length === 0) return [];

    const rowCount = columns[keys[0]].length;
    const result = [];

    for (let i = 0; i < rowCount; i++) {
      const row = {};
      for (const key of keys) {
        row[key] = columns[key][i];
      }
      result.push(row);
    }

    return result;
  }

  parseValue(value) {
    value = value.trim();

    if (!value) return null;

    if (value === "null") return null;
    if (value === "true") return true;
    if (value === "false") return false;
    if (value === "undefined") return undefined;
    if (value === "NaN") return NaN;
    if (value === "Infinity") return Infinity;
    if (value === "-Infinity") return -Infinity;

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      return this.unescapeString(value.slice(1, -1));
    }

    if (value.startsWith("{")) {
      return this.parseObject(value);
    }

    if (value.startsWith("[")) {
      return this.parseArray(value);
    }

    if (/^-?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(value)) {
      const num = parseFloat(value);
      if (Object.is(num, -0)) return -0;
      return num;
    }

    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
      return value;
    }

    return value;
  }

  splitByPipe(input) {
    const parts = [];
    let current = "";
    let depth = 0;
    let inString = false;
    let stringChar = "";

    for (let i = 0; i < input.length; i++) {
      const char = input[i];
      const prevChar = input[i - 1];

      if ((char === '"' || char === "'") && prevChar !== "\\") {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
        }
      }

      if (!inString) {
        if (char === "{" || char === "[") depth++;
        if (char === "}" || char === "]") depth--;

        if (char === "|" && depth === 0) {
          parts.push(current);
          current = "";
          continue;
        }
      }

      current += char;
    }

    if (current) parts.push(current);
    return parts;
  }

  splitArrayItems(input) {
    const parts = [];
    let current = "";
    let depth = 0;
    let inString = false;
    let stringChar = "";

    for (let i = 0; i < input.length; i++) {
      const char = input[i];
      const prevChar = input[i - 1];

      if ((char === '"' || char === "'") && prevChar !== "\\") {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
        }
      }

      if (!inString) {
        if (char === "{" || char === "[") depth++;
        if (char === "}" || char === "]") depth--;

        if (char === "," && depth === 0) {
          if (current.trim()) parts.push(current);
          current = "";
          continue;
        }
      }

      current += char;
    }

    if (current.trim()) parts.push(current);
    return parts;
  }

  findTopLevelColon(input) {
    let depth = 0;
    let inString = false;
    let stringChar = "";

    for (let i = 0; i < input.length; i++) {
      const char = input[i];
      const prevChar = input[i - 1];

      if ((char === '"' || char === "'") && prevChar !== "\\") {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
        }
      }

      if (!inString) {
        if (char === "{" || char === "[") depth++;
        if (char === "}" || char === "]") depth--;

        if (char === ":" && depth === 0) {
          return i;
        }
      }
    }

    return -1;
  }

  unescapeString(str) {
    return str
      .replace(/\\\\/g, "\x00")
      .replace(/\\n/g, "\n")
      .replace(/\\t/g, "\t")
      .replace(/\\r/g, "\r")
      .replace(/\\"/g, '"')
      .replace(/\\'/g, "'")
      .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
        String.fromCharCode(parseInt(hex, 16))
      )
      .replace(/\x00/g, "\\");
  }

  stringify(obj, options = {}) {
    const { pretty = false, columnar = true } = options;
    return this.stringifyValue(obj, 0, pretty, columnar);
  }

  stringifyValue(value, depth, pretty, columnar) {
    if (value === null) return "null";
    if (value === undefined) return "undefined";
    if (typeof value === "boolean") return String(value);
    if (Number.isNaN(value)) return "NaN";
    if (value === Infinity) return "Infinity";
    if (value === -Infinity) return "-Infinity";

    if (typeof value === "number") {
      if (Object.is(value, -0)) return "-0";
      return String(value);
    }

    if (typeof value === "string") {
      if (this.needsQuoting(value)) {
        return `"${this.escapeString(value)}"`;
      }
      return value;
    }

    // Arrays - check if columnar format applies
    if (Array.isArray(value)) {
      if (value.length === 0) return "[]";

      // Check if array of objects with same keys (columnar candidate)
      if (columnar && value.length > 0 && this.isArrayOfObjects(value)) {
        return this.stringifyColumnar(value, depth, pretty);
      }

      // Standard array format
      const items = value.map((item) =>
        this.stringifyValue(item, depth + 1, pretty, columnar)
      );
      return `[${items.join(",").replace(/\|/g, ",")}]`;
    }

    // Objects
    if (typeof value === "object") {
      const entries = Object.entries(value);
      if (entries.length === 0) return "{}";

      const pairs = entries.map(([key, val]) => {
        return `${key}:${this.stringifyValue(
          val,
          depth + 1,
          pretty,
          columnar
        )}`;
      });

      if (pretty && depth === 0) {
        return pairs.join("|\n");
      } else if (pretty) {
        const indent = "\n" + "  ".repeat(depth + 1);
        const closeIndent = "\n" + "  ".repeat(depth);
        return `{${indent}${pairs.join("|" + indent)}${closeIndent}}`;
      } else {
        return `{${pairs.join("|")}}`;
      }
    }

    return String(value);
  }

  isArrayOfObjects(arr) {
    if (!Array.isArray(arr) || arr.length === 0) return false;

    // Check if all items are objects (not arrays or primitives)
    if (
      !arr.every(
        (item) => item && typeof item === "object" && !Array.isArray(item)
      )
    ) {
      return false;
    }

    // Check if all objects have the same keys
    const firstKeys = Object.keys(arr[0]).sort();
    return arr.every((item) => {
      const keys = Object.keys(item).sort();
      return (
        keys.length === firstKeys.length &&
        keys.every((key, i) => key === firstKeys[i])
      );
    });
  }

  stringifyColumnar(arr, depth, pretty) {
    if (arr.length === 0) return "[]";

    const keys = Object.keys(arr[0]);
    const columns = [];

    for (const key of keys) {
      const values = arr.map((obj) =>
        this.stringifyValue(obj[key], depth + 1, false, false)
      );
      columns.push(`${key}:${values.join(",")}`);
    }

    if (pretty) {
      const indent = "\n  ";
      return `[${indent}${columns.join("|" + indent)}\n]`;
    } else {
      return `[${columns.join("|")}]`;
    }
  }

  needsQuoting(str) {
    return (
      str.includes(":") ||
      str.includes("|") ||
      str.includes(",") ||
      str.includes(" ") ||
      str.includes("{") ||
      str.includes("}") ||
      str.includes("[") ||
      str.includes("]") ||
      str.includes('"') ||
      str.includes("'") ||
      str.includes("\n") ||
      str.includes("\t")
    );
  }

  escapeString(str) {
    return str
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\n/g, "\\n")
      .replace(/\t/g, "\\t")
      .replace(/\r/g, "\\r")
      .replace(/[\x00-\x1F\x7F-\x9F]/g, (char) => {
        return "\\u" + ("0000" + char.charCodeAt(0).toString(16)).slice(-4);
      });
  }

  fromJSON(jsonString) {
    try {
      const obj = JSON.parse(jsonString);
      return this.stringify(obj, { pretty: true, columnar: true });
    } catch (error) {
      throw new Error(`Invalid JSON: ${error.message}`);
    }
  }

  toJSON(jdonString, options = {}) {
    const { pretty = false, indent = 2 } = options;
    try {
      const obj = this.parse(jdonString);
      return pretty ? JSON.stringify(obj, null, indent) : JSON.stringify(obj);
    } catch (error) {
      throw new Error(`Invalid JDON: ${error.message}`);
    }
  }
}

// Export
const JDON = new JDONParser();
const fromJSON = (json) => JDON.fromJSON(json);
const toJSON = (jdon, options) => JDON.toJSON(jdon, options);
const encodeJdon = (data, options = { pretty: true, columnar: true }) =>
  JDON.stringify(data, options);
const decodeJdon = (jdonString, options = { pretty: true }) =>
  JSON.parse(JDON.toJSON(jdonString, options));

export { JDON, JDONParser, fromJSON, toJSON, encodeJdon, decodeJdon };