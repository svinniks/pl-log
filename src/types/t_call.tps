CREATE OR REPLACE TYPE t_call IS OBJECT (

    id NUMBER,
    
    PRAGMA RESTRICT_REFERENCES(DEFAULT, RNDS, WNDS, RNPS, WNPS, TRUST),
    
    MEMBER FUNCTION value (
        p_name IN VARCHAR2,
        p_value IN VARCHAR2
    )
    RETURN t_call,
    
    MEMBER PROCEDURE value (
        self IN t_call,
        p_name IN VARCHAR2,
        p_value IN VARCHAR2
    ),
    
    MEMBER FUNCTION value (
        p_name IN VARCHAR2,
        p_value IN NUMBER
    )
    RETURN t_call,
    
    MEMBER PROCEDURE value (
        self IN t_call,
        p_name IN VARCHAR2,
        p_value IN NUMBER
    ),
    
    MEMBER FUNCTION value (
        p_name IN VARCHAR2,
        p_value IN BOOLEAN
    )
    RETURN t_call,
    
    MEMBER PROCEDURE value (
        self IN t_call,
        p_name IN VARCHAR2,
        p_value IN BOOLEAN
    ),
    
    MEMBER FUNCTION value (
        p_name IN VARCHAR2,
        p_value IN DATE
    )
    RETURN t_call,
    
    MEMBER PROCEDURE value (
        self IN t_call,
        p_name IN VARCHAR2,
        p_value IN DATE
    )
    
);
