/**
 *  JsEvalEngine
 *  Evaluate js while keeping track of it
 * 
 *  Copyright 2020, 2021 Rolf Bagge, Janus B. Kristensen, CAVI,
 *  Center for Advanced Visualization and Interaction, Aarhus University
 *    
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0

 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
**/
    
function codeStratesEvalInContext(code, context) {
    with(context) {
        eval(code);
    }
}

window.JsEvalEngine = class JsEvalEngine {
    static async execute(code, options, fragment = null) {

        options = Object.assign({}, JsEvalEngine.defaultOptions(fragment), options);

        let resolver = null;
        let rejector = null;

        let asyncPromise = new Promise((resolve, reject)=>{
            resolver = resolve;
            rejector = reject;
        });

        let clonedConsole = Object.assign({}, console, options.customConsole);

        let context = {
            exports: {},
            asyncResolve: resolver,
            asyncReject: rejector,
            console: clonedConsole,
            fragmentSelfReference: fragment,
            error: (e)=>{
                let parsedStack = JsEvalEngine.parseErrorStack(e.name, e.stack, e);
                EventSystem.triggerEvent("Codestrates.Fragment.Error", {
                    messages: [parsedStack],
                    fragment: fragment
                });
                let compactStack = StackWalker.compactify(parsedStack.stack);
                let lineNumber = compactStack[0].lineNumber;
                JsEvalEngine.doLog(console.error, fragment, lineNumber, parsedStack.extraReason, compactStack);
            }
        };

        if(options.context != null) {
            context = Object.assign({}, context, options.context);
        }

        let asyncCode = code;

        if(options.async) {
            asyncCode = JsEvalEngine.wrapInAsync(code, fragment != null ? "CS_ASYNC_" + fragment.uuid.replace("-", "_") : null);
        }

        try {
            codeStratesEvalInContext.call(null, asyncCode, context);
            if(!options.async) {
                context.asyncResolve();
            }
        } catch(e) {
            context.error(e);
            throw e;
        }

        await asyncPromise.catch((e)=>{context.error(e); throw e});

        return context[options.exportsName];
    }

    static wrapInAsync(code, methodName) {
        if(methodName == null) {
            methodName = "anonymousAsyncEval";
        }

        //Make code async
        return `(async function ${methodName}() { ${code} \n })().then(()=>{asyncResolve();}).catch((e)=>{asyncReject(e);});`;
    }

    static parseErrorStack(name, stack, error) {
        let parsedStackTrace = [];
        let extraReason = null;

        if(stack == null) {
            console.warn("parseErrorStack: empty stack!");
            return new StackWalker.StackTrace(
                error,
                [],
                null
            );
        }

        if(window.chrome) {
            let stackSplit = stack.split("\n");

            if(!stackSplit[0].trim().startsWith("at")) {
                extraReason = stackSplit[0];
            }

            stackSplit.filter((line)=>{
                return line.trim().startsWith("at");
            }).forEach((line)=>{
                let trimmedLine = line.trim();

                let functionName = trimmedLine.substring(3, trimmedLine.indexOf("(")).trim();

                let lineNumberAndPosition = trimmedLine.substring(trimmedLine.indexOf("),")+2).trim().split(":");

                let lineNumber = parseInt(lineNumberAndPosition[1]);

                if(Number.isNaN(lineNumber)) {
                    lineNumber = null;
                }

                parsedStackTrace.push({
                    method: functionName,
                    lineNumber: lineNumber,
                    debug: trimmedLine
                });
            });
        } else if (navigator.userAgent.toLowerCase().indexOf('firefox') > -1) {
            let stackSplit = stack.split("\n");

            stackSplit.forEach((line) => {
                let trimmedLine = line.trim();

                let functionName = trimmedLine.substring(0, trimmedLine.indexOf("@")).trim();

                let lineNumberAndPosition = trimmedLine.substring(trimmedLine.lastIndexOf(">") + 2).trim().split(":");

                let lineNumber = parseInt(lineNumberAndPosition[1]);

                if (Number.isNaN(lineNumber)) {
                    lineNumber = null;
                }

                parsedStackTrace.push({
                    method: functionName,
                    lineNumber: lineNumber,
                    debug: trimmedLine
                });
            });
        } else {
            console.log("Unsupported browser for parsing stack trace: ", stack);
            parsedStackTrace = stack;
        }

        return new StackWalker.StackTrace(
            name,
            parsedStackTrace,
            extraReason
        );
    }

    static defaultOptions(fragment = null) {
        return {
            context: null,
            exportsName: "exports",
            async: true,
            customConsole: {
                log: (...messages)=> {
                    JsEvalEngine.doLog(console.log, fragment, null, ...messages);
                    if(typeof EventSystem !== "undefined") {
                        EventSystem.triggerEvent("Codestrates.Fragment.Log", {
                            messages: messages,
                            fragment: fragment
                        });
                    }
                },
                warn: (...messages)=>{
                    JsEvalEngine.doLog(console.warn, fragment, null, ...messages);
                    if(typeof EventSystem !== "undefined") {
                        EventSystem.triggerEvent("Codestrates.Fragment.Warn", {
                            messages: messages,
                            fragment: fragment
                        });
                    }
                },
                error: (...messages)=>{
                    JsEvalEngine.doLog(console.error, fragment, null, ...messages);
                    if(typeof EventSystem !== "undefined") {
                        EventSystem.triggerEvent("Codestrates.Fragment.Error", {
                            messages: messages,
                            fragment: fragment
                        });
                    }
                }
            }
        };
    }

    static doLog(logger, fragment, lineNumber, ...messages) {
        if(fragment != null) {
            let name = fragment.element.getAttribute("name");
            let id = fragment.element.getAttribute("id");

            logger("Fragment ["+(name!=null&&name.trim()!==""?name:fragment.type)+(id!=null&&id.trim()!==""?"#"+id:"")+(lineNumber!=null?":"+lineNumber:"")+"]", ...messages);
        } else {
            logger(...messages);
        }
    }
};

window.addEventListener("unhandledrejection", (evt)=>{
    if(evt.reason != null) {
        let parsedStack = JsEvalEngine.parseErrorStack(evt.reason.name, evt.reason.stack);
        EventSystem.triggerEvent("Codestrates.Fragment.Error", {
            messages: ["Uncaught rejection in promise: ", parsedStack]
        });
    } else {
        console.warn("Did not include a reason property:", evt);
    }
});

window.addEventListener("error", (evt)=>{
    if(evt.error != null) {
        let parsedStack = JsEvalEngine.parseErrorStack(evt.error.message, evt.error.stack);
        EventSystem.triggerEvent("Codestrates.Fragment.Error", {
            messages: ["Uncaught exception: ", parsedStack]
        });
    } else {
        console.warn("Did not include an error property:", evt);
    }
});

//Setup infinite stack depth
Error.stackTraceLimit = Infinity;
