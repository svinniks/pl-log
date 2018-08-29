CREATE OR REPLACE TYPE BODY t_iso_language_mapper IS
    
    CONSTRUCTOR FUNCTION t_iso_language_mapper
    RETURN self AS RESULT IS
    BEGIN
        RETURN;
    END;

    OVERRIDING MEMBER FUNCTION to_nls_language (
        p_user_language IN VARCHAR2
    )
    RETURN VARCHAR2 IS
    
        CURSOR c_mapping IS
            SELECT nls_language
            FROM iso_language_map
            WHERE iso_language = p_user_language;
        
    BEGIN
    
        FOR v_mapping IN c_mapping LOOP
            RETURN v_mapping.nls_language;
        END LOOP;
        
        RETURN NULL;
    
    END;
    
    OVERRIDING MEMBER FUNCTION from_nls_language (
        p_nls_language IN VARCHAR2
    )
    RETURN VARCHAR2 IS
    
        CURSOR c_mapping IS
            SELECT iso_language
            FROM iso_language_map
            WHERE nls_language = p_nls_language;
        
    BEGIN
    
        FOR v_mapping IN c_mapping LOOP
            RETURN v_mapping.iso_language;
        END LOOP;
        
        RETURN NULL;
    
    END;
    
END;
