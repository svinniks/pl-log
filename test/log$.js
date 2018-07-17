const NONE = 1001;
const ERROR = 800;
const WARNING = 600;
const INFO = 400;
const DEBUG = 200;
const ALL = 0;

suite("Log level management", function() {

    test("Set and get session level", function() {
    
        database.call("log$.set_session_log_level", {
            p_level: 123
        });

        let level = database.call("log$.get_session_log_level");

        expect(level).to.be(123);
    
    });

    test("Reset system level", function() {
    
        database.call("log$.reset_system_log_level");

        let level = database.call("log$.get_system_log_level");

        expect(level).to.be(null);
    
    });

    test("Initialize system level", function() {
    
        database.call("log$.reset_system_log_level");

        database.call("log$.init_system_log_level", {
            p_level: 123
        });

        let level = database.call("log$.get_system_log_level");

        expect(level).to.be(123);
    
    });

    test("Initialize already initialized system level", function() {
    
        database.call("log$.reset_system_log_level");

        database.call("log$.init_system_log_level", {
            p_level: 123
        });

        database.call("log$.init_system_log_level", {
            p_level: 321
        });

        let level = database.call("log$.get_system_log_level");

        expect(level).to.be(123);
    
    });

    test("Set system level, get from another (proxy) session", function() {
    
        database.call("log$.set_system_log_level", {
            p_level: 777
        });

        database.commit();

        let level = database.call("log$.get_system_log_level");

        expect(level).to.be(777);
    
    });
    
});

suite("Message resolving and formatting", function() {

    suite("Concatenation formatter", function() {
    
        test("NULL message, NULL arguments", function() {
        
            database.call("log$.reset");

            let message = database.call("log$.format_message", {
                p_level: INFO,
                p_message: null,
                p_arguments: null
            });

            expect(message).to.be(null);
        
        });
        
        test("NULL message, empty arguments", function() {
        
            database.call("log$.reset");

            let message = database.call("log$.format_message", {
                p_level: INFO,
                p_message: null,
                p_arguments: []
            });

            expect(message).to.be(null);
        
        });

        test("NULL message, one argument", function() {
        
            database.call("log$.reset");

            let message = database.call("log$.format_message", {
                p_level: INFO,
                p_message: null,
                p_arguments: ["hello"]
            });

            expect(message).to.be("(hello)");
        
        });

        test("NULL message, multiple arguments", function() {
        
            database.call("log$.reset");

            let message = database.call("log$.format_message", {
                p_level: INFO,
                p_message: null,
                p_arguments: ["hello", "world", "!"]
            });

            expect(message).to.be("(hello, world, !)");
        
        });

        test("Non-NULL message, multiple arguments", function() {
        
            database.call("log$.reset");

            let message = database.call("log$.format_message", {
                p_level: INFO,
                p_message: "Hello, World!",
                p_arguments: ["hello", "world", "!"]
            });

            expect(message).to.be("Hello, World! (hello, world, !)");
        
        });
    
    });

    suite("Resolvers", function() {
    
        let dummyResolverName;

        setup("Create a dummy resolver", function() {
        
            dummyResolverName = randomString(30);

            database.run(`
                BEGIN

                    EXECUTE IMMEDIATE '
                        CREATE OR REPLACE TYPE "${dummyResolverName}" UNDER t_log_message_resolver (
                            
                            CONSTRUCTOR FUNCTION "${dummyResolverName}"
                            RETURN self AS RESULT,

                            OVERRIDING MEMBER FUNCTION resolve_message (
                                p_message IN VARCHAR2
                            )
                            RETURN VARCHAR2

                        );
                    ';

                    EXECUTE IMMEDIATE '
                        CREATE OR REPLACE TYPE BODY "${dummyResolverName}" IS
                            
                            CONSTRUCTOR FUNCTION "${dummyResolverName}"
                            RETURN self AS RESULT IS
                            BEGIN
                                RETURN;
                            END;

                            OVERRIDING MEMBER FUNCTION resolve_message (
                                p_message IN VARCHAR2
                            )
                            RETURN VARCHAR2 IS
                            BEGIN
                                RETURN UPPER(p_message);
                            END;

                        END;
                    ';

                END;
            `);
        
        });

        test("Add resolver with no level (defaults to ALL), resolve a message", function() {
        
            database.call("log$.reset");

            database.run(`
                BEGIN
                    log$.add_resolver("${dummyResolverName}"());    
                END;
            `);

            let message = database.call("log$.format_message", {
                p_level: INFO,
                p_message: "hello, world!",
                p_arguments: null
            });

            expect(message).to.be("HELLO, WORLD!");
        
        });
        
        test("Add resolver with INFO level, resolve a DEBUG message", function() {
        
            database.call("log$.reset");

            database.run(`
                BEGIN
                    log$.add_resolver("${dummyResolverName}"(), p_level => log$.c_INFO);    
                END;
            `);

            let message = database.call("log$.format_message", {
                p_level: DEBUG,
                p_message: "hello, world!",
                p_arguments: null
            });

            expect(message).to.be("hello, world!");
        
        });

        test("Add resolver with INFO level, resolve an ERROR message", function() {
        
            database.call("log$.reset");

            database.run(`
                BEGIN
                    log$.add_resolver("${dummyResolverName}"(), p_level => log$.c_INFO);    
                END;
            `);

            let message = database.call("log$.format_message", {
                p_level: ERROR,
                p_message: "hello, world!",
                p_arguments: null
            });

            expect(message).to.be("HELLO, WORLD!");
        
        });

        test("Resolver, which can't resolve the message", function() {
        
            database.call("log$.reset");

            database.run(`
                BEGIN
                    log$.add_resolver(t_default_message_resolver());    
                END;
            `);

            let message = database.call("log$.format_message", {
                p_level: ERROR,
                p_message: "hello, world!",
                p_arguments: null
            });

            expect(message).to.be("hello, world!");
        
        });

        test("Two resolvers, the first can't resolve, the second resolves", function() {
        
            database.call("log$.reset");

            database.run(`
                BEGIN
                    log$.add_resolver(t_default_message_resolver()); 
                    log$.add_resolver("${dummyResolverName}"());       
                END;
            `);

            let message = database.call("log$.format_message", {
                p_level: ERROR,
                p_message: "hello, world!",
                p_arguments: null
            });

            expect(message).to.be("HELLO, WORLD!");
        
        });

        test("Two resolvers, the first resolves", function() {
        
            database.call("log$.reset");

            database.run(`
                BEGIN
                    log$.add_resolver("${dummyResolverName}"());       
                    log$.add_resolver(t_default_message_resolver()); 
                END;
            `);

            let message = database.call("log$.format_message", {
                p_level: ERROR,
                p_message: "hello, world!",
                p_arguments: null
            });

            expect(message).to.be("HELLO, WORLD!");
        
        });

        teardown("Drop the dummy resolver", function() {
        
            database.run(`
                BEGIN
                    EXECUTE IMMEDIATE '
                        DROP TYPE "${dummyResolverName}"
                    ';
                END;
            `);

            database.commit();
        
        });
        
    
    });

    suite("Custom formatters", function() {
    
        test("No resolver, default formatter", function() {
        
            database.call("log$.reset");

            database.run(`
                BEGIN
                    log$.set_default_formatter(
                        t_default_message_formatter(':')
                    );    
                END;
            `);
        
            let message = database.call("log$.format_message", {
                p_level: INFO,
                p_message: "Hello, :1!",
                p_arguments: ["World"]
            });

            expect(message).to.be("Hello, World!");

        });

        test("Resolver with no formatter, default formatter", function() {
        
            database.call("log$.reset");
            
            database.call("default_message_resolver.reset");
            database.call("default_message_resolver.register_message", {
                p_code: "MSG-00001",
                p_message: "Hello, :1!"
            });

            database.run(`
                BEGIN

                    log$.add_resolver(
                        t_default_message_resolver()
                    );

                    log$.set_default_formatter(
                        t_default_message_formatter(':')
                    );    
                    
                END;
            `);
        
            let message = database.call("log$.format_message", {
                p_level: INFO,
                p_message: "MSG-00001",
                p_arguments: ["World"]
            });

            expect(message).to.be("MSG-00001: Hello, World!");
        
        });

        test("Resolver with formatter, default formatter", function() {
        
            database.call("log$.reset");
            
            database.call("default_message_resolver.reset");
            database.call("default_message_resolver.register_message", {
                p_code: "MSG-00001",
                p_message: "Hello, :1!"
            });

            database.run(`
                BEGIN

                    log$.add_resolver(
                        t_default_message_resolver(),
                        t_default_message_formatter(':')
                    );

                    log$.set_default_formatter(
                        t_default_message_formatter('#')
                    );    
                    
                END;
            `);
        
            let message = database.call("log$.format_message", {
                p_level: INFO,
                p_message: "MSG-00001",
                p_arguments: ["World"]
            });

            expect(message).to.be("MSG-00001: Hello, World!");
        
        });

        test("Resolver, no formatter, no default formatter", function() {
        
            database.call("log$.reset");
            
            database.call("default_message_resolver.reset");
            database.call("default_message_resolver.register_message", {
                p_code: "MSG-00001",
                p_message: "Hello, :1!"
            });

            database.run(`
                BEGIN
                    log$.add_resolver(
                        t_default_message_resolver()
                    );
                END;
            `);
        
            let message = database.call("log$.format_message", {
                p_level: INFO,
                p_message: "MSG-00001",
                p_arguments: ["World"]
            });

            expect(message).to.be("MSG-00001: Hello, :1! (World)");
        
        });
        
        
        
    });

});

suite("Message handling", function() {

    suite("Raw message handlers", function() {
    
        let handlerTypeName = randomString(30);
        let handlerPackageName = randomString(30);

        setup("Create a dummy raw message handler", function() {
        
            database.run(`
                BEGIN

                    EXECUTE IMMEDIATE '
                        CREATE OR REPLACE PACKAGE "${handlerPackageName}" IS
                            
                            v_messages t_varchars;

                            PROCEDURE reset;

                            PROCEDURE handle_message (
                                p_level IN log$.t_message_log_level,
                                p_message IN VARCHAR2,
                                p_arguments IN t_varchars
                            );

                            FUNCTION get_messages
                            RETURN t_varchars;

                        END;
                    ';

                    EXECUTE IMMEDIATE '
                        CREATE OR REPLACE PACKAGE BODY "${handlerPackageName}" IS

                            PROCEDURE reset IS
                            BEGIN
                                v_messages := t_varchars();
                            END;

                            PROCEDURE handle_message (
                                p_level IN log$.t_message_log_level,
                                p_message IN VARCHAR2,
                                p_arguments IN t_varchars
                            ) IS
                            BEGIN

                                v_messages.EXTEND(1);
                                v_messages(v_messages.COUNT) := p_level || '': '' || t_default_message_formatter('':'').format_message(
                                    p_message,
                                    p_arguments
                                );

                            END;

                            FUNCTION get_messages
                            RETURN t_varchars IS
                            BEGIN
                                RETURN v_messages;
                            END;

                        END;
                    ';

                    EXECUTE IMMEDIATE '
                        CREATE OR REPLACE TYPE "${handlerTypeName}" UNDER t_raw_message_handler (

                            log_level NUMBER,

                            OVERRIDING MEMBER FUNCTION get_log_level
                            RETURN PLS_INTEGER,
                            
                            OVERRIDING MEMBER PROCEDURE handle_message (
                                p_level IN PLS_INTEGER,
                                p_message IN VARCHAR2,
                                p_arguments IN t_varchars
                            )

                        );
                    ';

                    EXECUTE IMMEDIATE '
                        CREATE OR REPLACE TYPE BODY "${handlerTypeName}" IS

                            OVERRIDING MEMBER FUNCTION get_log_level
                            RETURN PLS_INTEGER IS
                            BEGIN
                                RETURN log_level;
                            END;
                            
                            OVERRIDING MEMBER PROCEDURE handle_message (
                                p_level IN PLS_INTEGER,
                                p_message IN VARCHAR2,
                                p_arguments IN t_varchars
                            ) IS
                            BEGIN

                                "${handlerPackageName}".handle_message(p_level, p_message, p_arguments);

                            END;
                            
                        END;
                    ';

                END;
            `);
        
        });

        test("INFO message to one handler with NULL handler, session and system level", function() {
        
            database.call("log$.reset");
            database.call("log$.reset_system_log_level");

            database.run(`
                BEGIN
                    log$.add_handler("${handlerTypeName}"(NULL, NULL));    
                END;
            `);

            database.call(`"${handlerPackageName}".reset`);

            database.call("log$.message", {
                p_level: INFO,
                p_message: "Hello, :1!",
                p_arguments: ["World"]
            });

            let messages = database.call(`"${handlerPackageName}".get_messages`);

            expect(messages).to.eql([]);
        
        });

        test("INFO message to one handler with NULL handler and session level, ERROR system level", function() {
        
            database.call("log$.reset");
            database.call("log$.set_system_log_level", {
                p_level: ERROR
            });

            database.run(`
                BEGIN
                    log$.add_handler("${handlerTypeName}"(NULL, NULL));    
                END;
            `);

            database.call(`"${handlerPackageName}".reset`);

            database.call("log$.message", {
                p_level: INFO,
                p_message: "Hello, :1!",
                p_arguments: ["World"]
            });

            let messages = database.call(`"${handlerPackageName}".get_messages`);

            expect(messages).to.eql([]);
        
        });

        test("INFO message to one handler with NULL handler and session level, INFO system level", function() {
        
            database.call("log$.reset");
            database.call("log$.set_system_log_level", {
                p_level: INFO
            });

            database.run(`
                BEGIN
                    log$.add_handler("${handlerTypeName}"(NULL, NULL));    
                END;
            `);

            database.call(`"${handlerPackageName}".reset`);

            database.call("log$.message", {
                p_level: INFO,
                p_message: "Hello, :1!",
                p_arguments: ["World"]
            });

            let messages = database.call(`"${handlerPackageName}".get_messages`);

            expect(messages).to.eql([
                "400: Hello, World!"
            ]);
        
        });

        test("INFO message to one handler with NULL handler level, ERROR session level, INFO system level", function() {
        
            database.call("log$.reset");

            database.call("log$.set_session_log_level", {
                p_level: ERROR
            });

            database.call("log$.set_system_log_level", {
                p_level: INFO
            });

            database.run(`
                BEGIN
                    log$.add_handler("${handlerTypeName}"(NULL, NULL));    
                END;
            `);

            database.call(`"${handlerPackageName}".reset`);

            database.call("log$.message", {
                p_level: INFO,
                p_message: "Hello, :1!",
                p_arguments: ["World"]
            });

            let messages = database.call(`"${handlerPackageName}".get_messages`);

            expect(messages).to.eql([]);
        
        });

        test("INFO message to one handler with ALL handler level, ERROR session level, INFO system level", function() {
        
            database.call("log$.reset");

            database.call("log$.set_session_log_level", {
                p_level: ERROR
            });

            database.call("log$.set_system_log_level", {
                p_level: INFO
            });

            database.run(`
                BEGIN
                    log$.add_handler("${handlerTypeName}"(NULL, 0));    
                END;
            `);

            database.call(`"${handlerPackageName}".reset`);

            database.call("log$.message", {
                p_level: INFO,
                p_message: "Hello, :1!",
                p_arguments: ["World"]
            });

            let messages = database.call(`"${handlerPackageName}".get_messages`);

            expect(messages).to.eql([
                "400: Hello, World!"
            ]);
        
        });

        test("INFO message to two handlers, both handle", function() {
        
            database.call("log$.reset");

            database.call("log$.set_system_log_level", {
                p_level: INFO
            });

            database.run(`
                BEGIN
                    log$.add_handler("${handlerTypeName}"(NULL, 0));    
                    log$.add_handler("${handlerTypeName}"(NULL, NULL));    
                END;
            `);

            database.call(`"${handlerPackageName}".reset`);

            database.call("log$.message", {
                p_level: INFO,
                p_message: "Hello, :1!",
                p_arguments: ["World"]
            });

            let messages = database.call(`"${handlerPackageName}".get_messages`);

            expect(messages).to.eql([
                "400: Hello, World!",
                "400: Hello, World!"
            ]);
        
        });
        
        teardown("Drop the dummy raw message handler", function() {
        
            database.run(`
                BEGIN
                    EXECUTE IMMEDIATE '
                        DROP TYPE "${handlerTypeName}"
                    ';
                    EXECUTE IMMEDIATE '
                        DROP PACKAGE "${handlerPackageName}"
                    ';
                END;
            `);

            database.commit();
        
        });
        
    });

    suite("Formatted message handlers", function() {
    
        let handlerTypeName = randomString(30);
        let handlerPackageName = randomString(30);

        setup("Create a dummy formatted message handler", function() {
        
            database.run(`
                BEGIN

                    EXECUTE IMMEDIATE '
                        CREATE OR REPLACE PACKAGE "${handlerPackageName}" IS
                            
                            v_messages t_varchars;

                            PROCEDURE reset;

                            PROCEDURE handle_message (
                                p_level IN log$.t_message_log_level,
                                p_message IN VARCHAR2
                            );

                            FUNCTION get_messages
                            RETURN t_varchars;

                        END;
                    ';

                    EXECUTE IMMEDIATE '
                        CREATE OR REPLACE PACKAGE BODY "${handlerPackageName}" IS

                            PROCEDURE reset IS
                            BEGIN
                                v_messages := t_varchars();
                            END;

                            PROCEDURE handle_message (
                                p_level IN log$.t_message_log_level,
                                p_message IN VARCHAR2
                            ) IS
                            BEGIN

                                v_messages.EXTEND(1);
                                v_messages(v_messages.COUNT) := p_level || '': '' || p_message;

                            END;

                            FUNCTION get_messages
                            RETURN t_varchars IS
                            BEGIN
                                RETURN v_messages;
                            END;

                        END;
                    ';

                    EXECUTE IMMEDIATE '
                        CREATE OR REPLACE TYPE "${handlerTypeName}" UNDER t_formatted_message_handler (

                            log_level NUMBER,

                            OVERRIDING MEMBER FUNCTION get_log_level
                            RETURN PLS_INTEGER,
                            
                            OVERRIDING MEMBER PROCEDURE handle_message (
                                p_level IN PLS_INTEGER,
                                p_message IN VARCHAR2
                            )

                        );
                    ';

                    EXECUTE IMMEDIATE '
                        CREATE OR REPLACE TYPE BODY "${handlerTypeName}" IS

                            OVERRIDING MEMBER FUNCTION get_log_level
                            RETURN PLS_INTEGER IS
                            BEGIN
                                RETURN log_level;
                            END;
                            
                            OVERRIDING MEMBER PROCEDURE handle_message (
                                p_level IN PLS_INTEGER,
                                p_message IN VARCHAR2
                            ) IS
                            BEGIN

                                "${handlerPackageName}".handle_message(p_level, p_message);

                            END;
                            
                        END;
                    ';

                END;
            `);
        
        });

        test("INFO message to one handler with NULL handler, session and system level", function() {
        
            database.call("log$.reset");
            database.call("log$.reset_system_log_level");

            database.run(`
                BEGIN
                    log$.add_handler("${handlerTypeName}"(NULL, NULL));    
                END;
            `);

            database.run(`
                BEGIN
                    log$.set_default_formatter(t_default_message_formatter(':'));
                END;
            `);

            database.call(`"${handlerPackageName}".reset`);

            database.call("log$.message", {
                p_level: INFO,
                p_message: "Hello, :1!",
                p_arguments: ["World"]
            });

            let messages = database.call(`"${handlerPackageName}".get_messages`);

            expect(messages).to.eql([]);
        
        });

        test("INFO message to one handler with NULL handler and session level, ERROR system level", function() {
        
            database.call("log$.reset");
            database.call("log$.set_system_log_level", {
                p_level: ERROR
            });

            database.run(`
                BEGIN
                    log$.add_handler("${handlerTypeName}"(NULL, NULL));    
                END;
            `);

            database.run(`
                BEGIN
                    log$.set_default_formatter(t_default_message_formatter(':'));
                END;
            `);

            database.call(`"${handlerPackageName}".reset`);

            database.call("log$.message", {
                p_level: INFO,
                p_message: "Hello, :1!",
                p_arguments: ["World"]
            });

            let messages = database.call(`"${handlerPackageName}".get_messages`);

            expect(messages).to.eql([]);
        
        });

        test("INFO message to one handler with NULL handler and session level, INFO system level", function() {
        
            database.call("log$.reset");
            database.call("log$.set_system_log_level", {
                p_level: INFO
            });

            database.run(`
                BEGIN
                    log$.add_handler("${handlerTypeName}"(NULL, NULL));    
                END;
            `);

            database.run(`
                BEGIN
                    log$.set_default_formatter(t_default_message_formatter(':'));
                END;
            `);

            database.call(`"${handlerPackageName}".reset`);

            database.call("log$.message", {
                p_level: INFO,
                p_message: "Hello, :1!",
                p_arguments: ["World"]
            });

            let messages = database.call(`"${handlerPackageName}".get_messages`);

            expect(messages).to.eql([
                "400: Hello, World!"
            ]);
        
        });

        test("INFO message to one handler with NULL handler level, ERROR session level, INFO system level", function() {
        
            database.call("log$.reset");

            database.call("log$.set_session_log_level", {
                p_level: ERROR
            });

            database.call("log$.set_system_log_level", {
                p_level: INFO
            });

            database.run(`
                BEGIN
                    log$.add_handler("${handlerTypeName}"(NULL, NULL));    
                END;
            `);

            database.run(`
                BEGIN
                    log$.set_default_formatter(t_default_message_formatter(':'));
                END;
            `);

            database.call(`"${handlerPackageName}".reset`);

            database.call("log$.message", {
                p_level: INFO,
                p_message: "Hello, :1!",
                p_arguments: ["World"]
            });

            let messages = database.call(`"${handlerPackageName}".get_messages`);

            expect(messages).to.eql([]);
        
        });

        test("INFO message to one handler with ALL handler level, ERROR session level, INFO system level", function() {
        
            database.call("log$.reset");

            database.call("log$.set_session_log_level", {
                p_level: ERROR
            });

            database.call("log$.set_system_log_level", {
                p_level: INFO
            });

            database.run(`
                BEGIN
                    log$.add_handler("${handlerTypeName}"(NULL, 0));    
                END;
            `);

            database.run(`
                BEGIN
                    log$.set_default_formatter(t_default_message_formatter(':'));
                END;
            `);

            database.call(`"${handlerPackageName}".reset`);

            database.call("log$.message", {
                p_level: INFO,
                p_message: "Hello, :1!",
                p_arguments: ["World"]
            });

            let messages = database.call(`"${handlerPackageName}".get_messages`);

            expect(messages).to.eql([
                "400: Hello, World!"
            ]);
        
        });

        test("INFO message to two handlers, both handle", function() {
        
            database.call("log$.reset");

            database.call("log$.set_system_log_level", {
                p_level: INFO
            });

            database.run(`
                BEGIN
                    log$.add_handler("${handlerTypeName}"(NULL, 0));    
                    log$.add_handler("${handlerTypeName}"(NULL, NULL));    
                END;
            `);

            database.run(`
                BEGIN
                    log$.set_default_formatter(t_default_message_formatter(':'));
                END;
            `);

            database.call(`"${handlerPackageName}".reset`);

            database.call("log$.message", {
                p_level: INFO,
                p_message: "Hello, :1!",
                p_arguments: ["World"]
            });

            let messages = database.call(`"${handlerPackageName}".get_messages`);

            expect(messages).to.eql([
                "400: Hello, World!",
                "400: Hello, World!"
            ]);
        
        });
        
        teardown("Drop the dummy formatted message handler", function() {
        
            database.run(`
                BEGIN
                    EXECUTE IMMEDIATE '
                        DROP TYPE "${handlerTypeName}"
                    ';
                    EXECUTE IMMEDIATE '
                        DROP PACKAGE "${handlerPackageName}"
                    ';
                END;
            `);

            database.commit();
        
        });
    
    });

});

suite("Log level data type constraints", function() {

    test("Try to add resolver with NULL level", function() {
    
        database.call("log$.reset");

        expect(function() {
        
            database.run(`
                BEGIN
                    log$.add_resolver(t_default_message_resolver(), p_level => NULL);
                END;
            `);
        
        }).to.throw(/PLS-00567/);
    
    });
    
    test("Try to add resolver with NONE level", function() {
    
        database.call("log$.reset");

        expect(function() {
        
            database.run(`
                BEGIN
                    log$.add_resolver(t_default_message_resolver(), p_level => ${NONE});
                END;
            `);
        
        }).to.throw(/ORA-06502/);
    
    });

    test("Add resolver with ALL level", function() {
    
        database.call("log$.reset");

        database.run(`
            BEGIN
                log$.add_resolver(t_default_message_resolver(), p_level => ${ALL});
            END;
        `);
    
    });
    
    test("Try to format message with NULL level", function() {
    
        database.call("log$.reset");

        expect(function() {
        
            database.call("log$.format_message", {
               p_level: null,
               p_message: "Hello, World!"
            });
        
        }).to.throw(/ORA-06502/);
    
    });
    
    test("Try to format message with ALL level", function() {
    
        database.call("log$.reset");

        expect(function() {
        
            database.call("log$.format_message", {
               p_level: ALL,
               p_message: "Hello, World!"
            });
        
        }).to.throw(/ORA-06502/);
    
    });

    test("Try to format message with NONE level", function() {
    
        database.call("log$.reset");

        expect(function() {
        
            database.call("log$.format_message", {
               p_level: NONE,
               p_message: "Hello, World!"
            });
        
        }).to.throw(/ORA-06502/);
    
    });

    test("Try to dispatch message with NULL level", function() {
    
        database.call("log$.reset");

        expect(function() {
        
            database.call("log$.message", {
               p_level: null,
               p_message: "Hello, World!"
            });
        
        }).to.throw(/ORA-06502/);
    
    });

    test("Try to dispatch message with NONE level", function() {
    
        database.call("log$.reset");

        expect(function() {
        
            database.call("log$.message", {
               p_level: NONE,
               p_message: "Hello, World!"
            });
        
        }).to.throw(/ORA-06502/);
    
    });

    test("Try to dispatch message with ALL level", function() {
    
        database.call("log$.reset");

        expect(function() {
        
            database.call("log$.message", {
               p_level: ALL,
               p_message: "Hello, World!"
            });
        
        }).to.throw(/ORA-06502/);
    
    });

});

suite("Call stack management", function() {

    let getCallStackJsonProcedureName = "get_call_stack_" + randomString(15);
    let user;

    let singleCallProcedureName = randomString(30);
    let singleCallProcedure2Name = randomString(30);
    let threeCallProcedureName = randomString(30);

    let user1Name = randomString(30);
    let user2Name = randomString(30);

    function resetPackage() {
        database.run(`
            BEGIN
                dbms_session.reset_package;
            END;
        `);
    }

    function getCallStack() {
        return database.call(`"${getCallStackJsonProcedureName}"`);
    }

    setup("Create procedures to test call stack management", function() {
    
        database.run(`
            BEGIN
                EXECUTE IMMEDIATE '
                    ALTER SESSION SET plsql_optimize_level = 1
                ';
            END;
        `);

        user = database.selectValue(`USER FROM dual`);

        let getCallStackJsonProcedure = readFile("test/sql/get_call_stack_json.sql");

        database.run(`
            BEGIN
                EXECUTE IMMEDIATE '${getCallStackJsonProcedure.replaceAll("'", "''").replace("${getCallStackJsonProcedureName}", getCallStackJsonProcedureName)}';
            END;
        `);

        database.run(`
            BEGIN
                EXECUTE IMMEDIATE '
                    CREATE PROCEDURE "${singleCallProcedureName}" IS
                    BEGIN
                        log$.call;
                    END;
                ';
            END;
        `);

        database.run(`
            BEGIN
                EXECUTE IMMEDIATE '
                    CREATE PROCEDURE "${singleCallProcedure2Name}" IS
                    BEGIN

                        log$.call;
                    END;
                ';
            END;
        `);

        database.run(`
            BEGIN
                EXECUTE IMMEDIATE '
                    CREATE PROCEDURE "${threeCallProcedureName}" IS
                    BEGIN
                        log$.call;
                        log$.call;
                        log$.call;
                    END;
                ';
            END;
        `);

        database.run(`
            BEGIN

                EXECUTE IMMEDIATE '
                    CREATE USER "${user1Name}" IDENTIFIED BY "password"
                ';

                EXECUTE IMMEDIATE '
                    CREATE OR REPLACE PROCEDURE "${user1Name}".test_procedure IS
                    BEGIN
                        log$.call(FALSE);
                    END;
                ';

                EXECUTE IMMEDIATE '
                    GRANT EXECUTE ON "${user1Name}".test_procedure TO PUBLIC
                ';

            END;
        `);

        database.run(`
            BEGIN

                EXECUTE IMMEDIATE '
                    CREATE USER "${user2Name}" IDENTIFIED BY "password"
                ';

                EXECUTE IMMEDIATE '
                    CREATE OR REPLACE PROCEDURE "${user2Name}".test_procedure IS
                    BEGIN
                        log$.call(FALSE);
                    END;
                ';

                EXECUTE IMMEDIATE '
                    GRANT EXECUTE ON "${user2Name}".test_procedure TO PUBLIC
                ';

            END;
        `);
    
    });

    suite("CALL", function() {
    
        test("Single anonymous block with one CALL", function() {
    
            resetPackage();
    
            database.run(`
                DECLARE
                BEGIN
                    log$.call;
                END;
            `);
    
            let callStack = getCallStack();
    
            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: 1,
                        owner: null,
                        unit: "__anonymous_block",
                        line: 4,
                        first_line: 4
                    }
                ],
                p_values: [
                    {}
                ]
            });
        
        });
    
        test("Single anonymous block with three subsequent CALLs", function() {
        
            resetPackage();
    
            database.run(`
                DECLARE
                BEGIN
                    log$.call;
                    log$.call;
                    log$.call;
                END;
            `);
    
            let callStack = getCallStack();
    
            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: 1,
                        owner: null,
                        unit: "__anonymous_block",
                        line: 6,
                        first_line: 4
                    }
                ],
                p_values: [
                    {}
                ]
            });
        
        });
    
        test("Single anonymous block with two CALLs on one line", function() {
        
            resetPackage();
    
            database.run(`
                DECLARE
                BEGIN
                    log$.call; log$.call;
                END;
            `);
    
            let callStack = getCallStack();
    
            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: 2,
                        owner: null,
                        unit: "__anonymous_block",
                        line: 4,
                        first_line: 4
                    }
                ],
                p_values: [
                    {}
                ]
            });
        
        });
    
        test("Single anonymous block with two CALLs on one line, reset top TRUE", function() {
        
            resetPackage();
    
            database.run(`
                DECLARE
                BEGIN
                    log$.call; log$.call(TRUE);
                END;
            `);
    
            let callStack = getCallStack();
    
            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: 2,
                        owner: null,
                        unit: "__anonymous_block",
                        line: 4,
                        first_line: 4
                    }
                ],
                p_values: [
                    {}
                ]
            });
        
        });
    
        test("Single anonymous block with two CALLs on one line, reset top FALSE", function() {
        
            resetPackage();
    
            database.run(`
                DECLARE
                BEGIN
                    log$.call; log$.call(FALSE);
                END;
            `);
    
            let callStack = getCallStack();
    
            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: 1,
                        owner: null,
                        unit: "__anonymous_block",
                        line: 4,
                        first_line: 4
                    }
                ],
                p_values: [
                    {}
                ]
            });
        
        });
    
        test("Single anonymous block with two CALLs on one line, reset top NULL", function() {
        
            resetPackage();
    
            database.run(`
                DECLARE
                BEGIN
                    log$.call; log$.call(FALSE);
                END;
            `);
    
            let callStack = getCallStack();
    
            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: 1,
                        owner: null,
                        unit: "__anonymous_block",
                        line: 4,
                        first_line: 4
                    }
                ],
                p_values: [
                    {}
                ]
            });
        
        });
    
        test("Single procedure with one CALL", function() {
        
            resetPackage();
    
            database.call(`"${singleCallProcedureName}"`);
    
            let callStack = getCallStack();
    
            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: 1,
                        owner: null, 
                        unit: "__anonymous_block",
                        line: 1,
                        first_line: 1
                    },
                    {
                        id: 2,
                        owner: user,
                        unit: singleCallProcedureName,
                        line: 3,
                        first_line: 3
                    }
                ],
                p_values: [
                    {},
                    {}
                ]
            });
        
        });
    
        test("Single procedure with three subsequent CALLs", function() {
        
            resetPackage();
    
            database.call(`"${threeCallProcedureName}"`);
    
            let callStack = getCallStack();
    
            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: 1,
                        owner: null, 
                        unit: "__anonymous_block",
                        line: 1,
                        first_line: 1
                    },
                    {
                        id: 2,
                        owner: user,
                        unit: threeCallProcedureName,
                        line: 5,
                        first_line: 3
                    }
                ],
                p_values: [
                    {},
                    {}
                ]
            });
        
        });
    
        test("Two procedures with one CALL on different lines", function() {
        
            resetPackage();
    
            database.call(`"${singleCallProcedureName}"`);
            database.call(`"${singleCallProcedure2Name}"`);
    
            let callStack = getCallStack();
    
            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: 1,
                        owner: null, 
                        unit: "__anonymous_block",
                        line: 1,
                        first_line: 1
                    },
                    {
                        id: 3,
                        owner: user,
                        unit: singleCallProcedure2Name,
                        line: 4,
                        first_line: 4
                    }
                ],
                p_values: [
                    {},
                    {}
                ]
            });
        
        });    
        
        test("Single CALL on level 3 subprogram", function() {
        
            resetPackage();

            database.run(`
                DECLARE

                    PROCEDURE proc2 IS
                    BEGIN
                        log$.call;
                    END;

                    PROCEDURE proc1 IS
                    BEGIN
                        proc2;
                    END;

                BEGIN
                    proc1;
                END;
            `);

            let callStack = getCallStack();

            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: 1,
                        owner: null,
                        unit: "__anonymous_block",
                        line: 15,
                        first_line: 15
                    },
                    {
                        id: 2,
                        owner: null,
                        unit: "__anonymous_block.PROC1",
                        line: 11,
                        first_line: 11
                    },
                    {
                        id: 3,
                        owner: null,
                        unit: "__anonymous_block.PROC2",
                        line: 6,
                        first_line: 6
                    }
                ],
                "p_values": [
                    {},
                    {},
                    {}
                ]
            });
        
        });
        
        test("CALLs on level 1, 2 and 3 before calling next level subprogram", function() {
        
            resetPackage();

            database.run(`
                DECLARE

                    PROCEDURE proc2 IS
                    BEGIN
                        log$.call;
                    END;

                    PROCEDURE proc1 IS
                    BEGIN
                        log$.call;
                        proc2;
                    END;

                BEGIN
                    log$.call;
                    proc1;
                END;
            `);

            let callStack = getCallStack();

            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: 1,
                        owner: null,
                        unit: "__anonymous_block",
                        line: 17,
                        first_line: 16
                    },
                    {
                        id: 2,
                        owner: null,
                        unit: "__anonymous_block.PROC1",
                        line: 12,
                        first_line: 11
                    },
                    {
                        id: 3,
                        owner: null,
                        unit: "__anonymous_block.PROC2",
                        line: 6,
                        first_line: 6
                    }
                ],
                "p_values": [
                    {},
                    {},
                    {}
                ]
            });
        
        });

        test("CALLs on level 1 and 3 before calling next level subprogram, on level 2 after calling next level subprogram", function() {
        
            resetPackage();

            database.run(`
                DECLARE

                    PROCEDURE proc2 IS
                    BEGIN
                        log$.call;
                    END;

                    PROCEDURE proc1 IS
                    BEGIN
                        proc2;
                        log$.call;
                    END;

                BEGIN
                    log$.call;
                    proc1;
                END;
            `);

            let callStack = getCallStack();

            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: 1,
                        owner: null,
                        unit: "__anonymous_block",
                        line: 17,
                        first_line: 16
                    },
                    {
                        id: 2,
                        owner: null,
                        unit: "__anonymous_block.PROC1",
                        line: 12,
                        first_line: 11
                    }
                ],
                "p_values": [
                    {},
                    {}
                ]
            });
        
        });

        test("Single CALL on level 3 subprogram, level 3 subprogram called twice in a row", function() {
        
            resetPackage();

            database.run(`
                DECLARE

                    PROCEDURE proc2 IS
                    BEGIN
                        log$.call;
                    END;

                    PROCEDURE proc1 IS
                    BEGIN
                        proc2;
                        proc2;
                    END;

                BEGIN
                    proc1;
                END;
            `);

            let callStack = getCallStack();

            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: 1,
                        owner: null,
                        unit: "__anonymous_block",
                        line: 16,
                        first_line: 16
                    },
                    {
                        id: 2,
                        owner: null,
                        unit: "__anonymous_block.PROC1",
                        line: 12,
                        first_line: 11
                    },
                    {
                        id: 4,
                        owner: null,
                        unit: "__anonymous_block.PROC2",
                        line: 6,
                        first_line: 6
                    }
                ],
                "p_values": [
                    {},
                    {},
                    {}
                ]
            });
        
        });

        test("Single CALL on level 3 subprogram, level 3 subprogram called twice in a row with reset top FALSE", function() {
        
            resetPackage();

            database.run(`
                DECLARE

                    PROCEDURE proc2 IS
                    BEGIN
                        log$.call(FALSE);
                    END;

                    PROCEDURE proc1 IS
                    BEGIN
                        proc2;
                        proc2;
                    END;

                BEGIN
                    proc1;
                END;
            `);

            let callStack = getCallStack();

            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: 1,
                        owner: null,
                        unit: "__anonymous_block",
                        line: 16,
                        first_line: 16
                    },
                    {
                        id: 2,
                        owner: null,
                        unit: "__anonymous_block.PROC1",
                        line: 12,
                        first_line: 11
                    },
                    {
                        id: 4,
                        owner: null,
                        unit: "__anonymous_block.PROC2",
                        line: 6,
                        first_line: 6
                    }
                ],
                "p_values": [
                    {},
                    {},
                    {}
                ]
            });
        
        });

        test("Single CALL on level 3 subprogram, level 2 subprogram called twice in a row", function() {
        
            resetPackage();

            database.run(`
                DECLARE

                    PROCEDURE proc2 IS
                    BEGIN
                        log$.call;
                    END;

                    PROCEDURE proc1 IS
                    BEGIN
                        proc2;
                    END;

                BEGIN
                    proc1;
                    proc1;
                END;
            `);

            let callStack = getCallStack();

            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: 1,
                        owner: null,
                        unit: "__anonymous_block",
                        line: 16,
                        first_line: 15
                    },
                    {
                        id: 4,
                        owner: null,
                        unit: "__anonymous_block.PROC1",
                        line: 11,
                        first_line: 11
                    },
                    {
                        id: 5,
                        owner: null,
                        unit: "__anonymous_block.PROC2",
                        line: 6,
                        first_line: 6
                    }
                ],
                "p_values": [
                    {},
                    {},
                    {}
                ]
            });
        
        });

        test("Single CALL on top of different branches", function() {
        
            resetPackage();

            database.run(`
                DECLARE

                    PROCEDURE proc5 IS
                    BEGIN
                        log$.call;
                    END;

                    PROCEDURE proc4 IS
                    BEGIN
                        proc5;
                    END;

                    PROCEDURE proc3 IS
                    BEGIN
                        proc5;
                    END;

                    PROCEDURE proc2 IS
                    BEGIN
                        proc3;
                        proc4;
                    END;

                    PROCEDURE proc1 IS
                    BEGIN
                        proc2;
                    END;

                BEGIN
                    proc1;
                END;
            `);

            let callStack = getCallStack();

            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: 1,
                        owner: null,
                        unit: "__anonymous_block",
                        line: 31,
                        first_line: 31
                    },
                    {
                        id: 2,
                        owner: null,
                        unit: "__anonymous_block.PROC1",
                        line: 27,
                        first_line: 27
                    },
                    {
                        id: 3,
                        owner: null,
                        unit: "__anonymous_block.PROC2",
                        line: 22,
                        first_line: 21
                    },
                    {
                        id: 6,
                        owner: null,
                        unit: "__anonymous_block.PROC4",
                        line: 11,
                        first_line: 11
                    },
                    {
                        id: 7,
                        owner: null,
                        unit: "__anonymous_block.PROC5",
                        line: 6,
                        first_line: 6
                    }
                ],
                "p_values": [
                    {},
                    {},
                    {},
                    {},
                    {}
                ]
            });
        
        });

        test("Check if MESSAGE updates the stack", function() {
        
            resetPackage();

            database.call("log$.message", {
                p_level: INFO,
                p_message: "Hello, World!"
            });

            let callStack = getCallStack();

            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: 1,
                        owner: null,
                        unit: "__anonymous_block",
                        line: 1,
                        first_line: 1
                    }
                ],
                p_values: [
                    {}
                ]
            });
        
        });
        
        test("Check if MESSAGE resets the top", function() {
        
            resetPackage();

            database.run(`
                DECLARE
                BEGIN
                    log$.info('Hello, World!'); log$.info('Hello, World!');
                END;
            `);

            let callStack = getCallStack();

            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: 2,
                        owner: null,
                        unit: "__anonymous_block",
                        line: 4,
                        first_line: 4
                    }
                ],
                p_values: [
                    {}
                ]
            });
        
        });

        test("Check if owned subprograms are distinguished correctly", function() {
        
            resetPackage();

            database.run(`
                BEGIN
                    "${user1Name}".test_procedure; "${user1Name}".test_procedure;
                END;
            `);

            let callStack = getCallStack();

            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: 1,
                        owner: null,
                        unit: "__anonymous_block",
                        line: 3,
                        first_line: 3
                    },
                    {
                        id: 2,
                        owner: user1Name,
                        unit: "TEST_PROCEDURE",
                        line: 3,
                        first_line: 3
                    }
                ],
                "p_values": [
                    {},
                    {}
                ]
            });

            resetPackage();

            database.run(`
                BEGIN
                    "${user1Name}".test_procedure; "${user2Name}".test_procedure;
                END;
            `);

            callStack = getCallStack();

            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: 1,
                        owner: null,
                        unit: "__anonymous_block",
                        line: 3,
                        first_line: 3
                    },
                    {
                        id: 3,
                        owner: user2Name,
                        unit: "TEST_PROCEDURE",
                        line: 3,
                        first_line: 3
                    }
                ],
                "p_values": [
                    {},
                    {}
                ]
            });
        
        });
        
    });

    suite("VALUE", function() {
    
        test("Single anonymous block with one VALUE", function() {
    
            resetPackage();
    
            database.run(`
                DECLARE
                BEGIN
                    log$.value('hello', 'world');
                END;
            `);
    
            let callStack = getCallStack();
    
            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: 1,
                        owner: null,
                        unit: "__anonymous_block",
                        line: 4,
                        first_line: 4
                    }
                ],
                p_values: [
                    {
                        hello: "world"
                    }
                ]
            });
        
        });

        test("Try to run single anonymous block with one VALUE, NULL name", function() {
    
            resetPackage();
    
            expect(function() {
            
                database.run(`
                    DECLARE
                    BEGIN
                        log$.value(NULL, 'world');
                    END;
                `);
            
            }).to.throw(/PLS-00567/);
        
        });

        test("Single anonymous block with multiple VALUEs", function() {
    
            resetPackage();
    
            database.run(`
                DECLARE
                BEGIN
                    log$.value('hello', 'world');
                    log$.value('sveiki', 'pasaule');
                    log$.value('good bye', 'people');
                END;
            `);
    
            let callStack = getCallStack();
    
            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: 1,
                        owner: null,
                        unit: "__anonymous_block",
                        line: 6,
                        first_line: 4
                    }
                ],
                p_values: [
                    {
                        hello: "world",
                        sveiki: "pasaule",
                        "good bye": "people"
                    }
                ]
            });
        
        });

        test("Single anonymous block, value overwrite", function() {
    
            resetPackage();
    
            database.run(`
                DECLARE
                BEGIN
                    log$.value('hello', 'world');
                    log$.value('hello', 'people');
                END;
            `);
    
            let callStack = getCallStack();
    
            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: 1,
                        owner: null,
                        unit: "__anonymous_block",
                        line: 5,
                        first_line: 4
                    }
                ],
                p_values: [
                    {
                        hello: "people"
                    }
                ]
            });
        
        });

        test("Single anonymous block, two VALUEs on one line", function() {
    
            resetPackage();
    
            database.run(`
                DECLARE
                BEGIN
                    log$.value('hello', 'world'); log$.value('sveiki', 'pasaule');
                END;
            `);
    
            let callStack = getCallStack();
    
            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: 2,
                        owner: null,
                        unit: "__anonymous_block",
                        line: 4,
                        first_line: 4
                    }
                ],
                p_values: [
                    {
                        sveiki: "pasaule"
                    }
                ]
            });
        
        });

        test("Single anonymous block, two VALUEs on one line, reset top FALSE", function() {
    
            resetPackage();
    
            database.run(`
                DECLARE
                BEGIN
                    log$.value('hello', 'world'); log$.value('sveiki', 'pasaule', FALSE);
                END;
            `);
    
            let callStack = getCallStack();
    
            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: 1,
                        owner: null,
                        unit: "__anonymous_block",
                        line: 4,
                        first_line: 4
                    }
                ],
                p_values: [
                    {
                        hello: "world",
                        sveiki: "pasaule"
                    }
                ]
            });
        
        });

        test("VALUEs on multiple levels", function() {
        
            resetPackage();

            database.run(`
                DECLARE

                    PROCEDURE proc2 IS
                    BEGIN
                        log$.value('level 3 name', 'level 3 value');
                    END;

                    PROCEDURE proc1 IS
                    BEGIN
                        log$.value('level 2 name', 'level 2 value');
                        proc2;
                    END;

                BEGIN
                    log$.value('level 1 name', 'level 1 value');
                    proc1;
                END;
            `);

            let callStack = getCallStack();
    
            expect(callStack.p_values).to.eql([
                {
                    "level 1 name": "level 1 value"
                },
                {
                    "level 2 name": "level 2 value"
                },
                {
                    "level 3 name": "level 3 value"
                }
            ]);
        
        });
        
    });

    teardown("Drop the procedures", function() {
    
        database.run(`
            BEGIN

                EXECUTE IMMEDIATE '
                    DROP USER "${user1Name}" CASCADE
                ';

                EXECUTE IMMEDIATE '
                    DROP USER "${user2Name}" CASCADE
                ';

                EXECUTE IMMEDIATE '
                    DROP PROCEDURE "${threeCallProcedureName}"
                ';
                EXECUTE IMMEDIATE '
                    DROP PROCEDURE "${singleCallProcedure2Name}"
                ';
                EXECUTE IMMEDIATE '
                    DROP PROCEDURE "${singleCallProcedureName}"
                ';
                EXECUTE IMMEDIATE '
                    DROP PROCEDURE "${getCallStackJsonProcedureName}"
                ';
            END;
        `);
    
    });
    
});