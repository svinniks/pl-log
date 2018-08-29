CREATE OR REPLACE TYPE BODY t_oracle_message_formatter IS

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
  
    CONSTRUCTOR FUNCTION t_oracle_message_formatter
    RETURN self AS RESULT IS
    BEGIN
        RETURN;
    END;

    OVERRIDING MEMBER FUNCTION format_message (
        p_message IN VARCHAR2,
        p_arguments IN t_varchars
    )
    RETURN VARCHAR2 IS
        v_message log$.STRING;
    BEGIN
    
        v_message := p_message;
    
        IF p_arguments IS NOT NULL THEN
            FOR v_i IN 1..p_arguments.COUNT LOOP
                v_message := REGEXP_REPLACE(v_message, '\%s', p_arguments(v_i), 1, 1);
            END LOOP;
        END IF;
    
        RETURN v_message;
    
    END;
    
END;
