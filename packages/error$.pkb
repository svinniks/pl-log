CREATE OR REPLACE PACKAGE BODY error$ IS

    v_error_code PLS_INTEGER := -20000;

    PROCEDURE set_error_code
        (p_code IN PLS_INTEGER) IS
    BEGIN
        v_error_code := p_code;
    END;

    PROCEDURE raise
        (p_message IN VARCHAR2
        ,p_arguments IN t_varchars := NULL) IS
    BEGIN
        raise_application_error(v_error_code, log$.format_message(p_message, p_arguments));
    END;
        
    PROCEDURE raise
        (p_message IN VARCHAR2
        ,p_argument1 IN VARCHAR2) IS
    BEGIN
        error$.raise(p_message, t_varchars(p_argument1));
    END;
        
    PROCEDURE raise
        (p_message IN VARCHAR2
        ,p_argument1 IN VARCHAR2
        ,p_argument2 IN VARCHAR2) IS
    BEGIN
        error$.raise(p_message, t_varchars(p_argument1));
    END;
  
    PROCEDURE raise
        (p_message IN VARCHAR2
        ,p_argument1 IN VARCHAR2
        ,p_argument2 IN VARCHAR2
        ,p_argument3 IN VARCHAR2) IS
    BEGIN
        error$.raise(p_message, t_varchars(p_argument1));
    END;
        
    PROCEDURE raise
        (p_message IN VARCHAR2
        ,p_argument1 IN VARCHAR2
        ,p_argument2 IN VARCHAR2
        ,p_argument3 IN VARCHAR2
        ,p_argument4 IN VARCHAR2) IS
    BEGIN
        error$.raise(p_message, t_varchars(p_argument1));
    END;
        
    PROCEDURE raise
        (p_message IN VARCHAR2
        ,p_argument1 IN VARCHAR2
        ,p_argument2 IN VARCHAR2
        ,p_argument3 IN VARCHAR2
        ,p_argument5 IN VARCHAR2) IS
    BEGIN
        error$.raise(p_message, t_varchars(p_argument1));
    END;

END;