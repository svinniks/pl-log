CREATE OR REPLACE TYPE t_call IS OBJECT (

    id NUMBER,
    
    MEMBER FUNCTION param (
        p_name IN VARCHAR2,
        p_value IN VARCHAR2
    )
    RETURN t_call,
    
    MEMBER PROCEDURE param (
        self IN t_call,
        p_name IN VARCHAR2,
        p_value IN VARCHAR2
    ),
    
    MEMBER FUNCTION param (
        p_name IN VARCHAR2,
        p_value IN NUMBER
    )
    RETURN t_call,
    
    MEMBER PROCEDURE param (
        self IN t_call,
        p_name IN VARCHAR2,
        p_value IN NUMBER
    ),
    
    MEMBER FUNCTION param (
        p_name IN VARCHAR2,
        p_value IN BOOLEAN
    )
    RETURN t_call,
    
    MEMBER PROCEDURE param (
        self IN t_call,
        p_name IN VARCHAR2,
        p_value IN BOOLEAN
    ),
    
    MEMBER FUNCTION param (
        p_name IN VARCHAR2,
        p_value IN DATE
    )
    RETURN t_call,
    
    MEMBER PROCEDURE param (
        self IN t_call,
        p_name IN VARCHAR2,
        p_value IN DATE
    )
    
);
