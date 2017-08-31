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
    
    v_log_level PLS_INTEGER;
    v_sequence NUMBER := 1;
    
    FUNCTION get_log_level
    RETURN PLS_INTEGER IS
    BEGIN
    
        RETURN v_log_level;
    
    END;
    
    PROCEDURE set_log_level
        (p_level IN PLS_INTEGER) IS
    BEGIN
    
        v_log_level := p_level;
    
    END;
    
    PROCEDURE reset IS
    BEGIN
    
        NULL;
    
    END;
    
    PROCEDURE create_message
        (p_log_level IN PLS_INTEGER
        ,p_message_text IN VARCHAR2
        ,p_call_stack IN VARCHAR2) IS
    BEGIN
    
        v_sequence := v_sequence + 1;
        
        INSERT INTO log$records
            (sequence
            ,log_date
            ,log_level
            ,message_text
            ,call_stack)
        VALUES
            (v_sequence
            ,CURRENT_TIMESTAMP
            ,p_log_level
            ,p_message_text
            ,p_call_stack);
    
    END;
    
END;