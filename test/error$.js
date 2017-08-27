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

suite("Error tests", function() {

    setup("Setup", function() {

        database.call("log$.reset_message_resolver");

        database.call("log$.register_message", {
            p_code: "MSG-00001",
            p_message: "Hello, :1!"
        });

        database.call("log$.register_message", {
            p_code: "MSG-00002",
            p_message: "Good bye, World!"
        });

    });

    test("Raise a formatted message with argument array", function() {

        expect(function() {
        
            var result = database.call("error$.raise", {
                p_message: "MSG-00001",
                p_arguments: ["World"]
            });
        
        }).to.throw(/MSG-00001: Hello, World!/);

    });

    test("Raise a formatted message with one argument overloaded version", function() {

        expect(function() {
        
            var result = database.call2("error$.raise", {
                p_message: "MSG-00001",
                p_argument1: "World"
            });
        
        }).to.throw(/MSG-00001: Hello, World!/);

    });

    test("Raise a formatted message without argumens", function() {

        expect(function() {
        
            var result = database.call("error$.raise", {
                p_message: "MSG-00002"
            });
        
        }).to.throw(/MSG-00002: Good bye, World!/);

    });

});