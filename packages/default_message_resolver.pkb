CREATE OR REPLACE PACKAGE BODY default_message_resolver IS

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
    
    TYPE t_messages IS 
        TABLE OF VARCHAR2(32000) 
        INDEX BY VARCHAR2(32000);
        
    v_messages t_messages;

    PROCEDURE reset IS
    BEGIN
    
       v_messages.DELETE;
    
    END;

    PROCEDURE register_message
        (p_code IN VARCHAR2
        ,p_message IN VARCHAR2) IS
    BEGIN
    
        IF p_code IS NOT NULL THEN
            v_messages(p_code) := p_message;
        END IF;
    
    END;
        
    FUNCTION resolve_message
        (p_code IN VARCHAR2)
    RETURN VARCHAR2 IS
    BEGIN
    
        IF p_code IS NULL THEN
        
            RETURN NULL;
            
        ELSIF v_messages.EXISTS(p_code) THEN
        
            RETURN v_messages(p_code);
            
        ELSE
        
            RETURN NULL;
            
        END IF;
    
    END;

END;
