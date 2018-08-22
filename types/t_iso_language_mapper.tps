CREATE OR REPLACE TYPE t_iso_language_mapper UNDER t_user_language_mapper (
    
    CONSTRUCTOR FUNCTION t_iso_language_mapper
    RETURN self AS RESULT,

    OVERRIDING MEMBER FUNCTION to_nls_language (
        p_user_language IN VARCHAR2
    )
    RETURN VARCHAR2
    
);
