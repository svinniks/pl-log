# Table of contents

* [Summary](#summary)
* [Prerequisites](#prerequisites)
* [Installation](#installation)
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

PL-LOG introduces a set of APIs to enable PL/SQL code instrumentation with log messages of different levels (e.g. DEBUG, INFO, ERROR etc.), custom business error raising and unexpected Oracle error handling. 
Log and error messages can be codified, translated into different languages, stored in arbitrary locations and later loaded by pluggable message __resolvers__. Both codified and free-text messages may act as template strings with argument placeholders, which are later replaced with actual values using pluggable __formatters__.

All formatted messages are finally directed to (also pluggable) __handlers__ which store or forward them according to the user and developer needs. Each handler can be configured to process messages in a different language - this can be useful, for example, in a multi-language user environment to store all log entries only in english, but to display messages to the users in their preferred language.

PL-LOG can be configured with unlimited number or message resolvers/formatters/handlers, limiting flow of the messages with log level constraints. Log level of messages being handled can be manipulated irrespective of database transactions on the __system__, __session__ (even different from the current one!) and __handler__ level which allows developers to leave even the finest level logger calls (DEBUG and lower) in the code and quickly enable message output when necessary.

Additional useful features include __call stack tracking__ with subprogram __argument and variable value logging__, ORA- error __translating__ and __mapping__ to custom business errors upon reraise, custom language code handling.

PL-LOG is based on the [`UTL_CALL_STACK`](https://docs.oracle.com/database/121/ARPLS/u_call_stack.htm#ARPLS74078]) package and therefore is only available on Oracle 12c R1 and up. Oracle abstract [object types](https://docs.oracle.com/database/121/ADOBJ/adobjint.htm#ADOBJ00101) are used to implement extensible plugin API, so getting familiar with the OOP concepts is advisable before using the framework.

Below is a short example of how some PL-LOG using looks like:

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
After installation you may want to make PL-LOG API accessible to other users. At the very minimum you should: 

```
GRANT EXECUTE ON log$ TO <PUBLIC|any_separate_user_or_role>
/
GRANT EXECUTE ON error$ TO <PUBLIC|any_separate_user_or_role>
/
```

It is also recommended to create __public synonyms__ for these objects to keep call statements as short as possible. Please refer to the next chapters to get familiar with other PL-LOG objects which it is usable to grant public access to.

# Architecture

## Log levels

Each log message must be supplemented with a numeric __log level__, which denotes severity (importance) of the message. PL-LOG supports up to 600 log levels expressed in positive integers ranged from 1 to 600. There are five predefined log levels ```DEBUG = 100```, ```INFO = 200```, ```WARNING = 300```, ```ERROR = 400``` and ```FATAL = 500```.

Users can set __theshold log level__ on the __system__, __session__ and __handler__ level to control how many messages are getting handled (persisted). For example, if your code contains a lot of ```DEBUG``` level messages, you would not want to always store them all in the log table to save disk space and to increase performance. In that case ```INFO``` can be set as the threshold value for the whole system so that only messages with level 200 or more would get "noticed" and handled. However, if the system starts to behave incorrectly, operators can instantly swith the threshold to ```ALL = 0``` and start observing the log table while trying to reproduce the invalid behavior.

Threshold log level for each message handler gets resolved as ```COALESCE(handler_log_level, session_log_level, system_log_level)``` which means that the session level overrides the system one and the handler level overrides both session and system level thresholds. If all three threshold levels are ```NULL```, then messages __won't be handled__ at all.

## Message handlers

By default, PL-LOG only provides the API to issue log messages of different levels. These messages, however, are not stored or displayed anywhere. To persist or show messages, PL-LOG must be configured to include one or more __message handlers__. Handlers may store messages in a table, file system, alert log or a trace file, output them to ```DBMS_OUTPUT``` or send via e-mail. It is possible to develop custom message handlers and plug them into PL-LOG without recompiling the framework's source code. 

Message handler API is implemented via an abstract object type ```T_LOG_MESSAGE_HANDLER```:

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

The field ```dummy``` is there only because Oracle doesn't allow to create object types without fields.

While creating custom message handlers, developer must extend ```T_LOG_MESSAGE_HANDLER``` and implement two methods: ```GET_LOG_LEVEL``` and ```HANDLE_MESSAGE```.

```GET_LOG_LEVEL``` must return threshold log level of the handler. PL-LOG will call the method while deciding whether to call the handler's ```HANDLE_MESSAGE``` method or not. It's up to the developer to decide where the return value for ```GET_LOG_LEVEL``` comes from. It may be a simple session-wide package global variable or a system-wide global value stored in a globally accessed context.

```HANDLE_MESSAGE``` is called by PL-LOG when the message passes the level threshold and should be persisted. The message text passed is already __translated and formatted__, so the handler must just save, display or forward it.

Please refer to the [```CREATE TYPE```](https://docs.oracle.com/database/121/LNPLS/create_type.htm) documentation to get familiar with how object type inheritance works in Oracle.

Message handlers must be added to PL-LOG by the [configuration procedure]() discussed later.

### Built-in handlers

There are two message handlers PL-LOG comes bundled with:

- ```T_DEFAULT_MESSAGE_HANDLER```
- ```T_DBMS_OUTPUT_HANDLER```

```T_DEFAULT_MESSAGE_HANDLER``` appends log messages to a circular buffer based on a collection variable stored in the handler implementation package ```DEFAULT_MESSAGE_HANDLER```. 

- Messages can be observed by selecting from the ```LOG$TAIL``` view. Only the messages of the current session are visible to the user.

- Size of the buffer can be changed by calling ```DEFAULT_MESSAGE_HANDLER.SET_CAPACITY```.

- Log level threshold of the default message handler is set via ```DEFAULT_MESSAGE_HANDLER.SET_LOG_LEVEL``` and works only in context of the session.

```T_DBMS_OUTPUT_HANDLER``` writes log messages to ```DBMS_OUTPUT```. Just like for the default message handler, there is an implementation package called ```DBMS_OUTPUT_HANDLER```.

- Log level threshold can be changed by calling ```DBMS_OUTPUT_HANDLER.SET_LOG_LEVEL``` (also only for the current session).
- By default the handler will output callstack for all messages with level 400 (```ERROR```) or higher. To lower or to raise call stack display level threshold call ```DBMS_OUTPUT_HANDLER.SET_CALL_STACK_LEVEL```.
- While displaying the call stack, tracked subprogram argument values will by default be displayed using colon as a separator:

    ```
    23:57:48.268 [ERROR  ] MSG-00001: name is not specified!
    at: OWNER.REGISTER_PERSON (line 19)
            p_birth_date: TIMESTAMP '2018-08-23 23:57:48'
            p_name: NULL
        __anonymous_block (line 2)
    ```

    It is possible, however, to make ```DBMS_OUTPUT_HANDLER``` display parameters using PL/SQL named notation, by issuing ```DBMS_OUTPUT_HANDLER.SET_ARGUMENT_NOTATION(TRUE)```:
    ```
    23:57:48.268 [ERROR  ] MSG-00001: name is not specified!
    at: OWNER.REGISTER_PERSON (line 19)
            p_birth_date => TIMESTAMP '2018-08-23 23:57:48',
            p_name => NULL
        __anonymous_block (line 2)
    ```

    This feature can be useful to ease rerunning failed subprogram by just copy-pasting the argument values into your PL/SQL IDE. 
    
    Please note that argument values as displayed as valid __PL/SQL literals__ for ```VARCHAR2```, ```NUMBER```, ```DATE```, ```BOOLEAN``` and compatible type arguments.

## Message resolvers

It is a common practice to codify all the messages in the system, especially those which are displayed to the end users. Codifying means assigning each message a unique code and storing the texts somwhere outside the PL/SQL code, for example in a table. This approach enables multi-language message support, eases reusing and sistematizaion of the system's messages.

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

The only method that needs to be implemented in a custom resolver is ```RESOLVE_MESSAGE```. The method is given a ```P_MESSAGE``` to resolve and an optional ```P_LANGUAGE```. If language is not specified then it's up to the resolver implementation to decide which language to return the resolved message in (one of the options can be the default system language, another is to use current session ```NLS_LANGUAGE```). ```P_MESSAGE``` format is also not strictly defined. While integrating PL-LOG into an existing system developers might want to implement a resolver based on the existing message definition table.

If the message has been successfully resolved, then the text must be returned from the function. Please note, that PL-LOG __will not add the original message__ code to the resolved text. For example, if there is a message with the code ```'MSG-00001'``` which resolves to the text ```'Invalid value!'```, the resolver might consider to concatenate them together before returning: ```'MSG-00001: Invalid value!'```.

If the message could not be resolved, ```NULL``` must be returned from ```RESOLVE_MESSAGE```. PL-LOG allows to define multiple resolvers. These resolvers will be called by the framework in the same order they have been registered. The firts one which returns a non-NULL value will "win", so no other resolver will be called.

In case the message could not be resolved by any of the registered resolvers, the original text will be passed to the handlers.

### Built-in resolvers

PL-LOG comes bundled with one message resolver ```T_DEFAULT_MESSAGE_RESOLVER```, which is based on an associative array package variable and does not support multi-language messages. However, it can be useful if you are planning to create a reusable package which is message store agnostic and comes bundled with all the messages it is using. Consider the following example:

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

```REGISTER_MESSAGES``` is called from the initialization block of ```A_VERY_USEFUL_PACKAGE``` and registers all the necessary messages by issuing ```DEFAULT_MESSAGE_HANDLER.REGISTER_MESSAGE```.

## Message formatters

Formatting is the process of replacing special placeholders in a message text with the provided values. This feature allows to define log messages not only as constant strings, but also as templates, which are later filled with data to provide end users more detailed information of what has happened in the system. 

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

Single method ```FORMAT_MESSAGE``` must be implemented to create a custom message formatter. The method accepts a template string and an array of ```VARCHAR2``` argument values and must return a fully formatted message text.

There is one message formatter included in PL-LOG by default, which is called ```T_DEFAULT_MESSAGE_FORMATTER```. It allows to include sequential numbers of arguments as value placeholders, prefixed with at most one special character. For example, if a developer chooses to use colon ```':'``` as the prefix, valid message templates would look like:

```
User :1 has no privileges to run service :2!
File :1 could not be found!
```

The prefix character can be defined while constructing a ```T_DEFAULT_MESSAGE_FORMATTER``` instance:

```
t_default_message_formatter(':');
```
# Public API

PL-LOG public API consists of two packages: ```LOG$``` and ```ERROR$```. 

```LOG$``` provides methods for log message formatting and dispatching, call stack and subprogram argument tracking, unexpected Oracle error handling, threshold log level manipulation and PL-LOG framework configuration. Constants for the predefined log levels are also defined in the ```LOG$``` package.

```ERROR$``` is used for both free-text and codified businness error raising and Oracle build-in error reraising after handling. The package ensures that any error will be dispatched to the handlers only once.

## Configuration

All PL-LOG configuration, namely message resolvers, formatters, handlers and log level thresholds, is stored in ```LOG$``` package variables, is local to the session and therefore must be initialized upon session creation. The default entry point for configuring PL-LOG is a special schema-level procedure called ```LOG$INIT```. ```LOG$``` will try to run this procedure from it's initialization block dynamically, using ```EXECUTE IMMEDIATE```. Procedure must either reside in the same schema as PL-LOG does or to be resolvable via a synonym.

### Log level threshold control

System and session log level thresholds are manipulated using the following ```LOG$``` subprograms:

```
PROCEDURE set_system_log_level (
    p_level IN t_handler_log_level
);  
    
PROCEDURE init_system_log_level (
    p_level IN t_handler_log_level
);      

PROCEDURE reset_system_log_level;

PROCEDURE set_session_log_level (
    p_level IN t_handler_log_level
);

PROCEDURE set_session_log_level (
    p_session_serial# IN t_session_serial#,
    p_level IN t_handler_log_level
);
```

```T_HANDLER_LOG_LEVEL``` and ```T_SESSION_SERIAL#``` are defined in ```LOG$``` as:

```
SUBTYPE t_handler_log_level IS 
    PLS_INTEGER 
        RANGE 0..601;

SUBTYPE t_session_serial# IS
    NUMBER NOT NULL;
```

- ```SET_SYSTEM_LOG_LEVEL``` changes __system__ log level threshold. The change becomes immediately available to all sessions.

- ```INIT_SYSTEM_LOG_LEVEL``` must be used to initialize the default system log level threshold when the database instance is started. When included into the ```LOG$INIT``` procedure, the first session which uses ```LOG$``` will set the initial system level threshold. All subsequent calls to ```INIT_SYSTEM_LOG_LEVEL``` won't make any effect to the setting.

- ```RESET_SYSTEM_LOG_LEVEL``` puts the system log level threshold back to the unitialized state, so that the first session to call ```INIT_SYSTEM_LOG_LEVEL``` or ```SET_SYSTEM_LOG_LEVEL``` would initialize it again.

- ```SET_SESSION_LOG_LEVEL``` allows to set log level to the current (the first overload) or to __any other session__ (the second one), by providing a valid session ```SERIAL#``` (unlike ```SID```s, session serial numbers are not reused by the database instance and can be used to uniquely identify sessions).

Unitialized log level threshold equals to and gets handled as ```NULL```.

Special log level threshold values ```ALL = 0``` and ```NONE = 601``` can be used to allow, respectively, any or none of the messages to be handled.

### Message resolver and handler registration

To register log message resolvers, formatters and handlers into PL-LOG, the following ```LOG$``` methods must be used in the configuration procedure:

```
PROCEDURE add_message_resolver (
    p_resolver IN t_log_message_resolver,
    p_level IN t_resolver_log_level := c_ALL,
    p_formatter IN t_log_message_formatter := NULL
);

PROCEDURE add_message_resolver (
    p_resolver IN t_log_message_resolver,
    p_formatter IN t_log_message_formatter
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
    
    Usually only messages visible to the end users are codified and need a resolver to be retrieved. Debug level messages will most probably be included in the code in a free-text form. Setting resolver's log level threshold may help to increase performance while processing large amounts of debug messages.

    PL-LOG allows to register more than one message resolvers, each of which may lookup messages in different stores and return templates of different formats. It is possible to associate different formatters for each resolver registered. If no formatter has been assigned to the resolver, then the default one will be used, if such is configured.

- ```SET_DEFAULT_MESSAGE_FORMATTER``` sets a message formatter which will be used to format messages which could not be resolved or the ones from the resolvers without associated formatter.

- ```ADD_MESSAGE_HANDLER``` registers a log message handler and optionally sets a language which the handler "would like" to receive messages in. When dispatching a message, PL-LOG will iterate over all active handlers and try to resolve the message in all languages requested. By calling ```SET_DEFAULT_LANGUAGE``` it is possible to set a language which will be used to resolve messages if no language has been provided while registering the handler.

### Configuration procedure example

Below is a (commented) example of how the PL-LOG configuration procedure ```LOG$INIT``` might look like:

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

There are two ways in PL-LOG of using ```LOG$``` to put instrumentation calls into your PL/SQL code: 

- A generic procedure ```MESSAGE```, which accepts any valid log level and an array of message arguments;
- A set of shortcut methods ```DEBUG```, ```INFO```, ```WARNING```, ```ERROR``` and ```FATAL``` each of which has six overloaded versions - one with an array of arguments and five similar versions which accept respectively from 1 to 5 arguments as separate procedure parameters ```P_ARGUMENT_1``` ... ```P_ARGUMENT_5```.

The generic procedure ```MESSAGE``` is defined as follows:

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

```P_SERVICE_DEPTH``` is a non-null natural number, which controls how many levels of the current call stack, starting from the top, must be considered as internal (or the "service") ones. This feature is helpful when it is necessary to wrap calls to PL-LOG into another layer of the instrumentation routines. For example, a system, which is going to integrate PL-LOG might already have an existing logging solution. The new code which is being developed will for sure call PL-LOG directly, but the old instrumentation methods can be refactored to call ```LOG$``` subprograms as well. In that case developers won't want to see their old logging framework units in the callstack logged alongside the messages. Please refer to the chapter ["Call stack tracking"](#call-stack-tracking) for more details.

Below is a set examples of calling ```MESSAGE``` for some codified and free-text messages:

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

The shortcut methods allow to keep the instrumentation calls as short and readable as possible:

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

Usually, being able to pass up to five message arguments is more than enough in the vast majority of situations. If, however, more arguments are required, each of the shortcut methods has an overloaded version, which accepts an array of argument values. The shortcut methods don't allow to specify service depth.

Below is the same example as for ```MESSAGE```, refactored to use sortcut methods:

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

PL/SQL has a built-in ability to report contents of the call stack. Before 12c, developers relied on [```DBMS_UTILITY.FORMAT_CALL_STACK```](https://docs.oracle.com/database/121/ARPLS/d_util.htm#ARPLS73240), which would return a single string value, containing a list of subprograms currently in the call stack. Starting from 12c Release 1, there is a new package called ```UTL_CALL_STACK```, which allows to observe the call stack in a structured way, entry by entry.

Sometimes it is very helpful to store contents of the call stack alongside with the log message. Most often it is required when storing error messages - developers would very much like to know where exactly the error has occured. 

Message handlers can use ```DBMS_UTILITY``` or ```UTL_CALL_STACK``` directly to format and persist contents of the call stack as needed. PL-LOG, however, brings call stack tracking to a higher level, allowing to:

- Hide irrelevant (service) top entries from the stack, leaving only the one of the business code.
- Associate one or more named values with any call stack entry (useful to log subprogram arguments or loop variables).
- Get the fullest information of where an unexpected Oracle error has occured, by merging the most recently tracked call stack and the error backtrace.

### Data types for storing call stack

PL-LOG stores it's own representation of the most recent call stack in a set of package variables of the following data types:

```
TYPE t_call IS
    RECORD (
        id NUMBER(30),
        unit STRING,
        line PLS_INTEGER,
        first_tracked_line PLS_INTEGER
    );
    
TYPE t_call_stack IS
    TABLE OF t_call;

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

```T_CALL``` represents one entry in the call stack:

-  ```ID``` is an internal unique identifier of the call the entry's subprogram, which is being "guessed" by PL-LOG as precisely as possible;

- ```UNIT``` is a fully qualified name of the unit. In case of successfull flow or a businness error raised by PL-LOG itself, ```UNIT``` will resolve down to the subprogram of the package being called. In case of an unexpected Oracle error (eg. ```NO_DATA_FOUND```), some upper entries of the call stack may be resolved until the package, because of the ```UTL_CALL_STACK``` limitations.

- ```LINE``` contains number of the line in the __top level unit__ (package or object type) the call has occured on, that is even when ```UNIT``` resolves to the very packaged procedure, ```LINE``` will still store line number in the package itself.

- ```FIRST_TRACKED_LINE``` is used by PL-LOG call stack tracking subsystem to identify whether a new call of the same subprogram has started or it is just another instrumentation call in the same execution of the subprogram. This field is considered to be internal and should be igrnored.

```T_CALL_STACK``` represents contents of the whole call stack. The first element is the deepest entry of the stack.

```T_CALL_VALUES``` represents named values associated with the call stack entries:

- Each element of ```T_CALL_VALUES``` is a ```VARCHAR2``` indexed (the name) associative array of ```T_VALUE``` (the value) and represents the set of values associated with one call stack entry. 

- ```T_CALL_STACK``` and ```T_CALL_VALUES``` variables always contain the same number of elements. The first element of ```T_CALL_VALUES``` corresponds to the first element of ```T_CALL_STACK```, the second corresponds to the second and so on. 

- Possible values of ```T_VALUE.TYPE``` are ```'VARCHAR2'```, ```'NUMBER'```, ```'BOOLEAN'``` and ```'DATE'```. Depending on the type, one of ```VARCHAR2_VALUE```, ```NUMBER_VALUE```, ```BOOLEAN_VALUE``` and ```DATE_VALUE``` is filled with the actual value.

### Tracking calls and named values

PL-SQL has a built-in call stack tracking mechanism, based on the ```UTL_CALL_STACK``` package. The goal of developing such mechanism was to provide a possibility to log actual argument values passed to the subprograms in the call stack. Additional idea was to make the whole call stack with all the argument values available for logging as early as possible - ideally at the moment of an instrumentation method call.

Unfortunately, ```UTL_CALL_STACK``` is still quite limited in functionality, namely it's resolution is one code line (not one character!) which makes it impossible to distinguish two calls on the same line. The package also doesn't provide any means to identify subsequent calls of the same PL/SQL subprogram.

As a consequence of the foregoing, to avoid strange and undesirable behavior, developers must be careful and obey some rules while working with the ```LOG$``` call stack tracking subprograms.

### Obtaining and formatting call stack

There is a procedure called ```GET_CALL_STACK``` in the ```LOG$``` package, which should be called from within the message handlers to obtain the most recent contents of the call stack:

```
PROCEDURE get_call_stack (
    p_calls OUT t_call_stack,
    p_values OUT t_call_values 
);
```

All the instrumentation calls will always update the internal representation of the call stack, taking into account any user specified service depth. All internal calls to PL-LOG are considered to be the service ones and normally won't appear in the call stack.

```LOG$``` also contains a helper method ```FORMAT_CALL_STACK```, which allows to create fromatted representation of the call stack contents ready to be presented or stored in a ```VARCHAR2``` column:

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

FUNCTION format_call_stack (
    p_length IN t_formatted_call_stack_length := c_STRING_LENGTH,
    p_options IN t_call_stack_format_options := NULL
)
RETURN VARCHAR2;
```

By default, ```FORMAT_CALL_STACK``` will return up to the 32767 first characters of the formatted call stack, including information about the associated values. Additionally it is possible to lower the length limitation to as little as 3 characters. If there is a length overflow, an ellipsis mark will be added to the end of the returned value.

It is possible to slightly alter the default behaviour of ```FORMAT_CALL_STACK``` by providing and instance of ```T_CALL_STACK_FORMAT_OPTIONS```:

- ```FIRST_LINE_INDENT``` will be added to the beginning of the first line.

- ```INDENT``` will be added to the beginning of all lines, starting with the second one.

- ```ARGUMENT_NOTATION``` value of ```TRUE``` will tell PL-LOG to output the associated value in PL/SQL named argument notation (that is using ```=>``` and comma as the separator).

Below is an example of how ```FORMAT_CALL_STACK``` is called withing the built-in message handler ```T_DBMS_OUTPUT_HANDLER``` (with the argument notation turned on):

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

And here is an example of what could appear in your ```DBMS_OUTPUT``` window:

```
at: OWNER.REGISTER_PERSON (line 19)
        p_birth_date => TIMESTAMP '2018-08-23 23:57:48',
        p_name => NULL
    __anonymous_block (line 2)
```

## Exception handling