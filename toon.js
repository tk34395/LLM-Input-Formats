import { encode as encodeToonFormat, decode as decodeToonFormat } from '@toon-format/toon';

export const encodeToon = (data) => {
  if (typeof data !== 'object' || data === null) {
    throw new Error('TOON encoder expects a JSON object.');
  }
  return encodeToonFormat(data);
};

export const decodeToon = (toonString) => {
  if (typeof toonString !== 'string') {
    throw new Error('TOON decoder expects a string payload.');
  }
  return decodeToonFormat(toonString);
};