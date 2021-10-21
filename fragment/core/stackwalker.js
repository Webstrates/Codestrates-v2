/**
 *  StackWalker
 *  An exception parser that that tries to clean out useless info from
 *  browser stack traces and provide only Codestrates-relevant parts
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

/**
 * StackWalker can compactify stack traces to remove codestrates internal traces, thus making them easier to read
 */
class StackWalker {
    /**
     * Given a full stack trace, produces a reduced stacktrace where only codestrate
     * stack markers are used instead of every method invocation.
     * 
     * @param {string[]} stack
     * @returns {string[]} The cleaned stack trace array
     */
    static compactify(stack){
        //Attempt to clean up some codestrates internal method code
        let cleanedStack = [];

        //If find pattern of Function.execute, codeStratesEvalInContext, eval, remove all 3
        stackLoop: for(let i = 0; i<stack.length; i++) {
            let si = stack[i];

            cleanPatternLoop: for(let cleanPattern of StackWalker.stackCleanPatterns) {
                try {
                    for(let j = 0; j<cleanPattern.pattern.length; j++) {
                        let pattern = cleanPattern.pattern[j];
                        let method = stack[i+j].method;

                        if(pattern.startsWith("~")) {
                            pattern = pattern.substring(1);
                            if(method.indexOf(pattern) === -1) {
                                //This pattern did not match
                                continue cleanPatternLoop;
                            }
                        } else {
                            if(method !== pattern) {
                                //This pattern did not match
                                continue cleanPatternLoop;
                            }
                        }
                    }

                    i += cleanPattern.pattern.length-1;

                    if(cleanPattern.output != null) {
                        let method = cleanPattern.output.method;

                        if(typeof method === "function") {
                            method = method(si);
                        }

                        cleanedStack.push({
                            method: method,
                            lineNumber: cleanPattern.output.lineNumber?si.lineNumber:null
                        });
                    }

                    continue stackLoop;
                } catch(e) {

                }
            }

            cleanedStack.push(si);
        }

        return cleanedStack;
    }
}

window.StackWalker = StackWalker;

StackWalker.stackCleanPatterns = [];

StackWalker.stackCleanPatterns.push({
    pattern: [
        "eval",
        "codeStratesEvalInContext",
        "Function.execute"
    ],
    output: null
});

StackWalker.stackCleanPatterns.push({
    pattern: [
        "codeStratesEvalInContext",
        "Function.execute",
        "~.require"
    ],
    output: null
});

StackWalker.stackCleanPatterns.push({
    pattern: [
        "_setup",
        "_start",
        "new _",
        "internalP5Function"
    ],
    output: null
});

StackWalker.stackCleanPatterns.push({
    pattern: [
        "_.n.default.redraw",
        "_draw"
    ],
    output: null
});

StackWalker.stackCleanPatterns.push({
    pattern: [
        "~.require",
        "~.onFragmentsLoaded",
        "Function.runFragmentsLoaded"
    ],
    output: {
        method: "<Codestrate Autostart>",
        lineNumber: false
    }
});

StackWalker.stackCleanPatterns.push({
    pattern: [
        "~.require",
        "eval",
        "eval",
        "Set.forEach",
        "Function.triggerEvent",
        "MenuItem.onAction",
        "MenuItem.triggerOnAction",
        "Menu.handleItemAction",
        "HTMLDivElement.eval",
        "h.a.emit",
        "Object.notifySelected",
        "_.handleItemAction",
        "HTMLDivElement.handleItemAction_",
        "d.a.emit",
        "Object.notifyAction",
        "d.handleClick",
        "d.handleClickEvent_"
    ],
    output: {
        method: "<Codestrate Run>",
        lineNumber: false
    }
});

StackWalker.stackCleanPatterns.push({
    pattern: [
        "TypeScriptAutoRunInternal",
        "eval",
        "Object.execCb",
        "e.check",
        "eval",
        "eval",
        "eval",
        "each",
        "emit",
        "e.check",
        "enable",
        "e.init",
        "a",
        "Object.completeLoad",
        "HTMLScriptElement.onScriptLoad"
    ],
    output: {
        method: "<Codestrate Autorun>",
        lineNumber: false
    }
});

StackWalker.stackCleanPatterns.push({
    pattern: [
        "eval",
        "Object.execCb",
        "e.check",
        "eval",
        "eval",
        "eval",
        "each",
        "emit",
        "e.check",
        "enable",
        "e.init",
        "a",
        "Object.completeLoad",
        "HTMLScriptElement.onScriptLoad"
    ],
    output: {
        method: "<Codestrate Run>",
        lineNumber: false
    }
});

StackWalker.stackCleanPatterns.push({
    pattern: [
        "eval",
        "Object.execCb",
        "e.check",
        "enable",
        "e.init",
        "eval"
    ],
    output: {
        method: "<Codestrate Run>",
        lineNumber: false
    }
});

StackWalker.stackCleanPatterns.push({
    pattern: [
        "P5Fragment.require",
        "P5Fragment.createAutoDom",
        "P5Fragment.insertAutoDom",
        "eval",
        "eval",
        "Array.forEach",
        "P5Fragment.triggerFragmentChanged",
        "P5Fragment.mutationCallback",
        "MutationObserver.mutationHandler"
    ],
    output: {
        method: "<Codestrate Autorun>",
        lineNumber: false
    }
});

StackWalker.stackCleanPatterns.push({
    pattern: [
        "P5Fragment.require",
        "P5Fragment.createAutoDom",
        "P5Fragment.insertAutoDom",
        "P5Fragment.onFragmentsLoaded",
        "Function.runFragmentsLoaded"
    ],
    output: {
        method: "<Codestrate Autorun>",
        lineNumber: false
    }
});

StackWalker.stackCleanPatterns.push({
    pattern: [
        "P5Fragment.require",
        "P5Fragment.createAutoDom",
        "P5Fragment.insertAutoDom",
        "eval",
        "eval",
        "Array.forEach",
        "P5Fragment.triggerFragmentChanged",
        "P5Fragment.executeObserverless",
        "CodemirrorEditor.handleModelChanged",
        "eval",
        "signal",
        "endOperation_finish",
        "endOperations",
        "at",
        "finishOperation",
        "endOperation",
        "runInOp",
        "~",
        "HTMLTextAreaElement.<anonymous>"
    ],
    output: {
        method: "<Codestrate Autorun>",
        lineNumber: false
    }
});

StackWalker.stackCleanPatterns.push({
    pattern: [
        "P5Fragment.require",
        "P5Fragment.createAutoDom",
        "P5Fragment.insertAutoDom",
        "eval",
        "eval",
        "Array.forEach",
        "P5Fragment.triggerFragmentChanged",
        "P5Fragment.executeObserverless",
        "CodemirrorEditor.handleModelChanged",
        "eval",
        "signal",
        "endOperation_finish",
        "endOperations",
        "at",
        "finishOperation",
        "endOperation",
        "HTMLTextAreaElement.<anonymous>"
    ],
    output: {
        method: "<Codestrate Autorun>",
        lineNumber: false
    }
});

StackWalker.stackCleanPatterns.push({
    pattern: [
        "~CS_ASYNC_fragment_"
    ],
    output: {
        method: (si) =>{
            //Internal fragment
            let fragmentUUID = si.method.substring(si.method.indexOf("CS_ASYNC_fragment_")+9).replace("_", "-");
            let fragment = Fragment.fromFragmentUUID(fragmentUUID);

            let attrName = fragment.html[0].getAttribute("name");
            let attrId = fragment.html[0].getAttribute("id");

            let name = (attrName != null && attrName.trim() !== "" ? attrName : "code-fragment");

            if(attrId != null && attrId.trim() !== "") {
                name += "#"+attrId;
            }

            return fragment.constructor.name+" "+name;
        },
        lineNumber: true
    }
})

/**
 * A StackTrace object
 * @memberof StackWalker
 */
class StackTrace {
    constructor(name, stack, extraReason) {
        /** @member {string} */
        this.name = name;
        /** @member {string[]} */
        this.stack = stack;
        /** @member {string} */
        this.extraReason = extraReason;
    }
};

window.StackWalker.StackTrace = StackTrace;