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

suite("Default message resolver tests", function() {

    setup("Reset default message resolver", function() {
        
        database.call("default_message_resolver.reset");    
    
    });
    
    test("Register a message in the default resolver", function() {

        var result = database.call("default_message_resolver.register_message", {
            p_code: "MSG-00001",
            p_message: "Hello, :1!"
        });

    });

    test("Resolve registered message", function() {
    
        var result = database.call("log$.resolve_message", {
            p_code: "MSG-00001"
        });

        expect(result).to.be("Hello, :1!");
    
    });

    test("Resolve an unexisting message", function() {
    
        var result = database.call("log$.resolve_message", {
            p_code: "MSG-00002"
        });

        expect(result).to.be.null;
    
    });

});

suite("Message formatting tests", function() {

    test("Format a resolvable message without arguments", function() {
    
        var result = database.call("log$.format_message", {
            p_message: "MSG-00001"
        });

        expect(result).to.be("MSG-00001: Hello, :1!");
    
    });

    test("Format a resolvable message with argument array", function() {
    
        var result = database.call("log$.format_message", {
            p_message: "MSG-00001",
            p_arguments: ["World"]
        });

        expect(result).to.be("MSG-00001: Hello, World!");
    
    });

    test("Format a resolvable message with a one argument overloaded function", function() {
    
        var result = database.call2("log$.format_message", {
            p_message: "MSG-00001",
            p_argument1: "World"
        });

        expect(result).to.be("MSG-00001: Hello, World!");
    
    });

    test("Format an unresolvable message argument array", function() {
    
        var result = database.call("log$.format_message", {
            p_message: "MSG-00002",
            p_arguments: ["World"]
        });

        expect(result).to.be("MSG-00002 (World)");
    
    });

    test("Format an unresolvable message without arguments", function() {
    
        var result = database.call("log$.format_message", {
            p_message: "MSG-00002"
        });

        expect(result).to.be("MSG-00002");
    
    });
    
});

suite("Default message handler tests", function() {

    var DEBUG = 250, INFO = 500, WARNING = 750, ERROR = 1000;

    setup("Reset default message resolver and hadler", function() {
        
        database.call("default_message_resolver.reset");    
        database.call("default_message_handler.reset");    
    
    });

    test("Set handler level to NULL", function() {

        database.call("default_message_handler.set_log_level", {
            p_level: null
        });

        var logLevel = database.call("default_message_handler.get_log_level");

        expect(logLevel).to.be(null);

    });

    test("Set handler level to INFO", function() {

        database.call("default_message_handler.set_log_level", {
            p_level: INFO
        });

        var logLevel = database.call("default_message_handler.get_log_level");

        expect(logLevel).to.be(INFO);

    });

    test("Log message of level DEBUG", function() {
    
        var result = database.call("log$.debug", {
            p_message: "DEBUG message 1"
        });
    
        var tail = database.selectRows(`*
            FROM log$tail`);

        expect(tail).to.eql([]);

    });
    
    test("Log message of level INFO", function() {
    
        var result = database.call("log$.info", {
            p_message: "INFO message 1"
        });
    
        var tail = database.selectRows(`log_level, message_text
            FROM log$tail`);

        expect(tail).to.eql([
            [INFO, "INFO message 1"]
        ]);

    });

    test("Log another message of level INFO", function() {
    
        var result = database.call("log$.info", {
            p_message: "INFO message 2"
        });
    
        var tail = database.selectRows(`log_level, message_text
            FROM log$tail`);

        expect(tail).to.eql([
            [INFO, "INFO message 2"],
            [INFO, "INFO message 1"]
        ]);

    });

    test("Log another message of level DEBUG", function() {
    
        var result = database.call("log$.debug", {
            p_message: "DEBUG message 2"
        });
    
        var tail = database.selectRows(`log_level, message_text
            FROM log$tail`);

        expect(tail).to.eql([
            [INFO, "INFO message 2"],
            [INFO, "INFO message 1"]
        ]);

    });

    test("Log message of level ERROR", function() {
    
        var result = database.call("log$.error", {
            p_message: "ERROR message 1"
        });
    
        var tail = database.selectRows(`log_level, message_text
            FROM log$tail`);

        expect(tail).to.eql([
            [ERROR, "ERROR message 1"],
            [INFO, "INFO message 2"],
            [INFO, "INFO message 1"]
        ]);

    });

});