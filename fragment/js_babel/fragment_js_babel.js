/**
 *  JavascriptBabelFragment
 *  Write typescript code and execute it in Codestrates
 * 
 *  Copyright 2024 Janus B. Kristensen, CAVI,
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

/* global webstrate, Fragment, wpm */

wpm.onRemoved(() => {
    Fragment.unRegisterFragmentType(JavascriptBabelFragment);
});

/**
 * A fragment containing Javascript code enchanced by Babel
 *
 * Supports auto - executes require() on load
 * @extends Fragments.Fragment
 * @hideconstructor
 * @memberof Fragments
 */
class JavascriptBabelFragment extends Fragment {
    constructor(html) {
        super(html);
    }

    /**
     * Evaluates the JavaScript code inside this fragment and returns the export object
     * @example
     * let exportedObject = Fragment.one("#myJSFragment").require();
     * @returns {Promise<Object>}
     */
    async require() {
        let self = this;
        
        // Support for css-like imports from other fragments
        function customLookups({types,template}){
            return {
                visitor: {
                    ImportDeclaration(path,state){
                        if (path?.node?.source?.value?.startsWith("#")){
                            value = `data:text/javascript,${encodeURIComponent(Fragment.one(path.node.source.value).require())}`
                            // TODO rewrite to let {ost,have,MyApp} = (await Fragment.one("#pjat").require());
                            //path.node.source.value="ost";                            
                        }
                    }
                }
            }
        }

        let processedCode = Babel.transform(self.raw,{presets:["react"], ast:true, code:true, plugins:[customLookups]});
        console.log(processedCode.ast);
        let output = await import(`data:text/javascript,${encodeURIComponent(processedCode.code)}`);
        return output;
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
        return "text/javascript+babel";
    }
}; window.JavascriptBabelFragment = JavascriptBabelFragment;

Fragment.registerFragmentType(JavascriptBabelFragment);
