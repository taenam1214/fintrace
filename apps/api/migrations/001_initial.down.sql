DROP TRIGGER IF EXISTS audit_no_delete ON audit_log;
DROP TRIGGER IF EXISTS audit_no_update ON audit_log;
DROP FUNCTION IF EXISTS prevent_audit_mutation();
DROP TABLE IF EXISTS audit_log;
DROP TABLE IF EXISTS proposals;
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS accounts;
DROP TABLE IF EXISTS plaid_items;
