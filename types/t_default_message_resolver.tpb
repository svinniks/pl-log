CREATE OR REPLACE TYPE BODY t_default_message_resolver IS

    CONSTRUCTOR FUNCTION t_default_message_resolver
    RETURN SELF AS RESULT IS
    BEGIN
        SELF.dummy := 'X';
        RETURN;
    END;

    MEMBER PROCEDURE register_message
        (p_code IN VARCHAR2
        ,p_message IN VARCHAR2) IS
    BEGIN
        default_message_store.register_message(p_code, p_message);
    END;

    OVERRIDING MEMBER FUNCTION resolve_message
        (p_code IN VARCHAR2)
    RETURN VARCHAR2 IS
    BEGIN
        RETURN default_message_store.resolve_message(p_code);
    END;

END;