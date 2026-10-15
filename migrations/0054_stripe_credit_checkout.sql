-- Keep existing PayFast rows valid while adding immutable Stripe/USD terms.
ALTER TABLE account_payment_intents
    DROP CONSTRAINT account_payment_intents_provider_check,
    DROP CONSTRAINT account_payment_intents_charge_currency_check,
    DROP CONSTRAINT account_payment_intents_provider_payment_id_check,
    ADD CONSTRAINT account_payment_intents_provider_currency_check CHECK (
        (provider = 'payfast' AND charge_currency = 'ZAR') OR
        (provider = 'stripe' AND charge_currency = 'USD')
    ),
    ADD CONSTRAINT account_payment_intents_provider_payment_id_check CHECK (
        provider_payment_id IS NULL OR
        (provider = 'payfast' AND provider_payment_id ~ '^[0-9]{1,32}$') OR
        (provider = 'stripe' AND provider_payment_id ~ '^cs_[A-Za-z0-9_]{1,197}$')
    );
-- Fly runs the release migration while the previous relay machine can still
-- receive PayFast notifications. Keep its write column until that binary is
-- retired; the new relay writes the currency-neutral column instead.
ALTER TABLE account_payment_notifications
    ADD COLUMN amount_minor_units BIGINT
        CONSTRAINT account_payment_notifications_amount_minor_units_check
        CHECK (amount_minor_units >= 0);
UPDATE account_payment_notifications
    SET amount_minor_units = amount_zar_cents;
ALTER TABLE account_payment_notifications
    ADD COLUMN provider TEXT NOT NULL DEFAULT 'payfast' CHECK (provider IN ('payfast', 'stripe')),
    ADD COLUMN charge_currency TEXT NOT NULL DEFAULT 'ZAR' CHECK (charge_currency ~ '^[A-Z]{3}$'),
    DROP CONSTRAINT account_payment_notifications_event_id_check,
    DROP CONSTRAINT account_payment_notifications_provider_payment_id_check,
    ADD CONSTRAINT account_payment_notifications_event_id_check CHECK (
        (provider = 'payfast' AND event_id ~ '^[0-9a-f]{64}$') OR
        (provider = 'stripe' AND event_id ~ '^evt_[A-Za-z0-9_]{1,196}$')
    ),
    ADD CONSTRAINT account_payment_notifications_provider_payment_id_check CHECK (
        provider_payment_id IS NULL OR
        (provider = 'payfast' AND provider_payment_id ~ '^[0-9]{1,32}$') OR
        (provider = 'stripe' AND provider_payment_id ~ '^cs_[A-Za-z0-9_]{1,197}$')
    );

CREATE FUNCTION account_payment_notification_sync_amount() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.provider = 'payfast' THEN
        IF NEW.amount_minor_units IS NULL THEN
            NEW.amount_minor_units := NEW.amount_zar_cents;
        ELSIF NEW.amount_zar_cents IS NULL THEN
            NEW.amount_zar_cents := NEW.amount_minor_units;
        ELSIF NEW.amount_minor_units <> NEW.amount_zar_cents THEN
            RAISE EXCEPTION 'PayFast notification amounts disagree'
                USING ERRCODE = '23514';
        END IF;
    ELSIF NEW.amount_zar_cents IS NOT NULL THEN
        RAISE EXCEPTION 'non-ZAR notification cannot set amount_zar_cents'
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END
$$;

CREATE TRIGGER account_payment_notification_sync_amount_insert
    BEFORE INSERT ON account_payment_notifications
    FOR EACH ROW EXECUTE FUNCTION account_payment_notification_sync_amount();
