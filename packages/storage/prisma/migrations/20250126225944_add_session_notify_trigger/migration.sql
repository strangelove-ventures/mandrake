-- Create notification function
CREATE OR REPLACE FUNCTION notify_session_update()
RETURNS trigger AS $$
BEGIN
    PERFORM pg_notify(
        'session_updates',
        json_build_object(
            'sessionId', NEW.id,
            'type', TG_OP
        )::text
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on Session table
CREATE TRIGGER session_notify 
    AFTER INSERT OR UPDATE ON "Session"
    FOR EACH ROW 
    EXECUTE FUNCTION notify_session_update();