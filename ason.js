import { SmartCompressor } from '@ason-format/ason';

const compressor = new SmartCompressor();

const ensureObject = (payload) => {
  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('ASON expects a JSON object.');
  }
  return payload;
};

export const encodeAson = (data) => {
  const payload = ensureObject(data);
  return compressor.compress(payload);
};

export const decodeAson = (asonString) => {
  if (typeof asonString !== 'string') {
    throw new Error('ASON decoder expects a string payload.');
  }
  return compressor.decompress(asonString);
};