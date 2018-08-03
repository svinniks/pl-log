function resetPackage() {
    database.run(`
        BEGIN
            dbms_session.reset_package;            
        END;
    `);
}

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

suite("Storing values in the tracked call stack nodes", function() {
    
    suite("VARCHAR2 versions of VALUE", function() {
    
        test("Try to pass NULL name to the VARCHAR2 version of VALUE", function() {

            resetPackage();

            expect(function() {
            
                database.run(`
                    BEGIN
                        log$.value(NULL, 'world');
                    END;
                `);
            
            }).to.throw(/PLS-00567/);

        });

        test("Try to pass NULL service depth to the VARCHAR2 version of VALUE", function() {
    
            resetPackage();

            expect(function() {
            
                database.run(`
                    BEGIN
                        log$.value('hello', 'world', NULL, TRUE);
                    END;
                `);
            
            }).to.throw(/PLS-00567/);

        });

        test("Try to pass NULL fill call stack flag to the VARCHAR2 version of VALUE", function() {
    
            resetPackage();

            expect(function() {
            
                database.run(`
                    BEGIN
                        log$.value('hello', 'world', 0, NULL);
                    END;
                `);
            
            }).to.throw(/PLS-00567/);

        });

        test("Try to pass NULL fill call stack flag to the VARCHAR2 version of VALUE, overload 2", function() {
    
            resetPackage();

            expect(function() {
            
                database.run(`
                    BEGIN
                        log$.value('hello', 'world', 0, CAST(NULL AS BOOLEAN));
                    END;
                `);
            
            }).to.throw(/ORA-06502/);

        });

        test("Try to pass negative service depth to the VARCHAR2 version of VALUE", function() {
    
            resetPackage();

            expect(function() {
            
                database.run(`
                    BEGIN
                        log$.value('hello', 'world', -1);
                    END;
                `);
            
            }).to.throw(/ORA-06512/);

        });

        test("Call VARCHAR2 version of VALUE, default arguments", function() {
    
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

        test("Call VARCHAR2 version of VALUE, check if the top is being reset", function() {
    
            resetPackage();
    
            database.run(`
                BEGIN
                    log$.value('hello', 'world'); log$.value('hello', 'world');
                END;
            `);
    
            let callStack = getCallStack();
    
            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: 2,
                        unit: "__anonymous_block",
                        line: 3,
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

        test("Call VARCHAR2 version of VALUE, hide one level of the stack", function() {
    
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

        test("Call VARCHAR2 version of VALUE, hide more levels, than there are in the stack", function() {
    
            resetPackage();
    
            database.run(`
                DECLARE
                    PROCEDURE proc IS
                    BEGIN
                        log$.value('hello', 'world', 10);
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
        
    });

    suite("NUMBER versions of VALUE", function() {
    
        test("Try to pass NULL name to the NUMBER version of VALUE", function() {

            resetPackage();

            expect(function() {
            
                database.run(`
                    BEGIN
                        log$.value(NULL, 123);
                    END;
                `);
            
            }).to.throw(/PLS-00567/);

        });

        test("Try to pass NULL service depth to the NUMBER version of VALUE", function() {
    
            resetPackage();

            expect(function() {
            
                database.run(`
                    BEGIN
                        log$.value('hello', 123, NULL, TRUE);
                    END;
                `);
            
            }).to.throw(/PLS-00567/);

        });

        test("Try to pass NULL fill call stack flag to the NUMBER version of VALUE", function() {
    
            resetPackage();

            expect(function() {
            
                database.run(`
                    BEGIN
                        log$.value('hello', 123, 0, NULL);
                    END;
                `);
            
            }).to.throw(/PLS-00567/);

        });

        test("Try to pass NULL fill call stack flag to the NUMBER version of VALUE, overload 2", function() {
    
            resetPackage();

            expect(function() {
            
                database.run(`
                    BEGIN
                        log$.value('hello', 123, CAST(NULL AS BOOLEAN));
                    END;
                `);
            
            }).to.throw(/ORA-06512/);

        });

        test("Try to pass negative service depth to the NUMBER version of VALUE", function() {
    
            resetPackage();

            expect(function() {
            
                database.run(`
                    BEGIN
                        log$.value('hello', 123, -1);
                    END;
                `);
            
            }).to.throw(/ORA-06512/);

        });

        test("Call NUMBER version of VALUE, default arguments", function() {
    
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
                        first_tracked_line: 3
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

        test("Call NUMBER version of VALUE, check if the top is being reset", function() {
    
            resetPackage();
    
            database.run(`
                BEGIN
                    log$.value('hello', 123); log$.value('hello', 123);
                END;
            `);
    
            let callStack = getCallStack();
    
            expect(callStack).to.eql({
                p_calls: [
                    {
                        id: 2,
                        unit: "__anonymous_block",
                        line: 3,
                        first_tracked_line: 3
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

        test("Call NUMBER version of VALUE, hide one level of the stack", function() {
    
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
                        first_tracked_line: 8
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

        test("Call NUMBER version of VALUE, hide more levels, than there are in the stack", function() {
    
            resetPackage();
    
            database.run(`
                DECLARE
                    PROCEDURE proc IS
                    BEGIN
                        log$.value('hello', 123, 10);
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
        
    });

    suite("BOOLEAN versions of VALUE", function() {
    
        test("Try to pass NULL name to the BOOLEAN version of VALUE", function() {

            resetPackage();

            expect(function() {
            
                database.run(`
                    BEGIN
                        log$.value(NULL, TRUE);
                    END;
                `);
            
            }).to.throw(/PLS-00567/);

        });

        test("Try to pass NULL service depth to the BOOLEAN version of VALUE", function() {
    
            resetPackage();

            expect(function() {
            
                database.run(`
                    BEGIN
                        log$.value('hello', TRUE, NULL, TRUE);
                    END;
                `);
            
            }).to.throw(/PLS-00567/);

        });

        test("Try to pass NULL fill call stack flag to the BOOLEAN version of VALUE", function() {
    
            resetPackage();

            expect(function() {
            
                database.run(`
                    BEGIN
                        log$.value('hello', TRUE, 0, NULL);
                    END;
                `);
            
            }).to.throw(/PLS-00567/);

        });

        test("Try to pass NULL fill call stack flag to the BOOLEAN version of VALUE, overload 2", function() {
    
            resetPackage();

            expect(function() {
            
                database.run(`
                    BEGIN
                        log$.value('hello', TRUE, CAST(NULL AS BOOLEAN));
                    END;
                `);
            
            }).to.throw(/ORA-06512/);

        });

        test("Try to pass negative service depth to the BOOLEAN version of VALUE", function() {
    
            resetPackage();

            expect(function() {
            
                database.run(`
                    BEGIN
                        log$.value('hello', TRUE, -1);
                    END;
                `);
            
            }).to.throw(/ORA-06512/);

        });

        test("Call BOOLEAN version of VALUE, default arguments", function() {
    
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
                        first_tracked_line: 3
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

        test("Call BOOLEAN version of VALUE, check if the top is being reset", function() {
    
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
                        first_tracked_line: 3
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

        test("Call BOOLEAN version of VALUE, hide one level of the stack", function() {
    
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
                        first_tracked_line: 8
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

        test("Call BOOLEAN version of VALUE, hide more levels, than there are in the stack", function() {
    
            resetPackage();
    
            database.run(`
                DECLARE
                    PROCEDURE proc IS
                    BEGIN
                        log$.value('hello', TRUE, 10);
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
        
    });

    suite("DATE versions of VALUE", function() {
    
        test("Try to pass NULL name to the DATE version of VALUE", function() {

            resetPackage();

            expect(function() {
            
                database.run(`
                    BEGIN
                        log$.value(NULL, CAST(TIMESTAMP '1913-08-25 13:49:03' AS DATE));
                    END;
                `);
            
            }).to.throw(/PLS-00567/);

        });

        test("Try to pass NULL service depth to the DATE version of VALUE", function() {
    
            resetPackage();

            expect(function() {
            
                database.run(`
                    BEGIN
                        log$.value('hello', CAST(TIMESTAMP '1913-08-25 13:49:03' AS DATE), NULL, TRUE);
                    END;
                `);
            
            }).to.throw(/PLS-00567/);

        });

        test("Try to pass NULL fill call stack flag to the DATE version of VALUE", function() {
    
            resetPackage();

            expect(function() {
            
                database.run(`
                    BEGIN
                        log$.value('hello', CAST(TIMESTAMP '1913-08-25 13:49:03' AS DATE), 0, NULL);
                    END;
                `);
            
            }).to.throw(/PLS-00567/);

        });

        test("Try to pass NULL fill call stack flag to the DATE version of VALUE, overload 2", function() {
    
            resetPackage();

            expect(function() {
            
                database.run(`
                    BEGIN
                        log$.value('hello', CAST(TIMESTAMP '1913-08-25 13:49:03' AS DATE), CAST(NULL AS BOOLEAN));
                    END;
                `);
            
            }).to.throw(/ORA-06502/);

        });

        test("Try to pass negative service depth to the DATE version of VALUE", function() {
    
            resetPackage();

            expect(function() {
            
                database.run(`
                    BEGIN
                        log$.value('hello', CAST(TIMESTAMP '1913-08-25 13:49:03' AS DATE), -1);
                    END;
                `);
            
            }).to.throw(/ORA-06512/);

        });

        test("Call DATE version of VALUE, default arguments", function() {
    
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
                        first_tracked_line: 3
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

        test("Call DATE version of VALUE, check if the top is being reset", function() {
    
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
                        first_tracked_line: 3
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

        test("Call DATE version of VALUE, hide one level of the stack", function() {
    
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
                        first_tracked_line: 8
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

        test("Call DATE version of VALUE, hide more levels, than there are in the stack", function() {
    
            resetPackage();
    
            database.run(`
                DECLARE
                    PROCEDURE proc IS
                    BEGIN
                        log$.value('hello', CAST(TIMESTAMP '1913-08-25 13:49:03' AS DATE), 10);
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
                    first_tracked_line: 4
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
                    first_tracked_line: 4
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

teardown("Drop the LOG$.GET_CALL_STACK wrapper", function() {
    
    database.run(`
        BEGIN
            EXECUTE IMMEDIATE '
                DROP PROCEDURE "${getCallStackJsonProcedureName}"
            ';
        END;
    `);

});