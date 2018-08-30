CREATE OR REPLACE PACKAGE oracle_message_resolver IS

    PROCEDURE set_nls_language_mapper (
        p_mapper IN t_nls_language_mapper
    );
    
    FUNCTION resolve_code (
        p_code IN NATURALN,
        p_nls_language IN VARCHAR2
    )
    RETURN VARCHAR2;

    FUNCTION resolve_message (
        p_message IN VARCHAR2,
        p_language IN VARCHAR2
    )
    RETURN VARCHAR2;

END;