-- 1. Update existing data to ensure appointment_total is the sum of all components (Services + Products + Tips)
-- We sum 'val' (which is original_value - discount_value) for all rows in the appointment.
-- This automatically includes the 'GORJETA' row if it exists.

UPDATE transactions t
SET appointment_total = sub.total
FROM (
    SELECT appointment_id, SUM(val) as total
    FROM transactions
    WHERE appointment_id IS NOT NULL
    GROUP BY appointment_id
) sub
WHERE t.appointment_id = sub.appointment_id;

-- 2. Create a function to automatically update appointment_total on changes
CREATE OR REPLACE FUNCTION update_appointment_total()
RETURNS TRIGGER AS $$
BEGIN
    -- Update all rows belonging to the same appointment with the new sum
    -- We use a temporary variable to avoid infinite recursion if we were updating the same table blindly,
    -- but here we update a specific column. To be safe, we check if appointment_id is set.
    
    IF NEW.appointment_id IS NOT NULL THEN
        UPDATE transactions
        SET appointment_total = (
            SELECT SUM(val)
            FROM transactions
            WHERE appointment_id = NEW.appointment_id
        )
        WHERE appointment_id = NEW.appointment_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Create the trigger
DROP TRIGGER IF EXISTS trigger_update_appointment_total ON transactions;

CREATE TRIGGER trigger_update_appointment_total
AFTER INSERT OR UPDATE OF val, original_value, discount_value, appointment_id OR DELETE ON transactions
FOR EACH ROW
EXECUTE FUNCTION update_appointment_total();
