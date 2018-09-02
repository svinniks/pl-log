# Table of contents

* [Summary](#summary)
* [Prerequisites](#prerequisites)
* [Installation](#installation)
* [Quick start guide](#quick-start-guide)
* [Architecture](#architecture)
    * [Log levels](#log-levels)
    * [Message handlers](#message-handlers)
    * [Message resolvers](#message-resolvers)
    * [Message formatters](#message-formatters)
* [Public API](#public-api)
    * [Configuration](#configuration)
        * [Log level threshold control](#log-level-threshold-control)
        * [Message resolver and handler registration](#message-resolver-and-handler-registration)
        * [Configuration procedure example](#configuration-procedure-example)
    * [Code instrumentation](#code-instrumentation)
    * [Call stack tracking](#call-stack-tracking)
        * [Data types for storing call stack](#data-types-for-storing-call-stack)
        * [Tracking calls and named values](#tracking-calls-and-named-values)
        * [Obtaining and formatting call stack](#obtaining-and-formatting-call-stack)
    * [Exception handling](#exception-handling)

# Summary

PL-LOG provides API for PL/SQL code instrumentation with log messages of different severity levels (DEBUG, INFO, ERROR etc.), custom business exception raising and unexpected Oracle error handling. 

Log and error messages can be codified, translated into different languages, stored in arbitrary locations and later loaded by pluggable message __resolvers__. 

Both codified and free-text messages may act as template strings with argument placeholders, which are later replaced with actual values using pluggable __formatters__.

All formatted messages are finally directed to __handlers__ which store or forward them according to the user and developer needs. Each handler can be configured to process messages in a different language, which can be useful in multi-language user environments.

Message flow is controlled by log level thresholds, which can by defined and dynamically changed on __system__, __session__ and __handler__ levels. This allows to leave debug level instrumentation calls in the code forever and turn on message output on demand.

Additional useful features include __call stack tracking__, subprogram __argument and variable value logging__, ORA- error __translating__ and __mapping__ to custom business errors upon reraise, __custom language__ code handling.

PL-LOG is based on the [`UTL_CALL_STACK`](https://docs.oracle.com/database/121/ARPLS/u_call_stack.htm#ARPLS74078]) package and therefore is only available on Oracle 12c R1 and up. Oracle abstract [object types](https://docs.oracle.com/database/121/ADOBJ/adobjint.htm#ADOBJ00101) are used to implement extensible plugin API, so getting familiar with the OOP concepts is advisable before using the framework.

# Prerequisites

- PL-LOG only supports Oracle database 12c Release 1 and higher as it uses the ```UTL_CALL_STACK``` package, which first appeared in 12c.
- It is recommended to install PL-LOG in a separate schema to avoid object naming conflicts. The user must at least have the following privileges:

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
- ```T_VARCHARS``` from [PL-COMMONS](https://github.com/svinniks/pl-commons) must be installed and made accessible to the PL-LOG user.

# Installation

To install PL-LOG, run the ```install.sql``` script using SQL*Plus or a PL/SQL IDE of choice. After installation you may want to make PL-LOG API accessible to other users. At the very minimum you should: 

```
GRANT EXECUTE ON log$ TO <PUBLIC|any_separate_user_or_role>
/
GRANT EXECUTE ON error$ TO <PUBLIC|any_separate_user_or_role>
/
```

It is also recommended to create __public synonyms__ for these objects to keep call statements as short as possible. Please refer to the next chapters to get familiar with other PL-LOG objects which it is useful to grant public access to.

# Quick start guide

After installation, create a procedure called ```LOG$INIT``` in the PL-LOG schema:

```
CREATE OR REPLACE PROCEDURE log$init IS
BEGIN
    
    log$.init_system_log_level(log$.c_ALL);

    log$.add_message_resolver(t_default_message_resolver(), log$.c_INFO);
    default_message_resolver.register_message('MSG-00001', ':1 is not specified!');

    log$.set_default_message_formatter(t_default_message_formatter(':'));

    log$.add_message_handler(t_default_message_handler());
    log$.add_message_handler(t_dbms_output_handler());
    
END;
```

Create another procedure to test the instrumentation API:

```
CREATE OR REPLACE PROCEDURE register_person (
    p_name IN VARCHAR2,
    p_birth_date IN DATE
) IS
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
```

Turn ```DBMS_OUTPUT``` on and call the procedure from an anonymous block:

```
BEGIN
    register_person(NULL, SYSDATE);
END;
```

Exception with the following message will be raised:

```
ORA-20000: MSG-00001: name is not specified!
```

The following lines will be fetched from `DBMS_OUTPUT`:

```
23:57:48.268 [DEBUG  ] Registering of a person started.
23:57:48.268 [ERROR  ] MSG-00001: name is not specified!
at: OWNER.REGISTER_PERSON (line 19)
        p_birth_date: TIMESTAMP '2018-08-23 23:57:48'
        p_name: NULL
    __anonymous_block (line 2)
```

Try to change system log level threshold and rerun the procedure:

```
BEGIN
    log$.set_system_log_level(log$.c_INFO);
END;
```

To integrate PL-LOG into an existing PL/SQL project, you will have to develop custom message resolvers, formatters and handlers. Please to the next chapters for more details. 

# Architecture

## Log levels

Each log message must be supplemented with a numeric __log level__, which denotes severity (importance) of the message. PL-LOG supports up to 600 log levels expressed in positive integers ranged from 1 to 600. There are five predefined log levels ```DEBUG = 100```, ```INFO = 200```, ```WARNING = 300```, ```ERROR = 400``` and ```FATAL = 500```.

Users can set __threshold log level__ on the __system__, __session__ and __handler__ level to control how many messages are getting handled. For example, if your code contains a lot of ```DEBUG``` level messages, you would not want to always store them all in the log table to save disk space and to increase performance. In that case ```INFO``` can be set as the threshold value for the whole system so that only messages with level 200 or more would get "noticed" and handled. At any time threshold can instantly be decreased to ```ALL = 0``` to allow the finest detail log messages to be persisted.

Threshold log level for each message handler gets calculated as ```COALESCE(handler_log_level, session_log_level, system_log_level)``` which means that the session level overrides the system one and the handler level overrides both the session and the system level thresholds. If all three threshold levels are ```NULL```, then messages __won't get handled__ at all.

## Message handlers

By default, PL-LOG only provides API which can be used to instrument PL/SQL code. Log messages, however, are not stored or displayed anywhere. To save or display messages, one or more __message handlers__ must be registered in PL-LOG. Handlers may store messages in a table, file, alert log, write them to ```DBMS_OUTPUT``` or send via e-mail. It is possible to develop custom message handlers and plug them into PL-LOG without recompiling framework's source code. 

Message handler API is implemented via the abstract object type ```T_LOG_MESSAGE_HANDLER```:

```
CREATE OR REPLACE TYPE t_log_message_handler IS OBJECT (

    dummy CHAR,
        
    NOT INSTANTIABLE MEMBER FUNCTION get_log_level
    RETURN PLS_INTEGER,
    
    NOT INSTANTIABLE MEMBER PROCEDURE handle_message (
        p_level IN PLS_INTEGER,
        p_message IN VARCHAR2
    )
    
) 
NOT INSTANTIABLE NOT FINAL
```

Field ```DUMMY``` is there only because Oracle doesn't allow to create object types without fields.

The following two abstract methods must be implemented while developing a message handler:

- ```GET_LOG_LEVEL``` must return threshold log level of the handler. PL-LOG will call the method while deciding whether to call handler's ```HANDLE_MESSAGE``` method or not. It's up to the developer to decide where the return value for ```GET_LOG_LEVEL``` comes from. It may be a simple session-wide package global variable or a system-wide global value stored in a globally accessed context.

- ```HANDLE_MESSAGE``` is called by PL-LOG when the message passes level threshold and should be persisted. The message text provided in ```P_MESSAGE``` is __translated and formatted__ and can be handled without additional processing.

Please refer to the [```CREATE TYPE```](https://docs.oracle.com/database/121/LNPLS/create_type.htm) documentation to get familiar with how object type inheritance works in Oracle.

### Built-in handlers

There are two message handlers PL-LOG comes bundled with:

- ```T_DEFAULT_MESSAGE_HANDLER``` appends log messages to a circular buffer based on a collection variable stored in the implementation package ```DEFAULT_MESSAGE_HANDLER```. 

    Messages can be observed by selecting from the ```LOG$TAIL``` view. Only messages of the current session are visible to the user.

    Size of the buffer can be changed by calling ```DEFAULT_MESSAGE_HANDLER.SET_CAPACITY```.

    Log level threshold of the default message handler is set via ```DEFAULT_MESSAGE_HANDLER.SET_LOG_LEVEL``` and works only in context of the session.

    Call ```DEFAULT_MESSAGE_HANDLER.RESET``` to clear message buffer.

- ```T_DBMS_OUTPUT_HANDLER``` writes log messages to ```DBMS_OUTPUT```. Handler's implementation logic is located in the ```DBMS_OUTPUT_HANDLER``` package.

    Log level threshold can be changed by calling ```DBMS_OUTPUT_HANDLER.SET_LOG_LEVEL``` (applies only to the current session).

    By default the handler will output callstack for all messages with level 400 (```ERROR```) or higher. To change call stack display level threshold use ```DBMS_OUTPUT_HANDLER.SET_CALL_STACK_LEVEL```.

    While displaying the call stack, tracked subprogram argument values will by default be separated by colons and new lines:

    ```
    23:57:48.268 [ERROR  ] MSG-00001: name is not specified!
    at: OWNER.REGISTER_PERSON (line 19)
            p_birth_date: TIMESTAMP '2018-08-23 23:57:48'
            p_name: NULL
        __anonymous_block (line 2)
    ```

    It is possible, however, to make ```DBMS_OUTPUT_HANDLER``` display values in PL/SQL argument named notation, by issuing ```DBMS_OUTPUT_HANDLER.SET_ARGUMENT_NOTATION(TRUE);```

    ```
    23:57:48.268 [ERROR  ] MSG-00001: name is not specified!
    at: OWNER.REGISTER_PERSON (line 19)
            p_birth_date => TIMESTAMP '2018-08-23 23:57:48',
            p_name => NULL
        __anonymous_block (line 2)
    ```

    ```T_DBMS_OUTPUT_HANDLER``` displays argument values as valid __PL/SQL literals__ for ```VARCHAR2```, ```NUMBER```, ```DATE```, ```BOOLEAN``` and compatible types.

## Message resolvers

It is a common practice to codify all messages in the system, especially those which are displayed to the end users. Codifying means assigning each message a unique code and storing texts somewhere outside the PL/SQL code, for example in a table. This approach helps to implement multi-language message support and eases message reusing throughout the project.

In PL-LOG, external message store concept is implemented via __message resolvers__ and the ```T_LOG_MESSAGE_RESOLVER`` abstract object type:

```
CREATE OR REPLACE TYPE t_log_message_resolver IS OBJECT (

    dummy CHAR,

    NOT INSTANTIABLE MEMBER FUNCTION resolve_message (
        p_message IN VARCHAR2,
        p_language IN VARCHAR2 := NULL
    )
    RETURN VARCHAR2
    
) NOT INSTANTIABLE NOT FINAL
```

The only method that needs to be implemented in a custom resolver is ```RESOLVE_MESSAGE```. The method is given a ```P_MESSAGE``` to lookup and an optional ```P_LANGUAGE``` and must return the resolved text. If language is not specified then it's up to the implementation to decide which language to return the resolved message in. ```P_MESSAGE``` format is also not strictly defined. While integrating PL-LOG into an existing system developers might want to implement a resolver based on the existing message definition table.

Please note, that PL-LOG __will not add the original message__ to the resolved text. For example, if there is a message with the code ```'MSG-00001'``` which resolves to the text ```'Invalid value!'```, the resolver might consider to concatenate them together before returning: ```'MSG-00001: Invalid value!'```.

If the message could not be resolved, ```NULL``` must be returned from ```RESOLVE_MESSAGE```. PL-LOG allows to define multiple resolvers. These resolvers will be called by the framework in the same order they have been registered in. The firts one which returns a non-NULL value will "win", so no other resolver will be called.

In case a message could not be resolved by any of the registered resolvers, __the original text__ will be passed to the handlers.

### Built-in resolvers

PL-LOG comes bundled with two message resolvers:

-  ```T_DEFAULT_MESSAGE_RESOLVER``` is based on an associative array package variable and does not support multi-language messages. However, it can be useful if you are planning to create a reusable package which is message store agnostic and comes bundled with all the messages it is using. Consider the following example:

    ```
    CREATE POR REPLACE PACKAGE a_very_useful_package IS
        /* Subprogram declarations */
        ...
    END;

    CREATE POR REPLACE PACKAGE BODY a_very_useful_package IS
        
        PROCEDURE register_messages I
        BEGIN
            default_message_handler.register_message('MSG-00001', 'Not all parameters have been filled correctly!');
            default_message_handler.register_message('MSG-00002', 'Insufficient privileges to run :1!');
        END;

        /* Subprogram implementations */
        ...

    BEGIN
        register_messages;
    END;
    ```

    ```REGISTER_MESSAGES``` is called from the initialization block of ```A_VERY_USEFUL_PACKAGE``` and registers all necessary messages by issuing ```DEFAULT_MESSAGE_HANDLER.REGISTER_MESSAGE```.

- ```T_ORACLE_MESSAGE_RESOLVER``` is used to resolve and __translate__ Oracle built-in ```ORA-``` error messages. The resolver is based on the [```UTL_LMS```](https://docs.oracle.com/database/121/ARPLS/u_lms.htm) package. 
    
    ```UTL_LMS``` allows to obtain text for any ```ORA-``` message in any supported language, using ```NLS_LANGUAGE``` language codes (e. g. ```'ENGLISH'```, ```'AMERICAN'```, ```'GERMAN'``` etc.). The system PL-LOG is used in may, however, use it's own language code table (for example [ISO 639-2](https://en.wikipedia.org/wiki/List_of_ISO_639-2_codes)). To successfully integrate ```T_ORACLE_MESSAGE_RESOLVER``` into a custom language code system an optional __NLS language mapper__ can be set up by using the following statement in the PL-LOG configuration procedure:

    ```
    oracle_message_resolver.set_nls_language_mapper(<t_nls_language_mapper_instance>);
    ```

    NLS language mapper is an abstraction, which allows to create translators from custom language codes to the NLS ones and is defined as follows:

    ```
    TYPE t_nls_language_mapper IS OBJECT (
    
        dummy CHAR,
        
        NOT INSTANTIABLE MEMBER FUNCTION to_nls_language (
            p_user_language IN VARCHAR2
        )
        RETURN VARCHAR2
        
    ) NOT INSTANTIABLE NOT FINAL;
    ```

    There is one NLS language mapper included in the PL-LOG installation as an example - ```T_ISO_LANGUAGE_MAPPER```. The mapper uses a prepopulated table called ```ISO_LANGUAGE_MAP``` to translate ```ISO 639-2``` three letter language codes into valid NLS language names. *Please note that currently this table does not contain all languages defined in the standart!*

    If no language mapper has been specified, ```T_ORACLE_MESSAGE_RESOLVER``` __will accept on;y NLS language names__.

    Refer to the chapter [Message resolver and handler registration](#message-resolver-and-handler-registration) for the details of how ```T_ORACLE_MESSAGE_RESOLVER``` gets registered in PL-LOG.

## Message formatters

Formatting is the process of replacing special placeholders in the message text with the provided values.

PL-LOG doesn't define any specific message template format, instead it provides an abstract object type called ```T_LOG_MESSAGE_FORMATTER``` which implements the formatter concept:

```
CREATE OR REPLACE TYPE t_log_message_formatter IS OBJECT (

    dummy CHAR,
        
    NOT INSTANTIABLE MEMBER FUNCTION format_message (
        p_message IN VARCHAR2,
        p_arguments IN t_varchars
    )
    RETURN VARCHAR2
    
) 
NOT INSTANTIABLE NOT FINAL
```

```FORMAT_MESSAGE``` must be implemented to create a custom message formatter. The method accepts a template string and an array of ```VARCHAR2``` argument values and must return a fully formatted message text.

### Built-in formatters

There are two message formatters included in PL-LOG by default:

- ```T_DEFAULT_MESSAGE_FORMATTER``` allows to include sequential numbers of arguments as value placeholders, prefixed with at most one special character. Below is an example of message templates containing value placeholders prefixed with colons:

    ```
    User :1 has no privileges to run service :2!
    File :1 could not be found!
    ```

    The prefix character can be defined while constructing a ```T_DEFAULT_MESSAGE_FORMATTER``` instance:

    ```
    t_default_message_formatter(':');
    ```

- ```T_ORACLE_MESSAGE_FORMATTER``` mimics the way Oracle defines and formats it's built-in messages and must be used in pair with ```T_ORACLE_MESSAGE_RESOLVER```.

    The message template format used by Oracle most probably has been derived from that of the ```C``` and ```Java``` programming languages. Namely it uses literals like ```%s``` and ```%d``` as argument value placeholders.

    Current implementation of ```T_ORACLE_MESSAGE_FORMATTER``` is very limited and supports only ```%s``` replacing with string argument values, which apparently is more than enough for the most common situations when it is required to translate and format a built-in Oracle message.

# Public API

PL-LOG public API consists of two packages: ```LOG$``` and ```ERROR$```. 

```LOG$``` provides methods for log message formatting and dispatching, call stack and subprogram argument tracking, Oracle built-in exception handling, threshold log level manipulation, message resolver, formatter and handler registration. Constants for the predefined log levels are also defined in the ```LOG$``` package.

```ERROR$``` is used for both free-text and codified businness exception raising and Oracle built-in exception reraising after they have been handled.

## Configuration

Lists of registered message resolvers, formatters and handlers are stored in ```LOG$``` package variables, are local to the session and therefore must be initialized upon session creation. 

The default entry point for configuring PL-LOG is a special schema-level procedure called ```LOG$INIT```. ```LOG$``` will try to run this procedure from it's initialization block dynamically, using ```EXECUTE IMMEDIATE```. Procedure must either reside in the same schema as PL-LOG does or to be resolvable via a synonym.

### Log level threshold control

System and session log level thresholds are manipulated using the following ```LOG$``` subprograms:

```
SUBTYPE NUMBERN IS
    NUMBER NOT NULL;

SUBTYPE t_handler_log_level IS 
    PLS_INTEGER 
        RANGE 0..601;

PROCEDURE reset_system_log_level;
    
PROCEDURE init_system_log_level (
    p_level IN t_handler_log_level
);

PROCEDURE set_system_log_level (
    p_level IN t_handler_log_level
);

FUNCTION get_system_log_level
RETURN t_handler_log_level;

FUNCTION get_session_log_level (
    p_session_serial# IN NUMBERN := c_SESSION_SERIAL#
)        
RETURN t_handler_log_level;
    
PROCEDURE set_session_log_level (
    p_level IN t_handler_log_level,
    p_session_serial# IN NUMBERN := c_SESSION_SERIAL#
);
```

- ```SET_SYSTEM_LOG_LEVEL``` changes __system__ log level threshold. The change becomes immediately available to all sessions.

- ```INIT_SYSTEM_LOG_LEVEL``` must be used to initialize the default system log level threshold when the database instance is started. When included into the ```LOG$INIT``` procedure, the first session which uses ```LOG$``` will set the initial system level threshold. All subsequent calls to ```INIT_SYSTEM_LOG_LEVEL``` won't affect the setting. Unitialized log level threshold equals to and gets handled as ```NULL```.

- ```RESET_SYSTEM_LOG_LEVEL``` puts the system log level threshold back to the unitialized state, so that the first session to call ```INIT_SYSTEM_LOG_LEVEL``` or ```SET_SYSTEM_LOG_LEVEL``` would initialize it again.

- ```SET_SESSION_LOG_LEVEL``` allows to set log level to the current or to __any other session__, by providing a valid session ```SERIAL#``` (unlike ```SID```s, session serial numbers are not reused by the database instance and can be used to uniquely identify sessions).

The ```c_SESSION_SERIAL#``` constant stores serial number of the current session.

Special log level threshold values ```ALL = 0``` and ```NONE = 601``` can be used to allow, respectively, any or none of the messages to be handled.

### Message resolver and handler registration

PL-LOG will always automatically register an instance of ```T_ORACLE_MESSAGE_RESOLVER``` in pair with ```T_ORACLE_MESSAGE_FORMATTER``` formatter. This will immidiately allow to format Oracle built-in messages in any language and custom argument values. ```T_ORACLE_MESSAGE_RESOLVER``` __will always remain the last__ in the list of registered resolvers, which allows developers to override some or all of the ```ORA-``` messages. Note, however, that __no NLS language mapper__ will be set up by default. Include a call to ```ORACLE_MESSAGE_RESOLVER.SET_NLS_LANGUAGE_MAPPER``` in the configuration procedure to enable custom language codes for Oracle built-in messages.

To register custom log message resolvers, formatters and handlers in PL-LOG, use the following ```LOG$``` methods in the configuration procedure:

```
PROCEDURE add_message_resolver (
    p_resolver IN t_log_message_resolver,
    p_level IN t_resolver_log_level := c_ALL,
    p_formatter IN t_log_message_formatter := NULL
);

PROCEDURE set_default_message_formatter (
    p_formatter IN t_log_message_formatter
);

PROCEDURE add_message_handler (
    p_handler IN t_log_message_handler,
    p_language IN VARCHAR2 := NULL
);

PROCEDURE set_default_language (
    p_language IN VARCHAR2
);
```

- ```ADD_MESSAGE_RESOLVER``` registers a message resolver, optionally sets it's log level threshold and associates a message formatter which will exclusively be used in pair with the resolver. 
    
    Usually only messages visible to the end users are codified and need a resolver to get obtained. Debug level messages will most probably be included in the code in a free-text form. Setting resolver's log level threshold may help to increase performance while processing large amounts of debug messages.

    PL-LOG allows to register __multiple message resolvers__, each of which may lookup messages in different stores and return templates of different formats. It is possible to associate different formatters for each registered resolver. If no formatter has been associated with the resolver, the default one will be used, if such is configured.

- ```SET_DEFAULT_MESSAGE_FORMATTER``` sets message formatter which will be used to format messages which could not be resolved or the ones from the resolvers without associated formatter.

- ```ADD_MESSAGE_HANDLER``` registers a log message handler and optionally sets the language which the handler "would like" to receive messages in. When dispatching a message, PL-LOG will iterate over all active handlers and try to resolve the message in all requested languages. 

- ```SET_DEFAULT_LANGUAGE``` defines the language which will be used to resolve messages if no language has been provided while registering the handler.

### Configuration procedure example

Below is an example of how the PL-LOG configuration procedure ```LOG$INIT``` might look like:

```
CREATE OR REPLACE PROCEDURE log$init IS
BEGIN

    -- Default system log level threshold is INFO.
    log$.init_system_log_level(log$.c_INFO);

    -- Registers a default message resolver.
    -- The default formatter will be used for this resolver.
    -- Only the messages of the INFO level or higher will be resolved.
    log$.add_message_resolver(t_default_message_resolver(), log$.c_INFO);

    -- Sets the default formatter.
    -- Message argument placeholders must be prefixed with a colon.
    log$.set_default_message_formatter(t_default_message_formatter(':'));

    -- Sets the ISO-to-NLS language mapper for the T_ORACLE_MESSAGE_RESOLVER resolver:
    oracle_message_resolver.set_nls_language_mapper(t_iso_language_mapper());

    -- Adds circular buffer message handler and sets 
    -- the language accepted to english.
    -- Log level threshold will be inherited from the system's or session's one.
    log$.add_message_handler(t_default_message_handler(), 'ENG');

    -- Adds DBMS_OUTPUT buffer message handler and sets 
    -- the language accepted to english.
    -- By default DBMS_OUTPUT handler will not accept any messages to keep
    -- output clean unless necessary.
    log$.add_message_handler(t_dbms_output_handler(), 'ENG');
    dbms_output_handler.set_log_level(log$.c_NONE);

END;
```

## Code instrumentation

In PL-LOG there are two ways of using ```LOG$``` to put instrumentation calls into your PL/SQL code: 

- A generic procedure ```MESSAGE```, which accepts any valid log level, a message and an array of message arguments:

    ```
    SUBTYPE t_message_log_level IS 
        PLS_INTEGER 
            RANGE 1..600
            NOT NULL;

    PROCEDURE message (
        p_level IN t_message_log_level,
        p_message IN VARCHAR2,
        p_arguments IN t_varchars := NULL,
        p_service_depth IN NATURALN := 0
    );
    ```

    ```P_SERVICE_DEPTH``` is a non-null natural number, which controls how many levels of the current call stack, starting from the top, must be considered as internal and be hidden from the call stack. This feature is helpful when it is necessary to wrap calls to PL-LOG into another layer of the instrumentation routines. For example, a system, which is going to integrate PL-LOG might already have an existing logging solution. The new code which is being developed will for sure call PL-LOG directly, but the old instrumentation methods can be refactored to call ```LOG$``` subprograms as well. In that case developers won't want to see their old logging framework units in the call stack logged alongside the messages. Please refer to the chapter ["Call stack tracking"](#call-stack-tracking) for more details.

    Below is an example of calling ```MESSAGE``` for both codified and free-text messages:

    ```
    PROCEDURE create_account (
        p_user_id IN NUMBER,
        p_currency IN VARCHAR2
    ) IS
    BEGIN

        log$.message(
            log$.c_DEBUG, 
            'Starting account creation. User ID is :1, currency is :2.', 
            t_varchars(p_user_id, p_currency)
        );

        -- An account for the user ID = :1 has been successfully created!
        log$.message(200, 'MSG-00001', t_varchars(p_user_id));

    END;
    ```

- A set of shortcut methods ```DEBUG```, ```INFO```, ```WARNING```, ```ERROR``` and ```FATAL``` each of which has six overloaded versions - one with an array of arguments and five similar versions which accept respectively from 1 to 5 arguments:

    ```
    PROCEDURE debug | info | warning | error | fatal (
        p_message IN VARCHAR2,
        p_arguments IN t_varchars := NULL
    );

    PROCEDURE debug | info | warning | error | fatal (
        p_message IN VARCHAR2,
        p_argument_1 IN VARCHAR2,
        [ ...
        p_argument_5 IN VARCHAR2 ]
    );
    ```

    - The shortcut methods allow to keep instrumentation calls as short and readable as possible.
    - Usually, being able to pass up to five message arguments is more than enough in the vast majority of situations. 
    - The shortcut methods don't allow to specify service depth.

    Below is the same example as for ```MESSAGE```, refactored to use shortcut methods:

    ```
    PROCEDURE create_account (
        p_user_id IN NUMBER,
        p_currency IN VARCHAR2
    ) IS
    BEGIN

        log$.debug(
            'Starting account creation. User ID is :1, currency is :2.', 
            p_user_id, 
            p_currency
        );

        -- An account for the user ID = :1 has been successfully created!
        log$.info('MSG-00001', p_user_id);

    END;
    ```

## Call stack tracking

PL/SQL has a built-in ability to report contents of the call stack. Before 12c, developers relied on [```DBMS_UTILITY.FORMAT_CALL_STACK```](https://docs.oracle.com/database/121/ARPLS/d_util.htm#ARPLS73240), which would return a single string value, containing list of subprograms currently in the call stack. Starting from 12c Release 1, there is a new package called ```UTL_CALL_STACK```, which allows to observe the call stack in a structured way, entry by entry.

Sometimes it is very helpful to store contents of the call stack alongside with the log message. Most often it is required when storing error messages - developers would very much like to know where exactly the error has occured. 

Message handlers can use ```DBMS_UTILITY``` or ```UTL_CALL_STACK``` directly to format and persist contents of the call stack as needed. PL-LOG, however, brings call stack tracking to a higher level, allowing to:

- Hide irrelevant (service) top entries from the stack, leaving only the ones of the business code.
- Associate one or more named values with any call stack entry (useful to log subprogram arguments or loop variables).
- Get the fullest information of where an unexpected Oracle error has occured, by merging the most recently tracked call stack and the error backtrace.

### Data types for storing call stack

PL-LOG stores it's own representation of the most recent call stack in a set of package variables of the following data types:

```
TYPE t_call_entry IS
    RECORD (
        id NUMBER(30),
        unit STRING,
        line PLS_INTEGER,
        first_tracked_line PLS_INTEGER
    );
    
TYPE t_call_stack IS
    TABLE OF t_call_entry;

TYPE t_value IS
    RECORD (
        type VARCHAR2(9),
        varchar2_value STRING,
        number_value NUMBER,
        boolean_value BOOLEAN,
        date_value DATE
    );

TYPE t_values IS
    TABLE OF t_value
    INDEX BY STRING;

TYPE t_call_values IS
    TABLE OF t_values;
```

```T_CALL_ENTRY``` represents one entry in the call stack:

-  ```ID``` is an internal unique identifier of the call;

- ```UNIT``` is a fully qualified name of the unit. In case of successfull flow or a businness error raised by PL-LOG itself, ```UNIT``` will resolve down to the subprogram of the package being called. In case of an unexpected Oracle error (eg. ```NO_DATA_FOUND```), some upper entries of the call stack may be resolved only to the package, because of the ```UTL_CALL_STACK``` limitations.

- ```LINE``` contains calling line number in the __top level program unit__ (package or object type), that is even when ```UNIT``` resolves to a packaged procedure, ```LINE``` will still store line number in the package itself.

- ```FIRST_TRACKED_LINE``` is used by PL-LOG call stack tracking subsystem to identify whether a new call of the same subprogram has started or it is just another instrumentation call in the same execution of the subprogram. This field is considered to be internal and should be igrnored.

```T_CALL_STACK``` represents contents of the whole call stack. The first element is the deepest entry of the stack.

```T_CALL_VALUES``` represents named values associated with the call stack entries:

- Each element of ```T_CALL_VALUES``` is a ```VARCHAR2``` indexed (the name) associative array of ```T_VALUE``` (the value) and represents a set of values associated with one call stack entry. 

- ```T_CALL_STACK``` and ```T_CALL_VALUES``` variables always contain the same number of elements. The first element of ```T_CALL_VALUES``` corresponds to the first element of ```T_CALL_STACK```, the second corresponds to the second and so on. 

- Possible values of ```T_VALUE.TYPE``` are ```'VARCHAR2'```, ```'NUMBER'```, ```'BOOLEAN'``` and ```'DATE'```. Depending on the type, one of ```VARCHAR2_VALUE```, ```NUMBER_VALUE```, ```BOOLEAN_VALUE``` and ```DATE_VALUE``` is filled with the actual value.

### Tracking calls and named values

PL-SQL has a built-in call stack tracking mechanism, based on the ```UTL_CALL_STACK``` package. The goal of developing such mechanism was to provide a possibility to log actual argument values passed to the subprograms in the call stack. Additional idea was to make the whole call stack with all argument values available for logging as early as possible - ideally at the moment of an instrumentation method call.

Unfortunately, ```UTL_CALL_STACK``` is still quite limited in functionality, namely it's resolution is one line of code (not one character!) which makes it impossible to distinguish two calls on the same line. The package also doesn't provide any means to identify subsequent calls of the same PL/SQL subprogram.

As a consequence of the foregoing, to avoid strange and undesirable behavior, developers must be careful and obey some rules while working with the ```LOG$``` call stack tracking subprograms.

The most reliable way of tracking call stack correctly is to make call to ```LOG$.CALL``` the first statement of each businness subprogram:

```
PROCEDURE call (
    p_service_depth IN NATURALN := 0
);
```

```CALL``` will make sure that the tracked call stack is actualized and synchronized with ```UTL_CALL_STACK```. Also collection of the named values associated to the call will be cleared. Line number ```LOG$.CALL;``` statement is located at will be written into the ```FIRST_TRACKED_LINE``` field of the top call stack entry.

### Obtaining and formatting call stack

```LOG$``` provides two subprograms to obtain the most recent contents of the tracked call stack:

```
c_STRING_LENGTH CONSTANT PLS_INTEGER := 32767;

SUBTYPE t_formatted_call_stack_length IS
    PLS_INTEGER
        RANGE 3..32767
        NOT NULL;

TYPE t_call_stack_format_options IS
    RECORD (
        first_line_indent STRING,
        indent STRING,
        argument_notation BOOLEANN := FALSE
    );

PROCEDURE get_call_stack (
    p_calls OUT t_call_stack,
    p_values OUT t_call_values 
);

FUNCTION format_call_stack (
    p_length IN t_formatted_call_stack_length := c_STRING_LENGTH,
    p_options IN t_call_stack_format_options := NULL
)
RETURN VARCHAR2;
```

- ```GET_CALL_STACK``` returns structured call stack information. Message handlers can use this method to analyze or to format call stack as desired.

- ```FORMAT_CALL_STACK``` concatenates contents of the call stack into one ```VARCHAR2``` value.

    By default, ```FORMAT_CALL_STACK``` will return up to the 32767 first characters of the formatted call stack, including information about associated values. Additionally it is possible to lower the length limitation to as little as 3 characters. If there is a length overflow, an ellipsis mark will be added to the end of the returned value.

    It is possible to slightly alter default behaviour of ```FORMAT_CALL_STACK``` by providing an instance of ```T_CALL_STACK_FORMAT_OPTIONS```:

    - ```FIRST_LINE_INDENT``` will be added to the beginning of the first line.
    - ```INDENT``` will be added to the beginning of all lines, starting with the second one.
    - ```ARGUMENT_NOTATION``` value of ```TRUE``` will tell PL-LOG to output associated values in PL/SQL named argument notation.

    Below is an example of how ```FORMAT_CALL_STACK``` is called from withing the built-in message handler ```T_DBMS_OUTPUT_HANDLER```:

    ```
    DECLARE
        v_call_stack_format_options log$.t_call_stack_format_options;
    BEGIN

        v_call_stack_format_options.first_line_indent := 'at: ';
        v_call_stack_format_options.indent := '    ';
        v_call_stack_format_options.argument_notation := TRUE;

        DBMS_OUTPUT.PUT_LINE(
            log$.format_call_stack(
                p_options => v_call_stack_format_options
            )
        );

    END;
    ```

    Possible handler output:

    ```
    at: OWNER.REGISTER_PERSON (line 19)
            p_birth_date => TIMESTAMP '2018-08-23 23:57:48',
            p_name => NULL
        __anonymous_block (line 2)
    ```                 

## Exception handling