/**
 *  PreviewEditor
 *  An "editor" that provides a preview of the autoDOM from a fragment
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

/* global webstrate, cQuery, Editor, EditorManager */

wpm.onRemoved(()=>{
    EditorManager.unregisterEditor(PreviewEditor, "preview-editor");
});

/**
 * An editor that renders a preview of the edited fragment
 *
 * @memberof Editors
 * @extends Editors.Editor
 */
class PreviewEditor extends Editor {
    constructor(fragment, options = {}) {
        super("preview-editor", fragment, options);

        this.options = options;

        this.setupEditor();
    }

    setupEditor() {
        let self = this;

        this.fragment.registerOnFragmentChangedHandler(()=>{
            self.updatePreview();
        });

        this.updatePreview();
    }

    async updatePreview() {
        try {
            let fragmentContent = await this.fragment.createAutoDom();

            this.editorDiv.empty();
            if (fragmentContent != null && fragmentContent !== "") {
                this.editorDiv.append(fragmentContent);
            }
        } catch(e) {
            console.warn("Unable to update preview: ", e);
        }
    }
    
    onSizeChanged() {
        //Empty
    }

    getValue() {
        //Empty
    }

    setValue(value) {
        //Empty
    }

    insertText(pos, val) {
        //Empty
    }
    
    deleteText(pos, val) {
        //Empty
    }

    static types() {
        return [
            "text/html",
            "image/svg+xml",
            "text/markdown",
            "text/x-latex"
        ];
    }
}; window.PreviewEditor = PreviewEditor;

EditorManager.registerEditor(PreviewEditor);
