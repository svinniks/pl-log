CREATE OR REPLACE PACKAGE BODY default_message_store IS

    TYPE t_messages IS TABLE OF VARCHAR2(32000) INDEX BY VARCHAR2(32000);
    v_messages t_messages;

    PROCEDURE register_message
        (p_code IN VARCHAR2
        ,p_message IN VARCHAR2) IS
    BEGIN
    
        IF p_code IS NOT NULL THEN
            v_messages(p_code) := p_message;
        END IF;
    
    END;
        
    FUNCTION resolve_message
        (p_code IN VARCHAR2)
    RETURN VARCHAR2 IS
    BEGIN
    
        IF p_code IS NULL THEN
        
            RETURN NULL;
            
        ELSIF v_messages.EXISTS(p_code) THEN
        
            RETURN v_messages(p_code);
            
        ELSE
        
            RETURN NULL;
            
        END IF;
    
    END;

END;