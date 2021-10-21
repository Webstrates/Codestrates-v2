/**
 *  PythonFragment
 *  Execute python-code with Codestrates
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

/* global webstrate, cQuery, Fragment, pyodide, languagePluginLoader, Promise, wpm */

wpm.onRemoved(()=>{
    Fragment.unRegisterFragmentType(PythonFragment);
});

/**
 * A fragment containing python code

 * Supports auto - executes require() on load
 * @extends Fragments.Fragment
 * @hideconstructor
 * @memberof Fragments
 */
class PythonFragment extends Fragment {
    constructor(html) {
        super(html);
    }

    /**
     * Evaluates the python code inside this fragment and returns the exported object
     * @example
     * let exportedObject = Fragment.one("#myPythonFragment").require();
     * @returns {Promise<Object>}
     */
    async require(options) {
        let self = this;
        try {
            if (typeof $B === "undefined" ) {
                console.log("Fetching Brython package...");
                await wpm.require("brython");

                //Magic?
                $B.meta_path=$B.$meta_path.slice();
                if(!$B.use_VFS){$B.meta_path.shift()}
            }

            let code = self.raw;

            let paddedCode = "";

            code.split("\n").forEach((line) => {
                paddedCode += "\t" + line + "\n";
            });

            let module_name = UUIDGenerator.generateUUID("", 25);

            let scopedCode = `def codestrates_python_scope():
    from browser import window, load, aio
    
    def asyncComplete(*args):
        asyncPythonComplete()
    
    async def asyncWrapper():
    ${paddedCode}
    aio.run(asyncWrapper(), onsuccess=asyncComplete)
    
codestrates_python_scope()`;

            //Generate code
            let jsCode = $B.py2js(scopedCode, module_name, module_name).to_js();

            let localsName = "$locals_"+module_name;

            //Convert code to actually working code? Something about libs break if not done like this

            let js = jsCode.split("\n");

            js.splice(0, 3, `(__BRYTHON__, ${localsName}) => { 
  __BRYTHON__.$setattr(__BRYTHON__,"curdir","./")
  __BRYTHON__.$setattr(__BRYTHON__,"debug",1)
  var None;
  var $B = __BRYTHON__;
        ` + __BRYTHON__.InjectBuiltins());

            js.push("}");

            var script = js.join("\n");

            let context = {
                exports: {},
                console: JsEvalEngine.defaultOptions(this).customConsole,
            };

            return new Promise((resolve, reject)=>{
                context.asyncPythonComplete = ()=>{
                    resolve(context.exports);
                }

                eval(script)(__BRYTHON__, context);
            }).catch((e)=>{
                console.error(e);
            });


        } catch(e) {
            console.error(e);
        }
    }

    static parseErrorStack(name, stack, fragment) {
        let scopeSeen = false;

        let lines = stack.split("\n").filter((line)=>{
            if(line.indexOf("codestrate_python_scope") !== -1) {
                scopeSeen = true;
            }

            //Ommit all js stack lines
            return scopeSeen && line.trim() !== "" && !line.trim().startsWith("at ");
        });

        let extraReason = lines.pop();

        let parsedStack = [];

        lines.forEach((line)=>{
            let lineNumber = parseInt(line.match(/line (\d+),/)[1]);
            let method = line.match(/, in (.*)/)[1];

            if(method === "codestrate_python_scope") {
                //Internal fragment
                let attrName = fragment.html[0].getAttribute("name");
                let attrId = fragment.html[0].getAttribute("id");

                let name = (attrName != null && attrName.trim() !== "" ? attrName : "code-fragment");

                if(attrId != null && attrId.trim() !== "") {
                    name += "#"+attrId;
                }

                method = fragment.constructor.name+" "+name;
            }

            parsedStack.push({
                lineNumber: lineNumber-1,
                method: method
            })
        });

        parsedStack.reverse();

        return new StackWalker.StackTrace(name, parsedStack, extraReason);
    }

    onFragmentsLoaded() {
        if(this.auto && !Fragment.disableAutorun) {
            this.require();
        }
    }

    supportsAuto() {
        return true;
    }
    
    supportsRun() {
        return true;
    }

    static type() {
        return "text/python";
    }
}; window.PythonFragment = PythonFragment;

Fragment.registerFragmentType(PythonFragment);
