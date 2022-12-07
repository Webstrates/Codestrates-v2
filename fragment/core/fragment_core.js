/**
 *  Fragment
 *  The base class for all code fragments in Codestrates
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

/* global cQuery, webstrate, HTMLElement, NodeList, UUIDGenerator, Observer, WPMv2, Text, DIFF_INSERT, DIFF_DELETE, wpm */

const dmp = new diff_match_patch();

/**
 * @namespace Fragments
 */

/**
 * Codestrate Fragment representing a <code-fragment></code-fragment> tag in codestrates.
 * @abstract
 * @hideconstructor
 * @memberof Fragments
 */
class Fragment {
    /**
     * Create a new fragment using the given cQuery object as its base.
     * @param {cQuery} html - The cQuery object to use as base.
     */
    constructor(html) {
        let self = this;

        this.html = html;

        this.html.data("Fragment", this);

        this.textInsertedCallbacks = [];
        this.textDeletedCallbacks = [];
        this.fragmentChangedCallbacks = [];
        this.fragmentUnloadedCallbacks = [];
        this.fragmentClassChangedCallbacks = [];
        this.fragmentAutoChangedCallbacks = [];

        this.uuid = UUIDGenerator.generateUUID("fragment-");

        //Setup autodom and make it able to wait until it is complete.
        this.autoDomDirty = true;
        this.setupAutoDomHandling();

        this.html[0].setAttribute("transient-fragment-uuid", this.uuid);

        this.setupObservers();
        this.startObserver();
    }

    /**
     * Get the node that holds the text content of this fragment
     * @protected
     * @ignore
     * @returns {Text}
     */
    getTextContentNode() {
        let textContentNode = this.html[0];

        this.checkTextContentNode(textContentNode);

        return textContentNode;
    }

    /**
     * Checks the given node for its feasibility of being the textContentNode
     * @protected
     * @ignore
     * @param {Text} textContentNode - The text node to check
     */
    checkTextContentNode(textContentNode) {
        if(textContentNode.childNodes.length > 1) {
            console.warn("More than 1 childnode...", textContentNode.childNodes);
        }
    }

    /**
     * Triggers all callback handlers for the given type insert/delete
     * @private
     * @param {number} pos - The position the event happened
     * @param {string} val - The value of the event
     * @param {insert|delete} type - The type of the event
     */
    insertDeleteCallback(pos, val, type) {
        switch (type) {
            case "insert":
            {
                this.textInsertedCallbacks.forEach((callback) => {
                    callback(pos, val);
                });
                
                break;
            }
            case "delete":
            {
                this.textDeletedCallbacks.forEach((callback) => {
                    callback(pos, val);
                });
                
                break;
            }
        }
    }

    /**
     * Handle the given mutations
     * @private
     * @param {Mutation[]} mutations - The mutations to handle
     */
    mutationCallback(mutations) {
        let self = this;
        
        let characterDataTargets = [];

        let sendUpdateCallback = false;

        mutations.forEach((mutation) => {
            if(mutation.type === "attributes") {
                sendUpdateCallback = true;
            }

            if (mutation.type === "attributes" && mutation.attributeName === "auto" && mutation.target === self.html[0]) {
                //If auto attribute changed, trigger onAutoChanged
                self.onAutoChanged(self.auto);
                sendUpdateCallback = false;
            } else if (mutation.type === "attributes" && mutation.attributeName === "class" && mutation.target === self.html[0]) {
                //If auto attribute changed, trigger onAutoChanged
                self.onClassChanged(this.html[0].classList);
                sendUpdateCallback = false;
            } else if(mutation.type === "characterData") {
                if(mutation.target.characterDataAlreadyHandled) {
                    return;
                }

                sendUpdateCallback = true;

                characterDataTargets.push(mutation.target);
                let newValue = mutation.target.nodeValue;
                let oldValue = mutation.oldValue;
                mutation.target.characterDataAlreadyHandled = true;
                
                //If characterData mutation, generate insert/delete ops
                let patches = dmp.patch_make(oldValue, newValue);
                Array.from(patches).forEach((patch)=>{
                    let offset = patch.start1;
                    patch.diffs.forEach((diff) => {
                        let type = diff[0];
                        let value = diff[1];
                        
                        switch(type) {
                            case DIFF_INSERT:
                                self.insertDeleteCallback(offset, value, "insert");
                                offset += value.length;
                                break;
                            case DIFF_DELETE:
                                self.insertDeleteCallback(offset, value, "delete");
                                break;
                            case DIFF_EQUAL:
                                offset += value.length;
                                break;
                        }
                    });
                });
            } else if(mutation.type === "childList") {
                sendUpdateCallback = true;
            }
        });
        
        characterDataTargets.forEach((target)=>{
            target.characterDataAlreadyHandled = false;
        });

        //Only send
        if(this.html[0].parentNode != null && sendUpdateCallback) {
            //Dont do changed callbacks if we are not in the dom?
            this.triggerFragmentChanged(this);
        }
    }

    /**
     * @private
     * @param context
     */
    triggerFragmentChanged(context) {
        this.fragmentChangedCallbacks.slice().forEach((callback) => {
            try {
                callback(context);
            } catch(e) {
                console.group("Error: "+e);
                console.log("Callback:", callback);
                console.log("Context:", context);
                console.groupCollapsed("Trace");
                console.trace();
                console.groupEnd();
                console.groupEnd();
            }
        });
    }

    /**
     * Sets up the mutation observer for this fragment
     * @ignore
     * @protected
     */
    setupObservers() {
        let self = this;

        this.mutationHandler = (mutations) => {
            self.mutationCallback(mutations);
        };

        this.observer = new MutationObserver(this.mutationHandler);
    }

    /**
     * Starts this fragments mutation observer
     * @ignore
     * @protected
     */
    startObserver() {
        if(this.observer == null) {
            return;
        }
        
        this.observer.observe(this.html[0], {
            attributes: true,
            childList: true,
            subtree: true,
            characterData: true,
            characterDataOldValue: true
        });
    }

    /**
     * Stops this fragments mutation observer, handling any mutations that is queued before stopping.
     * @ignore
     * @protected
     */
    stopObserver() {
        if(this.observer == null) {
            return;
        }
        
        let mutations = this.observer.takeRecords();

        if (mutations.length > 0) {
            this.mutationCallback(mutations);
        }

        this.observer.disconnect();
    }

    /**
     * Run the given method without triggering the mutation observer on this fragment, then trigger fragment changed callbacks with the given context
     * @ignore
     * @protected
     * @param {Function} method - Method to call. Important: cannot be async or return a promise, the observer will be restarted as soon as this method returns.
     * @param {Object} context - Context to pass along to the callbacks
     */
    executeObserverless(method, context, skipChangeCheck=false) {
        this.stopObserver();

        let before = null;

        if(!skipChangeCheck) {
            before = this.raw;
        }

        //Run our method, potentially adding mutations
        method();
        
        this.startObserver();

        if(skipChangeCheck || before !== this.raw) {
            this.triggerFragmentChanged(context);
        }
    }

    /**
     * The raw representation of this fragment, can be used to set/get the raw value.
     *
     * @example
     * //Get the raw value of a fragment
     * let fragmentValue = myFragment.raw;
     *
     * @example
     * //Set the raw value of a fragment
     * myFragment.raw = myNewFragmentValue;
     *
     * @type {string}
     */
    get raw() {
        if(this.getTextContentNode().firstChild instanceof Text) {
            return this.getTextContentNode().firstChild.nodeValue;
        } else {
            return this.getTextContentNode().textContent;
        }
    }

    set raw(content) {
        if(this.getTextContentNode().firstChild instanceof Text) {
            this.getTextContentNode().firstChild.nodeValue = content;
        } else {
            this.getTextContentNode().textContent = content;
        }
    }

    /**
     * The auto attribute of this fragment, toggles automatic behaviour on/off
     * @type {boolean}
     */
    get auto() {
        return this.html[0].hasAttribute("auto");
    }

    set auto(auto) {
        if (auto) {
            this.html[0].setAttribute("auto", "");
        } else {
            this.html[0].removeAttribute("auto");
        }
    }

    /**
     * @callback Fragments.Fragment~fragmentChangedCallback
     * @param {Fragment|Object} context - The context that called the callback
     */

    /**
     * Register a callback to be run when this fragments content changes.
     *
     * @example
     * Fragment.one("#myFragment").registerOnFragmentChangedHandler((context)=>{
     *     //Fragment has changed
     * });
     *
     * @param {Fragments.Fragment~fragmentChangedCallback} callback - The callback that is run when fragment content changes
     */
    registerOnFragmentChangedHandler(callback) {
        let self = this;

        this.fragmentChangedCallbacks.push(callback);

        return {
            delete: ()=>{
                self.unRegisterOnFragmentChangedHandler(callback);
            }
        }
    }

    /**
     * Unregister a callback handler
     * @param {Fragments.Fragment~fragmentChangedCallback} callback - The callback to unregister
     */
    unRegisterOnFragmentChangedHandler(callback) {
        this.fragmentChangedCallbacks.splice(this.fragmentChangedCallbacks.indexOf(callback), 1);
    }

    /**
     * @callback Fragments.Fragment~fragmentUnloadedCallback
     * @param {Fragments.Fragment} fragment - The fragment that called the callback
     */

    /**
     * Register a callback to run when this fragment is unloaded
     *
     * @example
     * Fragment.one("#myFragment").registerOnFragmentUnloadedHandler(()=>{
     *     //Fragment is unloaded
     * });
     *
     * @param {Fragments.Fragment~fragmentUnloadedCallback} callback - The callback to run when the fragment is unloaded
     */
    registerOnFragmentUnloadedHandler(callback) {
        let self = this;

        this.fragmentUnloadedCallbacks.push(callback);

        return {
            delete: ()=>{
                self.unRegisterOnFragmentUnloadedHandler(callback);
            }
        }
    }

    /**
     * Unregister a callback handler
     * @param {Fragments.Fragment~fragmentUnloadedCallback} callback - The callback to unregister
     */
    unRegisterOnFragmentUnloadedHandler(callback) {
        this.fragmentUnloadedCallbacks.splice(this.fragmentUnloadedCallbacks.indexOf(callback), 1);
    }

    /**
     * @callback Fragments.Fragment~autoChangedCallback
     * @param {Fragments.Fragment} fragment - The fragment
     * @param {boolean} auto - The new value of auto
     */

    /**
     * Register a callback to run when auto attribute changes on fragment
     *
     * @example
     * Fragment.one("#myFragment").registerOnAutoChangedHandler((fragment, auto)=>{
     *     //Fragment auto attribute changed
     * });
     *
     * @param {Fragments.Fragment~autoChangedCallback} callback - The callback to run when auto changes
     */
    registerOnAutoChangedHandler(callback) {
        let self = this;

        this.fragmentAutoChangedCallbacks.push(callback);

        return {
            delete: ()=>{
                self.unRegisterOnAutoChangedHandler(callback);
            }
        }
    }

    /**
     * Unregister a callback handler
     * @param {Fragments.Fragment~autoChangedCallback} callback - The callback to unregister
     */
    unRegisterOnAutoChangedHandler(callback) {
        this.fragmentAutoChangedCallbacks.splice(this.fragmentAutoChangedCallbacks.indexOf(callback), 1);
    }

    /**
     * @callback Fragments.Fragment~textInsertedCallback
     * @param {number} position - The position where the text was inserted
     * @param {string} value - The value of inserted text
     */

    /**
     * Register a callback to run when text is inserted into this fragment
     *
     * @example
     * Fragment.one("#myFragment").registerOnTextInsertedHandler((position, value)=>{
     *     //Text "value" has been inserted into this fragment at "position"
     * });
     *
     * @param {Fragments.Fragment~textInsertedCallback} callback - The callback to run when text is inserted
     */
    registerOnTextInsertedHandler(callback) {
        let self = this;

        this.textInsertedCallbacks.push(callback);

        return {
            delete: ()=>{
                self.textInsertedCallbacks.splice(self.textInsertedCallbacks.indexOf(callback), 1);
            }
        }
    }

    /**
     * @callback Fragments.Fragment~textDeletedCallback
     * @param {number} position - The position where the text was deleted
     * @param {string} value - The value of deleted text
     */

    /**
     * Register a callback to run when text is deleted from this fragment
     *
     * @example
     * Fragment.one("#myFragment").registerOnTextDeletedHandler((position, value)=>{
     *     //Text "value" has been deleted from this fragment at "position"
     * });
     *
     * @param {Fragments.Fragment~textDeletedCallback} callback - The callback to run when text is deleted
     */
    registerOnTextDeletedHandler(callback) {
        let self = this;

        this.textDeletedCallbacks.push(callback);

        return {
            delete: ()=>{
                self.textDeletedCallbacks.splice(self.textDeletedCallbacks.indexOf(callback), 1);
            }
        }
    }

    /**
     * @callback Fragments.Fragment~fragmentClassChangedCallback
     * @param {string[]} classes - The classes that changed
     */

    /**
     * Register a callback to run when the classes of this fragment changes
     *
     * @example
     * Fragment.one("#myFragment").registerOnClassChangedHandler((classes)=>{
     *     //Some classes changed on this fragment
     * });
     *
     * @param {Fragments.Fragment~fragmentClassChangedCallback} callback - The callback to run when classes change on the fragment
     */
    registerOnClassChangedHandler(callback) {
        let self = this;

        this.fragmentClassChangedCallbacks.push(callback);

        return {
            delete: ()=>{
                self.fragmentClassChangedCallbacks.splice(self.fragmentClassChangedCallbacks.indexOf(callback), 1);
            }
        }
    }

    /**
     * Handles when classes change on the fragment
     * @private
     * @param classes
     */
    onClassChanged(classes) {
        this.fragmentClassChangedCallbacks.slice().forEach((cb)=>{
            cb(classes);
        });
    }

    /**
     * The type of this fragment
     * @type {string}
     * @readonly
     */
    get type() {
        return this.html[0].getAttribute("data-type");
    }

    /**
     * Require this fragment and return the result. What require does depends on what type of fragment it is.
     * @example
     * let result = await Fragment.one("#myFragment").require()
     *
     * @abstract
     * @param {json} [options] - The options to pass to require
     * @returns {*} result of the require action
     */
    async require(options = {}) {
        //Ovewritten in subclass
    }

    /**
     * Tell this fragment to unload itself
     * @example
     * Fragment.one("#myFragment").unload();
     */
    unload() {
        let self = this;
        
        this.fragmentUnloadedCallbacks.slice().forEach((callback)=>{
            callback(self);
        });

        if(this.supportsAutoDom()) {
            this.clearAutoDom();
        }

        this.stopObserver();
        this.html.data("Fragment", null);
        this.html = null;
    }

    /**
     * Called when all fragments are loaded
     * @private
     */
    async onFragmentsLoaded() {
        if (this.auto && !Fragment.disableAutorun) {
            await this.insertAutoDom();
        }
    }

    /**
     * @private
     * @returns {boolean} - True/False depending on if this fragments supports automatic behaviour
     */
    supportsAuto() {
        return this.supportsAutoDom();
    }

    /**
     * @private
     * @returns {boolean} True/False depending on if this fragment supports automatic dom insertion
     */
    supportsAutoDom() {
        //Override in subclass
        return false;
    }


    /**
     * Setup handling of automatic dom insertion
     * @private
     * @returns {Promise<void>}
     */
    setupAutoDomHandling() {
        if(!this.supportsAutoDom()) {
            return;
        }

        let self = this;

        this.registerOnFragmentChangedHandler((context) => {
            if (self.auto && !Fragment.disableAutorun) {
                self.autoDomDirty = true;
                self.insertAutoDom();
            }
        });
    }

    /**
     * Called when auto attribute is changed on this fragment
     * @private
     * @param {boolean} auto - The new state of auto
     */
    onAutoChanged(auto) {
        this.fragmentAutoChangedCallbacks.forEach((cb)=>{
            cb(this, auto);
        });

        if(!this.supportsAutoDom()) {
            return;
        }

        if (auto && !Fragment.disableAutorun) {
            this.insertAutoDom();
        } else {
            this.clearAutoDom();
        }
    }

    /**
     * Create an instance of the automatic dom
     * @private
     * @returns {Promise<*>}
     */
    async createAutoDom() {
        if(!this.supportsAutoDom()) {
            return;
        }

        try {
            return await this.require();
        } catch(e) {
            return null;
        }
    }

    /**
     * Ask this fragment to insert its automatic dom (regardless of Fragment.disableAutorun)
     * @ignore
     * @returns {Promise<void>} - Promise that resolves when the automatic dom is inserted into the document
     */
    insertAutoDom() {
        if(!this.supportsAutoDom()) {
            return;
        }

        if(!this.autoDomDirty) {
            console.log("Not inserting autoDom, as it is already present and not flagged dirty");
            return;
        }

        let self = this;

        this.autoDomDirty = false;

        return new Promise(async (resolve, reject)=>{

            try {
                let autoDomContent = await this.createAutoDom();

                let oldTransient = cQuery("transient.autoDom#" + this.uuid);

                if(oldTransient.length > 0) {
                    oldTransient[0].setAttribute("class", "autoDom");

                    //Fix missing classes
                    this.html[0].classList.forEach((c)=>{
                        oldTransient[0].addClass(c);
                    });

                    try {
                        diff.innerHTML(oldTransient[0], autoDomContent, { parser: { strict: true } });
                    } catch (ex){
                        console.error("Failed to perform autoDOM diffing", ex);
                        diff.release(oldTransient[0]); // Reset state trackers since the patch was not applied
                    }

                    function cssPath(element, path= []) {
                        if(element.parentNode == null) {
                            // Document fragment is the top node
                            return path.reverse().join(" > ");
                        }

                        const parent = element.parentNode;
                        const childIndex = Array.from(parent.children).indexOf(element) + 1;
                        path.push(element.nodeName.toLowerCase()+":nth-child("+childIndex+")");
                        return cssPath(parent, path);
                    }

                    // Update innerHTML for each template, as this is not part of the dom, and would not be updated otherwise
                    cQuery(autoDomContent).find("template").forEach((template)=>{
                        let path = cssPath(template);
                        oldTransient[0].querySelector(path).innerHTML = autoDomContent.querySelector(path).innerHTML;
                    });
                } else {
                    let transient = cQuery("<transient></transient>");
                    transient[0].setAttribute("id", this.uuid);
                    transient.addClass("autoDom");

                    this.html[0].classList.forEach((c)=>{
                        transient.addClass(c);
                    });

                    if (autoDomContent != null && autoDomContent !== "") {
                        transient.append(autoDomContent);
                    }
                    this.html[0].parentNode.insertBefore(transient[0], this.html[0].nextSibling);
                }

                resolve();
            } catch(e) {
                console.warn("Unable to insertAutoDom: ", e);
                this.autoDomDirty = true;
                reject();
            }
        });
    }

    /**
     * Clear this fragments automatic dom from the document
     * @ignore
     */
    clearAutoDom() {
        if(!this.supportsAutoDom()) {
            return;
        }
        cQuery("transient.autoDom#" + this.uuid).remove();
        this.autoDomDirty = true;
    }

    /**
     * Returns whether this fragment supports the run flag
     * @private
     * @returns {boolean}
     */
    supportsRun() {
        return false;
    }

    /**
     * Returns a dompath for finding this fragment
     */
    getDomPath() {
        let child = this.html[0];
        let parent = this.html[0].parentNode;

        let domPath = [];

        while(parent.parentNode != null) {
            let children = Array.from(parent.childNodes);

            let childIndex = children.indexOf(child);

            domPath.push({
                parent: parent.tagName,
                childIndex: childIndex
            });

            child = parent;
            parent = parent.parentNode;
        }

        domPath.reverse()

        return domPath;
    }

    static findFromDomPath(domPath) {
        let currentParent = document.querySelector(domPath[0].parent);

        for(let dp of domPath) {
            if(currentParent.tagName !== dp.parent) {
                throw new Error("DomPath invalid, should have seen "+dp.parent+" saw "+currentParent.tagName);
            }
            currentParent = Array.from(currentParent.childNodes)[dp.childIndex];
        }

        return currentParent;
    }

    /**
     * Create a fragment of the given type.
     * 
     * If no Fragment is registered for the given type, null is returned.
     *
     * @example
     * let myJSFragment = Fragment.create("text/javascript");
     *
     * @param {string} type the type of fragment to create
     * @returns {Fragments.Fragment} the created fragment, or null
     */
    static create(type) {
        if (!Fragment.fragmentTypes.has(type)) {
            console.error("Creating fragment of unregistered type:", type);
            return null;
        }

        let fragmentDom = cQuery("<code-fragment data-type='" + type + "'></code-fragment>");

        Fragment.setupFragment(fragmentDom);

        return fragmentDom.data("Fragment");
    }

    /**
     * Registers a new fragment type
     * @ignore
     * @param {string} fragmentClass the fragment type to register
     */
    static registerFragmentType(fragmentClass) {
        if (Fragment.fragmentTypes.has(fragmentClass.type())) {
            console.error("Already have registered fragment type:", fragmentClass.type());
            return;
        }
        Fragment.fragmentTypes.set(fragmentClass.type(), fragmentClass);

        return Fragment.loadUnknownFragments(fragmentClass.type());
    }

    /**
     * Unregisters a fragment type, this also triggers unload on all fragments of this type that is currently loaded
     * @ignore
     * @param {string} fragmentClass the fragment type to unregister
     */
    static unRegisterFragmentType(fragmentClass) {
        Fragment.fragmentTypes.delete(fragmentClass.type());

        //Go through all fragments of this type, and do stuff
        cQuery("code-fragment[data-type='" + fragmentClass.type() + "']").forEach((fragmentElement) => {
            let fragment = cQuery(fragmentElement).data("Fragment");

            if (fragment != null) {
                //Unload the fragment
                fragment.unload();
            }

            //Reinsert this fragment as unknown
            Fragment.saveUnknownFragment(fragmentElement, fragmentClass.type());
        });
    }

    /**
     * Sets up the given fragment
     * @private
     * @param {cQuery} fragment - the fragment to set up
     */
    static setupFragment(fragment) {
        if (fragment.data("Fragment") != null) {
            //Already setup as fragment
            return null;
        }

        let fragmentType = fragment[0].getAttribute("data-type");

        if (!Fragment.fragmentTypes.has(fragmentType)) {
            //Unknown fragment type

            if (fragmentType != null) {
                Fragment.saveUnknownFragment(fragment, fragmentType);
            }

            return null;
        }

        let fragmentClass = Fragment.fragmentTypes.get(fragmentType);
        return new fragmentClass(fragment);
    }

    /**
     * Tries to setup all current and future fragments on the DOM
     * @ignore
     */
    static async setupFragments() {
        let foundFragments = [];

        //Check fragments already in DOM
        cQuery("code-fragment").forEach((fragmentDom) => {
            fragmentDom = cQuery(fragmentDom);
            let fragment = Fragment.setupFragment(fragmentDom);

            if (fragment !== null) {
                foundFragments.push(fragment);
            }
        });

        await Fragment.runFragmentsLoaded();

        //Observe newly added fragments, and deleted fragments
        let observer = new MutationObserver(async (mutations) => {

            let foundFragments = [];

            mutations.forEach((mutation) => {
                Array.from(mutation.addedNodes).forEach((node) => {
                    node = cQuery(node);
                    if (node.is("code-fragment")) {
                        let fragment = Fragment.setupFragment(node);
                        if(fragment != null) {
                            foundFragments.push(fragment);
                        }
                    } else {
                        if (node[0].querySelector != null) {
                            node.find("code-fragment").forEach((child) => {
                                child = cQuery(child);
                                let fragment = Fragment.setupFragment(child);
                                if(fragment != null) {
                                    foundFragments.push(fragment);
                                }
                            });
                        }
                    }
                });
                Array.from(mutation.removedNodes).forEach((node) => {
                    if(node.matches != null && node.matches("code-fragment")) {
                        cQuery(node).data("Fragment").unload();
                    } else if(node.querySelector != null) {
                        node.querySelectorAll("code-fragment").forEach((child)=>{
                            cQuery(child).data("Fragment").unload();
                        });
                    }
                });
            });

            await Fragment.runFragmentsLoaded();
        });

        observer.observe(document, {
            attributes: false,
            subtree: true,
            childList: true
        });
    }

    /**
     * Loads all currently unloaded fragments
     * @ignore
     * @returns {Promise<void>} - Promise that resolves when all unloaded fragments are done loading
     */
    static async runFragmentsLoaded() {
        if(!Fragment.allInstalledRun) {
            return;
        }

        //Check if currently loading
        while (Fragment.currentlyLoadingFragments) {
            await new Promise((resolve) => {
                setTimeout(() => {
                    resolve();
                }, 0);
            });
        }

        Fragment.currentlyLoadingFragments = true;

        let unloadedFragments = Fragment.find("code-fragment").filter((fragment)=>{
            let isLoaded = fragment.isLoaded;
            fragment.isLoaded = true;
            return !isLoaded;
        });

        for(let fragment of unloadedFragments) {
            fragment.isLoaded = true;
            await fragment.onFragmentsLoaded();
        }

        Fragment.currentlyLoadingFragments = false;
    }

    /**
     * Saves the given fragment for later loading when its no longer unknown
     * @private
     * @param {cQuery} fragment - the fragment to save
     * @param {string} type - the type of the fragment
     */
    static saveUnknownFragment(fragment, type) {

        //Unpack cQuery/jQuery objects, we want unique check of Set to work.
        if (fragment[0] != null) {
            fragment = fragment[0];
        }

        let fragmentsOfType = Fragment.unknownFragments.get(type);

        if (fragmentsOfType == null) {
            fragmentsOfType = new Set();
            Fragment.unknownFragments.set(type, fragmentsOfType);
        }

        fragmentsOfType.add(fragment);
    }

    /**
     * Loads all unknown fragments of a given type
     * @private
     * @param {type} type the fragment type to load
     */
    static loadUnknownFragments(type) {
        let unknownFragments = Fragment.unknownFragments.get(type);

        if (unknownFragments != null) {

            let unknownFragmentsCopy = Array.from(unknownFragments);

            //Clear the Set, fragments will be readded if not handled
            unknownFragments.clear();

            unknownFragmentsCopy.forEach((fragment) => {
                let frag = Fragment.setupFragment(cQuery(fragment));
            });

            return Fragment.runFragmentsLoaded();
        }

        return Promise.resolve();
    }

    /**
     * Returns the first fragment that is found from the given query
     *
     * This is the equivalent of taking the first result of Fragment.find(query)
     *
     * @example
     * let myFragment = Fragment.one("#myFragment");
     *
     * @param {string|cQuery|Array|Node} query - The query used to find fragments. Can be a css selector, a cQuery object, a dom element or an array of dom elements.
     * @returns {Fragments.Fragment} - the found fragment, or null if none could be found
     */
    static one(query) {
        let fragments = Fragment.find(query);

        if (fragments.length > 0) {
            return fragments[0];
        }

        return null;
    }

    /**
     * Finds all fragments based on a given query
     *
     * @example
     * let fragments = Fragment.find(".someClass");
     *
     * @param {string|cQuery|Array|Node} query - The query used to find fragments. Can be a css selector, a cQuery object, a dom element or an array of dom elements.
     * @returns {Fragments.Fragment[]} The found fragments
     */
    static find(query) {
        let fragments = [];

        if (query != null) {
            if (typeof query === "string") {
                cQuery(query).forEach((result) => {
                    result = cQuery(result);

                    let fragment = result.data("Fragment");

                    if (fragment != null) {
                        fragments.push(fragment);
                    }
                });

            } else if (Array.isArray(query) || query instanceof Array) {
                query.forEach((item) => {
                    fragments = fragments.concat(Fragment.find(item));
                });

            } else if (typeof query === "object") {
                if (query instanceof Fragment) {
                    fragments.push(query);
                } else if (query instanceof HTMLElement) {
                    let fragment = cQuery(query).data("Fragment");
                    if (fragment != null) {
                        fragments.push(fragment);
                    }
                } else if (query instanceof NodeList) {
                    fragments = fragments.concat(Fragment.find(Array.from(query)));
                }
            }
        }

        return fragments;
    }

    static fromFragmentUUID(uuid) {
        for(let fragmentDom of cQuery("code-fragment")) {
            let fragment = cQuery(fragmentDom).data("Fragment");

            if(fragment != null && fragment.uuid === uuid.replace("_", "-")) {
                return fragment;
            }
        }

        return null;
    }



}; window.Fragment = Fragment;

Fragment.allInstalledRun = false;
Fragment.fragmentTypes = new Map();
Fragment.unknownFragments = new Map();
Fragment.disableAutorun = false;
Fragment.currentlyLoadingFragments = false;

Fragment.setupFragments();

wpm.onAllInstalled(()=>{
    Fragment.allInstalledRun = true;
    Fragment.runFragmentsLoaded();
});
