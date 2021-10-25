/**
 *  DescriptorFragment
 *  Support for WPM package descriptors in Codestrates
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

/* global webstrate, cQuery, Fragment, wpm, WPMv2 */

wpm.onRemoved(() => {
    Fragment.unRegisterFragmentType(DescriptorFragment);
});

/**
 * A fragment containing a WPM descriptor
 *
 * @extends Fragments.Fragment
 * @hideconstructor
 * @memberof Fragments
 */
class DescriptorFragment extends Fragment {
    constructor(html) {
        super(html);
    }

    getTextContentNode() {
        let self = this;
        
        let descriptor = this.html.find("wpm-descriptor");

        if (descriptor.length === 0) {
            this.executeObserverless(() => {
                descriptor = cQuery(document.createElement("wpm-descriptor"));
                self.html.append(descriptor);
                WPMv2.stripProtection(descriptor);
                descriptor[0].textContent = `{
    "description": "",
    "dependencies": [
    ],
    "assets": [],
    "version": "1"
}`;
            },null, true);
        }

        this.checkTextContentNode(descriptor[0]);

        return descriptor[0];
    }

    /**
     *  A json object containing the descriptor json
     * @example
     * let descriptorJson = Fragment.one("#myDescriptorFragment").require();
     * @returns {Promise<Object>}
     */
    async require(options = {}) {
        return JSON.parse(this.raw);
    }

    static type() {
        return "wpm/descriptor";
    }
}; 

window.DescriptorFragment = DescriptorFragment;
Fragment.registerFragmentType(DescriptorFragment);
