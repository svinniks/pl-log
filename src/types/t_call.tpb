CREATE OR REPLACE TYPE BODY t_call IS

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

    MEMBER FUNCTION value (
        p_name IN VARCHAR2,
        p_value IN VARCHAR2
    )
    RETURN t_call IS
    BEGIN
    
        log$.value(
            height,
            p_name, 
            p_value,
            p_service_depth => 1
        );
        
        RETURN self;
         
    END;
    
    MEMBER PROCEDURE value (
        self IN t_call,
        p_name IN VARCHAR2,
        p_value IN VARCHAR2
    ) IS
    BEGIN
    
        log$.value(
            height,
            p_name, 
            p_value,
            p_service_depth => 1
        );
         
    END;
    
    MEMBER FUNCTION value (
        p_name IN VARCHAR2,
        p_value IN NUMBER
    )
    RETURN t_call IS
    BEGIN
    
        log$.value(
            height,
            p_name, 
            p_value,
            p_service_depth => 1
        );
        
        RETURN self;
         
    END;
    
    MEMBER PROCEDURE value (
        self IN t_call,
        p_name IN VARCHAR2,
        p_value IN NUMBER
    ) IS
    BEGIN
    
        log$.value(
            height,
            p_name, 
            p_value,
            p_service_depth => 1
        );
         
    END;
    
    MEMBER FUNCTION value (
        p_name IN VARCHAR2,
        p_value IN BOOLEAN
    )
    RETURN t_call IS
    BEGIN
    
        log$.value(
            height,
            p_name, 
            p_value,
            p_service_depth => 1
        );
        
        RETURN self;
         
    END;
    
    MEMBER PROCEDURE value (
        self IN t_call,
        p_name IN VARCHAR2,
        p_value IN BOOLEAN
    ) IS
    BEGIN
    
        log$.value(
            height,
            p_name, 
            p_value,
            p_service_depth => 1
        );
         
    END;
    
    MEMBER FUNCTION value (
        p_name IN VARCHAR2,
        p_value IN DATE
    )
    RETURN t_call IS
    BEGIN
    
        log$.value(
            height,
            p_name, 
            p_value,
            p_service_depth => 1
        );
        
        RETURN self;
         
    END;
    
    MEMBER PROCEDURE value (
        self IN t_call,
        p_name IN VARCHAR2,
        p_value IN DATE
    ) IS
    BEGIN
    
        log$.value(
            height,
            p_name, 
            p_value,
            p_service_depth => 1
        );
         
    END;
    
END;
