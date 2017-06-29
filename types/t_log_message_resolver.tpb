CREATE OR REPLACE TYPE BODY t_log_message_resolver IS

    CONSTRUCTOR FUNCTION t_log_message_resolver
    RETURN SELF AS RESULT IS
    BEGIN
        SELF.dummy := 'X';
        RETURN;
    END;

END;