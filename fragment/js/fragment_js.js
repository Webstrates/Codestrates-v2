/**
 *  JavascriptFragment
 *  Fragments with js that can be executed
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

/* global webstrate, cQuery, Fragment, wpm, JsEvalEngine */

wpm.onRemoved(()=>{
    Fragment.unRegisterFragmentType(JavascriptFragment);
});

/**
 * A fragment that contains js code
 *
 * Supports auto - executes require() on load
 * @extends Fragments.Fragment
 * @hideconstructor
 * @memberof Fragments
 */
class JavascriptFragment extends Fragment {
    constructor(html) {
        super(html);
    }

    /**
     * An object describing the options for require.
     *
     * Example:
     * <pre><code>{
     *     context: {
     *         someVariable: "test"
     *     },
     *     customConsole: {
     *         log: (...messages)=>{
     *              console.log("Custom:", ...messages);
     *         }
     *     }
     * }
     * </code></pre>
     *
     * @typedef {Object} JavascriptFragment~RequireOptions
     * @property {Object} [context] - The context to pass to the javascript environment
     * @property {Object} [customConsole] - A custom object used instead of window.console, ie. to make custom log methods.
     */

    /**
     * Evaluates the javascript inside this fragment and returns the export object
     *
     * @example
     * let exportedObject = Fragment.one("#myJsFragment").require();
     *
     * @param {JavascriptFragment~RequireOptions} [options] - Object containing any custom options.
     * @returns {Promise<Object>}
     */
    require(options = {}) {
        return JsEvalEngine.execute(this.raw, options, this);;
    }

    async onFragmentsLoaded() {
        if(this.auto && !Fragment.disableAutorun) {
            await this.require();
        }
    }

    supportsRun() {
        return true;
    }
    
    supportsAuto() {
        return true;
    }

    static type() {
        return "text/javascript";
    }
}; window.JavascriptFragment = JavascriptFragment;

Fragment.registerFragmentType(JavascriptFragment);
