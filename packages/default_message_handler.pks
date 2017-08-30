CREATE OR REPLACE PACKAGE default_message_handler IS

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
    
    TYPE t_log_record IS RECORD
        (log_date TIMESTAMP
        ,log_level VARCHAR2(30)
        ,message_text VARCHAR2(32000)
        ,call_stack VARCHAR2(32000));
        
    TYPE t_log_records IS TABLE OF t_log_record;
    
    FUNCTION get_handler_instance
    RETURN REF t_default_message_handler;
    
    FUNCTION get_log_level
    RETURN PLS_INTEGER;
    
    PROCEDURE set_log_level
        (p_level IN PLS_INTEGER);
    
    PROCEDURE reset;
    
    PROCEDURE set_size
        (p_size IN PLS_INTEGER);
        
    PROCEDURE add_message
        (p_level IN PLS_INTEGER
        ,p_message IN VARCHAR2
        ,p_call_stack IN VARCHAR2);    
        
    FUNCTION tail
    RETURN t_log_records PIPELINED;
    
    FUNCTION aaa RETURN PLS_INTEGER;
    
END;