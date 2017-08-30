CREATE OR REPLACE TYPE BODY t_default_message_resolver IS

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

    CONSTRUCTOR FUNCTION t_default_message_resolver
    RETURN SELF AS RESULT IS
    BEGIN
    
        SELF.dummy := 'X';
        
        RETURN;
        
    END;

    OVERRIDING MEMBER FUNCTION resolve_message
        (p_code IN VARCHAR2)
    RETURN VARCHAR2 IS
    BEGIN
    
        RETURN default_message_resolver.resolve_message(p_code);
        
    END;

END;
/
