/**
 *  WhenJSFragment
 *  Integration for the legacy when.js programming system into Codestrates
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

/* global webstrate, cQuery, Fragment, wpm, JsEvalEngine, WhenEngine */

wpm.onRemoved(()=>{
    Fragment.unRegisterFragmentType(WhenJSFragment);
});

/**
 * A fragment that contains When.js code
 *
 * Supports auto - executes require() on load
 * @extends Fragments.Fragment
 * @hideconstructor
 * @memberof Fragments
 * @private
 */
class WhenJSFragment extends Fragment {
    constructor(html) {
        super(html);

        this.whenInstance = globalWhenEngine.createInstance(this.uuid);
    }

    require(options = {}) {
        //Clear all instance state
        try {
            this.whenInstance.reset();
        } catch(e) {
            console.warn(e);
        }

        //Add fragment self reference to local context
        this.whenInstance.addToLocalContext("fragmentSelfReference", this);

        //Rerun all when.js code
        const code = this.raw;

        const whenContext = {
            define: (newAlias, aliases, parameterMapping=null)=>{
                return this.whenInstance.define(newAlias, aliases, parameterMapping);
            },
            undefine: (alias)=>{
                return this.whenInstance.undefine(alias);
            },
            redefine: (newAlias, aliases, parameterMapping=null)=>{
                return this.whenInstance.redefine(newAlias, aliases, parameterMapping);
            },
            when: (eventName)=>{
                return this.whenInstance.when(eventName);
            },
            registerFilter: (filterName, filter)=>{
                this.whenInstance.registerFilter(filterName, filter);
            },
            unregisterFilter: (filterName)=>{
                this.whenInstance.unregisterFilter(filterName);
            },
            registerGenerator: (generator)=>{
                this.whenInstance.registerGenerator(generator);
            },
            unregisterGenerator: (generator)=>{
                this.whenInstance.unregisterGenerator(generator);
            },
            load: (json)=>{
                this.whenInstance.load(json);
            },
            instance: this.whenInstance,
            engine: globalWhenEngine
        };

        if(options.context != null) {
            options.context = Object.assign(whenContext, options.context);
        } else {
            options.context = whenContext;
        }

        return JsEvalEngine.execute(code, options, this).catch((e)=>{
            console.error("Error during when.js execution:", e);
        });
    }

    async onFragmentsLoaded() {
        if(this.auto && !Fragment.disableAutorun) {
            await this.require();
        }
    }

    unload() {
        //Clear all instance state
        try {
            this.whenInstance.reset();
        } catch(e) {
            console.warn(e);
        }

        super.unload();
    }

    supportsRun() {
        return true;
    }

    supportsAuto() {
        return true;
    }

    static type() {
        return "text/whenjs";
    }
}; window.WhenJSFragment = WhenJSFragment;

Fragment.registerFragmentType(WhenJSFragment).then(()=>{
    EventSystem.triggerEvent("WhenJSFragments.loaded");
});
