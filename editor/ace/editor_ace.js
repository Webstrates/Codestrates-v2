/**
 *  JsEvalEngine
 *  Evaluate js while keeping track of it
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

/* global webstrate, cQuery, Editor, monaco, EditorManager, ace */

wpm.onRemoved(()=>{
    EditorManager.unregisterEditor(AceEditor, "ace-editor");
});

/**
 * An editor implementation using Ace
 *
 * @memberof Editors
 * @extends Editors.Editor
 */
class AceEditor extends Editor {
    constructor(fragment, options = {}) {
        super("ace-editor", fragment, options);
        
        this.setupEditor();
    }
    
    setupEditor() {
        let self = this;
        
        let mode = "text";

        switch(self.fragment.type) {
            case "text/javascript":
                mode = "javascript";
                break;

            case "text/css":
                mode = "css";
                break;

            case "image/svg+xml":
                mode = "svg";
                break;

            case "text/html":
                mode = "html";
                break;
                
            case "text/x-scss":
                mode = "scss";
                break;
                
            case "wpm/descriptor":
            case "application/json":
                mode = "json";
                break;
        }

        requirejs(["ace/ace"], (ace)=>{
            ace.config.set("packaged", true);
            ace.config.set("basePath", require.toUrl("ace"));
            
            self.editor = ace.edit(self.editorDiv[0]);
            self.editor.setValue(self.fragment.raw, 1);
            self.editor.session.setMode("ace/mode/"+mode);

            if(self.options.theme === "dark") {
                self.editor.setTheme("ace/theme/merbivore");
            }

            if(self.options.mode === "full") {
                self.editor.setAutoScrollEditorIntoView(true);
                self.editor.setOption("maxLines", 999999);
            }

            if(self.options.mode === "component") {
                self.editorDiv[0].style.height = "100%";
                self.editorDiv[0].style.width = "100%";
            }

            self.editor.session.on("change", ()=>{
                self.handleModelChanged();
            });
        });
    }

    onSizeChanged() {
        if (this.editor != null) {
            this.editor.resize();
        }
    }

    getValue() {
        if(this.editor == null) {
            return null;
        }
        
        return this.editor.getValue();
    }
    
    setValue(value) {
        if(this.editor == null) {
            return;
        }
        
        this.editor.setValue(value, this.editor.getCursorPosition());
    }
    
    insertText(pos, val) {
        if(this.editor == null) {
            return;
        }
        
        let startPosition = this.editor.session.getDocument().indexToPosition(pos);
        
        this.editor.session.getDocument().insert(startPosition, val);
    }
    
    deleteText(pos, val) {
        if(this.editor == null) {
            return;
        }
        
        let startPosition = this.editor.session.getDocument().indexToPosition(pos);
        let endPosition = this.editor.session.getDocument().indexToPosition(pos + val.length);
        
        let range = new ace.Range(startPosition.row, startPosition.column, endPosition.row, endPosition.column);
        
        this.editor.session.getDocument().remove(range);
    }
    
    static types() {
        return [
            "text/javascript",
            "text/html",
            "text/css",
            "text/x-scss",
            "wpm/descriptor",
            "application/json",
            "image/svg+xml"
        ];
    }
}; window.AceEditor = AceEditor;

EditorManager.registerEditor(AceEditor);
