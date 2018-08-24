# Summary

PL-LOG introduces a set of APIs to enable PL/SQL code instrumentation with log messages of different levels (e.g. DEBUG, INFO, ERROR etc.), custom business error raising and unexpected Oracle error handling. 
Log and error messages can be codified, translated into different languages, stored in arbitrary locations and later loaded by pluggable message __resolvers__. Both codified and free-text messages may act as template strings with argument placeholders, which are later replaced with actual values using pluggable __formatters__.

All formatted messages are finally directed to (also pluggable) __handlers__ which store or forward them according to the user and developer needs. Each handler can be configured to process messages in a different language - this can be useful, for example, in a multi-language user environment to store all log entries only in english, but to display messages to the users in their preferred language.

PL-LOG can be configured with unlimited number or message resolvers/formatters/handlers, limiting flow of the messages with log level constraints. Log level of messages being handled can be manipulated irrespective of database transactions on the __system__, __session__ (even different from the current one!) and __handler__ level which allows developers to leave even the finest level logger calls (DEBUG and lower) in the code and quickly enable message output when necessary.

Additional useful features include __call stack tracking__ with subprogram __argument and variable value logging__, ORA- error __translating__ and __mapping__ to custom business errors upon reraise, custom language code handling.

PL-LOG is based on the [`UTL_CALL_STACK`](https://docs.oracle.com/database/121/ARPLS/u_call_stack.htm#ARPLS74078]) package and therefore is only available on Oracle 12c R1 and up. Oracle abstract [object types](https://docs.oracle.com/database/121/ADOBJ/adobjint.htm#ADOBJ00101) are used to implement extensible plugin API, so getting familiar with the OOP concepts is advisable before using the framework.

Below is a shot example of how some PL-LOG using look like:

```
CREATE OR REPLACE 
PROCEDURE owner.register_person (
    p_name IN VARCHAR2,
    p_birth_date IN DATE
BEGIN

    -- Help PL-LOG to track the call stack and 
    -- associate argument values with the current call.
    log$.call()
        .param('p_name', p_name)
        .param('p_birth_date', p_birth_date);
        
    -- Log beginning of the person registration routine
    log$.debug('Registering of a person started.');
    
    -- Check if P_NAME has been supplied and raise a codified business error if not.
    IF p_name IS NULL THEN
        -- :1 is not specified!
        error$.raise('MSG-00001', 'name');
    END IF;

END;

-- Call the procedure from an anonymous block:
BEGIN
    register_person(NULL, SYSDATE);
END;
```

Providing that `DBMS_OUTPUT` handler is enabled and configured to accept all level messages, the following exception will be raised:

```
ORA-20000: MSG-00001: name is not specified!
```

and the following lines will be fetched from `DBMS_OUTPUT`:

```
23:57:48.268 [DEBUG  ] Registering of a person started.
23:57:48.268 [ERROR  ] MSG-00001: name is not specified!
at: OWNER.REGISTER_PERSON (line 19)
        p_birth_date: TIMESTAMP '2018-08-23 23:57:48'
        p_name: NULL
    __anonymous_block (line 2)
```
# Prerequisites

- PL-LOG only supports Oracle database 12c Release 1 and higher as it uses the ```UTL_CALL_STACK``` package, which first appeared in 12c R1.
- It is advisable to install PL-LOG in a separate schema to avoid object naming conflicts. The user must at least have the following privileges:

    ```
    CREATE USER pllog IDENTIFIED BY "password"
    /

    GRANT 
        CONNECT,
        CREATE SEQUENCE,
        CREATE TABLE,
        UNLIMITED TABLESPACE,
        CREATE PROCEDURE,
        CREATE VIEW,
        CREATE ANY CONTEXT,
        DROP ANY CONTEXT,
        CREATE TYPE
    TO pllog
    /

    GRANT SELECT ON v$session TO pllog
    /
    ```
- [PL-COMMONS](https://github.com/svinniks/pl-commons) must be installed as PL-LOG depends on the ```T_VARCHARS``` type. The type must be installed either in the same schema as PL-LOG itself, or it must be made accessible to the PL-LOG user via a synonym. Note however, that you will need to access ```T_VARCHARS``` from your code in order to pass argument lists to the message formatting routines.

# Installation

To install PL-LOG, connect to the database as the desired user/schema and run ```install.sql```.
After installation you may want to make PL-LOG accessible to other users: 

```
GRANT EXECUTE ON log$ TO <PUBLIC|any_separate_user_or_role>
/
GRANT EXECUTE ON error$ TO <PUBLIC|any_separate_user_or_role>
/
```

It is also recommended to create __public synonyms__ for these objects to keep call statements as short as possible.

