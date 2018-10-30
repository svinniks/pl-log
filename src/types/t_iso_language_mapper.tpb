CREATE OR REPLACE TYPE BODY t_iso_language_mapper IS
    
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

    CONSTRUCTOR FUNCTION t_iso_language_mapper
    RETURN self AS RESULT IS
    BEGIN
        RETURN;
    END;

    OVERRIDING MEMBER FUNCTION to_nls_language (
        p_user_language IN VARCHAR2
    )
    RETURN VARCHAR2 IS
    
        CURSOR c_mapping IS
            SELECT nls_language
            FROM iso_language_map
            WHERE iso_language = p_user_language;
        
    BEGIN
    
        FOR v_mapping IN c_mapping LOOP
            RETURN v_mapping.nls_language;
        END LOOP;
        
        RETURN NULL;
    
    END;
    
END;
