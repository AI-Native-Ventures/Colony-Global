-- Old binary writes must remain valid while Fly replaces the running relay.
INSERT INTO account_payment_notifications (
    event_id, reference, provider_payment_id, provider_status,
    amount_zar_cents, result
) VALUES (repeat('e', 64), NULL, NULL, 'COMPLETE', 250, 'processing');

INSERT INTO account_codes (account_id, purpose, code_hash, expires_at)
VALUES (
    '11111111-1111-4111-8111-111111111111', 'reset_password',
    decode(repeat('f', 64), 'hex'), now() + interval '15 minutes'
);

-- New binary writes must work with the same expanded schema.
INSERT INTO account_payment_notifications (
    event_id, reference, provider_payment_id, provider_status,
    amount_minor_units, result, provider, charge_currency
) VALUES ('evt_test_1', NULL, 'cs_test_1', 'paid', 500, 'processing', 'stripe', 'USD');

INSERT INTO account_codes (email, purpose, code_hash, expires_at)
VALUES (
    'new@example.test', 'sign_in', decode(repeat('a', 64), 'hex'),
    now() + interval '15 minutes'
);

DO $assertions$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM account_payment_notifications
        WHERE event_id = repeat('d', 64) AND amount_zar_cents = 11900
          AND amount_minor_units = 11900 AND provider = 'payfast'
          AND charge_currency = 'ZAR' AND result = 'applied'
    ) THEN
        RAISE EXCEPTION 'legacy PayFast notification was not preserved';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM account_payment_notifications
        WHERE event_id = repeat('e', 64) AND amount_zar_cents = 250
          AND amount_minor_units = 250
    ) THEN
        RAISE EXCEPTION 'old-binary PayFast insert was not mirrored';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM account_payment_notifications
        WHERE event_id = 'evt_test_1' AND amount_zar_cents IS NULL
          AND amount_minor_units = 500 AND provider = 'stripe'
          AND charge_currency = 'USD'
    ) THEN
        RAISE EXCEPTION 'new-binary Stripe insert was not preserved';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM account_payment_intents
        WHERE reference = 'legacy-payfast' AND provider = 'payfast'
          AND charge_currency = 'ZAR' AND charge_minor_units = 11900
          AND provider_payment_id = '12345'
    ) THEN
        RAISE EXCEPTION 'legacy PayFast intent was not preserved';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM account_codes
        WHERE id = '22222222-2222-4222-8222-222222222222'
          AND account_id = '11111111-1111-4111-8111-111111111111'
          AND email = 'owner@example.test' AND purpose = 'verify_email'
    ) THEN
        RAISE EXCEPTION 'existing account code was not backfilled';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM account_codes
        WHERE purpose = 'reset_password' AND email = 'owner@example.test'
          AND account_id = '11111111-1111-4111-8111-111111111111'
    ) THEN
        RAISE EXCEPTION 'old-binary account code insert was not backfilled';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM account_codes
        WHERE purpose = 'sign_in' AND email = 'new@example.test'
          AND account_id IS NULL
    ) THEN
        RAISE EXCEPTION 'new-binary anonymous sign-in code was not accepted';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM account_mail_outbox
        WHERE id = '33333333-3333-4333-8333-333333333333'
          AND account_id = '11111111-1111-4111-8111-111111111111'
          AND recipient = 'owner@example.test'
    ) OR NOT EXISTS (
        SELECT 1 FROM account_test_mail
        WHERE outbox_id = '33333333-3333-4333-8333-333333333333'
          AND code = '482913'
    ) THEN
        RAISE EXCEPTION 'legacy mail records were not preserved';
    END IF;
    IF to_regclass('account_ai_sessions') IS NULL
       OR to_regclass('account_ai_requests') IS NULL
       OR to_regclass('account_code_failures') IS NULL THEN
        RAISE EXCEPTION 'new durable account tables are missing';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'relay_members_role_check'
          AND pg_get_constraintdef(oid) LIKE '%partner%'
    ) THEN
        RAISE EXCEPTION 'partner membership constraint is missing';
    END IF;
END
$assertions$;
