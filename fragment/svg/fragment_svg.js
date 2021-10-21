/**
 *  SVGFragment
 *  SVG support in Codestrates
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
    Fragment.unRegisterFragmentType(SVGFragment);
});

/**
 * A fragment containing SVG
 *
 * Supports autodom insertion
 * @extends Fragments.Fragment
 * @hideconstructor
 * @memberof Fragments
 */
class SVGFragment extends Fragment {
    constructor(html) {
        super(html);
    }

    /**
     * Creates an svg element containing the svg inside the fragment.
     * @example
     * let svgElm = Fragment.one("#mySvgFragment").require();
     * @returns {Promise<SVGElement>}
     */
    async require(options = {}) {
        return cQuery(this.raw);
    }

    supportsAutoDom() {
        return true;
    }

    static type() {
        return "image/svg+xml";
    }
};  window.SVGFragment = SVGFragment;

Fragment.registerFragmentType(SVGFragment);
