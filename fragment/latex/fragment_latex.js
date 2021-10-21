/**
 *  LaTeXFragment
 *  Compose LaTeX documents in Codestrates
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

/* global webstrate, cQuery, Fragment, fetchSassWorkerBlob, URL, LatexJSLibraryPath, wpm */

wpm.onRemoved(()=>{
    Fragment.unRegisterFragmentType(LaTeXFragment);
});

/**
 * A fragment containing latex
 *
 * Supports autodom insertion
 * @extends Fragments.Fragment
 * @hideconstructor
 * @memberof Fragments
 */
class LaTeXFragment extends Fragment {
    constructor(html) {
        super(html);
    }

    /**
     * Render the LaTeX of this fragment to html
     * @example
     * let latexDiv = Fragment.one("#myLaTeXFragment").require();
     * @returns {Promise<HTMLDivElement>} - Promise that resolves to a div containing the LaTeX rendered as html. Warning the div also contains the needed styles to render the LaTeX correctly, the styles are not namespaced.
     */
    require(options) {
        let self = this;

        return new Promise((resolve, reject) => {
            import(LatexJSLibraryPath+"/latex.esm.js").then((latexjs)=>{
                try {
                    let generator = new latexjs.default.HtmlGenerator({ hyphenate: false });

                    let latexDoc = latexjs.default.parse(self.raw, { generator: generator });

                    let root = document.createElement("div");
                    root.appendChild(latexDoc.stylesAndScripts(LatexJSLibraryPath));
                    root.appendChild(latexDoc.domFragment());
                    resolve(root);
                } catch(e) {
                    reject(e);
                }
            });
        });
    }

    supportsAutoDom() {
        return true;
    }

    async createAutoDom() {
        let content = await this.require();

        let iframe = document.createElement("iframe");

        iframe.srcdoc = content.innerHTML;
        iframe.classList.add("latex");

        //Setup iframe height to be equal to its content.
        iframe.onload = ()=>{
            iframe.height = "";
            iframe.height = iframe.contentWindow.document.body.scrollHeight;
        };

        //Fix for board not being visible on load
        let observer = new MutationObserver((mutation)=>{
            if(iframe.offsetWidth > 0) {
                iframe.height = "";
                iframe.height = iframe.contentWindow.document.body.scrollHeight;
                observer.disconnect();
            }
        });
        observer.observe(document.body, {
            attributes: true,
            childList: true,
            subtree: true
        });

        return iframe;
    }

    static type() {
        return "text/x-latex";
    }
}; window.LaTeXFragment = LaTeXFragment;

Fragment.registerFragmentType(LaTeXFragment);
