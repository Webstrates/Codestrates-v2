/**
 *  SCSSFragment
 *  Compose and compile SCSS-scripts in Codestrates
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

/* global webstrate, cQuery, Fragment, fetchSassWorkerBlob, URL, wpm */

wpm.onRemoved(() => {
    Fragment.unRegisterFragmentType(SCSSFragment);
});

/**
 * A fragment containing scss
 *
 * Supports autodom insertion
 * @extends Fragments.Fragment
 * @hideconstructor
 * @memberof Fragments
 */
class SCSSFragment extends Fragment {
    constructor(html) {
        super(html);
    }

    /**
     * Create a style element containing the css rules resulting from compiling this fragments scss
     * @example
     * let styleElm = Fragment.one("#myScssFragment").require();
     * @returns {Promise<HTMLStyleElement>}
     */
    require(options) {
        let self = this;
        
        return new Promise(async (resolve, reject) => {
            // Check cached data
            if (typeof AutoDOMCache !== "undefined"){
                let cache = await AutoDOMCache.get(self);
                if (cache!==null){
                    let style = document.createElement("style");
                    style.textContent = cache;
                    resolve(style);
                    return;
                }
            }

            let start = Date.now();

            //Check for compiler
            await new Promise((resolveCompiler)=>{
                if(SCSSFragment.compiler == null) {
                    requirejs(["sass/sass"], (Sass)=> {
                        fetchSassWorkerBlob().then((blob) => {
                            SCSSFragment.compiler = new Sass(URL.createObjectURL(blob));
                            resolveCompiler();
                        });
                    });
                } else {
                    resolveCompiler();
                }
            });

            SCSSFragment.compiler.compile(self.raw, async (result) => {
                if (result.status === 0) {
                    let style = document.createElement("style");
                    style.textContent = result.text;

                    // Store in cache for later too
                    if (typeof AutoDOMCache !== "undefined"){
                         await AutoDOMCache.set(self, result.text);
                    }

                    resolve(style);
                } else {
                    reject(result.message);
                }
            });
        });
    }

    supportsAutoDom() {
        return true;
    }

    static type() {
        return "text/x-scss";
    }
}; window.SCSSFragment = SCSSFragment;

Fragment.registerFragmentType(SCSSFragment);
