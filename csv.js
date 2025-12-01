import { json2csv, csv2json } from 'json-2-csv';

export const encodeCsv = async (data) => {
  if (typeof data !== 'object' || data === null) {
    throw new Error('CSV encoder expects a JSON object or array.');
  }
  try {
    const csv = await json2csv(data);
    return csv;
  } catch (error) {
    throw new Error(`Failed to convert JSON to CSV: ${error.message}`);
  }
};

export const decodeCsv = async (csvString) => {
  if (typeof csvString !== 'string') {
    throw new Error('CSV decoder expects a string payload.');
  }
  try {
    const json = await csv2json(csvString);
    return json;
  } catch (error) {
    throw new Error(`Failed to convert CSV to JSON: ${error.message}`);
  }
};