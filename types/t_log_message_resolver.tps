CREATE OR REPLACE TYPE t_log_message_resolver IS OBJECT (
  
    dummy CHAR,

    CONSTRUCTOR FUNCTION t_log_message_resolver
    RETURN SELF AS RESULT,

    NOT INSTANTIABLE MEMBER FUNCTION resolve_message
        (p_code IN VARCHAR2)
    RETURN VARCHAR2
    
) NOT INSTANTIABLE NOT FINAL;