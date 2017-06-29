CREATE OR REPLACE PACKAGE error$ IS

    PROCEDURE set_error_code
        (p_code IN PLS_INTEGER);

    PROCEDURE raise
        (p_message IN VARCHAR2
        ,p_arguments IN t_varchars := NULL);
        
    PROCEDURE raise
        (p_message IN VARCHAR2
        ,p_argument1 IN VARCHAR2);
        
    PROCEDURE raise
        (p_message IN VARCHAR2
        ,p_argument1 IN VARCHAR2
        ,p_argument2 IN VARCHAR2);
  
    PROCEDURE raise
        (p_message IN VARCHAR2
        ,p_argument1 IN VARCHAR2
        ,p_argument2 IN VARCHAR2
        ,p_argument3 IN VARCHAR2);
        
    PROCEDURE raise
        (p_message IN VARCHAR2
        ,p_argument1 IN VARCHAR2
        ,p_argument2 IN VARCHAR2
        ,p_argument3 IN VARCHAR2
        ,p_argument4 IN VARCHAR2);
        
    PROCEDURE raise
        (p_message IN VARCHAR2
        ,p_argument1 IN VARCHAR2
        ,p_argument2 IN VARCHAR2
        ,p_argument3 IN VARCHAR2
        ,p_argument5 IN VARCHAR2);

END;