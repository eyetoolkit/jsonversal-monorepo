#!/usr/bin/env node
// Test script: runs handlers directly without network
import { handlers } from './dist/index.js';

function test(name, fn, expectError = false) {
  try {
    const result = fn();
    const hasError = !!(result && result.error);
    const ok = expectError ? hasError : (result && !result.error);
    console.log(`${ok ? '✓' : '✗'} ${name}${expectError ? ' (expects error)' : ''}`);
    if (!ok) console.log('  Result:', JSON.stringify(result, null, 2));
  } catch (e) {
    console.log(`✗ ${name}: ${e.message}`);
  }
}

console.log('\n=== json_format ===');
test('format basic', () => handlers.json_format({ json: '{"a":1,"b":2}', indent: 2 }));
test('format string input', () => handlers.json_format({ json: '{"a":1}' }));
test('format missing json', () => handlers.json_format({}), true);

console.log('\n=== json_validate ===');
test('validate valid', () => handlers.json_validate({ json: '{"a":1}' }));
test('validate invalid', () => handlers.json_validate({ json: 'not json' }));
test('validate with schema', () => handlers.json_validate({ json: '{"a":1}', schema: '{"type":"object"}' }));

console.log('\n=== json_minify ===');
test('minify basic', () => handlers.json_minify({ json: '{ "a" : 1 }' }));

console.log('\n=== json_diff ===');
test('diff equal', () => handlers.json_diff({ jsonA: '{"a":1}', jsonB: '{"a":1}' }));
test('diff different', () => handlers.json_diff({ jsonA: '{"a":1}', jsonB: '{"a":2}' }));
test('diff added key', () => handlers.json_diff({ jsonA: '{"a":1}', jsonB: '{"a":1,"b":2}' }));

console.log('\n=== json_to_zod ===');
test('zod from object', () => handlers.json_to_zod({ json: '{"name":"test","age":30}' }));
test('zod with name', () => handlers.json_to_zod({ json: '{"active":true}', name: 'User' }));

console.log('\n=== json_to_typescript ===');
test('ts from object', () => handlers.json_to_typescript({ json: '{"name":"test","age":30}' }));

console.log('\n=== json_token_count ===');
test('token count', () => handlers.json_token_count({ text: 'Hello world this is a test', model: 'gpt-4o' }));

console.log('\n=== regex_test ===');
test('regex match', () => handlers.regex_test({ pattern: '\\d+', flags: 'g', testStrings: ['abc123def456'] }));
test('regex no match', () => handlers.regex_test({ pattern: '\\d+', testStrings: ['nodigits'] }));
test('regex invalid', () => handlers.regex_test({ pattern: '[invalid' }), true);

console.log('\n=== jwt_decode ===');
test('jwt decode valid', () => handlers.jwt_decode({ token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c' }));
test('jwt decode invalid', () => handlers.jwt_decode({ token: 'not.a.jwt' }), true);
test('jwt decode missing', () => handlers.jwt_decode({}), true);

console.log('\n=== bcrypt_verify ===');
const hash = '$2a$10$H.GqhPMjMGYYTMvVT/HLYOqHGV6pS6Q9xC4xP7xV3x3QEQqGqMq3u'; // dummy
test('bcrypt verify', () => handlers.bcrypt_verify({ password: 'test', hash }));

console.log('\n=== hash_generate ===');
test('hash sha256', () => handlers.hash_generate({ text: 'hello world', algorithm: 'sha256' }));
test('hash md5', () => handlers.hash_generate({ text: 'hello', algorithm: 'md5' }));
test('hash bcrypt', () => handlers.hash_generate({ text: 'password', algorithm: 'bcrypt' }));

console.log('\nDone.\n');
