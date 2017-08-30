CREATE OR REPLACE PACKAGE BODY default_message_handler IS

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
    
    v_handler_instance t_default_message_handler;
    
    v_log_records t_log_records;
    
    v_size PLS_INTEGER;
    v_first PLS_INTEGER;
    v_last PLS_INTEGER;
    
    PROCEDURE init IS
    BEGIN
    
        v_handler_instance := t_default_message_handler(NULL);
        
        set_size(1000);
    
    END;
    
    FUNCTION get_handler_instance
    RETURN REF t_default_message_handler IS
    BEGIN
    
        RETURN REF(v_handler_instance);
        
    END;
    
    FUNCTION get_log_level
    RETURN PLS_INTEGER IS
    BEGIN
    
        RETURN v_handler_instance.log_level;
    
    END;
    
    PROCEDURE set_log_level
        (p_level IN PLS_INTEGER) IS
    BEGIN
    
        v_handler_instance.log_level := p_level;
    
    END;
    
    PROCEDURE reset IS
    BEGIN
    
        set_size(v_size);
    
    END;
    
    PROCEDURE set_size
        (p_size IN PLS_INTEGER) IS
    BEGIN
    
        v_size := p_size;
    
        v_log_records := t_log_records();
        v_log_records.EXTEND(v_size);
        
        v_first := NULL;
        v_last := NULL;
    
    END;
    
    PROCEDURE add_message
        (p_level IN PLS_INTEGER
        ,p_message IN VARCHAR2
        ,p_call_stack IN VARCHAR2) IS
    BEGIN
    
        IF v_first IS NULL THEN
        
            v_first := 1;
            v_last := 1;
        
        END IF;
        
        v_log_records(v_first).log_level := p_level;
        v_log_records(v_first).message_text := p_message;
        v_log_records(v_first).call_stack := p_call_stack;
    
    END;
    
    FUNCTION tail
    RETURN t_log_records PIPELINED IS
    BEGIN
    
        IF v_first IS NOT NULL THEN
        
            FOR v_i IN REVERSE v_last..v_first LOOP
                PIPE ROW(v_log_records(v_i));
            END LOOP;
            
        END IF;
        
        RETURN;
    
    END;
    
    FUNCTION aaa RETURN PLS_INTEGER IS
    BEGIN
        RETURN v_first;
    END;
    
BEGIN

    init;    
    
END;