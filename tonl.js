import { encodeTONL, decodeTONL } from 'tonl';

export const encodeTonl = (data) => {
  if (typeof data !== 'object' || data === null) {
    throw new Error('TONL encoder expects a JSON object.');
  }
  return encodeTONL(data);
};

export const decodeTonl = (tonlString) => {
  if (typeof tonlString !== 'string') {
    throw new Error('TONL decoder expects a string payload.');
  }
  return decodeTONL(tonlString);
};