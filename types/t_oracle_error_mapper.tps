CREATE OR REPLACE TYPE t_oracle_error_mapper IS OBJECT (

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
  
    dummy CHAR,

    NOT INSTANTIABLE MEMBER PROCEDURE map_oracle_error (
        p_source_code IN NATURALN,
        p_target_code OUT NATURAL,
        p_target_message OUT VARCHAR2
    )
    
) NOT INSTANTIABLE NOT FINAL;
