-- Anonymous code starts do not reserve permanent account identities.
ALTER TABLE account_codes ADD COLUMN email TEXT;
UPDATE account_codes c SET email = a.email FROM accounts a WHERE a.id = c.account_id;
-- A relay still serving during Fly's release command inserts verification and
-- reset codes with account_id only. Fill its new email column before NOT NULL
-- enforcement; anonymous new sign-in codes already provide email directly.
CREATE FUNCTION account_codes_fill_legacy_email() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.email IS NULL AND NEW.account_id IS NOT NULL THEN
        SELECT email INTO NEW.email FROM accounts WHERE id = NEW.account_id;
    END IF;
    RETURN NEW;
END
$$;
CREATE TRIGGER account_codes_fill_legacy_email_insert
    BEFORE INSERT ON account_codes
    FOR EACH ROW EXECUTE FUNCTION account_codes_fill_legacy_email();
ALTER TABLE account_codes
    ALTER COLUMN email SET NOT NULL,
    ADD CONSTRAINT account_codes_email_check
        CHECK (email = lower(btrim(email)) AND length(email) <= 254),
    ADD CONSTRAINT account_codes_pending_sign_in_check
        CHECK (account_id IS NOT NULL OR purpose = 'sign_in'),
    ALTER COLUMN account_id DROP NOT NULL;
DROP INDEX account_codes_one_active_purpose;
CREATE UNIQUE INDEX account_codes_one_active_purpose
    ON account_codes (email, purpose) WHERE consumed_at IS NULL;
ALTER TABLE account_mail_outbox ALTER COLUMN account_id DROP NOT NULL;
ALTER TABLE account_test_mail ALTER COLUMN account_id DROP NOT NULL;
