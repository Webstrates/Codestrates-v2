/**
 *  Editor and EditorManager
 *  Base classes for handling editors in Codestrates
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

/* global cQuery, webstrate */

/**
 * Triggers when a selection changes inside an editor
 * @event Editors.Editor.EventSystem:"Codestrates.Editor.Selection"
 * @type {Event}
 * @property {Editors.Editor} editor - The editor that triggered the event
 * @property {Editors.Editor~cursorSelection} selection - The selection
 */

/**
 * Triggers when an editor looses focus
 * @event Editors.Editor.EventSystem:"Codestrates.Editor.Blur"
 * @type {Event}
 * @property {Editors.Editor} editor - The editor that triggered the event
 */

/**
 * Triggers when an editor gains focus
 * @event Editors.Editor.EventSystem:"Codestrates.Editor.Focus"
 * @type {Event}
 * @property {Editors.Editor} editor - The editor that triggered the event
 */
/**
 * Triggers when an editor is closed
 * @event Editors.Editor.EventSystem:"Codestrates.Editor.Closed"
 * @type {Event}
 * @property {Editors.Editor} editor - The editor that triggered the event
 */
/**
 * Triggers when an editor is opened
 * @event Editors.Editor.EventSystem:"Codestrates.Editor.Opened"
 * @type {Event}
 * @property {Editors.Editor} editor - The editor that triggered the event
 */

/**
 * @namespace Editors
 */

/**
 * EditorManager
 *
 * @memberof Editors
 */
class EditorManager {
    /**
     * @private
     */
    static registerEditor(editor) {
        editor.types().forEach((type)=>{
            let editors = EditorManager.editorTypes.get(type);
            if(editors == null) {
                editors = new Set();
                EditorManager.editorTypes.set(type, editors);
            }

            editors.add(editor);
        });
    }

    /**
     * @private
     */
    static unregisterEditor(editor, editorClassName) {
        editor.types().forEach((type)=>{
            let editors = EditorManager.editorTypes.get(type);
            if(editors == null) {
                editors = new Set();
                EditorManager.editorTypes.set(type, editors);
            }

            editors.delete(editor);
        });
        
        cQuery("."+editorClassName).forEach((editor)=>{
            editor = cQuery(editor).data("Editor");
            if(editor != null) {
                editor.unload();
            }
        });
    }

    /**
     * @typedef {Object} EditorManager~EditorConfig
     * @property {Editors.Editor} [editor] - The editor to use.
     * @property {string} [theme] -  The theme to use, supports "light" or "dark".
     * @property {string} [mode] - The editor mode, supports "inline" or "full".
     * @property {boolean} [readOnly] - Should the editor be read only.
     */

    /**
     * Create an editor for the given fragment/array of fragments.
     *
     * <pre><code>config options:
     *  editor: null | EditorClass -- If not null, tries to create the specified editor
     *  theme: "light" | "dark" -- The theme to use for the editor
     *  mode: "inline" | "full" -- Inline fills the space its in, full resizes the editor to show all lines.
     *  readOnly: true|false -- Should the editor be read only</code></pre>
     *
     * @example
     * let editor = EditorManager.create(Fragment.one("#myFragment"), {theme:"light", mode: "full"})[0];
     *
     * @param {Fragments.Fragment|Fragments.Fragment[]} fragment - The fragment, or array of fragments to create the editors from
     * @param {EditorManager~EditorConfig} config - The editor config to use
     * @returns {Editors.Editor[]} the created editors
     */
    static createEditor(fragment, config = {}) {
        let result = [];
        
        let defaultConfig = {
            editor: null,
            theme: "light",
            mode: "inline",
            readOnly: false
        };
        
        config = Object.assign({}, defaultConfig, config);
        
        if(Array.isArray(fragment)) {
            for(let frag of fragment) {
                result = result.concat(EditorManager.createEditor(frag, config));
            }
        } else {
            if(config.editor != null) {
                if(config.editor.types().includes(fragment.type)) {
                    result.push(new config.editor(fragment, config));
                } else {
                    let newConfig = Object.assign({}, config);
                    newConfig.editor = null;
                    result = result.concat(EditorManager.createEditor(fragment, newConfig));
                    if(result.length === 0) {
                        console.warn(config.editor.name+" does not support fragment type:", fragment.constructor.type());
                        console.warn("Auto editor discovery did not find any usable editors.");
                    } else {
                        console.log(config.editor.name+" does not support fragment type:", fragment.constructor.type());
                        console.log("Auto editor discovery: ", result);
                    }
                }
            } else {
                let editors = EditorManager.editorTypes.get(fragment.type);

                if(editors == null) {
                    editors = new Set();
                    EditorManager.editorTypes.set(fragment.type, editors);
                }

                //Filter preview editor from auto discovery, as it can not edit.
                const availableEditors = Array.from(editors).filter((editor)=>{
                    return editor !== PreviewEditor;
                });

                if(availableEditors.size > 0) {

                    //TODO: Maybee not just use the first editor available?
                    result.push( new (availableEditors[0])(fragment, config));
                }
            }
        }
        
        return result;
    }

    /**
     * Used to load CSS for implementing editors
     * @private
     */
    static loadCss(url) {
        return new Promise((resolve, reject)=>{
            let link = document.createElement("link");
            link.type = "text/css";
            link.rel = "stylesheet";
            link.href = url;

            link.setAttribute("transient-element", "");

            document.head.append(link);

            link.onload = ()=>{
                resolve();
            };
        });
    }
}; window.EditorManager =  EditorManager;

EditorManager.editorTypes = new Map();

/**
 * Editor represents a fragment editor
 * @abstract
 * @memberof Editors
 * @hideconstructor
 */
class Editor {
    constructor(htmlClass, fragment, options = {}) {
        this.html = cQuery("<div class='codestrates-editor-core'></div>");
        this.html.data("Editor", this);
        
        this.fragment = fragment;
        this.handleModelChanges = true;

        this.options = options;

        this.editorDiv = cQuery("<div class='codestrates-editor-core-view "+htmlClass+"'></div>");

        this.html.append(this.editorDiv);

        this.foreignSelections = new Map();

        this.eventDeleters = [];

        if(options.mode === "inline") {
            this.verticalResizeHandle = cQuery("<div class=\"codestrates-editor-core-resizer\"></div>");
            this.html.append(this.verticalResizeHandle);
            this.setupResizer();
            this.html.addClass("resizeable");
        } else if(options.mode === "component") {
            this.html.addClass("component");
        } else if(options.mode === "full") {
            //Do nothing atm.
        }

        let self = this;

        this.eventDeleters.push(this.fragment.registerOnFragmentChangedHandler((context)=>{
            if(context === self) {
                return;
            }
            
            self.handleFragmentChanged();
        }));

        this.eventDeleters.push(this.fragment.registerOnTextInsertedHandler((pos, val)=>{
            self.handleTextInserted(pos, val);
        }));

        this.eventDeleters.push(this.fragment.registerOnTextDeletedHandler((pos, val)=>{
            self.handleTextDeleted(pos, val);
        }));

        this.resizeHandler = function() {
            self.onSizeChanged();
        };

        this.focusOutHandler = function() {
            self.triggerEditorLostFocus();
        };

        this.focusInHandler = function() {
            self.triggerEditorGainedFocus();
        };

        window.addEventListener("resize", this.resizeHandler);

        this.html[0].addEventListener("focusout", this.focusOutHandler);

        this.html[0].addEventListener("focusin", this.focusInHandler);

        //Setup live query to listen for cursors
        this.otherCursorLiveQuery = this.html.liveQuery("[class*='otherCursor_']", {
            added: (obj)=>{
                obj.classList.add("otherCursor");
            }
        });
        this.otherSelectorLiveQuery = this.html.liveQuery("[class*='otherSelector_']", {
            added: (obj)=>{
                obj.classList.add("otherSelector");
            }
        });

        this.waitForDomInsertion().then(()=>{
            self.waitForDisplay().then(()=>{
                self.onSizeChanged();
            });
        });
    }

    waitForDisplay() {
        let self = this;

        return new Promise((resolve, reject)=>{
            function checkDisplay() {
                try {
                    if (self.html[0].offsetWidth > 0) {
                        resolve();
                    } else {
                        setTimeout(checkDisplay, 100);
                    }
                } catch(e) {

                }
            }

            checkDisplay();
        });
    }

    waitForDomInsertion() {
        let self = this;

        return new Promise((resolve, reject)=>{
            let observer = new MutationObserver((mutations)=>{
                let foundEditor = false;
                mutations.forEach((mutation)=>{
                    Array.from(mutation.addedNodes).forEach((addedNode)=>{
                        if(addedNode === self.html[0]) {
                            foundEditor = true;
                        } else {
                            let parent = self.html[0].parentNode;

                            while(parent != null) {
                                if(parent === addedNode) {
                                    foundEditor = true;
                                    break;
                                }

                                parent = parent.parentNode;
                            }
                        }
                    });
                });

                if(foundEditor) {
                    observer.disconnect();
                    resolve();
                }
            });

            observer.observe(document, {
                childList: true,
                subtree: true
            });
        });
    }

    /**
     * Focuses the editor
     */
    focus() {
        //Override in subclass
    }

    /**
     * Sets the currently active line
     */
    setLine(line, column=1) {
        //Override in subclass
    }


    /**
     * @typedef {object} Editors.Editor~cursorSelection
     * @property {number} startLine
     * @property {number} startColumn
     * @property {number} endLine
     * @property {number} endColumn
     * @property {number} positionLine
     * @property {number} positionColumn
     */

    /**
     * Sets a forign client selection marker in this editor
     * @param {String} remoteClient - Webstrate clientId of the remote client that has a selection in the fragment this editor is editing
     * @param {Editors.Editor~cursorSelection} cursorSelection - The selection
     */
    setForeignSelection(remoteClient, cursorSelection) {
        if(cursorSelection == null) {
            this.foreignSelections.delete(remoteClient);
        } else {
            this.foreignSelections.set(remoteClient, cursorSelection);
        }
        this.updateForeignSelections(remoteClient);
    }

    /**
     * @private
     */
    updateForeignSelections(remoteClient=null) {
        //Overrite in subclass
    }

    /**
     * @private
     */
    triggerCursorSelection(selection) {
        EventSystem.triggerEvent("Codestrates.Editor.Selection", {
            editor: this,
            selection: selection
        });
    }

    /**
     * @private
     */
    triggerEditorLostFocus() {
        EventSystem.triggerEvent("Codestrates.Editor.Blur", {
            editor: this
        });
    }

    /**
     * @private
     */
    triggerEditorGainedFocus() {
        EventSystem.triggerEvent("Codestrates.Editor.Focus", {
            editor: this
        });
    }

    /**
     * @private
     */
    triggerEditorClosed() {
        EventSystem.triggerEvent("Codestrates.Editor.Closed", {
            editor: this
        });
    }

    /**
     * @private
     */
    triggerEditorOpened() {
        EventSystem.triggerEvent("Codestrates.Editor.Opened", {
            editor: this
        });
    }

    /**
     * @private
     */
    onSizeChanged() {
        //Overwrite in subclass
    }

    /**
     * @private
     */
    setupResizer() {
        let self = this;
        
        new CaviTouch(this.verticalResizeHandle, {
            dragMinDistance: 0
        });
        
        this.verticalResizeHandle.on("caviDrag", (evt)=>{
            let height = self.html[0].clientHeight + evt.detail.caviEvent.deltaPosition.y;
            self.html[0].style.height = height+"px";
            self.onSizeChanged();
        });
    }

    /**
     * @private
     */
    handleFragmentChanged() {
        let self = this;

        this.handleModelChanges = false;
        try {
            let editorValue = this.getValue();
            let fragmentValue = this.fragment.raw;

            if(editorValue !== fragmentValue) {
                this.setValue(this.fragment.raw);
            }
        } catch(e) {
            console.error("Error setting fragment value:", e);
        }
        
        setTimeout(()=>{
            self.handleModelChanges = true;
        },0);
    }

    /**
     * @private
     */
    handleTextInserted(pos, val) {
        let self = this;

        this.handleModelChanges = false;
        try {
            this.insertText(pos, val);
        } catch(e) {
            console.error("Error setting fragment value:", e);
        }
        
        setTimeout(()=>{
            self.handleModelChanges = true;
        },0);
    }

    /**
     * @private
     */
    handleTextDeleted(pos, val) {
        let self = this;

        this.handleModelChanges = false;
        try {
            this.deleteText(pos, val);
        } catch(e) {
            console.error("Error setting fragment value:", e);
        }
        
        setTimeout(()=>{
            self.handleModelChanges = true;
        },0);
    }

    /**
     * @private
     */
    handleModelChanged() {
        let self = this;
        
        if(this.handleModelChanges) {
            let changedValue = this.getValue();

            if(changedValue !== self.fragment.raw) {
                this.fragment.executeObserverless(() => {
                    EventSystem.triggerEvent("Codestrates.Editor.BeforeModelChanged", {
                        editor: this
                    });
                    self.fragment.raw = changedValue;
                    EventSystem.triggerEvent("Codestrates.Editor.AfterModelChanged", {
                        editor: this
                    });
                }, this);
            }
        }
    }

    /**
     * Get the current string value of this editor
     * @returns {string}
     */
    getValue() {
        //Override in subclass
        console.warn("getValue not overridden", this);
    }

    /**
     * Sets the current string value of this editor
     * @param {string} value
     */
    setValue(value) {
        //Override in subclass
        console.warn("setValue not overridden", this);
    }

    /**
     * Inserts text into this editor
     * @param {number} pos - The position to insert at
     * @param {string} val - The value to insert
     */
    insertText(pos, val) {
        //Override in subclass
        console.warn("insertText not overridden", this);
    }

    /**
     * Inserts text into this editor
     * @param {number} pos - The position to delete from
     * @param {string} val - The value to delete
     */
    deleteText(pos, val) {
        //Override in subclass
        console.warn("deleteText not overridden", this);
    }

    /**
     * Inserts the given text at the current selection, if no selection just insert at the cursor position, else replace the current selection.
     * @param {string} text - The text to insert
     */
    insertAtSelection(text) {
        //Override in subclass
        console.warn("insertAtSelection not overridden", this, text);
    }

    /**
     * Unloads this editor
     */
    unload() {
        this.triggerEditorClosed();

        this.eventDeleters.forEach((deleter)=>{
            deleter.delete();
        });

        window.removeEventListener("resize", this.resizeHandler);

        this.html[0].removeEventListener("focusout", this.focusOutHandler);

        this.html[0].removeEventListener("focusin", this.focusInHandler);

        this.otherCursorLiveQuery.stop();
        this.otherSelectorLiveQuery.stop();
        this.html.remove();
        this.html.data("Editor", null);
        this.html = null;
    }
}; window.Editor = Editor;
