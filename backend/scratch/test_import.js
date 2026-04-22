import { jsonrepair } from 'jsonrepair';
console.log('repair lowercase:', typeof jsonrepair);
try {
  const { jsonRepair } = await import('jsonrepair');
  console.log('repair camelCase:', typeof jsonRepair);
} catch (e) {
  console.log('repair camelCase failed');
}
