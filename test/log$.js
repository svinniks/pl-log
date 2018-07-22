const NONE = 1001;
const ERROR = 800;
const WARNING = 600;
const INFO = 400;
const DEBUG = 200;
const ALL = 0;

let getCallStackJsonProcedureName;

function getCallStack() {
    return database.call(`"${getCallStackJsonProcedureName}"`);
}

function resetPackage() {
    database.run(`
        BEGIN
            dbms_session.reset_package;
        END;
    `);
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

/*

suite("Call stack management", function() {

    let user;

    let singleCallProcedureName = randomString(30);
    let singleCallProcedure2Name = randomString(30);
    let threeCallProcedureName = randomString(30);

    let user1Name = randomString(30);
    let user2Name = randomString(30);

    setup("Create procedures to test call stack management", function() {
    
        database.run(`
            BEGIN
                EXECUTE IMMEDIATE '
                    ALTER SESSION SET plsql_optimize_level = 1
                ';
            END;
        `);

        user = database.selectValue(`USER FROM dual`);

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
    
        test("Try to pass NULL service depth", function() {
        
            expect(function() {
            
                database.run(`
                    BEGIN
                        log$.call(TRUE, NULL);
                    END;
                `);
            
            }).to.throw(/PLS-00567/);
        
        });
        
        test("Try to pass NULL service depth to the overload 2", function() {
        
            expect(function() {
            
                database.run(`
                    BEGIN
                        log$.call(TO_NUMBER(NULL));
                    END;
                `);
            
            }).to.throw(/ORA-06502/);
        
        });

        test("Try to pass negative service depth", function() {
        
            expect(function() {
            
                database.run(`
                    BEGIN
                        log$.call(TRUE, -1);
                    END;
                `);
            
            }).to.throw(/ORA-06502/);
        
        });
        
        test("Try to pass negative service depth to the overload 2", function() {
        
            expect(function() {
            
                database.run(`
                    BEGIN
                        log$.call(-1);
                    END;
                `);
            
            }).to.throw(/ORA-06502/);
        
        });

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
                        unit: "__anonymous_block",
                        line: 1,
                        first_line: 1
                    },
                    {
                        id: 2,
                        unit: user + "." + singleCallProcedureName,
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
                        unit: "__anonymous_block",
                        line: 1,
                        first_line: 1
                    },
                    {
                        id: 2,
                        unit: user + "." + threeCallProcedureName,
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
                        unit: "__anonymous_block",
                        line: 1,
                        first_line: 1
                    },
                    {
                        id: 3,
                        unit: user + "." + singleCallProcedure2Name,
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
                        unit: "__anonymous_block",
                        line: 15,
                        first_line: 15
                    },
                    {
                        id: 2,
                        unit: "__anonymous_block.PROC1",
                        line: 11,
                        first_line: 11
                    },
                    {
                        id: 3,
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
                        unit: "__anonymous_block",
                        line: 17,
                        first_line: 16
                    },
                    {
                        id: 2,
                        unit: "__anonymous_block.PROC1",
                        line: 12,
                        first_line: 11
                    },
                    {
                        id: 3,
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
                        unit: "__anonymous_block",
                        line: 17,
                        first_line: 16
                    },
                    {
                        id: 2,
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
                        unit: "__anonymous_block",
                        line: 16,
                        first_line: 16
                    },
                    {
                        id: 2,
                        unit: "__anonymous_block.PROC1",
                        line: 12,
                        first_line: 11
                    },
                    {
                        id: 4,
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
                        unit: "__anonymous_block",
                        line: 16,
                        first_line: 16
                    },
                    {
                        id: 2,
                        unit: "__anonymous_block.PROC1",
                        line: 12,
                        first_line: 11
                    },
                    {
                        id: 4,
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
                        unit: "__anonymous_block",
                        line: 16,
                        first_line: 15
                    },
                    {
                        id: 4,
                        unit: "__anonymous_block.PROC1",
                        line: 11,
                        first_line: 11
                    },
                    {
                        id: 5,
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
                        unit: "__anonymous_block",
                        line: 31,
                        first_line: 31
                    },
                    {
                        id: 2,
                        unit: "__anonymous_block.PROC1",
                        line: 27,
                        first_line: 27
                    },
                    {
                        id: 3,
                        unit: "__anonymous_block.PROC2",
                        line: 22,
                        first_line: 21
                    },
                    {
                        id: 6,
                        unit: "__anonymous_block.PROC4",
                        line: 11,
                        first_line: 11
                    },
                    {
                        id: 7,
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

        test("Hide one level of the stack", function() {
        
            resetPackage();

            database.run(`
                DECLARE

                    PROCEDURE proc2 IS
                    BEGIN
                        log$.call(TRUE, 1);
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
                        unit: "__anonymous_block",
                        line: 15,
                        first_line: 15
                    },
                    {
                        id: 2,
                        unit: "__anonymous_block.PROC1",
                        line: 11,
                        first_line: 11
                    }
                ],
                p_values: [
                    {},
                    {}
                ]
            });
        
        });

        test("Hide more levels, then there are in the stack", function() {
        
            resetPackage();

            database.run(`
                DECLARE

                    PROCEDURE proc2 IS
                    BEGIN
                        log$.call(TRUE, 10);
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
                p_calls: [],
                p_values: []
            });
        
        });

        test("Hide one level of the stack, CALL overload 2", function() {
        
            resetPackage();

            database.run(`
                DECLARE

                    PROCEDURE proc2 IS
                    BEGIN
                        log$.call(1);
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
                        unit: "__anonymous_block",
                        line: 15,
                        first_line: 15
                    },
                    {
                        id: 2,
                        unit: "__anonymous_block.PROC1",
                        line: 11,
                        first_line: 11
                    }
                ],
                "p_values": [
                    {},
                    {}
                ]
            });
        
        });

        test("Check if CALL overload 2 resets the top", function() {
        
            resetPackage();

            database.run(`
                BEGIN
                    log$.call(0); log$.call(0);
                END;
            `);

            let callStack = getCallStack();

            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: 2,
                        unit: "__anonymous_block",
                        line: 3,
                        first_line: 3
                    }
                ],
                "p_values": [
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
                        unit: "__anonymous_block",
                        line: 3,
                        first_line: 3
                    },
                    {
                        id: 2,
                        unit: user1Name + ".TEST_PROCEDURE",
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
                        unit: "__anonymous_block",
                        line: 3,
                        first_line: 3
                    },
                    {
                        id: 3,
                        unit: user2Name + ".TEST_PROCEDURE",
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
    
        suite("VARCHAR2 versions of VALUE", function() {
        
            test("Try to pass NULL name to the VARCHAR2 version of VALUE, overload 1", function() {
    
                resetPackage();
    
                expect(function() {
                
                    database.run(`
                        BEGIN
                            log$.value(NULL, 'world');
                        END;
                    `);
                
                }).to.throw(/PLS-00567/);
    
            });
    
            test("Try to pass NULL service depth to the VARCHAR2 version of VALUE, overload 1", function() {
        
                resetPackage();
    
                expect(function() {
                
                    database.run(`
                        BEGIN
                            log$.value('hello', 'world', TRUE, NULL);
                        END;
                    `);
                
                }).to.throw(/PLS-00567/);
    
            });
    
            test("Try to pass negative service depth to the VARCHAR2 version of VALUE, overload 1", function() {
        
                resetPackage();
    
                expect(function() {
                
                    database.run(`
                        BEGIN
                            log$.value('hello', 'world', TRUE, -1);
                        END;
                    `);
                
                }).to.throw(/ORA-06512/);
    
            });
    
            test("Try to pass NULL name to the VARCHAR2 version of VALUE, overload 2", function() {
        
                resetPackage();
    
                expect(function() {
                
                    database.run(`
                        BEGIN
                            log$.value(NULL, 'world', 0);
                        END;
                    `);
                
                }).to.throw(/PLS-00567/);
    
            });
    
            test("Try to pass NULL service depth to the VARCHAR2 version of VALUE, overload 2", function() {
        
                resetPackage();
    
                expect(function() {
                
                    database.run(`
                        BEGIN
                            log$.value('hello', 'world', TO_NUMBER(NULL));
                        END;
                    `);
                
                }).to.throw(/ORA-06502/);
    
            });
    
            test("Try to pass NULL negative depth to the VARCHAR2 version of VALUE, overload 2", function() {
        
                resetPackage();
    
                expect(function() {
                
                    database.run(`
                        BEGIN
                            log$.value('hello', 'world', -1);
                        END;
                    `);
                
                }).to.throw(/ORA-06502/);
    
            });
    
            test("Call VARCHAR2 version of VALUE, overload 1, default arguments", function() {
        
                resetPackage();
        
                database.run(`
                    BEGIN
                        log$.value('hello', 'world');
                    END;
                `);
        
                let callStack = getCallStack();
        
                expect(callStack).to.eql({
                    p_calls: [
                        {
                            id: 1,
                            unit: "__anonymous_block",
                            line: 3,
                            first_line: 3
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
    
            test("Call VARCHAR2 version of VALUE, overload 1, check if the top is being reset by default", function() {
        
                resetPackage();
        
                database.run(`
                    BEGIN
                        log$.value('hello', 'world', FALSE); log$.value('hello', 'world');
                    END;
                `);
        
                let callStack = getCallStack();
        
                expect(callStack).to.eql({
                    p_calls: [
                        {
                            id: 2,
                            unit: "__anonymous_block",
                            line: 3,
                            first_line: 3
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
    
            test("Call VARCHAR2 version of VALUE, overload 1, reset top FALSE", function() {
        
                resetPackage();
        
                database.run(`
                    BEGIN
                        log$.value('hello', 'world', FALSE); log$.value('hello', 'world', FALSE);
                    END;
                `);
        
                let callStack = getCallStack();
        
                expect(callStack).to.eql({
                    p_calls: [
                        {
                            id: 1,
                            unit: "__anonymous_block",
                            line: 3,
                            first_line: 3
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
    
            test("Call VARCHAR2 version of VALUE, overload 1, reset top NULL", function() {
        
                resetPackage();
        
                database.run(`
                    BEGIN
                        log$.value('hello', 'world', FALSE); log$.value('hello', 'world', NULL, 0);
                    END;
                `);
        
                let callStack = getCallStack();
        
                expect(callStack).to.eql({
                    p_calls: [
                        {
                            id: 1,
                            unit: "__anonymous_block",
                            line: 3,
                            first_line: 3
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

            test("Call VARCHAR2 version of VALUE, overload 1, hide one level of the stack", function() {
        
                resetPackage();
        
                database.run(`
                    DECLARE
                        PROCEDURE proc IS
                        BEGIN
                            log$.value('hello', 'world', TRUE, 1);
                        END;
                    BEGIN
                        proc;
                    END;
                `);
        
                let callStack = getCallStack();
        
                expect(callStack).to.eql({
                    p_calls: [
                        {
                            id: 1,
                            unit: "__anonymous_block",
                            line: 8,
                            first_line: 8
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

            test("Call VARCHAR2 version of VALUE, overload 1, hide more levels, than there are in the stack", function() {
        
                resetPackage();
        
                database.run(`
                    DECLARE
                        PROCEDURE proc IS
                        BEGIN
                            log$.value('hello', 'world', TRUE, 10);
                        END;
                    BEGIN
                        proc;
                    END;
                `);
        
                let callStack = getCallStack();
        
                expect(callStack).to.eql({
                    p_calls: [
                    ],
                    p_values: [
                    ]
                });
            
            });
            
            test("Call VARCHAR2 version of VALUE, overload 2", function() {
        
                resetPackage();
        
                database.run(`
                    BEGIN
                        log$.value('hello', 'world', 0);
                    END;
                `);
        
                let callStack = getCallStack();
        
                expect(callStack).to.eql({
                    p_calls: [
                        {
                            id: 1,
                            unit: "__anonymous_block",
                            line: 3,
                            first_line: 3
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

            test("Call VARCHAR2 version of VALUE, overload 2, check if the top is being reset", function() {
        
                resetPackage();
        
                database.run(`
                    BEGIN
                        log$.value('hello', 'world', 0); log$.value('hello', 'world', 0);
                    END;
                `);
        
                let callStack = getCallStack();
        
                expect(callStack).to.eql({
                    p_calls: [
                        {
                            id: 2,
                            unit: "__anonymous_block",
                            line: 3,
                            first_line: 3
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

            test("Call VARCHAR2 version of VALUE, overload 2, hide one level of the stack", function() {
        
                resetPackage();
        
                database.run(`
                    DECLARE
                        PROCEDURE proc IS
                        BEGIN
                            log$.value('hello', 'world', 1);
                        END;
                    BEGIN
                        proc;
                    END;
                `);
        
                let callStack = getCallStack();
        
                expect(callStack).to.eql({
                    p_calls: [
                        {
                            id: 1,
                            unit: "__anonymous_block",
                            line: 8,
                            first_line: 8
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

        suite("NUMBER versions of VALUE", function() {
        
            test("Try to pass NULL name to the NUMBER version of VALUE, overload 1", function() {
    
                resetPackage();
    
                expect(function() {
                
                    database.run(`
                        BEGIN
                            log$.value(NULL, 123);
                        END;
                    `);
                
                }).to.throw(/PLS-00567/);
    
            });
    
            test("Try to pass NULL service depth to the NUMBER version of VALUE, overload 1", function() {
        
                resetPackage();
    
                expect(function() {
                
                    database.run(`
                        BEGIN
                            log$.value('hello', 123, TRUE, NULL);
                        END;
                    `);
                
                }).to.throw(/PLS-00567/);
    
            });
    
            test("Try to pass negative service depth to the NUMBER version of VALUE, overload 1", function() {
        
                resetPackage();
    
                expect(function() {
                
                    database.run(`
                        BEGIN
                            log$.value('hello', 123, TRUE, -1);
                        END;
                    `);
                
                }).to.throw(/ORA-06512/);
    
            });
    
            test("Try to pass NULL name to the NUMBER version of VALUE, overload 2", function() {
        
                resetPackage();
    
                expect(function() {
                
                    database.run(`
                        BEGIN
                            log$.value(NULL, 123, 0);
                        END;
                    `);
                
                }).to.throw(/PLS-00567/);
    
            });
    
            test("Try to pass NULL service depth to the NUMBER version of VALUE, overload 2", function() {
        
                resetPackage();
    
                expect(function() {
                
                    database.run(`
                        BEGIN
                            log$.value('hello', 123, TO_NUMBER(NULL));
                        END;
                    `);
                
                }).to.throw(/ORA-06502/);
    
            });
    
            test("Try to pass NULL negative depth to the NUMBER version of VALUE, overload 2", function() {
        
                resetPackage();
    
                expect(function() {
                
                    database.run(`
                        BEGIN
                            log$.value('hello', 123, -1);
                        END;
                    `);
                
                }).to.throw(/ORA-06502/);
    
            });
    
            test("Call NUMBER version of VALUE, overload 1, default arguments", function() {
        
                resetPackage();
        
                database.run(`
                    BEGIN
                        log$.value('hello', 123);
                    END;
                `);
        
                let callStack = getCallStack();
        
                expect(callStack).to.eql({
                    p_calls: [
                        {
                            id: 1,
                            unit: "__anonymous_block",
                            line: 3,
                            first_line: 3
                        }
                    ],
                    p_values: [
                        {
                            hello: {
                                type: "NUMBER",
                                varchar2_value: null,
                                number_value: 123,
                                boolean_value: null,
                                date_value: null
                            }
                        }
                    ]
                });
            
            });
    
            test("Call NUMBER version of VALUE, overload 1, check if the top is being reset by default", function() {
        
                resetPackage();
        
                database.run(`
                    BEGIN
                        log$.value('hello', 123, FALSE); log$.value('hello', 123);
                    END;
                `);
        
                let callStack = getCallStack();
        
                expect(callStack).to.eql({
                    p_calls: [
                        {
                            id: 2,
                            unit: "__anonymous_block",
                            line: 3,
                            first_line: 3
                        }
                    ],
                    p_values: [
                        {
                            hello: {
                                type: "NUMBER",
                                varchar2_value: null,
                                number_value: 123,
                                boolean_value: null,
                                date_value: null
                            }
                        }
                    ]
                });
            
            });
    
            test("Call NUMBER version of VALUE, overload 1, reset top FALSE", function() {
        
                resetPackage();
        
                database.run(`
                    BEGIN
                        log$.value('hello', 123, FALSE); log$.value('hello', 123, FALSE);
                    END;
                `);
        
                let callStack = getCallStack();
        
                expect(callStack).to.eql({
                    p_calls: [
                        {
                            id: 1,
                            unit: "__anonymous_block",
                            line: 3,
                            first_line: 3
                        }
                    ],
                    p_values: [
                        {
                            hello: {
                                type: "NUMBER",
                                varchar2_value: null,
                                number_value: 123,
                                boolean_value: null,
                                date_value: null
                            }
                        }
                    ]
                });
            
            });
    
            test("Call NUMBER version of VALUE, overload 1, reset top NULL", function() {
        
                resetPackage();
        
                database.run(`
                    BEGIN
                        log$.value('hello', 123, FALSE); log$.value('hello', 123, NULL, 0);
                    END;
                `);
        
                let callStack = getCallStack();
        
                expect(callStack).to.eql({
                    p_calls: [
                        {
                            id: 1,
                            unit: "__anonymous_block",
                            line: 3,
                            first_line: 3
                        }
                    ],
                    p_values: [
                        {
                            hello: {
                                type: "NUMBER",
                                varchar2_value: null,
                                number_value: 123,
                                boolean_value: null,
                                date_value: null
                            }
                        }
                    ]
                });
            
            });

            test("Call NUMBER version of VALUE, overload 1, hide one level of the stack", function() {
        
                resetPackage();
        
                database.run(`
                    DECLARE
                        PROCEDURE proc IS
                        BEGIN
                            log$.value('hello', 123, TRUE, 1);
                        END;
                    BEGIN
                        proc;
                    END;
                `);
        
                let callStack = getCallStack();
        
                expect(callStack).to.eql({
                    p_calls: [
                        {
                            id: 1,
                            unit: "__anonymous_block",
                            line: 8,
                            first_line: 8
                        }
                    ],
                    p_values: [
                        {
                            hello: {
                                type: "NUMBER",
                                varchar2_value: null,
                                number_value: 123,
                                boolean_value: null,
                                date_value: null
                            }
                        }
                    ]
                });
            
            });

            test("Call NUMBER version of VALUE, overload 1, hide more levels, than there are in the stack", function() {
        
                resetPackage();
        
                database.run(`
                    DECLARE
                        PROCEDURE proc IS
                        BEGIN
                            log$.value('hello', 123, TRUE, 10);
                        END;
                    BEGIN
                        proc;
                    END;
                `);
        
                let callStack = getCallStack();
        
                expect(callStack).to.eql({
                    p_calls: [
                    ],
                    p_values: [
                    ]
                });
            
            });
            
            test("Call NUMBER version of VALUE, overload 2", function() {
        
                resetPackage();
        
                database.run(`
                    BEGIN
                        log$.value('hello', 123, 0);
                    END;
                `);
        
                let callStack = getCallStack();
        
                expect(callStack).to.eql({
                    p_calls: [
                        {
                            id: 1,
                            unit: "__anonymous_block",
                            line: 3,
                            first_line: 3
                        }
                    ],
                    p_values: [
                        {
                            hello: {
                                type: "NUMBER",
                                varchar2_value: null,
                                number_value: 123,
                                boolean_value: null,
                                date_value: null
                            }
                        }
                    ]
                });
            
            });

            test("Call NUMBER version of VALUE, overload 2, check if the top is being reset", function() {
        
                resetPackage();
        
                database.run(`
                    BEGIN
                        log$.value('hello', 123, 0); log$.value('hello', 123, 0);
                    END;
                `);
        
                let callStack = getCallStack();
        
                expect(callStack).to.eql({
                    p_calls: [
                        {
                            id: 2,
                            unit: "__anonymous_block",
                            line: 3,
                            first_line: 3
                        }
                    ],
                    p_values: [
                        {
                            hello: {
                                type: "NUMBER",
                                varchar2_value: null,
                                number_value: 123,
                                boolean_value: null,
                                date_value: null
                            }
                        }
                    ]
                });
            
            });

            test("Call NUMBER version of VALUE, overload 2, hide one level of the stack", function() {
        
                resetPackage();
        
                database.run(`
                    DECLARE
                        PROCEDURE proc IS
                        BEGIN
                            log$.value('hello', 123, 1);
                        END;
                    BEGIN
                        proc;
                    END;
                `);
        
                let callStack = getCallStack();
        
                expect(callStack).to.eql({
                    p_calls: [
                        {
                            id: 1,
                            unit: "__anonymous_block",
                            line: 8,
                            first_line: 8
                        }
                    ],
                    p_values: [
                        {
                            hello: {
                                type: "NUMBER",
                                varchar2_value: null,
                                number_value: 123,
                                boolean_value: null,
                                date_value: null
                            }
                        }
                    ]
                });
            
            });
        
        });

        suite("BOOLEAN versions of VALUE", function() {
        
            test("Try to pass NULL name to the BOOLEAN version of VALUE, overload 1", function() {
    
                resetPackage();
    
                expect(function() {
                
                    database.run(`
                        BEGIN
                            log$.value(NULL, TRUE);
                        END;
                    `);
                
                }).to.throw(/PLS-00567/);
    
            });
    
            test("Try to pass NULL service depth to the BOOLEAN version of VALUE, overload 1", function() {
        
                resetPackage();
    
                expect(function() {
                
                    database.run(`
                        BEGIN
                            log$.value('hello', TRUE, TRUE, NULL);
                        END;
                    `);
                
                }).to.throw(/PLS-00567/);
    
            });
    
            test("Try to pass negative service depth to the BOOLEAN version of VALUE, overload 1", function() {
        
                resetPackage();
    
                expect(function() {
                
                    database.run(`
                        BEGIN
                            log$.value('hello', TRUE, TRUE, -1);
                        END;
                    `);
                
                }).to.throw(/ORA-06512/);
    
            });
    
            test("Try to pass NULL name to the BOOLEAN version of VALUE, overload 2", function() {
        
                resetPackage();
    
                expect(function() {
                
                    database.run(`
                        BEGIN
                            log$.value(NULL, TRUE, 0);
                        END;
                    `);
                
                }).to.throw(/PLS-00567/);
    
            });
    
            test("Try to pass NULL service depth to the BOOLEAN version of VALUE, overload 2", function() {
        
                resetPackage();
    
                expect(function() {
                
                    database.run(`
                        BEGIN
                            log$.value('hello', TRUE, TO_NUMBER(NULL));
                        END;
                    `);
                
                }).to.throw(/ORA-06502/);
    
            });
    
            test("Try to pass NULL negative depth to the BOOLEAN version of VALUE, overload 2", function() {
        
                resetPackage();
    
                expect(function() {
                
                    database.run(`
                        BEGIN
                            log$.value('hello', TRUE, -1);
                        END;
                    `);
                
                }).to.throw(/ORA-06502/);
    
            });
    
            test("Call BOOLEAN version of VALUE, overload 1, default arguments", function() {
        
                resetPackage();
        
                database.run(`
                    BEGIN
                        log$.value('hello', TRUE);
                    END;
                `);
        
                let callStack = getCallStack();
        
                expect(callStack).to.eql({
                    p_calls: [
                        {
                            id: 1,
                            unit: "__anonymous_block",
                            line: 3,
                            first_line: 3
                        }
                    ],
                    p_values: [
                        {
                            hello: {
                                type: "BOOLEAN",
                                varchar2_value: null,
                                number_value: null,
                                boolean_value: true,
                                date_value: null
                            }
                        }
                    ]
                });
            
            });
    
            test("Call BOOLEAN version of VALUE, overload 1, check if the top is being reset by default", function() {
        
                resetPackage();
        
                database.run(`
                    BEGIN
                        log$.value('hello', TRUE); log$.value('hello', TRUE);
                    END;
                `);
        
                let callStack = getCallStack();
        
                expect(callStack).to.eql({
                    p_calls: [
                        {
                            id: 2,
                            unit: "__anonymous_block",
                            line: 3,
                            first_line: 3
                        }
                    ],
                    p_values: [
                        {
                            hello: {
                                type: "BOOLEAN",
                                varchar2_value: null,
                                number_value: null,
                                boolean_value: true,
                                date_value: null
                            }
                        }
                    ]
                });
            
            });
    
            test("Call BOOLEAN version of VALUE, overload 1, reset top FALSE", function() {
        
                resetPackage();
        
                database.run(`
                    BEGIN
                        log$.value('hello', TRUE); log$.value('hello', TRUE, FALSE);
                    END;
                `);
        
                let callStack = getCallStack();
        
                expect(callStack).to.eql({
                    p_calls: [
                        {
                            id: 1,
                            unit: "__anonymous_block",
                            line: 3,
                            first_line: 3
                        }
                    ],
                    p_values: [
                        {
                            hello: {
                                type: "BOOLEAN",
                                varchar2_value: null,
                                number_value: null,
                                boolean_value: true,
                                date_value: null
                            }
                        }
                    ]
                });
            
            });
    
            test("Call BOOLEAN version of VALUE, overload 1, reset top NULL", function() {
        
                resetPackage();
        
                database.run(`
                    BEGIN
                        log$.value('hello', TRUE); log$.value('hello', TRUE, NULL, 0);
                    END;
                `);
        
                let callStack = getCallStack();
        
                expect(callStack).to.eql({
                    p_calls: [
                        {
                            id: 1,
                            unit: "__anonymous_block",
                            line: 3,
                            first_line: 3
                        }
                    ],
                    p_values: [
                        {
                            hello: {
                                type: "BOOLEAN",
                                varchar2_value: null,
                                number_value: null,
                                boolean_value: true,
                                date_value: null
                            }
                        }
                    ]
                });
            
            });

            test("Call BOOLEAN version of VALUE, overload 1, hide one level of the stack", function() {
        
                resetPackage();
        
                database.run(`
                    DECLARE
                        PROCEDURE proc IS
                        BEGIN
                            log$.value('hello', TRUE, TRUE, 1);
                        END;
                    BEGIN
                        proc;
                    END;
                `);
        
                let callStack = getCallStack();
        
                expect(callStack).to.eql({
                    p_calls: [
                        {
                            id: 1,
                            unit: "__anonymous_block",
                            line: 8,
                            first_line: 8
                        }
                    ],
                    p_values: [
                        {
                            hello: {
                                type: "BOOLEAN",
                                varchar2_value: null,
                                number_value: null,
                                boolean_value: true,
                                date_value: null
                            }
                        }
                    ]
                });
            
            });

            test("Call BOOLEAN version of VALUE, overload 1, hide more levels, than there are in the stack", function() {
        
                resetPackage();
        
                database.run(`
                    DECLARE
                        PROCEDURE proc IS
                        BEGIN
                            log$.value('hello', TRUE, TRUE, 10);
                        END;
                    BEGIN
                        proc;
                    END;
                `);
        
                let callStack = getCallStack();
        
                expect(callStack).to.eql({
                    p_calls: [
                    ],
                    p_values: [
                    ]
                });
            
            });
            
            test("Call BOOLEAN version of VALUE, overload 2", function() {
        
                resetPackage();
        
                database.run(`
                    BEGIN
                        log$.value('hello', TRUE, 0);
                    END;
                `);
        
                let callStack = getCallStack();
        
                expect(callStack).to.eql({
                    p_calls: [
                        {
                            id: 1,
                            unit: "__anonymous_block",
                            line: 3,
                            first_line: 3
                        }
                    ],
                    p_values: [
                        {
                            hello: {
                                type: "BOOLEAN",
                                varchar2_value: null,
                                number_value: null,
                                boolean_value: true,
                                date_value: null
                            }
                        }
                    ]
                });
            
            });

            test("Call BOOLEAN version of VALUE, overload 2, check if the top is being reset", function() {
        
                resetPackage();
        
                database.run(`
                    BEGIN
                        log$.value('hello', TRUE, 0); log$.value('hello', TRUE, 0);
                    END;
                `);
        
                let callStack = getCallStack();
        
                expect(callStack).to.eql({
                    p_calls: [
                        {
                            id: 2,
                            unit: "__anonymous_block",
                            line: 3,
                            first_line: 3
                        }
                    ],
                    p_values: [
                        {
                            hello: {
                                type: "BOOLEAN",
                                varchar2_value: null,
                                number_value: null,
                                boolean_value: true,
                                date_value: null
                            }
                        }
                    ]
                });
            
            });

            test("Call BOOLEAN version of VALUE, overload 2, hide one level of the stack", function() {
        
                resetPackage();
        
                database.run(`
                    DECLARE
                        PROCEDURE proc IS
                        BEGIN
                            log$.value('hello', TRUE, 1);
                        END;
                    BEGIN
                        proc;
                    END;
                `);
        
                let callStack = getCallStack();
        
                expect(callStack).to.eql({
                    p_calls: [
                        {
                            id: 1,
                            unit: "__anonymous_block",
                            line: 8,
                            first_line: 8
                        }
                    ],
                    p_values: [
                        {
                            hello: {
                                type: "BOOLEAN",
                                varchar2_value: null,
                                number_value: null,
                                boolean_value: true,
                                date_value: null
                            }
                        }
                    ]
                });
            
            });
        
        });

        suite("DATE versions of VALUE", function() {
        
            test("Try to pass NULL name to the DATE version of VALUE, overload 1", function() {
    
                resetPackage();
    
                expect(function() {
                
                    database.run(`
                        BEGIN
                            log$.value(NULL, CAST(TIMESTAMP '1913-08-25 13:49:03' AS DATE));
                        END;
                    `);
                
                }).to.throw(/PLS-00567/);
    
            });
    
            test("Try to pass NULL service depth to the DATE version of VALUE, overload 1", function() {
        
                resetPackage();
    
                expect(function() {
                
                    database.run(`
                        BEGIN
                            log$.value('hello', CAST(TIMESTAMP '1913-08-25 13:49:03' AS DATE), TRUE, NULL);
                        END;
                    `);
                
                }).to.throw(/PLS-00567/);
    
            });
    
            test("Try to pass negative service depth to the DATE version of VALUE, overload 1", function() {
        
                resetPackage();
    
                expect(function() {
                
                    database.run(`
                        BEGIN
                            log$.value('hello', CAST(TIMESTAMP '1913-08-25 13:49:03' AS DATE), TRUE, -1);
                        END;
                    `);
                
                }).to.throw(/ORA-06512/);
    
            });
    
            test("Try to pass NULL name to the DATE version of VALUE, overload 2", function() {
        
                resetPackage();
    
                expect(function() {
                
                    database.run(`
                        BEGIN
                            log$.value(NULL, CAST(TIMESTAMP '1913-08-25 13:49:03' AS DATE), 0);
                        END;
                    `);
                
                }).to.throw(/PLS-00567/);
    
            });
    
            test("Try to pass NULL service depth to the DATE version of VALUE, overload 2", function() {
        
                resetPackage();
    
                expect(function() {
                
                    database.run(`
                        BEGIN
                            log$.value('hello', CAST(TIMESTAMP '1913-08-25 13:49:03' AS DATE), TO_NUMBER(NULL));
                        END;
                    `);
                
                }).to.throw(/ORA-06502/);
    
            });
    
            test("Try to pass NULL negative depth to the DATE version of VALUE, overload 2", function() {
        
                resetPackage();
    
                expect(function() {
                
                    database.run(`
                        BEGIN
                            log$.value('hello', CAST(TIMESTAMP '1913-08-25 13:49:03' AS DATE), -1);
                        END;
                    `);
                
                }).to.throw(/ORA-06502/);
    
            });
    
            test("Call DATE version of VALUE, overload 1, default arguments", function() {
        
                resetPackage();
        
                database.run(`
                    BEGIN
                        log$.value('hello', CAST(TIMESTAMP '1913-08-25 13:49:03' AS DATE));
                    END;
                `);
        
                let callStack = getCallStack();
        
                expect(callStack).to.eql({
                    p_calls: [
                        {
                            id: 1,
                            unit: "__anonymous_block",
                            line: 3,
                            first_line: 3
                        }
                    ],
                    p_values: [
                        {
                            hello: {
                                type: "DATE",
                                varchar2_value: null,
                                number_value: null,
                                boolean_value: null,
                                date_value: "1913-08-25 13:49:03"
                            }
                        }
                    ]
                });
            
            });
    
            test("Call DATE version of VALUE, overload 1, check if the top is being reset by default", function() {
        
                resetPackage();
        
                database.run(`
                    BEGIN
                        log$.value('hello', CAST(TIMESTAMP '1913-08-25 13:49:03' AS DATE)); log$.value('hello', CAST(TIMESTAMP '1913-08-25 13:49:03' AS DATE));
                    END;
                `);
        
                let callStack = getCallStack();
        
                expect(callStack).to.eql({
                    p_calls: [
                        {
                            id: 2,
                            unit: "__anonymous_block",
                            line: 3,
                            first_line: 3
                        }
                    ],
                    p_values: [
                        {
                            hello: {
                                type: "DATE",
                                varchar2_value: null,
                                number_value: null,
                                boolean_value: null,
                                date_value: "1913-08-25 13:49:03"
                            }
                        }
                    ]
                });
            
            });
    
            test("Call DATE version of VALUE, overload 1, reset top FALSE", function() {
        
                resetPackage();
        
                database.run(`
                    BEGIN
                        log$.value('hello', CAST(TIMESTAMP '1913-08-25 13:49:03' AS DATE)); log$.value('hello', CAST(TIMESTAMP '1913-08-25 13:49:03' AS DATE), FALSE);
                    END;
                `);
        
                let callStack = getCallStack();
        
                expect(callStack).to.eql({
                    p_calls: [
                        {
                            id: 1,
                            unit: "__anonymous_block",
                            line: 3,
                            first_line: 3
                        }
                    ],
                    p_values: [
                        {
                            hello: {
                                type: "DATE",
                                varchar2_value: null,
                                number_value: null,
                                boolean_value: null,
                                date_value: "1913-08-25 13:49:03"
                            }
                        }
                    ]
                });
            
            });
    
            test("Call DATE version of VALUE, overload 1, reset top NULL", function() {
        
                resetPackage();
        
                database.run(`
                    BEGIN
                        log$.value('hello', CAST(TIMESTAMP '1913-08-25 13:49:03' AS DATE)); log$.value('hello', CAST(TIMESTAMP '1913-08-25 13:49:03' AS DATE), NULL, 0);
                    END;
                `);
        
                let callStack = getCallStack();
        
                expect(callStack).to.eql({
                    p_calls: [
                        {
                            id: 1,
                            unit: "__anonymous_block",
                            line: 3,
                            first_line: 3
                        }
                    ],
                    p_values: [
                        {
                            hello: {
                                type: "DATE",
                                varchar2_value: null,
                                number_value: null,
                                boolean_value: null,
                                date_value: "1913-08-25 13:49:03"
                            }
                        }
                    ]
                });
            
            });

            test("Call DATE version of VALUE, overload 1, hide one level of the stack", function() {
        
                resetPackage();
        
                database.run(`
                    DECLARE
                        PROCEDURE proc IS
                        BEGIN
                            log$.value('hello', CAST(TIMESTAMP '1913-08-25 13:49:03' AS DATE), TRUE, 1);
                        END;
                    BEGIN
                        proc;
                    END;
                `);
        
                let callStack = getCallStack();
        
                expect(callStack).to.eql({
                    p_calls: [
                        {
                            id: 1,
                            unit: "__anonymous_block",
                            line: 8,
                            first_line: 8
                        }
                    ],
                    p_values: [
                        {
                            hello: {
                                type: "DATE",
                                varchar2_value: null,
                                number_value: null,
                                boolean_value: null,
                                date_value: "1913-08-25 13:49:03"
                            }
                        }
                    ]
                });
            
            });

            test("Call DATE version of VALUE, overload 1, hide more levels, than there are in the stack", function() {
        
                resetPackage();
        
                database.run(`
                    DECLARE
                        PROCEDURE proc IS
                        BEGIN
                            log$.value('hello', CAST(TIMESTAMP '1913-08-25 13:49:03' AS DATE), TRUE, 10);
                        END;
                    BEGIN
                        proc;
                    END;
                `);
        
                let callStack = getCallStack();
        
                expect(callStack).to.eql({
                    p_calls: [
                    ],
                    p_values: [
                    ]
                });
            
            });
            
            test("Call DATE version of VALUE, overload 2", function() {
        
                resetPackage();
        
                database.run(`
                    BEGIN
                        log$.value('hello', CAST(TIMESTAMP '1913-08-25 13:49:03' AS DATE), 0);
                    END;
                `);
        
                let callStack = getCallStack();
        
                expect(callStack).to.eql({
                    p_calls: [
                        {
                            id: 1,
                            unit: "__anonymous_block",
                            line: 3,
                            first_line: 3
                        }
                    ],
                    p_values: [
                        {
                            hello: {
                                type: "DATE",
                                varchar2_value: null,
                                number_value: null,
                                boolean_value: null,
                                date_value: "1913-08-25 13:49:03"
                            }
                        }
                    ]
                });
            
            });

            test("Call DATE version of VALUE, overload 2, check if the top is being reset", function() {
        
                resetPackage();
        
                database.run(`
                    BEGIN
                        log$.value('hello', CAST(TIMESTAMP '1913-08-25 13:49:03' AS DATE), 0); log$.value('hello', CAST(TIMESTAMP '1913-08-25 13:49:03' AS DATE), 0);
                    END;
                `);
        
                let callStack = getCallStack();
        
                expect(callStack).to.eql({
                    p_calls: [
                        {
                            id: 2,
                            unit: "__anonymous_block",
                            line: 3,
                            first_line: 3
                        }
                    ],
                    p_values: [
                        {
                            hello: {
                                type: "DATE",
                                varchar2_value: null,
                                number_value: null,
                                boolean_value: null,
                                date_value: "1913-08-25 13:49:03"
                            }
                        }
                    ]
                });
            
            });

            test("Call DATE version of VALUE, overload 2, hide one level of the stack", function() {
        
                resetPackage();
        
                database.run(`
                    DECLARE
                        PROCEDURE proc IS
                        BEGIN
                            log$.value('hello', CAST(TIMESTAMP '1913-08-25 13:49:03' AS DATE), 1);
                        END;
                    BEGIN
                        proc;
                    END;
                `);
        
                let callStack = getCallStack();
        
                expect(callStack).to.eql({
                    p_calls: [
                        {
                            id: 1,
                            unit: "__anonymous_block",
                            line: 8,
                            first_line: 8
                        }
                    ],
                    p_values: [
                        {
                            hello: {
                                type: "DATE",
                                varchar2_value: null,
                                number_value: null,
                                boolean_value: null,
                                date_value: "1913-08-25 13:49:03"
                            }
                        }
                    ]
                });
            
            });
        
        });

        test("Single anonymous block with multiple VALUEs", function() {
    
            resetPackage();
    
            database.run(`
                DECLARE
                BEGIN
                    log$.value('hello', 'world');
                    log$.value('sveiki', 123);
                    log$.value('good bye', TRUE);
                END;
            `);
    
            let callStack = getCallStack();
    
            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: 1,
                        unit: "__anonymous_block",
                        line: 6,
                        first_line: 4
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
                        },
                        sveiki: {
                            type: "NUMBER",
                            varchar2_value: null,
                            number_value: 123,
                            boolean_value: null,
                            date_value: null
                        },
                        "good bye": {
                            type: "BOOLEAN",
                            varchar2_value: null,
                            number_value: null,
                            boolean_value: true,
                            date_value: null
                        }
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
                    log$.value('hello', 123);
                END;
            `);
    
            let callStack = getCallStack();
    
            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: 1,
                        unit: "__anonymous_block",
                        line: 5,
                        first_line: 4
                    }
                ],
                p_values: [
                    {
                        hello: {
                            type: "NUMBER",
                            varchar2_value: null,
                            number_value: 123,
                            boolean_value: null,
                            date_value: null
                        }
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
                        log$.value('good bye', TRUE);
                    END;

                    PROCEDURE proc1 IS
                    BEGIN
                        log$.value('sveiki', 123);
                        proc2;
                    END;

                BEGIN
                    log$.value('hello', 'world');
                    proc1;
                END;
            `);

            let callStack = getCallStack();
    
            expect(callStack.p_values).to.eql([
                {
                    "hello": {
                        type: "VARCHAR2",
                        varchar2_value: "world",
                        number_value: null,
                        boolean_value: null,
                        date_value: null
                    }
                },
                {
                    "sveiki": {
                        type: "NUMBER",
                        varchar2_value: null,
                        number_value: 123,
                        boolean_value: null,
                        date_value: null
                    }
                },
                {
                    "good bye": {
                        type: "BOOLEAN",
                        varchar2_value: null,
                        number_value: null,
                        boolean_value: true,
                        date_value: null
                    }
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
            END;
        `);
    
    });
    
});

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

    test("Try to call MESSAGE with NULL service depth", function() {
    
        expect(function() {
        
            database.run(`
                BEGIN
                    log$.message(log$.c_INFO, 'Hello, World!', NULL, NULL);    
                END;
            `);
        
        }).to.throw(/PLS-00567/);
    
    });
    
    test("Try to call MESSAGE overload 2 with NULL service depth", function() {
    
        expect(function() {
        
            database.run(`
                BEGIN
                    log$.message(log$.c_INFO, 'Hello, World!', TO_NUMBER(NULL));    
                END;
            `);
        
        }).to.throw(/ORA-06502/);
    
    });

    test("Check if call stack is updated when no handlers are registered", function() {
        
        resetPackage();

        database.call("log$.reset");
        database.call("log$.reset_system_log_level");

        database.run(`
            BEGIN
                log$.message(log$.c_INFO, 'Hello, :1!', t_varchars('World'));
            END;
        `);

        let callStack = getCallStack();

        expect(callStack).to.eql({
            p_calls: [],
            p_values: []
        });
    
    });

    suite("Raw message handlers", function() {
    
        let handlerTypeName = randomString(30);
        let handlerPackageName = randomString(30);

        setup("Create a dummy raw message handler", function() {
        
            database.run(`
                BEGIN

                    EXECUTE IMMEDIATE '
                        CREATE OR REPLACE PACKAGE "${handlerPackageName}" IS
                            
                            v_messages t_varchars := t_varchars();

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

            let callStack = getCallStack();

            expect(callStack).to.eql({
                p_calls: [],
                p_values: []
            });
        
        });

        test("Check if call stack is updated when none of the registered handlers run", function() {
        
            resetPackage();

            database.call("log$.reset");
            database.call("log$.reset_system_log_level");

            database.run(`
                BEGIN
                    log$.add_handler("${handlerTypeName}"(NULL, NULL));    
                END;
            `);

            database.call("log$.message", {
                p_level: INFO,
                p_message: "Hello, :1!",
                p_arguments: ["World"]
            });

            let callStack = getCallStack();

            expect(callStack).to.eql({
                p_calls: [],
                p_values: []
            });
        
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

        test("INFO message to one handler with NULL handler and session level, INFO system level, MESSAGE overload 2", function() {
        
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

            database.run(`
                BEGIN
                    log$.message(log$.c_INFO, 'Hello, World!', 0);
                END;
            `);

            let messages = database.call(`"${handlerPackageName}".get_messages`);

            expect(messages).to.eql([
                "400: Hello, World!"
            ]);
        
        });

        test("Check if call stack is updated when at least one handler is executed", function() {
        
            resetPackage();

            database.call("log$.reset");
            database.call("log$.set_system_log_level", {
                p_level: ALL
            });

            database.run(`
                BEGIN
                    log$.add_handler("${handlerTypeName}"(NULL, NULL));    
                END;
            `);

            database.run(`
                BEGIN
                    log$.message(log$.c_INFO, 'Hello, :1!', t_varchars('World'));
                END;
            `);
            
            let callStack = getCallStack();

            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: 1,
                        unit: "__anonymous_block",
                        line: 3,
                        first_line: 3
                    }
                ],
                p_values: [
                    {}
                ]
            });
        
        });

        test("Check if call stack is updated when at least one handler is executed, MESSAGE overload 2", function() {
        
            resetPackage();

            database.call("log$.reset");
            database.call("log$.set_system_log_level", {
                p_level: ALL
            });

            database.run(`
                BEGIN
                    log$.add_handler("${handlerTypeName}"(NULL, NULL));    
                END;
            `);

            database.run(`
                BEGIN
                    log$.message(log$.c_INFO, 'Hello, World!', 0);
                END;
            `);
            
            let callStack = getCallStack();

            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: 1,
                        unit: "__anonymous_block",
                        line: 3,
                        first_line: 3
                    }
                ],
                p_values: [
                    {}
                ]
            });
        
        });

        test("Check if MESSAGE resets the top of the call stack", function() {
        
            resetPackage();

            database.call("log$.reset");
            database.call("log$.set_system_log_level", {
                p_level: ALL
            });

            database.run(`
                BEGIN
                    log$.add_handler("${handlerTypeName}"(NULL, NULL));    
                END;
            `);

            database.run(`
                BEGIN
                    log$.message(log$.c_INFO, 'Hello, :1!', t_varchars('World')); log$.message(log$.c_INFO, 'Hello, :1!', t_varchars('World'));
                END;
            `);
            
            let callStack = getCallStack();

            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: 2,
                        unit: "__anonymous_block",
                        line: 3,
                        first_line: 3
                    }
                ],
                p_values: [
                    {}
                ]
            });
        
        });

        test("Hide one level of the call stack", function() {
        
            resetPackage();

            database.call("log$.reset");
            database.call("log$.set_system_log_level", {
                p_level: ALL
            });

            database.run(`
                BEGIN
                    log$.add_handler("${handlerTypeName}"(NULL, NULL));    
                END;
            `);

            database.run(`  
                DECLARE
                    PROCEDURE proc IS
                    BEGIN
                        log$.message(log$.c_INFO, 'Hello, :1!', t_varchars('World'), 1);
                    END;
                BEGIN
                    proc;
                END;
            `);
            
            let callStack = getCallStack();

            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: 1,
                        unit: "__anonymous_block",
                        line: 8,
                        first_line: 8
                    }
                ],
                p_values: [
                    {}
                ]
            });
        
        });

        test("Hide one level of the call stack, MESSAGE overload 2", function() {
        
            resetPackage();

            database.call("log$.reset");
            database.call("log$.set_system_log_level", {
                p_level: ALL
            });

            database.run(`
                BEGIN
                    log$.add_handler("${handlerTypeName}"(NULL, NULL));    
                END;
            `);

            database.run(`  
                DECLARE
                    PROCEDURE proc IS
                    BEGIN
                        log$.message(log$.c_INFO, 'Hello, World!', 1);
                    END;
                BEGIN
                    proc;
                END;
            `);
            
            let callStack = getCallStack();

            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: 1,
                        unit: "__anonymous_block",
                        line: 8,
                        first_line: 8
                    }
                ],
                p_values: [
                    {}
                ]
            });
        
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
                            
                            v_messages t_varchars := t_varchars();

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

        test("Check if call stack is updated when at least one handler is executed", function() {
        
            resetPackage();

            database.call("log$.reset");
            database.call("log$.set_system_log_level", {
                p_level: ALL
            });

            database.run(`
                BEGIN
                    log$.add_handler("${handlerTypeName}"(NULL, NULL));    
                END;
            `);

            database.run(`
                BEGIN
                    log$.message(log$.c_INFO, 'Hello, :1!', t_varchars('World'));
                END;
            `);
            
            let callStack = getCallStack();

            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: 1,
                        unit: "__anonymous_block",
                        line: 3,
                        first_line: 3
                    }
                ],
                p_values: [
                    {}
                ]
            });
        
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

    suite("Shortcut methods", function() {
    
        let handlerTypeName = randomString(30);
        let handlerPackageName = randomString(30);

        setup("Create a dummy raw message handler", function() {
        
            database.run(`
                BEGIN

                    EXECUTE IMMEDIATE '
                        CREATE OR REPLACE PACKAGE "${handlerPackageName}" IS
                            
                            v_messages t_varchars := t_varchars();

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

        setup("Setup the logger", function() {
        
            database.call("log$.reset");
            database.call("log$.set_system_log_level", {
                p_level: ALL
            });

            database.run(`
                BEGIN
                    log$.add_handler("${handlerTypeName}"(NULL, NULL));    
                END;
            `);
        
        });

        test("DEBUG argument array version", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.debug('Hello, :1!', t_varchars('World'));
                END;
            `);

            let messages = database.call(`"${handlerPackageName}".get_messages`);

            expect(messages).to.eql([
                "200: Hello, World!"
            ]);
        
        });

        test("DEBUG argument array version, check call stack", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.debug('Hello, :1!', t_varchars('World'));
                END;
            `);

            let callStack = getCallStack();

            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: callStack.p_calls[0].id,
                        unit: "__anonymous_block",
                        line: 3,
                        first_line: 3
                    }
                ],
                p_values: [
                    {}
                ]
            });

        });

        test("DEBUG no argument version", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.debug('Hello, :1, :2, :3, :4 and :5!');
                END;
            `);

            let messages = database.call(`"${handlerPackageName}".get_messages`);

            expect(messages).to.eql([
                "200: Hello, :1, :2, :3, :4 and :5!"
            ]);
        
        });

        test("DEBUG no argument version, check call stack", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.debug('Hello, :1, :2, :3, :4 and :5!');
                END;
            `);

            let callStack = getCallStack();

            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: callStack.p_calls[0].id,
                        unit: "__anonymous_block",
                        line: 3,
                        first_line: 3
                    }
                ],
                p_values: [
                    {}
                ]
            });

        });

        test("DEBUG 1 argument version", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.debug('Hello, :1, :2, :3, :4 and :5!', 'World');
                END;
            `);

            let messages = database.call(`"${handlerPackageName}".get_messages`);

            expect(messages).to.eql([
                "200: Hello, World, :2, :3, :4 and :5!"
            ]);
        
        });

        test("DEBUG 1 argument version, check call stack", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.debug('Hello, :1, :2, :3, :4 and :5!', 'World');
                END;
            `);

            let callStack = getCallStack();

            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: callStack.p_calls[0].id,
                        unit: "__anonymous_block",
                        line: 3,
                        first_line: 3
                    }
                ],
                p_values: [
                    {}
                ]
            });

        });

        test("DEBUG 2 argument version", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.debug('Hello, :1, :2, :3, :4 and :5!', 'World', 'People');
                END;
            `);

            let messages = database.call(`"${handlerPackageName}".get_messages`);

            expect(messages).to.eql([
                "200: Hello, World, People, :3, :4 and :5!"
            ]);
        
        });

        test("DEBUG 2 argument version, check call stack", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.debug('Hello, :1, :2, :3, :4 and :5!', 'World', 'People');
                END;
            `);

            let callStack = getCallStack();

            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: callStack.p_calls[0].id,
                        unit: "__anonymous_block",
                        line: 3,
                        first_line: 3
                    }
                ],
                p_values: [
                    {}
                ]
            });

        });

        test("DEBUG 3 argument version", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.debug('Hello, :1, :2, :3, :4 and :5!', 'World', 'People', 'Sun');
                END;
            `);

            let messages = database.call(`"${handlerPackageName}".get_messages`);

            expect(messages).to.eql([
                "200: Hello, World, People, Sun, :4 and :5!"
            ]);
        
        });

        test("DEBUG 3 argument version, check call stack", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.debug('Hello, :1, :2, :3, :4 and :5!', 'World', 'People', 'Sun');
                END;
            `);

            let callStack = getCallStack();

            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: callStack.p_calls[0].id,
                        unit: "__anonymous_block",
                        line: 3,
                        first_line: 3
                    }
                ],
                p_values: [
                    {}
                ]
            });

        });

        test("DEBUG 4 argument version", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.debug('Hello, :1, :2, :3, :4 and :5!', 'World', 'People', 'Sun', 'Joy');
                END;
            `);

            let messages = database.call(`"${handlerPackageName}".get_messages`);

            expect(messages).to.eql([
                "200: Hello, World, People, Sun, Joy and :5!"
            ]);
        
        });

        test("DEBUG 4 argument version, check call stack", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.debug('Hello, :1, :2, :3, :4 and :5!', 'World', 'People', 'Sun', 'Joy');
                END;
            `);

            let callStack = getCallStack();

            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: callStack.p_calls[0].id,
                        unit: "__anonymous_block",
                        line: 3,
                        first_line: 3
                    }
                ],
                p_values: [
                    {}
                ]
            });

        });

        test("DEBUG 5 argument version", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.debug('Hello, :1, :2, :3, :4 and :5!', 'World', 'People', 'Sun', 'Joy', 'Fun');
                END;
            `);

            let messages = database.call(`"${handlerPackageName}".get_messages`);

            expect(messages).to.eql([
                "200: Hello, World, People, Sun, Joy and Fun!"
            ]);
        
        });

        test("DEBUG 5 argument version, check call stack", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.debug('Hello, :1, :2, :3, :4 and :5!', 'World', 'People', 'Sun', 'Joy', 'Fun');
                END;
            `);

            let callStack = getCallStack();

            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: callStack.p_calls[0].id,
                        unit: "__anonymous_block",
                        line: 3,
                        first_line: 3
                    }
                ],
                p_values: [
                    {}
                ]
            });

        });

        test("INFO argument array version", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.info('Hello, :1!', t_varchars('World'));
                END;
            `);

            let messages = database.call(`"${handlerPackageName}".get_messages`);

            expect(messages).to.eql([
                "400: Hello, World!"
            ]);
        
        });

        test("INFO argument array version, check call stack", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.info('Hello, :1!', t_varchars('World'));
                END;
            `);

            let callStack = getCallStack();

            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: callStack.p_calls[0].id,
                        unit: "__anonymous_block",
                        line: 3,
                        first_line: 3
                    }
                ],
                p_values: [
                    {}
                ]
            });

        });

        test("INFO no argument version", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.info('Hello, :1, :2, :3, :4 and :5!');
                END;
            `);

            let messages = database.call(`"${handlerPackageName}".get_messages`);

            expect(messages).to.eql([
                "400: Hello, :1, :2, :3, :4 and :5!"
            ]);
        
        });

        test("INFO no argument version, check call stack", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.info('Hello, :1, :2, :3, :4 and :5!');
                END;
            `);

            let callStack = getCallStack();

            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: callStack.p_calls[0].id,
                        unit: "__anonymous_block",
                        line: 3,
                        first_line: 3
                    }
                ],
                p_values: [
                    {}
                ]
            });

        });

        test("INFO 1 argument version", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.info('Hello, :1, :2, :3, :4 and :5!', 'World');
                END;
            `);

            let messages = database.call(`"${handlerPackageName}".get_messages`);

            expect(messages).to.eql([
                "400: Hello, World, :2, :3, :4 and :5!"
            ]);
        
        });

        test("INFO 1 argument version, check call stack", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.info('Hello, :1, :2, :3, :4 and :5!', 'World');
                END;
            `);

            let callStack = getCallStack();

            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: callStack.p_calls[0].id,
                        unit: "__anonymous_block",
                        line: 3,
                        first_line: 3
                    }
                ],
                p_values: [
                    {}
                ]
            });

        });

        test("INFO 2 argument version", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.info('Hello, :1, :2, :3, :4 and :5!', 'World', 'People');
                END;
            `);

            let messages = database.call(`"${handlerPackageName}".get_messages`);

            expect(messages).to.eql([
                "400: Hello, World, People, :3, :4 and :5!"
            ]);
        
        });

        test("INFO 2 argument version, check call stack", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.info('Hello, :1, :2, :3, :4 and :5!', 'World', 'People');
                END;
            `);

            let callStack = getCallStack();

            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: callStack.p_calls[0].id,
                        unit: "__anonymous_block",
                        line: 3,
                        first_line: 3
                    }
                ],
                p_values: [
                    {}
                ]
            });

        });

        test("INFO 3 argument version", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.info('Hello, :1, :2, :3, :4 and :5!', 'World', 'People', 'Sun');
                END;
            `);

            let messages = database.call(`"${handlerPackageName}".get_messages`);

            expect(messages).to.eql([
                "400: Hello, World, People, Sun, :4 and :5!"
            ]);
        
        });

        test("INFO 3 argument version, check call stack", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.info('Hello, :1, :2, :3, :4 and :5!', 'World', 'People', 'Sun');
                END;
            `);

            let callStack = getCallStack();

            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: callStack.p_calls[0].id,
                        unit: "__anonymous_block",
                        line: 3,
                        first_line: 3
                    }
                ],
                p_values: [
                    {}
                ]
            });

        });

        test("INFO 4 argument version", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.info('Hello, :1, :2, :3, :4 and :5!', 'World', 'People', 'Sun', 'Joy');
                END;
            `);

            let messages = database.call(`"${handlerPackageName}".get_messages`);

            expect(messages).to.eql([
                "400: Hello, World, People, Sun, Joy and :5!"
            ]);
        
        });

        test("INFO 4 argument version, check call stack", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.info('Hello, :1, :2, :3, :4 and :5!', 'World', 'People', 'Sun', 'Joy');
                END;
            `);

            let callStack = getCallStack();

            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: callStack.p_calls[0].id,
                        unit: "__anonymous_block",
                        line: 3,
                        first_line: 3
                    }
                ],
                p_values: [
                    {}
                ]
            });

        });

        test("INFO 5 argument version", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.info('Hello, :1, :2, :3, :4 and :5!', 'World', 'People', 'Sun', 'Joy', 'Fun');
                END;
            `);

            let messages = database.call(`"${handlerPackageName}".get_messages`);

            expect(messages).to.eql([
                "400: Hello, World, People, Sun, Joy and Fun!"
            ]);
        
        });

        test("INFO 5 argument version, check call stack", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.info('Hello, :1, :2, :3, :4 and :5!', 'World', 'People', 'Sun', 'Joy', 'Fun');
                END;
            `);

            let callStack = getCallStack();

            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: callStack.p_calls[0].id,
                        unit: "__anonymous_block",
                        line: 3,
                        first_line: 3
                    }
                ],
                p_values: [
                    {}
                ]
            });

        });

        test("WARNING argument array version", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.warning('Hello, :1!', t_varchars('World'));
                END;
            `);

            let messages = database.call(`"${handlerPackageName}".get_messages`);

            expect(messages).to.eql([
                "600: Hello, World!"
            ]);
        
        });

        test("WARNING argument array version, check call stack", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.warning('Hello, :1!', t_varchars('World'));
                END;
            `);

            let callStack = getCallStack();

            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: callStack.p_calls[0].id,
                        unit: "__anonymous_block",
                        line: 3,
                        first_line: 3
                    }
                ],
                p_values: [
                    {}
                ]
            });

        });

        test("WARNING no argument version", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.warning('Hello, :1, :2, :3, :4 and :5!');
                END;
            `);

            let messages = database.call(`"${handlerPackageName}".get_messages`);

            expect(messages).to.eql([
                "600: Hello, :1, :2, :3, :4 and :5!"
            ]);
        
        });

        test("WARNING no argument version, check call stack", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.warning('Hello, :1, :2, :3, :4 and :5!');
                END;
            `);

            let callStack = getCallStack();

            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: callStack.p_calls[0].id,
                        unit: "__anonymous_block",
                        line: 3,
                        first_line: 3
                    }
                ],
                p_values: [
                    {}
                ]
            });

        });

        test("WARNING 1 argument version", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.warning('Hello, :1, :2, :3, :4 and :5!', 'World');
                END;
            `);

            let messages = database.call(`"${handlerPackageName}".get_messages`);

            expect(messages).to.eql([
                "600: Hello, World, :2, :3, :4 and :5!"
            ]);
        
        });

        test("WARNING 1 argument version, check call stack", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.warning('Hello, :1, :2, :3, :4 and :5!', 'World');
                END;
            `);

            let callStack = getCallStack();

            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: callStack.p_calls[0].id,
                        unit: "__anonymous_block",
                        line: 3,
                        first_line: 3
                    }
                ],
                p_values: [
                    {}
                ]
            });

        });

        test("WARNING 2 argument version", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.warning('Hello, :1, :2, :3, :4 and :5!', 'World', 'People');
                END;
            `);

            let messages = database.call(`"${handlerPackageName}".get_messages`);

            expect(messages).to.eql([
                "600: Hello, World, People, :3, :4 and :5!"
            ]);
        
        });

        test("WARNING 2 argument version, check call stack", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.warning('Hello, :1, :2, :3, :4 and :5!', 'World', 'People');
                END;
            `);

            let callStack = getCallStack();

            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: callStack.p_calls[0].id,
                        unit: "__anonymous_block",
                        line: 3,
                        first_line: 3
                    }
                ],
                p_values: [
                    {}
                ]
            });

        });

        test("WARNING 3 argument version", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.warning('Hello, :1, :2, :3, :4 and :5!', 'World', 'People', 'Sun');
                END;
            `);

            let messages = database.call(`"${handlerPackageName}".get_messages`);

            expect(messages).to.eql([
                "600: Hello, World, People, Sun, :4 and :5!"
            ]);
        
        });

        test("WARNING 3 argument version, check call stack", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.warning('Hello, :1, :2, :3, :4 and :5!', 'World', 'People', 'Sun');
                END;
            `);

            let callStack = getCallStack();

            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: callStack.p_calls[0].id,
                        unit: "__anonymous_block",
                        line: 3,
                        first_line: 3
                    }
                ],
                p_values: [
                    {}
                ]
            });

        });

        test("WARNING 4 argument version", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.warning('Hello, :1, :2, :3, :4 and :5!', 'World', 'People', 'Sun', 'Joy');
                END;
            `);

            let messages = database.call(`"${handlerPackageName}".get_messages`);

            expect(messages).to.eql([
                "600: Hello, World, People, Sun, Joy and :5!"
            ]);
        
        });

        test("WARNING 4 argument version, check call stack", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.warning('Hello, :1, :2, :3, :4 and :5!', 'World', 'People', 'Sun', 'Joy');
                END;
            `);

            let callStack = getCallStack();

            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: callStack.p_calls[0].id,
                        unit: "__anonymous_block",
                        line: 3,
                        first_line: 3
                    }
                ],
                p_values: [
                    {}
                ]
            });

        });

        test("WARNING 5 argument version", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.warning('Hello, :1, :2, :3, :4 and :5!', 'World', 'People', 'Sun', 'Joy', 'Fun');
                END;
            `);

            let messages = database.call(`"${handlerPackageName}".get_messages`);

            expect(messages).to.eql([
                "600: Hello, World, People, Sun, Joy and Fun!"
            ]);
        
        });

        test("WARNING 5 argument version, check call stack", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.warning('Hello, :1, :2, :3, :4 and :5!', 'World', 'People', 'Sun', 'Joy', 'Fun');
                END;
            `);

            let callStack = getCallStack();

            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: callStack.p_calls[0].id,
                        unit: "__anonymous_block",
                        line: 3,
                        first_line: 3
                    }
                ],
                p_values: [
                    {}
                ]
            });

        });

        test("ERROR argument array version", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.error('Hello, :1!', t_varchars('World'));
                END;
            `);

            let messages = database.call(`"${handlerPackageName}".get_messages`);

            expect(messages).to.eql([
                "800: Hello, World!"
            ]);
        
        });

        test("ERROR argument array version, check call stack", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.error('Hello, :1!', t_varchars('World'));
                END;
            `);

            let callStack = getCallStack();

            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: callStack.p_calls[0].id,
                        unit: "__anonymous_block",
                        line: 3,
                        first_line: 3
                    }
                ],
                p_values: [
                    {}
                ]
            });

        });

        test("ERROR no argument version", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.error('Hello, :1, :2, :3, :4 and :5!');
                END;
            `);

            let messages = database.call(`"${handlerPackageName}".get_messages`);

            expect(messages).to.eql([
                "800: Hello, :1, :2, :3, :4 and :5!"
            ]);
        
        });

        test("ERROR no argument version, check call stack", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.error('Hello, :1, :2, :3, :4 and :5!');
                END;
            `);

            let callStack = getCallStack();

            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: callStack.p_calls[0].id,
                        unit: "__anonymous_block",
                        line: 3,
                        first_line: 3
                    }
                ],
                p_values: [
                    {}
                ]
            });

        });

        test("ERROR 1 argument version", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.error('Hello, :1, :2, :3, :4 and :5!', 'World');
                END;
            `);

            let messages = database.call(`"${handlerPackageName}".get_messages`);

            expect(messages).to.eql([
                "800: Hello, World, :2, :3, :4 and :5!"
            ]);
        
        });

        test("ERROR 1 argument version, check call stack", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.error('Hello, :1, :2, :3, :4 and :5!', 'World');
                END;
            `);

            let callStack = getCallStack();

            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: callStack.p_calls[0].id,
                        unit: "__anonymous_block",
                        line: 3,
                        first_line: 3
                    }
                ],
                p_values: [
                    {}
                ]
            });

        });

        test("ERROR 2 argument version", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.error('Hello, :1, :2, :3, :4 and :5!', 'World', 'People');
                END;
            `);

            let messages = database.call(`"${handlerPackageName}".get_messages`);

            expect(messages).to.eql([
                "800: Hello, World, People, :3, :4 and :5!"
            ]);
        
        });

        test("ERROR 2 argument version, check call stack", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.error('Hello, :1, :2, :3, :4 and :5!', 'World', 'People');
                END;
            `);

            let callStack = getCallStack();

            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: callStack.p_calls[0].id,
                        unit: "__anonymous_block",
                        line: 3,
                        first_line: 3
                    }
                ],
                p_values: [
                    {}
                ]
            });

        });

        test("ERROR 3 argument version", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.error('Hello, :1, :2, :3, :4 and :5!', 'World', 'People', 'Sun');
                END;
            `);

            let messages = database.call(`"${handlerPackageName}".get_messages`);

            expect(messages).to.eql([
                "800: Hello, World, People, Sun, :4 and :5!"
            ]);
        
        });

        test("ERROR 3 argument version, check call stack", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.error('Hello, :1, :2, :3, :4 and :5!', 'World', 'People', 'Sun');
                END;
            `);

            let callStack = getCallStack();

            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: callStack.p_calls[0].id,
                        unit: "__anonymous_block",
                        line: 3,
                        first_line: 3
                    }
                ],
                p_values: [
                    {}
                ]
            });

        });

        test("ERROR 4 argument version", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.error('Hello, :1, :2, :3, :4 and :5!', 'World', 'People', 'Sun', 'Joy');
                END;
            `);

            let messages = database.call(`"${handlerPackageName}".get_messages`);

            expect(messages).to.eql([
                "800: Hello, World, People, Sun, Joy and :5!"
            ]);
        
        });

        test("ERROR 4 argument version, check call stack", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.error('Hello, :1, :2, :3, :4 and :5!', 'World', 'People', 'Sun', 'Joy');
                END;
            `);

            let callStack = getCallStack();

            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: callStack.p_calls[0].id,
                        unit: "__anonymous_block",
                        line: 3,
                        first_line: 3
                    }
                ],
                p_values: [
                    {}
                ]
            });

        });

        test("ERROR 5 argument version", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.error('Hello, :1, :2, :3, :4 and :5!', 'World', 'People', 'Sun', 'Joy', 'Fun');
                END;
            `);

            let messages = database.call(`"${handlerPackageName}".get_messages`);

            expect(messages).to.eql([
                "800: Hello, World, People, Sun, Joy and Fun!"
            ]);
        
        });

        test("ERROR 5 argument version, check call stack", function() {
        
            database.call(`"${handlerPackageName}".reset`);

            database.run(`
                BEGIN
                    log$.error('Hello, :1, :2, :3, :4 and :5!', 'World', 'People', 'Sun', 'Joy', 'Fun');
                END;
            `);

            let callStack = getCallStack();

            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: callStack.p_calls[0].id,
                        unit: "__anonymous_block",
                        line: 3,
                        first_line: 3
                    }
                ],
                p_values: [
                    {}
                ]
            });

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

*/

suite("Error stack filling and oracle error logging", function() {

    test("Check if call stack isn't affected when tere is no error", function() {
    
        resetPackage();

        database.run(`
            DECLARE
                
                PROCEDURE proc1 IS
                BEGIN
                    log$.call;
                END;

            BEGIN
                log$.call;
                proc1;
                log$.fill_error_stack;
            END;
        `);

        let callStack = getCallStack();

        expect(callStack).to.eql({
            p_calls: [
                {
                    id: 1,
                    unit: "__anonymous_block",
                    line: 11,
                    first_line: 10
                },
                {
                    id: 2,
                    unit: "__anonymous_block.PROC1",
                    line: 6,
                    first_line: 6
                }
            ],
            "p_values": [
                {},
                {}
            ]
        });
    
    });
    
    test("Anonymous block, call stack depth 1, tracked depth 0, backtrace depth 1", function() {
    
        resetPackage();

        database.run(`
            BEGIN
                RAISE NO_DATA_FOUND;
            EXCEPTION
                WHEN OTHERS THEN
                    log$.fill_error_stack;
            END;
        `);

        let callStack = getCallStack();

        expect(callStack).to.eql({
            p_calls: [
                {
                    id: 1,
                    unit: "__anonymous_block",
                    line: 3,
                    first_line: 3
                }
            ],
            p_values: [
                {}
            ]
        });
    
    });

    test("Anonymous block, call stack depth 1, tracked depth 1, backtrace depth 1", function() {
    
        resetPackage();

        database.run(`
            BEGIN
                log$.value('hello', 'world');
                RAISE NO_DATA_FOUND;
            EXCEPTION
                WHEN OTHERS THEN
                    log$.fill_error_stack;
            END;
        `);

        let callStack = getCallStack();

        expect(callStack).to.eql({
            p_calls: [
                {
                    id: 1,
                    unit: "__anonymous_block",
                    line: 4,
                    first_line: 3
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

    test("Anonymous block, call stack depth 1, tracked depth 1, backtrace depth 3", function() {
    
        resetPackage();

        database.run(`
            DECLARE
                
                PROCEDURE proc2 IS
                BEGIN
                    RAISE NO_DATA_FOUND;
                END;

                PROCEDURE proc1 IS
                BEGIN
                    proc2;
                END;

            BEGIN
                log$.value('hello', 'world');
                proc1;
            EXCEPTION
                WHEN OTHERS THEN
                    log$.fill_error_stack;
            END;
        `);

        let callStack = getCallStack();

        expect(callStack).to.eql({
            p_calls: [
                {
                    id: 1,
                    unit: "__anonymous_block",
                    line: 16,
                    first_line: 15
                }, 
                {
                    id: 2,
                    unit: "__anonymous_block",
                    line: 11,
                    first_line: 11
                }, 
                {
                    id: 3,
                    unit: "__anonymous_block",
                    line: 6,
                    first_line: 6
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
                }, 
                {}, 
                {}
            ]
        });
    
    });

    test("Anonymous block, call stack depth 1, tracked depth 2, backtrace depth 3", function() {
    
        resetPackage();

        database.run(`
            DECLARE
                
                PROCEDURE proc2 IS
                BEGIN
                    RAISE NO_DATA_FOUND;
                END;

                PROCEDURE proc1 IS
                BEGIN
                    log$.call;
                    proc2;
                END;

            BEGIN
                log$.value('hello', 'world');
                proc1;
            EXCEPTION
                WHEN OTHERS THEN
                    log$.fill_error_stack;
            END;
        `);

        let callStack = getCallStack();

        expect(callStack).to.eql({
            p_calls: [
                {
                    id: 1,
                    unit: "__anonymous_block",
                    line: 17,
                    first_line: 16
                }, 
                {
                    id: 2,
                    unit: "__anonymous_block.PROC1",
                    line: 12,
                    first_line: 11
                }, 
                {
                    id: 3,
                    unit: "__anonymous_block",
                    line: 6,
                    first_line: 6
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
                }, 
                {}, 
                {}
            ]
        });
    
    });

    test("Anonymous block, call stack depth 1, tracked depth 2, backtrace depth 2, common depth 1", function() {
    
        resetPackage();

        database.run(`
            DECLARE
                
                PROCEDURE proc2 IS
                BEGIN
                    RAISE NO_DATA_FOUND;
                END;

                PROCEDURE proc1 IS
                BEGIN
                    log$.call;
                END;

            BEGIN
                log$.value('hello', 'world');
                proc1;
                proc2;
            EXCEPTION
                WHEN OTHERS THEN
                    log$.fill_error_stack;
            END;
        `);

        let callStack = getCallStack();

        expect(callStack).to.eql({
            p_calls: [
                {
                    id: 1,
                    unit: "__anonymous_block",
                    line: 17,
                    first_line: 15
                }, 
                {
                    id: 3,
                    unit: "__anonymous_block",
                    line: 6,
                    first_line: 6
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
                }, 
                {}
            ]
        });
    
    });

    test("Anonymous block, call stack depth 1, tracked depth 3, backtrace depth 4, common depth 2", function() {
    
        resetPackage();
    
        database.run(`
            DECLARE
    
                PROCEDURE proc4 IS
                BEGIN
                    RAISE NO_DATA_FOUND;
                END;
    
                PROCEDURE proc3 IS
                BEGIN
                    proc4;
                END;
    
                PROCEDURE proc2 IS
                BEGIN
                    log$.value('hello', 'people');
                END;
    
                PROCEDURE proc1 IS
                BEGIN
                    log$.call;
                    proc2;
                    proc3;
                END;
    
            BEGIN
                log$.value('hello', 'world');
                proc1;
            EXCEPTION
                WHEN OTHERS THEN
                    log$.fill_error_stack;
            END;
        `);
    
        let callStack = getCallStack();
    
        expect(callStack).to.eql({
            p_calls: [
                {
                    id: 1,
                    unit: "__anonymous_block",
                    line: 28,
                    first_line: 27
                }, 
                {
                    id: 2,
                    unit: "__anonymous_block.PROC1",
                    line: 23,
                    first_line: 21
                },
                {
                    id: 4,
                    unit: "__anonymous_block",
                    line: 11,
                    first_line: 11
                },
                {
                    id: 5,
                    unit: "__anonymous_block",
                    line: 6,
                    first_line: 6
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
                }, 
                {},
                {},
                {}
            ]
        });
    
    });

    test("Anonymous block, call stack depth 3, tracked depth 1, backtrace depth 3", function() {
    
        resetPackage();
    
        database.run(`
            DECLARE
    
                PROCEDURE proc4 IS
                BEGIN
                    RAISE NO_DATA_FOUND;
                END;
    
                PROCEDURE proc3 IS
                BEGIN
                    proc4;
                END;
    
                PROCEDURE proc2 IS
                BEGIN
                    proc3;
                EXCEPTION
                    WHEN OTHERS THEN
                        log$.fill_error_stack;
                END;
    
                PROCEDURE proc1 IS
                BEGIN
                    proc2;
                END;
    
            BEGIN
                log$.value('hello', 'world');
                proc1;
            END;
        `);
    
        let callStack = getCallStack();
    
        expect(callStack).to.eql({
            p_calls: [
                {
                    id: 1,
                    unit: "__anonymous_block",
                    line: 29,
                    first_line: 28
                }, 
                {
                    id: 2,
                    unit: "__anonymous_block.PROC1",
                    line: 24,
                    first_line: 24
                },
                {
                    id: 3,
                    unit: "__anonymous_block.PROC2",
                    line: 16,
                    first_line: 16
                },
                {
                    id: 4,
                    unit: "__anonymous_block",
                    line: 11,
                    first_line: 11
                },
                {
                    id: 5,
                    unit: "__anonymous_block",
                    line: 6,
                    first_line: 6
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
                }, 
                {},
                {},
                {},
                {}
            ]
        });
    
    });

    test("Anonymous block, call stack depth 3, tracked depth 1, backtrace depth 3", function() {
    
        resetPackage();
    
        database.run(`
            DECLARE
    
                PROCEDURE proc5 IS
                BEGIN
                    log$.fill_error_stack(10);
                END;

                PROCEDURE proc4 IS
                BEGIN
                    RAISE NO_DATA_FOUND;
                END;
    
                PROCEDURE proc3 IS
                BEGIN
                    proc4;
                END;
    
                PROCEDURE proc2 IS
                BEGIN
                    proc3;
                EXCEPTION
                    WHEN OTHERS THEN
                        proc5;
                END;
    
                PROCEDURE proc1 IS
                BEGIN
                    proc2;
                END;
    
            BEGIN
                log$.value('hello', 'world');
                proc1;
            END;
        `);
    
        let callStack = getCallStack();
    
        expect(callStack).to.eql({
            p_calls: [
                {
                    id: 1,
                    unit: "__anonymous_block",
                    line: 29,
                    first_line: 28
                }, 
                {
                    id: 2,
                    unit: "__anonymous_block.PROC1",
                    line: 24,
                    first_line: 24
                },
                {
                    id: 3,
                    unit: "__anonymous_block.PROC2",
                    line: 16,
                    first_line: 16
                },
                {
                    id: 4,
                    unit: "__anonymous_block",
                    line: 11,
                    first_line: 11
                },
                {
                    id: 5,
                    unit: "__anonymous_block",
                    line: 6,
                    first_line: 6
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
                }, 
                {},
                {},
                {},
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