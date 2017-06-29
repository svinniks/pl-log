CREATE OR REPLACE PACKAGE BODY log$ IS

    v_message_resolver t_log_message_resolver;
    v_default_message_resolver t_default_message_resolver;
    
    PROCEDURE set_message_resolver
        (p_message_resolver IN t_log_message_resolver) IS
    BEGIN
    
        IF p_message_resolver IS NULL THEN
            v_message_resolver := v_default_message_resolver;
        ELSE
            v_message_resolver := p_message_resolver;
        END IF;
          
    END;
    
    PROCEDURE reset_message_resolver IS
    BEGIN
        set_message_resolver(NULL);
    END;
    
    PROCEDURE register_message
        (p_code IN VARCHAR2
        ,p_message IN VARCHAR2) IS
    BEGIN
        default_message_store.register_message(p_code, p_message);
    END;

    FUNCTION resolve_message
        (p_code IN VARCHAR2)
    RETURN VARCHAR2 IS
    BEGIN
    
        IF v_message_resolver IS NULL THEN
            RETURN NULL;
        ELSE
            RETURN v_message_resolver.resolve_message(p_code);
        END IF;
    
    END;

    FUNCTION format_message
        (p_message IN VARCHAR2
        ,p_arguments IN t_varchars := NULL)
    RETURN VARCHAR2 IS
        v_message VARCHAR2(4000);
    BEGIN
    
        -- First try to resolve the message as a code.
        v_message := resolve_message(p_message);
        
        -- If the message could be resolved and there are arguments, then replace 
        -- the placeholders for with the values:
        IF v_message IS NOT NULL THEN
        
            IF p_arguments IS NOT NULL THEN
        
                FOR v_i IN 1..p_arguments.COUNT LOOP
                     v_message := REPLACE(v_message, ':' || v_i, p_arguments(v_i));
                END LOOP;
            
            END IF;
            
            v_message := p_message || ': ' || v_message;
            
        -- If the message could not be resolved from the code, then the message 
        -- itself will be output followed by the arguments, if provided, in brackets.
        ELSE
        
            v_message := p_message;
            
            IF p_arguments IS NOT NULL THEN
            
                IF v_message IS NOT NULL THEN
                    v_message := v_message || ' (';
                ELSE
                    v_message := v_message || '(';
                END IF;
                
                FOR v_i IN 1..p_arguments.COUNT LOOP
                
                    IF v_i > 1 THEN
                        v_message := v_message || ', ';
                    END IF;
                
                    v_message := v_message || p_arguments(v_i);
                   
                END LOOP;
                
                v_message := v_message || ')';
            
            END IF;
        
        END IF;
        
        RETURN v_message;
    
    END;
    
    FUNCTION format_message
        (p_message IN VARCHAR2
        ,p_argument1 IN VARCHAR2)
    RETURN VARCHAR2 IS
    BEGIN
        RETURN format_message(p_message, t_varchars(p_argument1));
    END;
    
    FUNCTION format_message
        (p_message IN VARCHAR2
        ,p_argument1 IN VARCHAR2
        ,p_argument2 IN VARCHAR2)
    RETURN VARCHAR2 IS
    BEGIN
        RETURN format_message(p_message, t_varchars(p_argument1, p_argument2));
    END;
    
    FUNCTION format_message
        (p_message IN VARCHAR2
        ,p_argument1 IN VARCHAR2
        ,p_argument2 IN VARCHAR2
        ,p_argument3 IN VARCHAR2)
    RETURN VARCHAR2 IS
    BEGIN
        RETURN format_message(p_message, t_varchars(p_argument1, p_argument2, p_argument3));
    END;
    
    FUNCTION format_message
        (p_message IN VARCHAR2
        ,p_argument1 IN VARCHAR2
        ,p_argument2 IN VARCHAR2
        ,p_argument3 IN VARCHAR2
        ,p_argument4 IN VARCHAR2)
    RETURN VARCHAR2 IS
    BEGIN
        RETURN format_message(p_message, t_varchars(p_argument1, p_argument2, p_argument3, p_argument4));
    END;
    
    FUNCTION format_message
        (p_message IN VARCHAR2
        ,p_argument1 IN VARCHAR2
        ,p_argument2 IN VARCHAR2
        ,p_argument3 IN VARCHAR2
        ,p_argument4 IN VARCHAR2
        ,p_argument5 IN VARCHAR2)
    RETURN VARCHAR2 IS
    BEGIN
        RETURN format_message(p_message, t_varchars(p_argument1, p_argument2, p_argument3, p_argument4, p_argument5));
    END;
    
BEGIN
    v_default_message_resolver := t_default_message_resolver();
    v_message_resolver := v_default_message_resolver;
END;