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

    setup("Reset default message resolver and store", function() {
    
        database.call("log$.reset_message_resolver");    
        database.call("default_message_store.reset");    
    
    });
    
    test("Register a message in the default resolver", function() {

        var result = database.call("log$.register_message", {
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

    setup("Reset default message resolver and store", function() {
    
        database.call("log$.reset_message_resolver");    
        database.call("default_message_store.reset");    
    
    });

    test("", function() {

        

    });

});