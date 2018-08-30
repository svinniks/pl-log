CREATE OR REPLACE PACKAGE BODY oracle_message_resolver IS

    v_nls_language_mapper t_nls_language_mapper;
    
    PROCEDURE set_nls_language_mapper (
        p_mapper IN t_nls_language_mapper
    ) IS
    BEGIN
        v_nls_language_mapper := p_mapper;
    END;
    
    FUNCTION to_nls_language (
        p_user_language IN VARCHAR2
    )
    RETURN VARCHAR2 IS
    BEGIN
        IF v_nls_language_mapper IS NOT NULL THEN
            RETURN v_nls_language_mapper.to_nls_language(p_user_language);
        ELSE
            RETURN p_user_language;
        END IF;
    END;
    
    
    
    FUNCTION resolve_code (
        p_code IN NATURALN,
        p_nls_language IN VARCHAR2
    )
    RETURN VARCHAR2  IS
    
        v_dummy INTEGER;
        v_message log$.STRING;
    
    BEGIN

        IF p_code BETWEEN 20000 AND 20999 THEN
        
            RETURN '%s';
            
        ELSE
        
            v_dummy := utl_lms.get_message(
                p_code, 
                'RDBMS', 
                'ORA',          
                p_nls_language, 
                v_message
            );
            
            IF v_message LIKE 'Message ' || p_code || 'not found%' THEN
                RETURN NULL;
            ELSE
                RETURN v_message;
            END IF;
            
        END IF;
    
    END;
    
    FUNCTION resolve_message (
        p_message IN VARCHAR2,
        p_language IN VARCHAR2
    ) 
    RETURN VARCHAR2 IS
    
        v_code PLS_INTEGER;
        v_nls_language log$.STRING;
        
        v_message log$.STRING;
            
    BEGIN
        
        IF NOT REGEXP_LIKE(p_message, '^ORA-[0-9]{5}$') THEN
            RETURN NULL;
        END IF;
        
        v_code := SUBSTR(p_message, 5);
        
        IF v_nls_language_mapper IS NOT NULL THEN
            v_nls_language := v_nls_language_mapper.to_nls_language(p_language);
        ELSE
            v_nls_language := p_language;
        END IF;
        
        v_message := oracle_message_resolver.resolve_code(
            v_code, v_nls_language);
        
        IF v_message IS NOT NULL THEN
            v_message := p_message || ': ' || v_message;
        END IF;
        
        RETURN v_message;
    
    END;  

END;