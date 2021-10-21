/**
 *  CSSFragment
 *  Fragments with css that can be injected into the page
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
wpm.onRemoved(()=>{
    Fragment.unRegisterFragmentType(CSSFragment);
});

/**
 * A fragment that contains css code
 *
 * Supports autodom insertion
 * @hideconstructor
 * @memberof Fragments
 * @extends Fragments.Fragment
 */
class CSSFragment extends Fragment {
    constructor(html) {
        super(html);
    }

    /**
     * Creates a new style element with the styles represented by this css fragment inserted.
     *
     * @example
     * let styleElm = Fragment.one("#myCssFragment").require();
     *
     * @returns {Promise<HTMLStyleElement>} - Promise that resolves to the style element
     */
    async require(options = {}) {
        let style = document.createElement("style");

        style.textContent = this.raw;

        return style;
    }

    supportsAutoDom() {
        return true;
    }

    static type() {
        return "text/css";
    }
}; window.CSSFragment = CSSFragment;

Fragment.registerFragmentType(CSSFragment);
