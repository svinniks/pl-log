CREATE OR REPLACE TYPE BODY t_top_call IS

    CONSTRUCTOR FUNCTION t_top_call
    RETURN self AS RESULT IS
    BEGIN
        RETURN;
    END;
    
    MEMBER FUNCTION param (
        p_name IN VARCHAR2,
        p_value IN VARCHAR2
    )
    RETURN t_top_call IS
    BEGIN
    
        log$.value(
            p_name, 
            p_value,
            p_service_depth => 1,
            p_fill_call_stack => FALSE
        );
        
        RETURN self;
         
    END;
    
    MEMBER PROCEDURE param (
        self IN t_top_call,
        p_name IN VARCHAR2,
        p_value IN VARCHAR2
    ) IS
    BEGIN
    
        log$.value(
            p_name, 
            p_value,
            p_service_depth => 1,
            p_fill_call_stack => FALSE
        );
         
    END;
    
    MEMBER FUNCTION param (
        p_name IN VARCHAR2,
        p_value IN NUMBER
    )
    RETURN t_top_call IS
    BEGIN
    
        log$.value(
            p_name, 
            p_value,
            p_service_depth => 1,
            p_fill_call_stack => FALSE
        );
        
        RETURN self;
         
    END;
    
    MEMBER PROCEDURE param (
        self IN t_top_call,
        p_name IN VARCHAR2,
        p_value IN NUMBER
    ) IS
    BEGIN
    
        log$.value(
            p_name, 
            p_value,
            p_service_depth => 1,
            p_fill_call_stack => FALSE
        );
         
    END;
    
    MEMBER FUNCTION param (
        p_name IN VARCHAR2,
        p_value IN BOOLEAN
    )
    RETURN t_top_call IS
    BEGIN
    
        log$.value(
            p_name, 
            p_value,
            p_service_depth => 1,
            p_fill_call_stack => FALSE
        );
        
        RETURN self;
         
    END;
    
    MEMBER PROCEDURE param (
        self IN t_top_call,
        p_name IN VARCHAR2,
        p_value IN BOOLEAN
    ) IS
    BEGIN
    
        log$.value(
            p_name, 
            p_value,
            p_service_depth => 1,
            p_fill_call_stack => FALSE
        );
         
    END;
    
    MEMBER FUNCTION param (
        p_name IN VARCHAR2,
        p_value IN DATE
    )
    RETURN t_top_call IS
    BEGIN
    
        log$.value(
            p_name, 
            p_value,
            p_service_depth => 1,
            p_fill_call_stack => FALSE
        );
        
        RETURN self;
         
    END;
    
    MEMBER PROCEDURE param (
        self IN t_top_call,
        p_name IN VARCHAR2,
        p_value IN DATE
    ) IS
    BEGIN
    
        log$.value(
            p_name, 
            p_value,
            p_service_depth => 1,
            p_fill_call_stack => FALSE
        );
         
    END;
    
END;
