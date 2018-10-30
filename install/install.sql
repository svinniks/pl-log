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

SET DEFINE OFF

/* Tables */

@@tables/log$events.tab
/
@@tables/iso_language_map.tab
/
@@data/iso_language_map.sql


/* Specifications */

-- Core

@@types/t_log_message_formatter.tps
/
@@types/t_log_message_resolver.tps
/
@@types/t_log_message_handler.tps
/
@@types/t_raw_message_handler.tps
/
@@types/t_formatted_message_handler.tps
/
@@types/t_call.tps
/
@@types/t_oracle_error_mapper.tps
/
@@packages/log$.pks
/
@@packages/error$.pks
/

-- Formatters
@@types/t_default_message_formatter.tps
/
@@types/t_oracle_message_formatter.tps
/

-- Resolvers

@@packages/default_message_resolver.pks
/
@@types/t_default_message_resolver.tps
/
@@types/t_nls_language_mapper.tps
/
@@types/t_iso_language_mapper.tps
/
@@packages/oracle_message_resolver.pks
/
@@types/t_oracle_message_resolver.tps
/

-- Handlers

@@packages/default_message_handler.pks
/
@@views/log$tail.vw
/
@@types/t_default_message_handler.tps
/
@@packages/dbms_output_handler.pks
/
@@types/t_dbms_output_handler.tps
/

-- Contexts

@@contexts/log$levels.ctx
/

/* Bodies */

-- Core

@@types/t_call.tpb
/
@@packages/log$.pkb
/
@@packages/error$.pkb
/

-- Formatters

@@types/t_default_message_formatter.tpb
/
@@types/t_oracle_message_formatter.tpb
/

-- Resolvers

@@packages/default_message_resolver.pkb
/
@@types/t_default_message_resolver.tpb
/
@@types/t_iso_language_mapper.tpb
/
@@packages/oracle_message_resolver.pkb
/
@@types/t_oracle_message_resolver.tpb
/

-- Handlers

@@packages/default_message_handler.pkb
/
@@types/t_default_message_handler.tpb
/
@@packages/dbms_output_handler.pkb
/
@@types/t_dbms_output_handler.tpb
/
