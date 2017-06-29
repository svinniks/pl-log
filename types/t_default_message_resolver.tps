CREATE OR REPLACE TYPE t_default_message_resolver UNDER t_log_message_resolver(

    CONSTRUCTOR FUNCTION t_default_message_resolver
    RETURN SELF AS RESULT,

    MEMBER PROCEDURE register_message
        (p_code IN VARCHAR2
        ,p_message IN VARCHAR2),

    OVERRIDING MEMBER FUNCTION resolve_message
        (p_code IN VARCHAR2)
    RETURN VARCHAR2
    
);
