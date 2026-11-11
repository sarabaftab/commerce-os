-- AUD-006: store confirmation tokens as SHA-256 hex (Node createHash('sha256').digest('hex')).
-- Existing plaintext tokens are hashed in place so unique constraints stay satisfied.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

UPDATE "orders"
SET "confirmation_token" = encode(digest("confirmation_token", 'sha256'), 'hex')
WHERE length("confirmation_token") <> 64
   OR "confirmation_token" !~ '^[0-9a-f]{64}$';
