import { readFileSync } from 'node:fs';

function parseSSEFrame(frameText) {
  const raw = frameText.trim();
  if (!raw) return null;

  const lines = raw.split('\n');
  let eventName;
  const dataLines = [];

  for (const ln of lines) {
    const line = ln.trim();
    if (!line) continue;
    if (line.startsWith('event:')) {
      eventName = line.slice('event:'.length).trim();
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice('data:'.length).trim());
    }
  }

  const data = dataLines.join('\n');
  if (!data) return null;
  return { event: eventName, data };
}

function safeParseJson(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

const sse = readFileSync(new URL('./sse_sample_answer_format.txt', import.meta.url), 'utf8');
const frames = sse.split('\n\n').filter(Boolean);
let out = '';

for (const frameText of frames) {
  const frame = parseSSEFrame(frameText);
  if (!frame?.data) continue;
  const obj = safeParseJson(frame.data);
  if (!obj) continue;

  const token = typeof obj.answer === 'string' ? obj.answer : '';
  // emulate frontend filter
  if (token && token !== 'skip' && token !== 'llm_fast') out += token;
}

console.log(out);
