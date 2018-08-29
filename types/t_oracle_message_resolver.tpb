CREATE OR REPLACE TYPE BODY t_oracle_message_resolver IS

    /* 
        Copyright 2018 Sergejs Vinniks

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

    CONSTRUCTOR FUNCTION t_oracle_message_resolver
    RETURN SELF AS RESULT IS
    BEGIN
        RETURN;
    END;

    OVERRIDING MEMBER FUNCTION resolve_message (
        p_message IN VARCHAR2,
        p_language IN VARCHAR2 := NULL
    ) 
    RETURN VARCHAR2 IS
    
        v_code PLS_INTEGER;
    
        v_message log$.STRING;
        v_resolving_result INTEGER;
        
    BEGIN
        
        IF NOT REGEXP_LIKE(p_message, '^ORA-[0-9]{5}$') THEN
            RETURN NULL;
        END IF;
        
        v_code := SUBSTR(p_message, 5);
        
        IF v_code BETWEEN 20000 AND 20999 THEN
        
            v_message := '%s';
            v_resolving_result := 0;
            
        ELSE
        
            v_resolving_result := utl_lms.get_message(
                v_code, 
                'RDBMS', 
                'ORA', 
                log$.to_nls_language(p_language), 
                v_message
            );
            
        END IF;
        
        IF v_resolving_result = 0 THEN
            RETURN p_message || ': ' || v_message;
        ELSE
            RETURN NULL;
        END IF;
    
    END;    

END;