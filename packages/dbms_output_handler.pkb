CREATE OR REPLACE PACKAGE BODY dbms_output_handler IS

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
    
    v_log_level log$.t_handler_log_level;
    v_call_stack_level log$.t_handler_log_level := log$.c_ERROR;
    
    PROCEDURE set_log_level (
        p_level IN log$.t_handler_log_level
    ) IS
    BEGIN
        v_log_level := p_level;
    END;
    
    FUNCTION get_log_level
    RETURN log$.t_handler_log_level IS
    BEGIN
        RETURN v_log_level;
    END;
    
    PROCEDURE set_call_stack_level (
        p_level IN log$.t_handler_log_level
    ) IS
    BEGIN
        v_call_stack_level := p_level;
    END;
    
    FUNCTION get_call_stack_level
    RETURN log$.t_handler_log_level IS
    BEGIN
        RETURN v_call_stack_level;
    END;
    
    PROCEDURE handle_message (
        p_level IN log$.t_message_log_level,
        p_message IN VARCHAR2
    ) IS
    
        v_calls log$.t_call_stack;
        v_values log$.t_call_values;
        
        v_unit log$.STRING;
        v_name log$.STRING;
        
    BEGIN
    
        DBMS_OUTPUT.PUT_LINE(
            TO_CHAR(SYSTIMESTAMP, 'hh24:mi:ss.ff3') || ' [' ||
            RPAD(
                CASE p_level
                    WHEN log$.c_DEBUG THEN 'DEBUG'
                    WHEN log$.c_INFO THEN 'INFO'
                    WHEN log$.c_WARNING THEN 'WARNING'
                    WHEN log$.c_ERROR THEN 'ERROR'
                    ELSE TO_CHAR(p_level)
                END,
                7
            ) || '] ' ||
            p_message
        );
        
        IF p_level >= v_call_stack_level THEN
        
            log$.get_call_stack(v_calls, v_values);
            
            FOR v_i IN REVERSE 1..v_calls.COUNT LOOP
                
                IF v_calls(v_i).owner IS NOT NULL THEN
                    v_unit := v_calls(v_i).owner || '.' || v_calls(v_i).unit;
                ELSE
                    v_unit := v_calls(v_i).unit;
                END IF;
                
                IF v_i = v_calls.COUNT THEN
                    DBMS_OUTPUT.PUT('at: ');
                ELSE
                    DBMS_OUTPUT.PUT('    ');
                END IF;
                
                DBMS_OUTPUT.PUT_LINE(v_unit || ' (line ' || v_calls(v_i).line || ')');
                
                v_name := v_values(v_i).FIRST;
                
                WHILE v_name IS NOT NULL LOOP
                
                    DBMS_OUTPUT.PUT('        ' || v_name || ': ');
                    
                    CASE v_values(v_i)(v_name).type
                    
                        WHEN 'VARCHAR2' THEN
                        
                            IF v_values(v_i)(v_name).varchar2_value IS NULL THEN
                                DBMS_OUTPUT.PUT_LINE('NULL');
                            ELSE
                                DBMS_OUTPUT.PUT_LINE('''' || REPLACE(v_values(v_i)(v_name).varchar2_value, '''', '''''') || '''');
                            END IF;
                            
                        WHEN 'NUMBER' THEN
                        
                            IF v_values(v_i)(v_name).number_value IS NULL THEN
                                DBMS_OUTPUT.PUT_LINE('NULL');
                            ELSE
                                DBMS_OUTPUT.PUT_LINE(TO_CHAR(v_values(v_i)(v_name).number_value, 'TM', 'NLS_NUMERIC_CHARACTERS=''.,'''));
                            END IF;
                            
                        WHEN 'BOOLEAN' THEN
                        
                            IF v_values(v_i)(v_name).boolean_value IS NULL THEN
                                DBMS_OUTPUT.PUT_LINE('NULL');
                            ELSIF v_values(v_i)(v_name).boolean_value IS NULL THEN
                                DBMS_OUTPUT.PUT_LINE('TRUE');
                            ELSE
                                DBMS_OUTPUT.PUT_LINE('FALSE');
                            END IF;
                            
                        WHEN 'DATE' THEN
                        
                            IF v_values(v_i)(v_name).date_value IS NULL THEN
                                DBMS_OUTPUT.PUT_LINE('NULL');
                            ELSE
                                DBMS_OUTPUT.PUT_LINE('TIMESTAMP ''' || TO_CHAR(v_values(v_i)(v_name).date_value, 'YYYY-MM-DD HH24:MI:SS') || '''');
                            END IF;
                        
                        ELSE
                            
                            DBMS_OUTPUT.PUT_LINE(NULL);
                            
                    END CASE;
                
                    v_name := v_values(v_i).NEXT(v_name);
                
                END LOOP;
            
            END LOOP;
        
        END IF;
    
    END;
    
END;