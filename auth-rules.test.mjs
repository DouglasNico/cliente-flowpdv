import assert from 'node:assert/strict';
import { isLicenseBlocked, isValidManagerPin, isSessionCacheExpired, buildStoredSession } from './auth-rules.js';

assert.equal(isLicenseBlocked('ativo'), false);
assert.equal(isLicenseBlocked('bloqueado'), true);
assert.equal(isLicenseBlocked('bloqueada'), true);
assert.equal(isLicenseBlocked('pendente'), false);

assert.equal(isValidManagerPin('1234', { pinGerente: '4321', pinMestre: '9999' }), false);
assert.equal(isValidManagerPin('4321', { pinGerente: '4321', pinMestre: '9999' }), true);
assert.equal(isValidManagerPin('9999', { pinGerente: '4321', pinMestre: '9999' }), true);
assert.equal(isValidManagerPin('1234', { pinGerente: '', pinMestre: '' }), false);

assert.equal(isSessionCacheExpired(Date.now() - (12 * 60 * 60 * 1000 + 1000)), true);
assert.equal(isSessionCacheExpired(Date.now() - 10, 1000 * 60), false);

const session = buildStoredSession('LIC-123', '4321', 1000 * 60);
assert.ok(session && session.chave === 'LIC-123');
assert.equal(session.pin, '4321');
assert.equal(isSessionCacheExpired(session.storedAt, 1000 * 60), false);

console.log('auth-rules ok');
