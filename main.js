import dotenv from 'dotenv';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { encodeAson } from './ason.js';
import { encodeJdon } from './JDON.js';
import { encodeTonl } from './tonl.js';
import { encodeToon } from './toon.js';
import { encodeCsv } from './csv.js';
import { encodeYaml } from './yaml.js';
import { encodeXml } from './xml.js';

dotenv.config();

const rl = readline.createInterface({ input, output });
const apiKey = process.env.ANTHROPIC_API_KEY || '';
const INPUT_FILE = path.resolve(process.cwd(), 'input.txt');
const OUTPUT_FILE = path.resolve(process.cwd(), 'output.txt');
const LLM_QUERY_FILE = path.resolve(process.cwd(), 'llm-query.txt');
const LLM_RESPONSE_FILE = path.resolve(process.cwd(), 'llm-query-response.txt');

const formatChoices = [
  { key: '1', name: 'CSV', encode: encodeCsv },
  { key: '2', name: 'ASON', encode: encodeAson },
  { key: '3', name: 'JDON', encode: (data) => encodeJdon(data, { pretty: true, columnar: true }) },
  { key: '4', name: 'TONL', encode: encodeTonl },
  { key: '5', name: 'TOON', encode: encodeToon },
  { key: '6', name: 'YAML', encode: encodeYaml },
  { key: '7', name: 'XML', encode: encodeXml },
];

const mainMenu = `
Select an option:
  1) Convert JSON to a custom format
  2) Send a request to the Anthropic API
`.trim();

const formatMenu = `
Select the target format:
  1) CSV
  2) ASON
  3) JDON
  4) TONL
  5) TOON
  6) YAML
  7) XML
  B) Back to main menu
`.trim();

const question = async (prompt) => rl.question(`${prompt.trim()} `);

const promptUntilValid = async (prompt, validator) => {
  while (true) {
    const answer = (await question(prompt)).trim();
    const validation = validator(answer);
    if (validation.valid) {
      return validation.value;
    }
    console.log(validation.message);
  }
};

const parseJsonInput = async () => {
  try {
    const raw = await readFile(INPUT_FILE, 'utf8');
    if (!raw.trim()) {
      throw new Error('Input file is empty.');
    }
    console.log('Raw input:');
    console.log(raw);
    console.log('--------------------------------');
    console.log('Parsed input:');
    console.log(JSON.parse(raw));
    console.log('--------------------------------');
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `Failed to read JSON from ${path.basename(INPUT_FILE)}: ${error.message}`
    );
  }
};

const writeConversionOutput = async (payload) => {
  await writeFile(OUTPUT_FILE, payload, 'utf8');
};

const handleConversion = async (formatSelection = null) => {
  while (true) {
    let selection = formatSelection;

    if (!selection) {
      console.log(formatMenu);
      selection = await promptUntilValid('Choose a format (1-7 or B):', (answer) => {
        if (!answer) {
          return { valid: false, message: 'Input cannot be empty. Please choose 1-7 or B.' };
        }
        const normalized = answer.trim().toUpperCase();
        if (['1', '2', '3', '4', '5', '6', '7'].includes(normalized) || normalized === 'B') {
          return { valid: true, value: normalized };
        }
        return { valid: false, message: 'Invalid choice. Please enter 1, 2, 3, 4, 5, 6, 7, or B/b.' };
      });
    }

    if (selection === 'B') {
      return false;
    }

    const target = formatChoices.find((choice) => choice.key === selection);
    if (!target) {
      console.log('Unknown format. Please try again.');
      if (formatSelection) {
        return false;
      }
      continue;
    }

    let jsonPayload;
    try {
      jsonPayload = await parseJsonInput();
    } catch (error) {
      console.error(error.message);
      return false;
    }

    try {
      const formatted = await Promise.resolve(target.encode(jsonPayload));
      const printable =
        typeof formatted === 'string' ? formatted : JSON.stringify(formatted, null, 2);
      await writeConversionOutput(printable);
      console.log(`\n${target.name} output written to ${path.basename(OUTPUT_FILE)}.`);
      console.log(`\n${target.name} output preview:\n${printable}\n`);
    } catch (error) {
      console.error(`Failed to encode ${target.name}:`, error.message || error);
      return false;
    }

    return true;
  }
};

const buildAnthropicPayload = (userMessage) => {
  const payload = {
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: userMessage
          },
        ],
      },
    ],
  };

  const accountId = process.env.NETSUITE_ACCOUNT_ID;
  const authToken = process.env.NETSUITE_AUTHORIZATION_TOKEN;
  if (accountId && authToken) {
    payload.mcp_servers = [
      {
        name: 'ns-mcp-tools',
        type: 'url',
        url: `https://${accountId}.suitetalk.api.netsuite.com/services/mcp/v1/suiteapp/com.netsuite.mcpstandardtools`,
        authorization_token: authToken,
      },
    ];
  }

  return payload;
};

const handleAnthropic = async (skipPrompt = false) => {
  if (!apiKey) {
    console.log('ANTHROPIC_API_KEY is not set. Please add it to your .env file before calling the API.');
    return false;
  }

  if (!skipPrompt) {
    const query = await promptUntilValid('Press Enter to load query from llm-query.txt or type B to go back:', (answer) => {
      const trimmed = answer.trim().toUpperCase();
      if (trimmed === 'B') {
        return { valid: true, value: 'B' };
      }
      return { valid: true, value: '' };
    });

    if (query === 'B') {
      return false;
    }
  }

  let llmQuery;
  try {
    console.log('Reading LLM query from:');
    console.log(LLM_QUERY_FILE);
    console.log('--------------------------------');
    llmQuery = (await readFile(LLM_QUERY_FILE, 'utf8')).trim();
    if (!llmQuery) {
      throw new Error('Query file is empty.');
    }

    // Check if <CONVERTED_FORMAT_PAYLOAD> placeholder exists in the query
    const hasPayloadPlaceholder = llmQuery.includes('<CONVERTED_FORMAT_PAYLOAD>');

    if (hasPayloadPlaceholder) {
      // Validate that output.txt exists and is not empty
      let outputContent;
      try {
        outputContent = (await readFile(OUTPUT_FILE, 'utf8')).trim();
        if (!outputContent) {
          throw new Error(
            `The query contains <CONVERTED_FORMAT_PAYLOAD> placeholder, but ${path.basename(OUTPUT_FILE)} is empty. ` +
            `Please ensure ${path.basename(OUTPUT_FILE)} contains the payload data.`
          );
        }
      } catch (error) {
        if (error.code === 'ENOENT') {
          throw new Error(
            `The query contains <CONVERTED_FORMAT_PAYLOAD> placeholder, but ${path.basename(OUTPUT_FILE)} does not exist. ` +
            `Please create ${path.basename(OUTPUT_FILE)} with the payload data or remove <CONVERTED_FORMAT_PAYLOAD> from ${path.basename(LLM_QUERY_FILE)}.`
          );
        }
        throw new Error(
          `Failed to read payload from ${path.basename(OUTPUT_FILE)}: ${error.message}`
        );
      }

      // Replace all occurrences of <CONVERTED_FORMAT_PAYLOAD> with the actual payload content
      llmQuery = llmQuery.replace(/<CONVERTED_FORMAT_PAYLOAD>/g, outputContent);
      console.log('LLM query (with payload from output.txt):');
    } else {
      console.log('LLM query:');
    }

    console.log(llmQuery);
    console.log('--------------------------------');
  } catch (error) {
    console.error(
      `Failed to read LLM query from ${path.basename(LLM_QUERY_FILE)}: ${error.message}`
    );
    return false;
  }

  console.log(`\nCalling Anthropic API with ${path.basename(LLM_QUERY_FILE)}...\n`);
  const payload = buildAnthropicPayload(llmQuery);

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'mcp-client-2025-04-04',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        `Anthropic API Error: ${response.status} ${response.statusText} - ${JSON.stringify(data)}`
      );
    }

    await writeFile(LLM_RESPONSE_FILE, JSON.stringify(data, null, 2), 'utf8');
    console.log(
      `\nFull Anthropic response JSON written to ${path.basename(LLM_RESPONSE_FILE)}.\n`
    );
    console.log('\nFull Anthropic response JSON:\n', data);
  } catch (error) {
    console.error('Anthropic request failed:', error.message || error);
  }

  return true;
};

const shouldExit = async () => {
  const answer = await question('Do you want to exit? (Y/y to exit, anything else to continue):');
  return ['y', 'Y'].includes(answer.trim());
};

const main = async () => {
  // Parse command-line arguments
  const args = process.argv.slice(2);
  const hasArgs = args.length > 0;

  if (hasArgs) {
    // Non-interactive mode
    const action = args[0];

    if (action === '1') {
      // Convert JSON to format
      if (args.length < 2) {
        console.error('Error: Format selection required. Usage: node main.js 1 <format>');
        console.error('Formats: 1=CSV, 2=ASON, 3=JDON, 4=TONL, 5=TOON, 6=YAML, 7=XML');
        process.exit(1);
      }
      const formatSelection = args[1];
      if (!['1', '2', '3', '4', '5', '6', '7'].includes(formatSelection)) {
        console.error(`Error: Invalid format "${formatSelection}". Must be 1-7.`);
        console.error('Formats: 1=CSV, 2=ASON, 3=JDON, 4=TONL, 5=TOON, 6=YAML, 7=XML');
        process.exit(1);
      }
      const success = await handleConversion(formatSelection);
      process.exit(success ? 0 : 1);
    } else if (action === '2') {
      // Send request to Anthropic API
      const success = await handleAnthropic(true);
      process.exit(success ? 0 : 1);
    } else {
      console.error(`Error: Invalid action "${action}". Must be 1 or 2.`);
      console.error('Usage:');
      console.error('  node main.js 1 <format>  - Convert JSON to format (1-7)');
      console.error('  node main.js 2           - Send request to Anthropic API');
      process.exit(1);
    }
  } else {
    // Interactive mode
    console.log('Welcome to the LLM Input Formats CLI!');
    let exitRequested = false;

    while (!exitRequested) {
      console.log(`\n${mainMenu}\n`);
      const action = await promptUntilValid('Choose option 1 or 2:', (answer) => {
        if (answer === '1' || answer === '2') {
          return { valid: true, value: answer };
        }
        return { valid: false, message: 'Please enter 1 or 2.' };
      });

      let performedAction = true;
      if (action === '1') {
        performedAction = await handleConversion();
      } else if (action === '2') {
        performedAction = await handleAnthropic();
      }

      if (performedAction) {
        exitRequested = await shouldExit();
      }
    }

    console.log('Goodbye!');
    rl.close();
  }
};

main().catch((error) => {
  console.error('Unexpected error:', error);
  rl.close();
  process.exit(1);
});