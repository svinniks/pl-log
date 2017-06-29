CREATE OR REPLACE PACKAGE default_message_store IS

    PROCEDURE register_message
        (p_code IN VARCHAR2
        ,p_message IN VARCHAR2);
        
    FUNCTION resolve_message
        (p_code IN VARCHAR2)
    RETURN VARCHAR2;

END;