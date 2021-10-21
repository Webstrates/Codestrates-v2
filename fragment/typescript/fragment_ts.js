/**
 *  TypescriptFragment
 *  Write typescript code and execute it in Codestrates
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

/* global webstrate, cQuery, Fragment, wpm */

wpm.onRemoved(() => {
    Fragment.unRegisterFragmentType(TypescriptFragment);
});

/**
 * A fragment containing TypeScript code
 *
 * Supports auto - executes require() on load
 * @extends Fragments.Fragment
 * @hideconstructor
 * @memberof Fragments
 */
class TypescriptFragment extends Fragment {
    constructor(html) {
        super(html);
    }

    /**
     * Evaluates the TypeScript code inside this fragment and returns the export object
     * @example
     * let exportedObject = Fragment.one("#myTypescriptFragment").require();
     * @param {JavascriptFragment~RequireOptions} [options] - Object containing any custom options.
     * @returns {Promise<Object>}
     */
    async require(options = {}) {
        let self = this;

        try {
            let exports = await new Promise((resolve, reject) => {
                requirejs(["typescript/typescript"], () => {
                    let typeScriptCode = JsEvalEngine.wrapInAsync(this.raw, "TypeScriptInternalAsync");

                    let result = ts.transpileModule(typeScriptCode, {
                        compilerOptions: {module: ts.ModuleKind.ES6, target: "ES2017"}
                    });

                    //Clean one layer of async function
                    let codeLines = result.outputText.trim().split("\n");
                    codeLines.splice(0, 1);
                    codeLines.pop();
                    let runCode = codeLines.join("\n");

                    if(options.autoRun) {
                        (function TypeScriptAutoRunInternal() {
                            try {
                                JsEvalEngine.execute(runCode, options, self).then((exports) => {
                                    resolve(exports);
                                }).catch((e) => {
                                    console.error(e);
                                    reject();
                                });
                            } catch (e) {
                                console.error("Error in typescript:", e);
                                reject();
                            }
                        })();
                    } else {
                        try {
                            JsEvalEngine.execute(runCode, options, self).then((exports) => {
                                resolve(exports);
                            }).catch((e) => {
                                console.error(e);
                                reject();
                            });
                        } catch (e) {
                            console.error("Error in typescript:", e);
                            reject();
                        }
                    }

                });
            });

            return exports;
        } catch(e) {
        }
    }

    onFragmentsLoaded() {
        if(this.auto && !Fragment.disableAutorun) {
            this.require({
                autoRun: true
            });
        }
    }

    supportsAuto() {
        return true;
    }
    
    supportsRun() {
        return true;
    }

    static type() {
        return "text/x-typescript";
    }
}; window.TypescriptFragment = TypescriptFragment;

Fragment.registerFragmentType(TypescriptFragment);
