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

    CONSTRUCTOR FUNCTION t_oracle_message_resolver (
        p_nls_language_mapper IN t_nls_language_mapper := NULL
    )
    RETURN SELF AS RESULT IS
    BEGIN
        nls_language_mapper := p_nls_language_mapper;
        RETURN;
    END;

    OVERRIDING MEMBER FUNCTION resolve_message (
        p_message IN VARCHAR2,
        p_language IN VARCHAR2 := NULL
    ) 
    RETURN VARCHAR2 IS
    BEGIN
        RETURN oracle_message_resolver.resolve_message(p_message, p_language);
    END;    

END;