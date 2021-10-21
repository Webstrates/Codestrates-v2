/**
 *  JSONFragment
 *  Fragments with json data that can be included
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
    Fragment.unRegisterFragmentType(JSONFragment);
});

/**
 * A fragment that contains json
 *
 * @extends Fragments.Fragment
 * @memberof Fragments
 * @hideconstructor
 */
class JSONFragment extends Fragment {
    constructor(html) {
        super(html);
    }

    /**
     * Get the contained json as an object
     * @example
     * let jsonElement = Fragment.one("#myJsonFragment").require();
     * @returns {Promise<Object>} - Promise that resolves to the json object with the json from this fragment.
     */
    async require(options = {}) {
        return JSON.parse(this.raw);
    }

    static type() {
        return "application/json";
    }
}; window.JSONFragment = JSONFragment;

Fragment.registerFragmentType(JSONFragment);
