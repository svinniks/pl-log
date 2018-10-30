# Version

1.0.0 

[Release notes](RELEASE_NOTES.md)

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
    * [Error raising and handling](#error-raising-and-handling)
        * [Business error raising](#business-error-raising)
        * [Unexpected error handling](#unexpected-error-handling)
            * [Checking for the handled errors](#checking-for-the-handled-errors)
            * [Handling ORA- exceptions](#handling-ora--exceptions)
            * [Reraising exceptions](#reraising-exceptions)
            * [Mapping Oracle exceptions to business errors](#mapping-oracle-exceptions-to-business-errors)
* [Internal PL-LOG exception handling](#internal-pl-log-exception-handling)            
* [Miscellaneous](#miscellaneous)

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

To install PL-LOG, make  ```/src``` the __current folder__ and run ```/install/install.sql``` using SQL*Plus or a PL/SQL IDE of choice. After installation you may want to make PL-LOG API accessible to other users. At the very minimum you should: 

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
        .value('p_name', p_name)
        .value('p_birth_date', p_birth_date);
        
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

To integrate PL-LOG into an existing PL/SQL project, you will have to develop custom message resolvers, formatters and handlers. Please refer to the next chapters for more details. 

# Architecture

## Log levels

Each log message must be supplemented with a numeric __log level__, which denotes severity (importance) of the message. PL-LOG supports up to 600 log levels expressed in positive integers ranged from 1 to 600. There are five predefined log levels ```DEBUG = 100```, ```INFO = 200```, ```WARNING = 300```, ```ERROR = 400``` and ```FATAL = 500```.

Users can set __threshold log level__ on the __system__, __session__ and __handler__ level to control how many messages are getting handled. For example, if your code contains a lot of ```DEBUG``` level messages, you would not want to always store them all in the log table to save disk space and to increase performance. In that case ```INFO``` can be set as the threshold value for the whole system so that only messages with level 200 or more would get "noticed" and handled. At any time threshold can instantly be decreased to ```ALL = 0``` to allow the finest detail log messages to be persisted.

Threshold log level for each message handler gets calculated as ```COALESCE(handler_log_level, session_log_level, system_log_level)``` which means that the session level overrides the system one and the handler level overrides both the session and the system level thresholds. If all three threshold levels are ```NULL```, then messages __won't get handled__ at all.

## Message handlers

By default, PL-LOG only provides API which can be used to instrument PL/SQL code. Log messages, however, are not stored or displayed anywhere. To save or to display messages, one or more __message handlers__ must be registered in PL-LOG. Handlers may store messages in a table, file, alert log, write them to ```DBMS_OUTPUT``` or send via e-mail. It is possible to develop custom message handlers and plug them into PL-LOG without recompiling framework's source code. 

There are two types of message handlers in PL-LOG:

- __Raw__ message handlers accept messages directly from the instrumentation routines. Original messages and argument values come separately - all resolving, formatting and handling must occur within a raw message handler itself. Use raw message handlers if you want to store messages disassembled and later present them to the users in different languages.
- __Formatted__ message handlers receive resolved and formatted messages which are ready to be immediately stored in the desired location. All resolving and formatting happens within PL-LOG automatically according to the configuration.

Message handler API is implemented via three abstract object types ```T_LOG_MESSAGE_HANDLER```, ```T_RAW_MESSAGE_HANDLER``` and ```T_FORMATTED_MESSAGE_HANDLER```:

```
TYPE t_log_message_handler IS OBJECT (

    dummy CHAR,
        
    NOT INSTANTIABLE MEMBER FUNCTION get_log_level
    RETURN PLS_INTEGER,
    
    NOT INSTANTIABLE MEMBER PROCEDURE handle_message (
        p_level IN PLS_INTEGER,
        p_message IN VARCHAR2
    )
    
) 
NOT INSTANTIABLE NOT FINAL;

TYPE t_raw_message_handler UNDER t_log_message_handler (
    
    NOT INSTANTIABLE MEMBER PROCEDURE handle_message (
        p_level IN PLS_INTEGER,
        p_message IN VARCHAR2,
        p_arguments IN t_varchars
    )
    
) 
NOT INSTANTIABLE NOT FINAL;

TYPE t_formatted_message_handler UNDER t_log_message_handler (
  
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

- ```HANDLE_MESSAGE``` is called by PL-LOG when the message passes level threshold and should be persisted. Messages received by descendants of ```T_FORMATTED_MESSAGE_HANDLER``` via ```P_MESSAGE``` are __translated and formatted__ and can be handled without additional processing.

Please refer to the [```CREATE TYPE```](https://docs.oracle.com/database/121/LNPLS/create_type.htm) documentation to get familiar with how object type inheritance works in Oracle.

### Built-in handlers

There are two message handlers PL-LOG comes bundled with:

- ```T_DEFAULT_MESSAGE_HANDLER``` appends log messages to a circular buffer based on a collection variable stored in the implementation package ```DEFAULT_MESSAGE_HANDLER```. 

    Messages can be observed by selecting from the ```LOG$TAIL``` view. Only messages of the current session are visible to the user.

    Size of the buffer can be changed by calling ```DEFAULT_MESSAGE_HANDLER.SET_CAPACITY```.

    Log level threshold of the default message handler is set via ```DEFAULT_MESSAGE_HANDLER.SET_LOG_LEVEL``` and works only in context of the session.

    Call ```DEFAULT_MESSAGE_HANDLER.RESET``` to clear message buffer.

- ```T_DBMS_OUTPUT_HANDLER``` writes log messages to ```DBMS_OUTPUT```. Handler's implementation logic is incapsulated within the ```DBMS_OUTPUT_HANDLER``` package.

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

In PL-LOG, external message store concept is implemented via __message resolvers__ and the `T_LOG_MESSAGE_RESOLVER` abstract object type:

```
TYPE t_log_message_resolver IS OBJECT (

    dummy CHAR,

    NOT INSTANTIABLE MEMBER FUNCTION resolve_message (
        p_message IN VARCHAR2,
        p_language IN VARCHAR2 := NULL
    )
    RETURN VARCHAR2
    
) NOT INSTANTIABLE NOT FINAL;
```

The only method that needs to be implemented in a custom resolver is ```RESOLVE_MESSAGE```. The method is given a ```P_MESSAGE``` to lookup and an optional ```P_LANGUAGE``` and must return the resolved text. If language is not specified then it's up to the implementation to decide which language to return the resolved message in. ```P_MESSAGE``` format is also not strictly defined. While integrating PL-LOG into an existing system developers might want to implement a resolver based on the existing message definition table.

Please note, that PL-LOG __will not add the original message__ to the resolved text. For example, if there is a message with the code ```'MSG-00001'``` which resolves to the text ```'Invalid value!'```, the resolver might consider to concatenate them together before returning: ```'MSG-00001: Invalid value!'```.

If the message could not be resolved, ```NULL``` must be returned from ```RESOLVE_MESSAGE```. PL-LOG allows to define multiple resolvers. These resolvers will be called by the framework in the same order they have been registered in. The first one which returns a non-NULL value will "win", so no other resolver will be called.

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

    If no language mapper has been specified, ```T_ORACLE_MESSAGE_RESOLVER``` __will accept only NLS language names__.

    Refer to the chapter [Message resolver and handler registration](#message-resolver-and-handler-registration) for the details of how ```T_ORACLE_MESSAGE_RESOLVER``` gets registered in PL-LOG.

## Message formatters

Formatting is the process of replacing special placeholders in the message text with the provided values.

PL-LOG doesn't define any specific message template format, instead it provides an abstract object type called ```T_LOG_MESSAGE_FORMATTER``` which implements the formatter concept:

```
TYPE t_log_message_formatter IS OBJECT (

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

- ```T_ORACLE_MESSAGE_FORMATTER``` mimics the way Oracle defines and formats it's built-in messages. Should be used in pair with ```T_ORACLE_MESSAGE_RESOLVER```.

    Message template format used by Oracle has most probably been derived from that of the ```C``` and ```Java``` programming languages. Namely it uses literals like ```%s``` and ```%d``` as argument value placeholders.

    Current implementation of ```T_ORACLE_MESSAGE_FORMATTER``` is very limited and supports only ```%s``` replacing with string argument values, which most likely is more than enough for situations when it is required to translate and format a built-in Oracle message.

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

PL-SQL has a built-in call stack tracking mechanism, based on the ```UTL_CALL_STACK``` package. The idea behind this feature was to enable logging of actual argument values of subprograms in the call stack.

Unfortunately, ```UTL_CALL_STACK``` is still quite limited in functionality, namely it's resolution is one line of code (not one character!) which makes it impossible to distinguish two calls on the same line. The package also doesn't provide any means to identify subsequent calls of the same PL/SQL subprogram.

As a consequence of the foregoing, to avoid strange and undesirable behavior, developers must be careful and obey some rules while working with the ```LOG$``` call stack tracking subprograms.

The most reliable way of tracking call stack is to make ```LOG$.CALL;``` the first statement of each businness subprogram:

```
PROCEDURE call (
    p_service_depth IN NATURALN := 0
);
```

```CALL``` will make sure that the tracked call stack is actualized and synchronized with ```UTL_CALL_STACK```. Also collection of the named values associated to the call will be cleared. Line number ```LOG$.CALL;``` statement is located at will be written into the ```FIRST_TRACKED_LINE``` field of the call stack top entry.

```CALL``` will try to update as little of the call stack as possible. If PL-LOG thinks the base of the call stack is the same, it will update only the topmost entries.

Each entry of the tracked call stack (a __"call"__) has a unique ID which PL-LOG assigns to it. There is an overloaded version of the ```CALL``` method which returns ID of the topmost tracked call:

```
PROCEDURE call (
    p_id OUT NUMBER,
    p_service_depth IN NATURALN := 0
);
```

Please note that each subsequent call to ```CALL``` within the same calling subprogram will reset the top of the call stack and return different call ID:

```
PROCEDURE my_proc IS
    v_call_id NUMBER;
BEGIN
    log$.call(v_call_id); -- will return N
    log$.call(v_call_id); -- will return N + 1
END;
```

Call ID can be later used to associate named (argument) values with the corresponding call stack entry by using one of the four overloaded ```VALUE``` methods:

```
SUBTYPE NUMBERN IS
    NUMBER NOT NULL;

SUBTYPE STRINGN IS 
    VARCHAR2(32767)
        NOT NULL;

PROCEDURE value (
    p_call_id IN NUMBERN,
    p_name IN STRINGN,
    p_value IN VARCHAR2 | NUMBER | BOOLEAN | DATE,
    p_service_depth IN NATURALN := 0
);
```

```VALUE``` does not raise any exceptions even if a non-existing call ID has been passed to it - the invalid ID will be ignored and a notification will be stored in the internal event log. Values with the same name will be overwritten.

Below is an example of tracking calls and argument values of a procedure:

```
PROCEDURE register_person (
    p_name IN VARCHAR2,
    p_surname IN VARCHAR2,
    p_birth_date IN DATE,
    p_married IN BOOLEAN
) IS
    v_call_id NUMBER;
BEGIN

    log$.call(v_call_id);
    log$.value(v_call_id, 'P_NAME', p_name);
    log$.value(v_call_id, 'P_SURNAME', P_SURNAME);
    log$.value(v_call_id, 'P_BIRTH_DATE', p_birth_date);
    log$.value(v_call_id, 'P_MARRIED', p_married);

    ...

    log$.info('The person has been successfully registered!');

END;
```

Provided that the DBMS_OUTPUT message handler is configured to display call stack for INFO messages, the output could be similar to:

```
16:05:32.604 [INFO   ] The person has been successfully registered!
at: JODUS.REGISTER_PERSON (line 16)
        P_BIRTH_DATE: TIMESTAMP '1982-08-06 00:00:00'
        P_MARRIED: FALSE
        P_NAME: 'Sergejs'
        P_SURNAME: 'Vinniks'
    __anonymous_block (line 3)
```

Declaring and handing the call ID variable is a boilerplate, therefore PL-LOG offers a simplified method for tracking calls and argument values - the third ```CALL``` overload, which returns a ```T_CALL``` object, which encapsulates the call ID. ```T_CALL``` object has very similar four ```VALUE``` methods, each of which returns ```SELF``` as result, allowing method call chaining. Below is the same example with the ```REGISTER_PERSON``` procedure, refactored to use chained calls to ```VALUE```:

```
PROCEDURE register_person (
    p_name IN VARCHAR2,
    p_surname IN VARCHAR2,
    p_birth_date IN DATE,
    p_married IN BOOLEAN
) IS
BEGIN

    log$.call()
        .value('P_NAME', p_name)
        .value('P_SURNAME', P_SURNAME)
        .value('P_BIRTH_DATE', p_birth_date)
        .value('P_MARRIED', p_married);

    ...

    log$.info('The person has been successfully registered!');

END;
```

The second version is obviously shorter and more readable. Please note, however, that calling object methods is by __around 10% slower__ in PL/SQL than calling package subprograms.

The ```VALUE``` methods can be used to log not only argument values, but also internal state of a subprogram (eg. loop variables):

```
PROCEDURE process_payments IS
    v_call t_call;
BEGIN

    v_call := log$.call;

    FOR v_payment IN (SELECT id, ...) LOOP

        v_call.value('Payment ID', v_payment.id);

        -- Some processing code here
        ...

    END LOOP;

END;
```

In the example above, if an error occurs and gets handled by PL-LOG while processing the payments, ID of the failing record will appear in the call stack details.

There are another four overloaded versions of the ```VALUE``` method in the ```LOG$``` package:

```
PROCEDURE value (
    p_name IN STRINGN,
    p_value IN VARCHAR2 | NUMBER | BOOLEAN | DATE,
    p_service_depth IN NATURALN := 0
);
```

Unlike the previous version, these methods do not require call ID to be specified - PL-LOG will try to update the call stack within the ```VALUE``` methods themselves. Because of the mentioned ```UTL_CALL_STACK``` drawbacks, this version of ```VALUE``` needs special care to be used and should be avoided. Some examples of undesirable ```VALUE``` behaviour are listed below.

1. When placing multiple calls to ```VALUE``` on the same line, if it is the first line of the subprogram, each subsequent call to ```VALUE``` will reset the top of the stack and clear the list of associated values:

    ```
    PROCEDURE register_person (
        p_name IN VARCHAR2,
        p_surname IN VARCHAR2,
        p_birth_date IN DATE
    ) IS
        v_call_id NUMBER;
    BEGIN

        log$.value('P_NAME', p_name); log$.value('P_SURNAME', P_SURNAME); log$.value('P_BIRTH_DATE', p_birth_date);
            
        ...

        log$.info('The person has been successfully registered!');

    END;
    ```

    In this example only the last argument value (```P_BIRTH_DATE```) will appear in the call stack details:

    ```
    16:05:32.604 [INFO   ] The person has been successfully registered!
    at: JODUS.REGISTER_PERSON (line 16)
            P_BIRTH_DATE: TIMESTAMP '1982-08-06 00:00:00'
        __anonymous_block (line 3)
    ```

2. Subprogram without arguments which use ```VALUE``` to track loop variables, must anyway include ```LOG$.CALL``` as the first statement, especially if message handlers make use of call IDs, otherwise each loop iteration will be presented as a separate subprogram call:

    ```
    PROCEDURE process_payments IS
    BEGIN

        log$.call;

        FOR v_payment IN (SELECT id, ...) LOOP

            log$.value('Payment ID', v_payment.id);

            -- Some processing code here
            ...

        END LOOP;

    END;
    ```

3. Some problems might also appear when multiple overloads of the same subprogram are called subsequently or are mutually calling each other.

Instrumentation API routines, such as ```MESSAGE``` or ```INFO``` will __always try to update the call stack__, so the same restrictions apply when using multiple instrumentation calls on one line or on the same line with ```LOG$.CALL```.

Basic recommendations of hassle free call stack tracking and named value logging are:

1. Always try to include ```LOG$.CALL;``` as the first statement of a subrogram.
2. Always put instrumentation API and unbounded ```VALUE``` calls on separate lines of code.

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

## Error raising and handling

PL-LOG allows not only to instrument your PL/SQL code, but also to manage all kinds of errors - both business related and Oracle built-in ones. 

The main entry point for error handling is the package called ```ERROR$```. Packages's main features are:

- Raising parametrized free-text and codified business errors, using PL-LOG message resolver-formatter-handler pipeline.
- Handling unexpected Oracle errors, which includes error message translating and processing in the PL-LOG message handler infrastructure.
- Ensuring that any exception will be logged in the system at most once.

### Business error raising

To raise a business error with parametrized message call ```ERROR$.RAISE```:

```
PROCEDURE raise (
    p_message IN VARCHAR2,
    p_arguments IN t_varchars := NULL,
    p_service_depth IN NATURALN := 0
);
```

The syntax and the meaning of parameters of ```RAISE``` is the same as of ```LOG$.MESSAGE```. ```RAISE``` will actually call ```LOG$.MESSAGE``` to send the message to registered message handlers. Then it will raise and application error (code 20000..20999) with the resolved and formatted message.

By default, ```ERROR$.RAISE``` will create a log entry with the level ```ERROR=400``` and use ```RAISE_APPLICATION_ERROR``` to raise ```ORA-20000``` with the message formatted using ```NULL``` language (which means that the resolver must decide which language to return the text in). To alter the default ```ERROR$``` behavior, the following methods must be used in the PL-LOG configuration procedure:

```
SUBTYPE log$.t_application_error_code IS
    PLS_INTEGER
        RANGE 20000..20999
        NOT NULL;

SUBTYPE log$.t_message_log_level IS 
    PLS_INTEGER 
        RANGE 1..600
        NOT NULL;

PROCEDURE set_default_error_code (
    p_code IN log$.t_application_error_code
);

PROCEDURE set_error_level (
    p_level IN log$.t_message_log_level
);

PROCEDURE set_display_language (
    p_language IN VARCHAR2
);
```

- Use ```SET_DEFAULT_ERROR_CODE``` if you want to change which application error will be raised by ```ERROR$``` by default. Possible code values are ```20000``` to ```20999```.
- Use ```SET_ERROR_LEVEL``` to change the level error message will be passed to ```LOG$.MESSAGE``` with.
- Use ```SET_DISPLAY_LANGUAGE``` to set fixed language in which the messages are resolved to be raised by ```RAISE_APPLICATION_ERROR```.

There is an overloaded version of the ```RAISE``` procedure, which allows you to specify the error code to raise:

```
PROCEDURE raise (
    p_code IN log$.t_application_error_code,
    p_message IN VARCHAR2,
    p_arguments IN t_varchars := NULL,
    p_service_depth IN NATURALN := 0
)
```

There are also five overloaded shortcut versions of ```RAISE``` which accept from one to five arguments:

```
PROCEDURE raise (
    p_message IN VARCHAR2,
    p_argument_1 IN VARCHAR2,
    [ ...
    p_argument_5 IN VARCHAR2 ]
);
```

Below is an example of a procedure, which tracks it's argument values and raises a codified business error upon input validation:

```
CREATE OR REPLACE PROCEDURE register_person (
    p_name IN VARCHAR2,
    p_birth_date IN DATE
) IS
BEGIN

    log$.call()
        .value('p_name', p_name)
        .value('p_birth_date', p_birth_date);
    
    IF p_name IS NULL THEN
        -- :1 is not specified!
        error$.raise('MSG-00001', 'name');
    END IF;

END;
```

Provided that ```MSG-00001``` is resolved to ```':1 is not specified!'``` and that `DBMS_OUTPUT` handler is enabled and accepts `ERROR` level messages, anonymous PL/SQL block

```
BEGIN
    register_person(NULL, SYSDATE);
END;
```

will raise the following exception:

```
ORA-20000: MSG-00001: name is not specified!
```

and produce the following output:

```
19:33:21.342 [ERROR  ] MSG-00001: name is not specified!
at: PLLOG.REGISTER_PERSON (line 13)
        p_birth_date: TIMESTAMP '2018-09-04 19:33:21'
        p_name: NULL
    __anonymous_block (line 2)
```

Please note that ```(line 13)``` points directly to the line of code in ```REGISTER_PERSON``` the error has occured at.

### Unexpected error handling

Business errors are a part of normal processing - they are raised by intention, their messages are readable and understandable by the end users. It is not even completely necessary to save each business error in the log table. 

Unexpected errors or __exceptions__, on the other hand, need to be carefully handled and persisted, gathering the fullest possible information about where precicely the error has occured and what was the current state of execution at the moment of the exception.

It is a good practice to handle unexpected errors __on the outermost level of code__, that is in subprograms which are directly called by the user program. None of the internal API subprograms should contain ```WHEN OTHERS THEN ...``` unless absolutely necessary. This approach allows developers to track exceptions in the fastest and the most natural way. Placing catches and reraises in the internal API routines will hide the true source of errors and make debugging process difficult and unpleasant.

Methods described in this chapter are designed to be used in an ```EXCEPTION WHEN ... THEN``` block or in a subprogram, which is called from an exception handling block. When using while PL/SQL error stack is empty, the methods won't take any effect.

#### Checking for the handled errors

To check if an exception has already been handled by PL-LOG use the ```ERROR$.HANDLED``` function:

```
FUNCTION handled
RETURN BOOLEAN;
```

```HANDLED``` checks if the exception currently being handled has been raised by one of the ```ERROR$``` subprograms (eg. ```RAISE```). If the function returns ```FALSE```, the error has originated elsewhere and needs manual processing.

#### Handling ORA- exceptions

In case an unhandled exception has been determined by ```HANDLED```, one can call ```LOG$.ORACLE_ERROR``` to persist exception details in the log table or other destinations:

```
PROCEDURE oracle_error (
    p_level IN t_message_log_level := c_FATAL,
    p_service_depth IN NATURALN := 0
);
```

```ORACLE_ERROR``` will send the exception message to the handlers even if the error has already been handled once, so use this procedure only after ```ERROR$.HANDLED``` has returned ```FALSE```.

PL-LOG is capable of __translating ```ORA-``` errors__ into handler's preferred language. Imagine the following situation:
    
- There is a table with a unique key constraint:
    
    ```
    CREATE TABLE things (
        id NUMBER PRIMARY KEY
    );
    ```

- PL-LOG is configured to output log messages to the ```DBMS_OUTPUT``` handler __always in english__:

    ```
    CREATE OR REPLACE PROCEDURE log$init IS
    BEGIN
        ...
        log$.add_message_handler(t_dbms_output_handler(), 'ENG');
        ...
    END;
    ```

- Session's ```NLS_LANGUAGE``` has been set to ```'FRENCH'```:

    ```
    ALTER SESSION SET NLS_LANGUAGE = 'FRENCH';
    ```
- After running

    ```
    BEGIN
        INSERT INTO things VALUES(1);
        INSERT INTO things VALUES(1);
    EXCEPTION
        WHEN OTHERS THEN
            log$.oracle_error;
            RAISE;
    END;
    ```

    the following exception (in french) will be raised

    ```
    ORA-00001: violation de contrainte unique (PLLOG.SYS_C0046901)
    ```

    and the following message (in english) will appear in ```DBMS_OUTPUT```:

    ```
    17:01:57.849 [FATAL  ] ORA-00001: unique constraint (PLLOG.SYS_C0046901) violated
    at: __anonymous_block (line 4)
    ```

If ```LOG$.ORACLE_ERROR``` has been called while handling a "handled" exception, the message will be passed to the handlers twice:

```
BEGIN
    error$.raise('Hello, World!');
EXCEPTION
    WHEN OTHERS THEN
        log$.oracle_error;
END;
```

```
17:06:19.120 [ERROR  ] Hello, World!
at: __anonymous_block (line 2)

17:06:19.121 [FATAL  ] ORA-20000: Hello, World!
at: PLLOG.ERROR$ (line 133)
    PLLOG.ERROR$ (line 147)
    __anonymous_block (line 2)
```

In the example above, the first message in ```DBMS_OUTPUT``` is the result of the original call to ```ERROR$.RAISE```. The second message looks like an unexpected ```ORA-20000``` exception - it has the `ORA-20000:` prefix, it's call stack contains ```ERROR$``` entries which would normally be considered as internal (or "service").

```LOG$.ORACLE_ERROR``` will try to preserve as much of the tracked call stack and named values as possible. Consider the example below:

```
DECLARE

    PROCEDURE proc2 IS
    BEGIN
        log$.call()
            .value('proc2_param', 'proc2_value');
        RAISE NO_DATA_FOUND;
    END;

    PROCEDURE proc1 IS
    BEGIN
        log$.call()
            .value('proc1_param', 'proc1_value');
        proc2;
    END;

BEGIN
    log$.call()
        .value('hello', 'world');
    proc1;
EXCEPTION
    WHEN OTHERS THEN
        log$.oracle_error;
END;
```

Here is what the output will look like:

```
20:35:02.022 [FATAL  ] ORA-01403: no data found
at: __anonymous_block.PROC2 (line 7)
        proc2_param: 'proc2_value'
    __anonymous_block.PROC1 (line 14)
        proc1_param: 'proc1_value'
    __anonymous_block (line 20)
        hello: 'world'
```

Note that the call stack, including the argument values, has been reported correctly up to the very line where ```NO_DATA_FOUND``` has been raised.

#### Shortcut for exception handling

According to the last two chapters, each outermost PL/SQL subprogram should contain the following exception handling block (the ```RAISE``` statement is necessary to reraise the exception regardless whether or not it is a "handled" error):

```
BEGIN
    ...
EXCEPTION
    WHEN OTHERS THEN
        IF NOT error$.handled THEN
            log$.oracle_error;
        END IF;
        RAISE;
END;
```

There is a shortcut method in ```ERROR$``` called ```HANDLE``` which simplifies handling of unexpected errors:

```
PROCEDURE handle (
    p_raise_mapped_error IN log$.BOOLEANN := FALSE,
    p_service_depth IN NATURALN := 0
);
```

With ```ERROR$.HANDLE``` the foregoing code example can be reduced to:

```
BEGIN
    ...
EXCEPTION
    WHEN OTHERS THEN
        error$.handle;
        RAISE;
END;
```

```HANDLE``` will first check if the exception is a handled one and if not will call ```LOG$.ORACLE_ERROR```.

There is an argument ```P_LEVEL``` in ```LOG$.ORACLE_ERROR```, which allows to manually specify  log level the error must be handled with. While using ```ERROR$.HANDLE```, PL-LOG will use the default value for ```P_LEVEL```, which can be altered by using ```ERROR$.SET_ORACLE_ERROR_LEVEL``` in the configuration procedure:

```
PROCEDURE set_error_level (
    p_level IN log$.t_message_log_level
);
```

Details about using the ```P_RAISE_MAPPED_ERROR``` argument can be found in the chapter "[Mapping Oracle exceptions to business errors](#mapping-oracle-exceptions-to-business-errors)".

#### Reraising exceptions

The best way to handle and to later reraise exceptions is using ```ERROR$.HANDLE``` followed by the ```RAISE``` statement in the exception handling block of the outermost PL/SQL subprogram:

```
BEGIN
    ...
EXCEPTION
    WHEN OTHERS THEN
        error$.handle;
        RAISE;
END;
```

Sometimes, however, it is required to reraise an error not from the exception handling block directly, but from a subprogram:

```
DECLARE
    
    PROCEDURE handle_and_reraise IS
    BEGIN
        error$.handle;
        RAISE; -- This will fail to compile!
    END;

EXCEPTION
    WHEN OTHERS THEN
        handle_and_reraise;
END;
```

This anonymous block will fail to run, because ```RAISE``` can't be used outside exception handling block. The issue can be solved by using another overload of ```ERROR$.RAISE```:

```
PROCEDURE raise (
    p_service_depth IN NATURALN := 0
);
```

This version will first handle any unhandled error, then it will raise an exception with the same ```ORA-``` code as the original one. For error codes from ```20000``` to ```20999``` it will call ```RAISE_APPLICATION_ERROR```, for all other exceptions ```RAISE``` will execute a dynamic PL/SQL block, which throws an exception, that has been initialized with the required code by the ```EXCEPTION_INIT``` pragma. Using ```ERROR$.RAISE``` to reraise an exception is demonstrated in the example below:

```
BEGIN
    INSERT INTO things VALUES(1);
    INSERT INTO things VALUES(1);
EXCEPTION
    WHEN OTHERS THEN
        error$.raise;
END;
```

The error will be correctly displayed in ```DBMS_OUTPUT```:

```
21:38:39.744 [FATAL  ] ORA-00001: unique constraint (PLLOG.SYS_C0046901) violated
at: __anonymous_block (line 3)
```

However, exception message displayed to the user will miss the original name of the constraint:

```
ORA-00001: unique constraint (.) violated
```

This happens because there is no way in Oracle to specify message arguments while raising a ```PRAGMA EXCEPTION_INIT``` initialized exception:

```
DECLARE
    e_unique_constraint_violated EXCEPTION;
    PRAGMA EXCEPTION_INIT(e_unique_constraint_violated, -1);
BEGIN
    RAISE e_unique_constraint_violated; -- "ORA-00001: unique constraint (.) violated"
END;
```

Because of this limitation it is recommended to avoid using `ERROR$.RAISE` for exception reraising in favor of `ERROR$.HANDLE` and `RAISE` combination when possible.

#### Mapping Oracle exceptions to business errors

PL-LOG allows to map Oracle built-in exceptions to `20000..20999` errors with custom business messages. This can be useful when developers need to use a subset of `ORA-` exceptions as business errors. For example, instead of `'ORA-00001: unique constraint (OWNER.CONSTRAINT) violated'` one would consider displaying a more readable error message like `'MSG-00001: such record already exists!'`.

__Caution!__ Allowing end users to see unexpected database errors either directly or via mapping is considered a __bad practice__ and should be avoided. Explicit data validations with meaningful error messages must be included in the API instead!

Oracle error mapping concept is implemented via the `T_ORACLE_ERROR_MAPPER` abstract object type:

```
CREATE OR REPLACE TYPE t_oracle_error_mapper IS OBJECT (

    dummy CHAR,

    NOT INSTANTIABLE MEMBER PROCEDURE map_oracle_error (
        p_source_code IN NATURALN,
        p_target_code OUT NATURAL,
        p_target_message OUT VARCHAR2
    )
    
) NOT INSTANTIABLE NOT FINAL;

```

The only method `MAP_ORACLE_ERROR` receives a (positive) `ORA-` error code and must return a "target" application error code (`20000..20999`) and a business error message. Codified messages will be resolved by the normal resolver-formatter-handler flow. PL-LOG will ignore message codes which are not in the valid range of `20000..20999`.

Oracle error mappers can be registered in PL-LOG by calling `LOG$.ADD_ORACLE_ERROR_MAPPER` in the configuration procedure. In case multiple mappers have been registered, the first one to return a non-NULL target error code will win.

PL-LOG will apply mappings __while handling an error__ with `LOG$.ORACLE_ERROR`, `ERROR$.HANDLE` or `ERROR$.RAISE`. Below is an example of creating and using an error mapper in PL-LOG:

- Implement the mapper interface:

    ```
    CREATE OR REPLACE TYPE t_dummy_error_mapper UNDER t_oracle_error_mapper (

        CONSTRUCTOR FUNCTION t_dummy_error_mapper
        RETURN self AS RESULT,

        OVERRIDING MEMBER PROCEDURE map_oracle_error (
            p_source_code IN NATURALN,
            p_target_code OUT NATURAL,
            p_target_message OUT VARCHAR2
        )

    );

    CREATE OR REPLACE TYPE BODY t_dummy_error_mapper IS

        CONSTRUCTOR FUNCTION t_dummy_error_mapper
        RETURN self AS RESULT IS
        BEGIN
            RETURN;
        END;

        OVERRIDING MEMBER PROCEDURE map_oracle_error (
            p_source_code IN NATURALN,
            p_target_code OUT NATURAL,
            p_target_message OUT VARCHAR2
        ) IS
        BEGIN
        
            IF p_source_code = 1403 THEN
                p_target_code := 20100;
                p_target_message := 'MSG-00001';
            END IF;
        
        END;

    END;
    ```

    The mapper will translate `NO_DATA_FOUND` exception (code 1403) into `MSG-00001` and raise `ORA-20100` if necessary.

- Register the mapper in the configuration procedure:

    ```
    CREATE OR REPLACE PROCEDURE log$init IS
    BEGIN
        ...
        log$.add_oracle_error_mapper(t_dummy_error_mapper());
        ...
    END;
    ```

- Register `MSG-00001` in the default message resolver:

    ```
    default_message_resolver.register_message('MSG-00001', 'Requested records could not be found!');
    ```

- Call the anonymous block:

 
    ```
    BEGIN
        RAISE NO_DATA_FOUND;
    EXCEPTION
        WHEN OTHERS THEN
            log$.oracle_error;
            RAISE;
    END;
    ```

    The following output will be displayed in `DBMS_OUTPUT`:

    ```
    13:26:46.251 [FATAL  ] MSG-00001: Requested records could not be found!
    at: __anonymous_block (line 2)
    ```

    and the following exception message will be displayed to the user:

    ```
    ORA-01403: no data found
    ```

`RAISE` will still reraise the original `NO_DATA_FOUND` exception. `'MSG-00001'` will be sent only to the message handlers. To reraise the mapped error (`ORA-20100` with `'MSG-00001'` in our case), one of the following methods should be used:

1. Instead `LOG$.ORACLE_ERROR` use `ERROR$.HANDLE` with the optional argument `P_RAISE_MAPPED_ERROR` equal to `TRUE`:

    ```
    BEGIN
        RAISE NO_DATA_FOUND;
    EXCEPTION
        WHEN OTHERS THEN
            error$.handle(TRUE);
            RAISE;
    END;
    ```     

    will now raise

    ```
    ORA-20100: MSG-00001: Requested records could not be found!
    ```

    Please note, that in the last example `ORA-20100` has been raised from within the `ERROR$.HANDLE` procedure and not by the `RAISE` statement. However, `RAISE` must still be left in the code to handle non-mapped exceptions:

    ```
    BEGIN
        RAISE TOO_MANY_ROWS;
    EXCEPTION
        WHEN OTHERS THEN
            error$.handle(TRUE);
            RAISE;
    END;
    ``` 

    will normally handle and reraise

    ```
    ORA-01422: exact fetch returns more than requested number of rows
    ```

2. Use `ERROR$.RAISE` to reraise the error, which internally calls `HANDLE(TRUE)`.
3. Use the overloaded version of `LOG$.ORACLE_ERROR` which returns mapped error code and message if any:

    ```
    PROCEDURE oracle_error (
        p_level IN t_message_log_level,
        p_service_depth IN NATURALN,
        p_mapped_code OUT PLS_INTEGER,
        p_mapped_message OUT VARCHAR2
    );
    ```

    This version of `ORACLE_ERROR` is used internally by the `ERROR$.HANDLE` procedure.

# Internal PL-LOG exception handling

PL-LOG is designed not to raise any internal exceptions which may occur in the `LOG$` and `ERROR$` code itself. Two techniques are used to avoid seeing `LOG$` and `$ERROR` on the error stack:

1. Extensive use of constrainted data types in the public API methods. For example, if a subprogram argument is defined as `NATURALN`, which is a "non-NULL natural number", instead of just `PLS_INTEGER`, the code will fail to compile or to run in the __calling routine__ instead of the subprogram itself.
2. All plugable component (resolver, handler, etc.) calls are wrapped into `BEGIN ... EXCEPTION ... END` blocks which catch all the exceptions and write them into the internal log table `LOG$EVENTS`. If a handler raises an error, your main business code won't fail, although the message won't be handled correctly, so it is essential to periodically check `LOG$EVENTS` for the new errors.

# Miscellaneous

- By default, ```LOG$``` will call ```LOG$INIT``` dynamically, using an ```EXECUTE IMMEDIATE ...``` statement. However, it is always faster (up to 6 times, benchmark proven) to call subprograms from statically compiled code. It is possible to recompile the ```LOG$``` package with an additional compiler flag ```production:TRUE``` which will compile a statical call to ```LOG$INIT```:

    ```
    ALTER PACKAGE log$ COMPILE PLSQL_CCFLAGS = 'production:TRUE'
    /
    ```

    Pleas note though, that in case ```LOG$INIT``` becomes invalid, it will immideately invalidate the ```LOG$``` package itself which can ruin the whole system, so it is not recommended to use this flag unless ```LOG$INIT``` has been carefully tested.