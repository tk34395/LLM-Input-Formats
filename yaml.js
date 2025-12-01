import { convert } from "@catalystic/json-to-yaml";
import { load } from "js-yaml";

export const encodeYaml = (data) => {
  if (typeof data !== 'object' || data === null) {
    throw new Error('YAML encoder expects a JSON object or array.');
  }
  try {
    const yamlString = convert(data);
    return yamlString;
  } catch (error) {
    throw new Error(`Failed to convert JSON to YAML: ${error.message}`);
  }
};

export const decodeYaml = (yamlString) => {
  if (typeof yamlString !== 'string') {
    throw new Error('YAML decoder expects a string payload.');
  }
  try {
    const json = load(yamlString);
    return json;
  } catch (error) {
    throw new Error(`Failed to convert YAML to JSON: ${error.message}`);
  }
};