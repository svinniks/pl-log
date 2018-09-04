CREATE OR REPLACE TYPE BODY t_call IS

    MEMBER FUNCTION value (
        p_name IN VARCHAR2,
        p_value IN VARCHAR2
    )
    RETURN t_call IS
    BEGIN
    
        log$.value(
            id,
            p_name, 
            p_value,
            p_service_depth => 1
        );
        
        RETURN self;
         
    END;
    
    MEMBER PROCEDURE value (
        self IN t_call,
        p_name IN VARCHAR2,
        p_value IN VARCHAR2
    ) IS
    BEGIN
    
        log$.value(
            id,
            p_name, 
            p_value,
            p_service_depth => 1
        );
         
    END;
    
    MEMBER FUNCTION value (
        p_name IN VARCHAR2,
        p_value IN NUMBER
    )
    RETURN t_call IS
    BEGIN
    
        log$.value(
            id,
            p_name, 
            p_value,
            p_service_depth => 1
        );
        
        RETURN self;
         
    END;
    
    MEMBER PROCEDURE value (
        self IN t_call,
        p_name IN VARCHAR2,
        p_value IN NUMBER
    ) IS
    BEGIN
    
        log$.value(
            id,
            p_name, 
            p_value,
            p_service_depth => 1
        );
         
    END;
    
    MEMBER FUNCTION value (
        p_name IN VARCHAR2,
        p_value IN BOOLEAN
    )
    RETURN t_call IS
    BEGIN
    
        log$.value(
            id,
            p_name, 
            p_value,
            p_service_depth => 1
        );
        
        RETURN self;
         
    END;
    
    MEMBER PROCEDURE value (
        self IN t_call,
        p_name IN VARCHAR2,
        p_value IN BOOLEAN
    ) IS
    BEGIN
    
        log$.value(
            id,
            p_name, 
            p_value,
            p_service_depth => 1
        );
         
    END;
    
    MEMBER FUNCTION value (
        p_name IN VARCHAR2,
        p_value IN DATE
    )
    RETURN t_call IS
    BEGIN
    
        log$.value(
            id,
            p_name, 
            p_value,
            p_service_depth => 1
        );
        
        RETURN self;
         
    END;
    
    MEMBER PROCEDURE value (
        self IN t_call,
        p_name IN VARCHAR2,
        p_value IN DATE
    ) IS
    BEGIN
    
        log$.value(
            id,
            p_name, 
            p_value,
            p_service_depth => 1
        );
         
    END;
    
END;
