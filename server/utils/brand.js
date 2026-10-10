/**
 * The agency a client-facing page or email is branded as.
 *
 * This CRM sends from a single account, so every photo email and gallery page
 * carries the same name as the From line in emailService. BRAND_NAME
 * overrides it without a code change.
 */

const { FROM_NAME } = require('./emailService');

const BRAND_NAME = (process.env.BRAND_NAME || FROM_NAME || 'Think Models').trim();

/**
 * @returns {{ name: string, main: string, sub: string|null }}
 *   name - "Think Models", for running text
 *   main / sub - the two-line wordmark, "THINK" over "MODELS"
 */
function brandForAccount() {
  const name = BRAND_NAME;
  const m = /^(.*\S)\s+(models?)$/i.exec(name);
  return m
    ? { name, main: m[1].toUpperCase(), sub: m[2].toUpperCase() }
    : { name, main: name.toUpperCase(), sub: null };
}

module.exports = { brandForAccount };
