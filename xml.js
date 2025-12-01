import { toXML } from 'jstoxml';
import { XMLParser } from 'fast-xml-parser';

const parser = new XMLParser();

export const encodeXml = (data) => {
  if (typeof data !== 'object' || data === null) {
    throw new Error('XML encoder expects a JSON object or array.');
  }
  try {
    const xmlString = toXML(data);
    return xmlString;
  } catch (error) {
    throw new Error(`Failed to convert JSON to XML: ${error.message}`);
  }
};

export const decodeXml = (xmlString) => {
  if (typeof xmlString !== 'string') {
    throw new Error('XML decoder expects a string payload.');
  }
  try {
    const json = parser.parse(xmlString);
    return json;
  } catch (error) {
    throw new Error(`Failed to convert XML to JSON: ${error.message}`);
  }
};