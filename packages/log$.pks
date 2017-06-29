CREATE OR REPLACE PACKAGE log$ IS

    TYPE t IS TABLE OF NUMBER INDEX BY PLS_INTEGER;

    PROCEDURE set_message_resolver
        (p_message_resolver IN t_log_message_resolver);
        
    PROCEDURE reset_message_resolver;

    PROCEDURE register_message
        (p_code IN VARCHAR2
        ,p_message IN VARCHAR2);

    FUNCTION resolve_message
        (p_code IN VARCHAR2)
    RETURN VARCHAR2;

    FUNCTION format_message
        (p_message IN VARCHAR2
        ,p_arguments IN t_varchars := NULL)
    RETURN VARCHAR2;

    FUNCTION format_message
        (p_message IN VARCHAR2
        ,p_argument1 IN VARCHAR2)
    RETURN VARCHAR2;
    
    FUNCTION format_message
        (p_message IN VARCHAR2
        ,p_argument1 IN VARCHAR2
        ,p_argument2 IN VARCHAR2)
    RETURN VARCHAR2;
    
    FUNCTION format_message
        (p_message IN VARCHAR2
        ,p_argument1 IN VARCHAR2
        ,p_argument2 IN VARCHAR2
        ,p_argument3 IN VARCHAR2)
    RETURN VARCHAR2;
    
    FUNCTION format_message
        (p_message IN VARCHAR2
        ,p_argument1 IN VARCHAR2
        ,p_argument2 IN VARCHAR2
        ,p_argument3 IN VARCHAR2
        ,p_argument4 IN VARCHAR2)
    RETURN VARCHAR2;
    
    FUNCTION format_message
        (p_message IN VARCHAR2
        ,p_argument1 IN VARCHAR2
        ,p_argument2 IN VARCHAR2
        ,p_argument3 IN VARCHAR2
        ,p_argument4 IN VARCHAR2
        ,p_argument5 IN VARCHAR2)
    RETURN VARCHAR2;
    
END;

