CREATE OR REPLACE TYPE t_top_call IS OBJECT (

    dummy CHAR,
    
    CONSTRUCTOR FUNCTION t_top_call
    RETURN self AS RESULT,
    
    MEMBER FUNCTION param (
        p_name IN VARCHAR2,
        p_value IN VARCHAR2
    )
    RETURN t_top_call,
    
    MEMBER PROCEDURE param (
        self IN t_top_call,
        p_name IN VARCHAR2,
        p_value IN VARCHAR2
    ),
    
    MEMBER FUNCTION param (
        p_name IN VARCHAR2,
        p_value IN NUMBER
    )
    RETURN t_top_call,
    
    MEMBER PROCEDURE param (
        self IN t_top_call,
        p_name IN VARCHAR2,
        p_value IN NUMBER
    ),
    
    MEMBER FUNCTION param (
        p_name IN VARCHAR2,
        p_value IN BOOLEAN
    )
    RETURN t_top_call,
    
    MEMBER PROCEDURE param (
        self IN t_top_call,
        p_name IN VARCHAR2,
        p_value IN BOOLEAN
    ),
    
    MEMBER FUNCTION param (
        p_name IN VARCHAR2,
        p_value IN DATE
    )
    RETURN t_top_call,
    
    MEMBER PROCEDURE param (
        self IN t_top_call,
        p_name IN VARCHAR2,
        p_value IN DATE
    )
    
);
