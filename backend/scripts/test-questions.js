// Quick manual test for M5: runs the question generator on sample slides.
// Usage: npm run test:questions
import 'dotenv/config';
import { generateQuestions } from '../src/questions.js';
import { configuredProviders } from '../src/llm.js';

const slides = [
  { page: 1, text: 'Big-O notation describes how the running time of an algorithm grows as the input size n grows. We ignore constants and lower-order terms.' },
  { page: 2, text: 'Linear search checks each element one by one, so its worst-case running time is O(n). Binary search needs a sorted array and runs in O(log n).' },
  { page: 3, text: 'Merge sort divides the array in half, sorts each half recursively, then merges them. Its running time is O(n log n) in all cases.' },
  { page: 4, text: 'A hash table stores key-value pairs. With a good hash function, lookup, insert and delete take O(1) time on average.' },
  { page: 5, text: 'A stack is last-in, first-out (LIFO). A queue is first-in, first-out (FIFO). Both support push and pop style operations in O(1).' },
];

console.log('Providers:', configuredProviders().map((p) => p.label).join(' -> ') || 'none');
const t0 = Date.now();
const result = await generateQuestions(slides, 6);
console.log(`Provider: ${result.provider} | fallback: ${result.usedFallback} | ${Date.now() - t0} ms`);
console.log(JSON.stringify(result.questions, null, 2));
