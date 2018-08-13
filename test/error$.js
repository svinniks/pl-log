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

const NONE = 601;
const FATAL = 500;
const ERROR = 400; 
const WARNING = 300; 
const INFO = 200; 
const DEBUG = 100;
const ALL = 0;

let getCallStackJsonProcedureName;

function getCallStack() {
    return database.call(`"${getCallStackJsonProcedureName}"`);
}

setup("Create wrapper for LOG$.GET_CALL_STACK to handle associative array argument", function() {

    getCallStackJsonProcedureName = "get_call_stack_" + randomString(15);

    let getCallStackJsonProcedure = readFile("test/sql/get_call_stack_json.sql");

    database.run(`
        BEGIN
            EXECUTE IMMEDIATE '${getCallStackJsonProcedure.replaceAll("'", "''").replace("${getCallStackJsonProcedureName}", getCallStackJsonProcedureName)}';
        END;
    `);

});

setup("Setup logger and error handler", function() {

    database.call("log$.reset");

    database.run(`
        BEGIN
            log$.add_message_resolver(t_default_message_resolver());
            log$.set_default_message_formatter(t_default_message_formatter(':'));
            log$.add_message_handler(t_default_message_handler());
            log$.set_system_log_level(log$.c_ALL);
        END;
    `);

    database.call("default_message_resolver.reset");

    database.call("default_message_resolver.register_message", {
        p_code: "MSG-00001",
        p_message: "Hello, :1!"
    });

    database.call("default_message_resolver.register_message", {
        p_code: "MSG-00002",
        p_message: "Good bye, World!"
    });

    database.call("default_message_resolver.register_message", {
        p_code: "MSG-00003",
        p_message: "Hello, :1, :2, :3, :4 and :5!"
    });

});

suite("Error handler configuration", function() {

    test("Try to set NULL error code", function() {
    
        expect(function() {
        
            database.call("error$.set_error_code", {
                p_code: null
            });
        
        }).to.throw(/ORA-06502/);
    
    });
    
    test("Try to set invalid error code", function() {
    
        expect(function() {
        
            database.call("error$.set_error_code", {
                p_code: 10
            });
        
        }).to.throw(/ORA-06502/);
    
    });

    test("Set valid error code", function() {
    
        database.call("error$.set_error_code", {
            p_code: 20123
        });
        
        let errorCode = database.call("error$.get_error_code");

        expect(errorCode).to.be(20123);
    
    });

    test("Try to set NULL error level", function() {
    
        expect(function() {
        
            database.call("error$.set_error_level", {
                p_level: null
            });
        
        }).to.throw(/ORA-06502/);
    
    });
    
    test("Try to set invalid error level", function() {
    
        expect(function() {
        
            database.call("error$.set_error_level", {
                p_level: ALL
            });
        
        }).to.throw(/ORA-06502/);
    
    });

    test("Set valid error level", function() {
    
        database.call("error$.set_error_level", {
            p_level: WARNING
        });
        
        let errorLevel = database.call("error$.get_error_level");

        expect(errorLevel).to.be(WARNING);

    });

});

suite("Error raising and handling", function() {

    test("Raise an error without arguments, check custom error code and level", function() {

        database.run(`
            BEGIN
                log$.reset_call_stack;
                default_message_handler.reset;
                error$.set_error_code(20123);
                error$.set_error_level(550);
            END;
        `);

        expect(function() {
        
            database.run(`
                BEGIN
                    error$.raise('MSG-00002');
                EXCEPTION
                    WHEN OTHERS THEN
                        log$.oracle_error;
                        RAISE;
                END;
            `);    
        
        }).to.throw(/MSG-00002/);

        let tail = database.selectObjects(`log_level, message FROM log$tail`);

        expect(tail).to.eql([
            {
                log_level: FATAL,
                message: "ORA-20123: MSG-00002: Good bye, World!"
            },
            {
                log_level: 550,
                message: "MSG-00002: Good bye, World!"
            }
        ]);
        
    });
       
    test("Raise an error with arguments, check custom error code and level", function() {
    
        database.run(`
            BEGIN
                log$.reset_call_stack;
                error$.reset;
                default_message_handler.reset;
            END;
        `);

        expect(function() {
        
            database.run(`
                BEGIN
                    log$.value('hello', 'world');
                    error$.raise('MSG-00001', t_varchars('World'));
                END;
            `);    
        
        }).to.throw(/MSG-00001/);

        let tail = database.selectObjects(`log_level, message FROM log$tail`);

        expect(tail).to.eql([
            {
                log_level: ERROR,
                message: "MSG-00001: Hello, World!"
            }
        ]);

        let callStack = getCallStack();

        expect(callStack).to.eql({
            p_calls: [
                {
                    id: callStack.p_calls[0].id,
                    unit: "__anonymous_block",
                    line: 4,
                    first_tracked_line: 3
                }
            ],
            p_values: [
                {
                    hello: {
                        type: "VARCHAR2",
                        varchar2_value: "world",
                        number_value: null,
                        boolean_value: null,
                        date_value: null
                    }
                }
            ]
        });
        
    });

    test("Raise an error with arguments, hide one stack level", function() {
    
        database.run(`
            BEGIN
                log$.reset_call_stack;
                error$.reset;
                default_message_handler.reset;
            END;
        `);

        expect(function() {
        
            database.run(`
                DECLARE
                    PROCEDURE proc IS
                    BEGIN
                        error$.raise('MSG-00001', t_varchars('World'), 1);
                    END;
                BEGIN
                    log$.value('hello', 'world');
                    proc;
                END;
            `);    
        
        }).to.throw(/MSG-00001/);
    
        let tail = database.selectObjects(`log_level, message FROM log$tail`);
    
        expect(tail).to.eql([
            {
                log_level: ERROR,
                message: "MSG-00001: Hello, World!"
            }
        ]);
    
        let callStack = getCallStack();
    
        expect(callStack).to.eql({
            p_calls: [
                {
                    id: callStack.p_calls[0].id,
                    unit: "__anonymous_block",
                    line: 9,
                    first_tracked_line: 8
                }
            ],
            p_values: [
                {
                    hello: {
                        type: "VARCHAR2",
                        varchar2_value: "world",
                        number_value: null,
                        boolean_value: null,
                        date_value: null
                    }
                }
            ]
        });
    
    });

    test("Raise an error with 1 argument overload version", function() {
    
        database.run(`
            BEGIN
                log$.reset_call_stack;
                error$.reset;
                default_message_handler.reset;
            END;
        `);
    
        expect(function() {
        
            database.run(`
                BEGIN
                    log$.value('hello', 'world');
                    error$.raise('MSG-00003', 'World');
                END;
            `);    
        
        }).to.throw(/MSG-00003: Hello, World, :2, :3, :4 and :5!/);
    
        let tail = database.selectObjects(`log_level, message FROM log$tail`);
    
        expect(tail).to.eql([
            {
                log_level: ERROR,
                message: "MSG-00003: Hello, World, :2, :3, :4 and :5!"
            }
        ]);
    
        let callStack = getCallStack();
    
        expect(callStack).to.eql({
            p_calls: [
                {
                    id: callStack.p_calls[0].id,
                    unit: "__anonymous_block",
                    line: 4,
                    first_tracked_line: 3
                }
            ],
            p_values: [
                {
                    hello: {
                        type: "VARCHAR2",
                        varchar2_value: "world",
                        number_value: null,
                        boolean_value: null,
                        date_value: null
                    }
                }
            ]
        });
    
    });

    test("Raise an error with 2 argument overload version", function() {
    
        database.run(`
            BEGIN
                log$.reset_call_stack;
                error$.reset;
                default_message_handler.reset;
            END;
        `);
    
        expect(function() {
        
            database.run(`
                BEGIN
                    log$.value('hello', 'world');
                    error$.raise('MSG-00003', 'World', 'People');
                END;
            `);    
        
        }).to.throw(/MSG-00003: Hello, World, People, :3, :4 and :5!/);
    
        let tail = database.selectObjects(`log_level, message FROM log$tail`);
    
        expect(tail).to.eql([
            {
                log_level: ERROR,
                message: "MSG-00003: Hello, World, People, :3, :4 and :5!"
            }
        ]);
    
        let callStack = getCallStack();
    
        expect(callStack).to.eql({
            p_calls: [
                {
                    id: callStack.p_calls[0].id,
                    unit: "__anonymous_block",
                    line: 4,
                    first_tracked_line: 3
                }
            ],
            p_values: [
                {
                    hello: {
                        type: "VARCHAR2",
                        varchar2_value: "world",
                        number_value: null,
                        boolean_value: null,
                        date_value: null
                    }
                }
            ]
        });
    
    });

    test("Raise an error with 3 argument overload version", function() {
    
        database.run(`
            BEGIN
                log$.reset_call_stack;
                error$.reset;
                default_message_handler.reset;
            END;
        `);
    
        expect(function() {
        
            database.run(`
                BEGIN
                    log$.value('hello', 'world');
                    error$.raise('MSG-00003', 'World', 'People', 'Sun');
                END;
            `);    
        
        }).to.throw(/MSG-00003: Hello, World, People, Sun, :4 and :5!/);
    
        let tail = database.selectObjects(`log_level, message FROM log$tail`);
    
        expect(tail).to.eql([
            {
                log_level: ERROR,
                message: "MSG-00003: Hello, World, People, Sun, :4 and :5!"
            }
        ]);
    
        let callStack = getCallStack();
    
        expect(callStack).to.eql({
            p_calls: [
                {
                    id: callStack.p_calls[0].id,
                    unit: "__anonymous_block",
                    line: 4,
                    first_tracked_line: 3
                }
            ],
            p_values: [
                {
                    hello: {
                        type: "VARCHAR2",
                        varchar2_value: "world",
                        number_value: null,
                        boolean_value: null,
                        date_value: null
                    }
                }
            ]
        });
    
    });

    test("Raise an error with 4 argument overload version", function() {
    
        database.run(`
            BEGIN
                log$.reset_call_stack;
                error$.reset;
                default_message_handler.reset;
            END;
        `);
    
        expect(function() {
        
            database.run(`
                BEGIN
                    log$.value('hello', 'world');
                    error$.raise('MSG-00003', 'World', 'People', 'Sun', 'Joy');
                END;
            `);    
        
        }).to.throw(/MSG-00003: Hello, World, People, Sun, Joy and :5!/);
    
        let tail = database.selectObjects(`log_level, message FROM log$tail`);
    
        expect(tail).to.eql([
            {
                log_level: ERROR,
                message: "MSG-00003: Hello, World, People, Sun, Joy and :5!"
            }
        ]);
    
        let callStack = getCallStack();
    
        expect(callStack).to.eql({
            p_calls: [
                {
                    id: callStack.p_calls[0].id,
                    unit: "__anonymous_block",
                    line: 4,
                    first_tracked_line: 3
                }
            ],
            p_values: [
                {
                    hello: {
                        type: "VARCHAR2",
                        varchar2_value: "world",
                        number_value: null,
                        boolean_value: null,
                        date_value: null
                    }
                }
            ]
        });

    });

    test("Raise an error with 5 argument overload version", function() {

        database.run(`
            BEGIN
                log$.reset_call_stack;
                error$.reset;
                default_message_handler.reset;
            END;
        `);
    
        expect(function() {
        
            database.run(`
                BEGIN
                    log$.value('hello', 'world');
                    error$.raise('MSG-00003', 'World', 'People', 'Sun', 'Joy', 'Fun');
                END;
            `);    
        
        }).to.throw(/MSG-00003: Hello, World, People, Sun, Joy and Fun!/);
    
        let tail = database.selectObjects(`log_level, message FROM log$tail`);
    
        expect(tail).to.eql([
            {
                log_level: ERROR,
                message: "MSG-00003: Hello, World, People, Sun, Joy and Fun!"
            }
        ]);
    
        let callStack = getCallStack();
    
        expect(callStack).to.eql({
            p_calls: [
                {
                    id: callStack.p_calls[0].id,
                    unit: "__anonymous_block",
                    line: 4,
                    first_tracked_line: 3
                }
            ],
            p_values: [
                {
                    hello: {
                        type: "VARCHAR2",
                        varchar2_value: "world",
                        number_value: null,
                        boolean_value: null,
                        date_value: null
                    }
                }
            ]
        });

    });
    
});

suite("Error reraising", function() {

    test("Check if HANDLED returns FALSE if there is no error", function() {
    
        let handled = database.call("error$.handled");

        expect(handled).to.be(false);
    
    });
    
    test("Check if HANDLED returns TRUE if an error has been raised using ERROR$", function() {
    
        database.call("error$.reset");

        database.run(`
            BEGIN
                error$.raise('Hello, World!');
            EXCEPTION
                WHEN OTHERS THEN
                    IF NOT error$.handled THEN
                        raise_application_error(-20999, 'HANDLED returned FALSE!');
                    END IF;
            END;
        `);        
    
    });
    
    test("Check if HANDLED returns TRUE if an error has been raised using simple RAISE", function() {
    
        database.call("error$.reset");

        database.run(`
            BEGIN
                RAISE NO_DATA_FOUND;
            EXCEPTION
                WHEN OTHERS THEN
                    IF error$.handled THEN
                        raise_application_error(-20999, 'HANDLED returned TRUE!');
                    END IF;
            END;
        `);        
    
    });

    test("Reraise error 20000, check if it becomes \"handled\", check custom error level", function() {
    
        database.run(`
            BEGIN
                log$.reset_call_stack;
                error$.reset;
                error$.set_oracle_error_level(550);
                default_message_handler.reset;
            END;
        `);

        database.run(`
            BEGIN
                raise_application_error(-20000, 'Hello, World!');
            EXCEPTION
                WHEN OTHERS THEN
                    BEGIN
                        error$.raise;
                    EXCEPTION
                        WHEN OTHERS THEN
                            IF NOT error$.handled THEN
                                raise_application_error(-20999, 'HANDLED returned FALSE!');
                            END IF;    
                    END;
            END;
        `);

        let tail = database.selectObjects(`log_level, message FROM log$tail`);
    
        expect(tail).to.eql([
            {
                log_level: 550,
                message: "ORA-20000: Hello, World!"
            }
        ]);
    
        let callStack = getCallStack();
    
        expect(callStack).to.eql({
            p_calls: [
                {
                    id: callStack.p_calls[0].id,
                    unit: "__anonymous_block",
                    line: 3,
                    first_tracked_line: null
                }
            ],
            p_values: [
                {}
            ]
        });
    
    });
    
    test("Reraise NO_DATA_FOUND, check if it becomes \"handled\"", function() {
    
        database.run(`
            BEGIN
                log$.reset_call_stack;
                error$.reset;
                default_message_handler.reset;
            END;
        `);

        database.run(`
            BEGIN
                RAISE NO_DATA_FOUND;
            EXCEPTION
                WHEN OTHERS THEN
                    BEGIN
                        error$.raise;
                    EXCEPTION
                        WHEN OTHERS THEN
                            IF NOT error$.handled THEN
                                raise_application_error(-20999, 'HANDLED returned FALSE!');
                            END IF;    
                    END;
            END;
        `);

        let tail = database.selectObjects(`log_level, message FROM log$tail`);
    
        expect(tail).to.eql([
            {
                log_level: FATAL,
                message: "ORA-1403: no data found"
            }
        ]);
    
        let callStack = getCallStack();
    
        expect(callStack).to.eql({
            p_calls: [
                {
                    id: callStack.p_calls[0].id,
                    unit: "__anonymous_block",
                    line: 3,
                    first_tracked_line: null
                }
            ],
            p_values: [
                {}
            ]
        });
    
    });

    test("Reraise other Oracle built-in exception, check if it becomes \"handled\"", function() {
    
        database.run(`
            BEGIN
                log$.reset_call_stack;
                error$.reset;
                default_message_handler.reset;
            END;
        `);

        database.run(`
            BEGIN
                RAISE TOO_MANY_ROWS;
            EXCEPTION
                WHEN OTHERS THEN
                    BEGIN
                        error$.raise;
                    EXCEPTION
                        WHEN OTHERS THEN
                            IF NOT error$.handled THEN
                                raise_application_error(-20999, 'HANDLED returned FALSE!');
                            END IF;    
                    END;
            END;
        `);

        let tail = database.selectObjects(`log_level, message FROM log$tail`);
    
        expect(tail).to.eql([
            {
                log_level: FATAL,
                message: "ORA-1422: exact fetch returns more than requested number of rows"
            }
        ]);
    
        let callStack = getCallStack();
    
        expect(callStack).to.eql({
            p_calls: [
                {
                    id: callStack.p_calls[0].id,
                    unit: "__anonymous_block",
                    line: 3,
                    first_tracked_line: null
                }
            ],
            p_values: [
                {}
            ]
        });
    
    });

    test("Reraise Oracle built-in exception, hide one level of stack", function() {
    
        database.run(`
            BEGIN
                log$.reset_call_stack;
                error$.reset;
                default_message_handler.reset;
            END;
        `);

        expect(function() {
        
            database.run(`
                DECLARE
                    PROCEDURE proc IS
                    BEGIN
                        error$.raise(1);
                    END;
                BEGIN
                    RAISE TOO_MANY_ROWS;
                EXCEPTION
                    WHEN OTHERS THEN
                        proc;
                END;
            `);    
        
        }).to.throw(/ORA-01422/);
        
        let tail = database.selectObjects(`log_level, message FROM log$tail`);
    
        expect(tail).to.eql([
            {
                log_level: FATAL,
                message: "ORA-1422: exact fetch returns more than requested number of rows"
            }
        ]);
    
        let callStack = getCallStack();
    
        expect(callStack).to.eql({
            p_calls: [
                {
                    id: callStack.p_calls[0].id,
                    unit: "__anonymous_block",
                    line: 8,
                    first_tracked_line: null
                }
            ],
            p_values: [
                {}
            ]
        });
    
    });

});

teardown("Drop the LOG$.GET_CALL_STACK wrapper", function() {
    
    database.run(`
        BEGIN
            EXECUTE IMMEDIATE '
                DROP PROCEDURE "${getCallStackJsonProcedureName}"
            ';
        END;
    `);

});