function normalizeLicenseStatus(value) {
  return String(value ?? '').trim().toLowerCase();
}

function isLicenseBlocked(status) {
  const normalized = normalizeLicenseStatus(status);
  return normalized === '' || normalized === 'bloqueado' || normalized === 'bloqueada';
}

function isValidManagerPin(pinDigitado, licData = {}) {
  const candidate = String(pinDigitado ?? '').trim();
  const candidatePinGerente = String(licData.pinGerente ?? '').trim();
  const candidatePinMestre = String(licData.pinMestre ?? '').trim();

  if (!candidate) return false;
  if (!candidatePinGerente && !candidatePinMestre) return false;

  return candidate === candidatePinGerente || candidate === candidatePinMestre;
}

function isSessionCacheExpired(storedAt, ttlMs = 1000 * 60 * 60 * 12) {
  if (!storedAt) return true;
  const timestamp = Number(storedAt);
  if (!Number.isFinite(timestamp)) return true;
  return Date.now() - timestamp > ttlMs;
}

function buildStoredSession(chaveLicenca, pin, ttlMs = 1000 * 60 * 60 * 12) {
  const chave = String(chaveLicenca ?? '').trim();
  const pinDigitado = String(pin ?? '').trim();
  if (!chave || !pinDigitado) return null;
  return {
    chave,
    pin: pinDigitado,
    storedAt: Date.now(),
    expiresAt: Date.now() + ttlMs,
  };
}

if (typeof window !== 'undefined') {
  window.FlowPDVAuthRules = {
    normalizeLicenseStatus,
    isLicenseBlocked,
    isValidManagerPin,
    isSessionCacheExpired,
    buildStoredSession,
  };
}

export { normalizeLicenseStatus, isLicenseBlocked, isValidManagerPin, isSessionCacheExpired, buildStoredSession };
