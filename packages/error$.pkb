CREATE OR REPLACE PACKAGE BODY error$ IS

    /* 
        Copyright 2017 Sergejs Vinniks

        Licensed under the Apache License, Version 2.0 (the "License");
        you may not use this file except in compliance with the License.
        You may obtain a copy of the License at
     
          http://www.apache.org/licenses/LICENSE-2.0

        Unless required by applicable law or agreed to in writing, software
        distributed under the License is distributed on an "AS IS" BASIS,
        WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
        See the License for the specific language governing permissions and
        limitations under the License.
    */

    v_error_code PLS_INTEGER := -20000;
    
    v_handler_unit VARCHAR2(4000) := utl_call_stack.owner(1) || '.ERROR$';
    v_handled_lines t_numbers := t_numbers(35, 105, 109, 113);

    PROCEDURE set_error_code
        (p_code IN PLS_INTEGER) IS
    BEGIN
        v_error_code := p_code;
    END;

    PROCEDURE raise
        (p_message IN VARCHAR2
        ,p_arguments IN t_varchars := NULL) IS
    BEGIN
        log$.error(p_message, p_arguments);
        raise_application_error(v_error_code, log$.format_message(log$.c_ERROR, p_message, p_arguments));
    END;
        
    PROCEDURE raise
        (p_message IN VARCHAR2
        ,p_argument1 IN VARCHAR2) IS
    BEGIN
        error$.raise(p_message, t_varchars(p_argument1));
    END;
        
    PROCEDURE raise
        (p_message IN VARCHAR2
        ,p_argument1 IN VARCHAR2
        ,p_argument2 IN VARCHAR2) IS
    BEGIN
        error$.raise(p_message, t_varchars(p_argument1, p_argument2));
    END;
  
    PROCEDURE raise
        (p_message IN VARCHAR2
        ,p_argument1 IN VARCHAR2
        ,p_argument2 IN VARCHAR2
        ,p_argument3 IN VARCHAR2) IS
    BEGIN
        error$.raise(p_message, t_varchars(p_argument1, p_argument2, p_argument3));
    END;
        
    PROCEDURE raise
        (p_message IN VARCHAR2
        ,p_argument1 IN VARCHAR2
        ,p_argument2 IN VARCHAR2
        ,p_argument3 IN VARCHAR2
        ,p_argument4 IN VARCHAR2) IS
    BEGIN
        error$.raise(p_message, t_varchars(p_argument1, p_argument2, p_argument3, p_argument4));
    END;
        
    PROCEDURE raise
        (p_message IN VARCHAR2
        ,p_argument1 IN VARCHAR2
        ,p_argument2 IN VARCHAR2
        ,p_argument3 IN VARCHAR2
        ,p_argument4 IN VARCHAR2
        ,p_argument5 IN VARCHAR2) IS
    BEGIN
        error$.raise(p_message, t_varchars(p_argument1, p_argument2, p_argument3, p_argument4, p_argument5));
    END;
    
    PROCEDURE raise IS
    
        v_error_number NUMBER;
    
    BEGIN
    
        IF utl_call_stack.error_depth > 0 THEN
        
            IF NOT handled THEN
                log$.oracle_error;
            END IF;
            
            v_error_number := utl_call_stack.error_number(1);
        
            IF v_error_number BETWEEN 20000 AND 20099 THEN
        
                raise_application_error(-v_error_number, utl_call_stack.error_msg(1), TRUE);
            
            ELSIF v_error_number = 1403 THEN
                
                RAISE NO_DATA_FOUND;
            
            ELSE
            
                EXECUTE IMMEDIATE '
                    DECLARE
                        e EXCEPTION;
                        PRAGMA EXCEPTION_INIT(e, -' || v_error_number || ');
                    BEGIN
                        RAISE e;
                    END;
                ';
            
            END IF;
        
        END IF;
    
    END;    
        
    FUNCTION handled
    RETURN BOOLEAN IS
     
        e_bad_depth_indicator EXCEPTION;
        PRAGMA EXCEPTION_INIT(e_bad_depth_indicator, -64610);
    
        v_backtrace_unit VARCHAR2(4000);
    
    BEGIN
    
        IF utl_call_stack.backtrace_depth = 0 THEN
        
            RETURN FALSE;
            
        ELSE
 
            FOR v_i IN 1..LEAST(utl_call_stack.backtrace_depth, 2) LOOP
       
                BEGIN
                    v_backtrace_unit := utl_call_stack.backtrace_unit(v_i);
                EXCEPTION
                    WHEN e_bad_depth_indicator THEN
                        v_backtrace_unit := '__anonymous_block';
                END;
                
                IF v_backtrace_unit = v_handler_unit 
                   AND utl_call_stack.backtrace_line(v_i) MEMBER OF v_handled_lines 
                THEN
                
                   RETURN TRUE;
                   
                END IF;
                       
            END LOOP;
            
            RETURN FALSE; 
        
        END IF;     
        
    END;

END;

