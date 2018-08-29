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

DROP CONTEXT log$levels
/

DROP VIEW log$tail
/

DROP TYPE t_iso_language_mapper
/

DROP TABLE iso_language_map
/

DROP TYPE t_nls_language_mapper
/

DROP TYPE t_dbms_output_handler
/
DROP PACKAGE dbms_output_handler
/

DROP TYPE t_default_message_handler
/
DROP PACKAGE default_message_handler
/

DROP PACKAGE default_message_resolver
/
DROP TYPE t_default_message_resolver
/

DROP TYPE t_default_message_formatter
/

DROP PACKAGE error$
/
DROP PACKAGE log$
/

DROP TYPE t_call
/

DROP TYPE t_oracle_error_mapper
/
DROP TYPE t_formatted_message_handler
/
DROP TYPE t_raw_message_handler
/
DROP TYPE t_log_message_handler
/
DROP TYPE t_log_message_resolver
/
DROP TYPE t_log_message_formatter
/

DROP TABLE log$events
/
