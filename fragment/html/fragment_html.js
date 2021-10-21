/**
 *  HtmlFragment
 *  Fragments with html that can be injected into the page in the same place
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
    Fragment.unRegisterFragmentType(HtmlFragment);
});

/**
 * A fragment containing html
 *
 * Supports autodom insertion
 * @extends Fragments.Fragment
 * @hideconstructor
 * @memberof Fragments
 */
class HtmlFragment extends Fragment {
    constructor(html) {
        super(html);
    }
    
    supportsAutoDom() {
        return true;
    }

    /**
     * Get a document fragment containing the html from this fragment
     *
     * @example
     * let documentFragment = Fragment.one("#myHtmlFragment").require();
     *
     * @returns {Promise<DocumentFragment>}
     */
    async require(options) {
        let domFragment = document.createDocumentFragment();

        let dom = cQuery("<div>"+this.raw+"</div>");

        Array.from(dom[0].childNodes).forEach((node)=>{
            domFragment.appendChild(node);
        });
        
        return domFragment;
    }
    
    getTextContentNode() {
        if(this.html[0].childNodes.length > 1 || (this.html[0].firstChild != null && !(this.html[0].firstChild instanceof Text))) {
            //We have at least one child, first of those is not a Text node, convert
            let textNode = document.createTextNode("");
            let content = this.html[0].innerHTML;
            this.html[0].innerHTML = "";
            this.html[0].appendChild(textNode);
            textNode.nodeValue = content;
            console.log("Converted HTML to single textNode");
        }
        
        return super.getTextContentNode();
    }
    
    static type() {
        return "text/html";
    }
}; window.HtmlFragment = HtmlFragment;

Fragment.registerFragmentType(HtmlFragment);
