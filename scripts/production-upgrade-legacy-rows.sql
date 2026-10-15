-- Representative writes made by the relay deployed at c9315a6. Fixed IDs
-- make post-migration preservation assertions independent of sequence order.
INSERT INTO accounts (
    id, email, email_verified_at, pubkey, wrapped_dek, kek_id, sealed_nsec, nonce
) VALUES (
    '11111111-1111-4111-8111-111111111111', 'owner@example.test', now(),
    repeat('a', 64), decode(repeat('b', 64), 'hex'), 'legacy-kek',
    decode(repeat('c', 32), 'hex'), decode(repeat('d', 24), 'hex')
);

INSERT INTO account_codes (
    id, account_id, purpose, code_hash, expires_at
) VALUES (
    '22222222-2222-4222-8222-222222222222',
    '11111111-1111-4111-8111-111111111111',
    'verify_email', decode(repeat('e', 64), 'hex'), now() + interval '15 minutes'
);

INSERT INTO account_mail_outbox (
    id, account_id, code_id, recipient, purpose, code_ciphertext, nonce
) VALUES (
    '33333333-3333-4333-8333-333333333333',
    '11111111-1111-4111-8111-111111111111',
    '22222222-2222-4222-8222-222222222222',
    'owner@example.test', 'verify_email',
    decode(repeat('f', 32), 'hex'), decode(repeat('a', 24), 'hex')
);

INSERT INTO account_test_mail (
    outbox_id, account_id, recipient, purpose, code
) VALUES (
    '33333333-3333-4333-8333-333333333333',
    '11111111-1111-4111-8111-111111111111',
    'owner@example.test', 'verify_email', '482913'
);

INSERT INTO account_payment_intents (
    reference, account_id, idempotency_key, provider, pack_id,
    charge_minor_units, charge_currency, grant_nanousd, status,
    provider_payment_id
) VALUES (
    'legacy-payfast', '11111111-1111-4111-8111-111111111111',
    '44444444-4444-4444-8444-444444444444', 'payfast', 'starter',
    11900, 'ZAR', 5000000000, 'paid', '12345'
);

INSERT INTO account_payment_notifications (
    event_id, reference, provider_payment_id, provider_status,
    amount_zar_cents, result
) VALUES (
    repeat('d', 64), 'legacy-payfast', '12345', 'COMPLETE', 11900, 'applied'
);
