CREATE OR REPLACE PACKAGE log$level IS
    
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

    SUBTYPE message IS 
        PLS_INTEGER 
            RANGE 1..1000
            NOT NULL;
    
    c_DEBUG CONSTANT message := 200;
    c_INFO CONSTANT message := 400;
    c_WARNING CONSTANT message := 600;
    c_ERROR CONSTANT message := 800;
    c_NONE CONSTANT PLS_INTEGER := 1001;
            
    SUBTYPE resolver IS 
        PLS_INTEGER 
            RANGE 0..1000
            NOT NULL;            

    c_ALL CONSTANT resolver := 0;
    
    SUBTYPE handler IS 
        PLS_INTEGER 
            RANGE 0..1001;            

    c_NONE CONSTANT handler := 1001;

END;
