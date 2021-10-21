/**
 *  RubyFragment
 *  Execute ruby-code with Codestrates
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

/* global webstrate, cQuery, Fragment, Promise, wpm, Opal */
wpm.onRemoved(() => {
    Fragment.unRegisterFragmentType(RubyFragment);
});

/**
 * A fragment containing ruby code
 *
 * Supports auto - executes require() on load
 * @hideconstructor
 * @memberof Fragments
 * @extends Fragments.Fragment
 */
class RubyFragment extends Fragment {
    constructor(html) {
        super(html);
    }

    /**
     * Evaluates the ruby inside this fragment and returns the export object
     * @example
     * let exportedObject = Fragment.one("#myRubyFragment").require();
     * @param {JavascriptFragment~RequireOptions} [options] - Object containing any custom options.
     * @returns {Promise<Object>}
     */
    require(options = {}) {
        let self = this;

        return new Promise(async (resolve, reject) => {
            if (!OpalInitialized) {
                await wpm.requireExternal(OpalLibraryPath+"opal.min.js");
                await wpm.requireExternal(OpalLibraryPath+"opal-parser.min.js");
                await wpm.requireExternal(OpalLibraryPath+"native.min.js");

                Opal.load("opal-parser");
                OpalInitialized = true;
                console.log("Opal loaded!");
            }

            let rubyCode = self.raw;

            //Detect any used requires, and make sure they are available
            for(let require of Array.from(rubyCode.matchAll(/require '(.*)'/g)).map((match)=>{
                return OpalLibraryPath+match[1]+".min.js";
            })) {
                await wpm.requireExternal(require);
            }

            try {
                let exportsCode = `
                    require 'native'
                    exports = Native(\`rubyExports\`)
                    
                    ${rubyCode}`;

                let compiledCode = Opal.compile(exportsCode);

                let context = {
                    rubyExports: {}
                };

                if(options.context != null) {
                    context = Object.assign({}, context, options.context);
                }

                resolve(JsEvalEngine.execute(compiledCode, {
                    context: context,
                    exportsName: "rubyExports"
                }, self));
            } catch(e) {
                let parsedStack = JsEvalEngine.parseErrorStack(e.name, e.stack);
                EventSystem.triggerEvent("Codestrates.Fragment.Error", {
                    messages: ["Error in ruby: ", parsedStack],
                    fragment: self
                });
                reject();
            }
        });
    }

    onFragmentsLoaded() {
        if (this.auto && !Fragment.disableAutorun) {
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
        return "text/ruby";
    }
}; window.RubyFragment = RubyFragment;

Fragment.registerFragmentType(RubyFragment);
