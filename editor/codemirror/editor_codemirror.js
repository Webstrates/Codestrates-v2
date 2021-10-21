/**
 *  CodemirrorEditor
 *  Wrapper for using the CodeMirror editor in Codestrates
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

/* global webstrate, cQuery, Editor, monaco, EditorManager */

wpm.onRemoved(()=>{
    EditorManager.unregisterEditor(CodemirrorEditor, "codemirror-editor");
});

/**
 * An editor implementation using CodeMirror
 *
 * @memberof Editors
 * @extends Editors.Editor
 */
class CodemirrorEditor extends Editor {
    constructor(fragment, options = {}) {
        super("codemirror-editor", fragment, options);
        
        this.setupEditor();
    }
    
    setupEditor() {
        let self = this;
        
        let mode = "text";
        let module = "text";
        let addons = [];
        let styles = [];

        let p5Theme = false;

        switch(self.fragment.type) {
            case "text/p5js":
                mode = "javascript";
                module = "p5-javascript";
                p5Theme = true;
                break;

            case "text/ruby":
                mode = "text/x-ruby";
                module = "ruby";
                break;

            case "text/python":
                mode = "python";
                module = "python";
                break;

            case "text/markdown":
                mode = "markdown";
                module = "markdown";
                break;

            case "text/x-typescript":
                mode = "text/typescript";
                module = "javascript";
                addons.push("cm/addon/hint/show-hint", "cm/addon/hint/javascript-hint");
                styles.push(CodemirrorLibraryPath+"/addon/hint/show-hint.css");
                break;

            case "text/javascript":
                mode = "javascript";
                module = "javascript";
                addons.push("cm/addon/hint/show-hint", "cm/addon/hint/javascript-hint");
                styles.push(CodemirrorLibraryPath+"/addon/hint/show-hint.css");
                break;

            case "text/x-scss":
                mode = "text/x-scss";
                module = "css";
                break;

            case "text/html":
                mode = "htmlmixed";
                module = "htmlmixed";
                addons.push("cm/addon/hint/show-hint", "cm/addon/hint/html-hint");
                styles.push(CodemirrorLibraryPath+"/addon/hint/show-hint.css");
                break;
                
            case "text/css":
                mode = "css";
                module = "css";
                addons.push("cm/addon/hint/show-hint", "cm/addon/hint/css-hint");
                styles.push(CodemirrorLibraryPath+"/addon/hint/show-hint.css");
                break;
                
            case "text/x-latex":
                mode = "stex";
                module = "stex";
                break;                

            case "wpm/descriptor":
            case "application/json":
                module = "javascript";
                mode = {
                    name: "javascript",
                    json: true
                };
                break;
        }

        let requireModules = ["cm/lib/codemirror", "cm/mode/"+module+"/"+module];

        requireModules.push(...addons);

        requirejs(requireModules, (CodeMirror)=>{
            let theme = "default";

            let stylePromises = [];

            styles.forEach((style)=>{
                stylePromises.push(EditorManager.loadCss(style));
            });

            Promise.all(stylePromises).then(()=>{
                EditorManager.loadCss(CodemirrorLibraryPath+"/lib/codemirror.css").then(()=>{
                    switch(self.options.theme) {
                        case "light":
                            if(p5Theme) {
                                theme = "p5-light";
                                EditorManager.loadCss(CodemirrorLibraryPath+"/theme/p5-light.css").then(()=>{
                                    self.onSizeChanged();
                                });
                            } else {
                                theme = "default";
                            }
                            break;
                        case "dark":
                            if(p5Theme) {
                                theme = "p5-dark";
                                EditorManager.loadCss(CodemirrorLibraryPath+"/theme/p5-dark.css").then(()=>{
                                    self.onSizeChanged();
                                });
                            } else {
                                theme = "darcula";
                                EditorManager.loadCss(CodemirrorLibraryPath+"/theme/darcula.css").then(()=>{
                                    self.onSizeChanged();
                                });
                            }
                            break;
                    }

                    self.editor = CodeMirror(self.editorDiv[0], {
                        value: self.fragment.raw,
                        mode: mode,
                        extraKeys: {"Ctrl-Space": "autocomplete"},
                        lineNumbers: true,
                        theme: theme,
                        hintOptions: {
                            container: self.html[0]
                        }
                    });

                    self.editor.on("changes", ()=>{
                        self.handleModelChanged();
                    });

                    self.onSizeChanged();
                });
            });
        });
    }
    
    onSizeChanged() {
        if(this.editor != null) {
            if(self.mode === "component") {
                this.editor.setSize("100%", "100%");
            } else {
                this.editor.setSize(null, null);
            }
            this.editor.refresh();
        }
    }
    
    getValue() {
        if(this.editor != null) {
            return this.editor.getDoc().getValue();
        }
    }
    
    setValue(value) {
        if(this.editor != null) {
            this.editor.getDoc().setValue(value);
        }
    }

    insertText(pos, val) {
        if(this.editor == null) {
            return;
        }
        
        let startPosition = this.editor.getDoc().posFromIndex(pos);
        
        this.editor.getDoc().replaceRange(val, startPosition);
    }
    
    deleteText(pos, val) {
        if(this.editor == null) {
            return;
        }
        
        let startPosition = this.editor.getDoc().posFromIndex(pos);
        let endPosition = this.editor.getDoc().posFromIndex(pos+val.length);
        
        this.editor.getDoc().replaceRange("", startPosition, endPosition);
    }

    static types() {
        return [
            "text/python",
            "text/javascript",
            "text/html",
            "text/css",
            "text/markdown",
            "text/ruby",
            "text/x-scss",
            "wpm/descriptor",
            "application/json",
            "text/x-typescript",
            "text/x-latex",
            "text/p5js"
        ];
    }
}; window.CodemirrorEditor = CodemirrorEditor;

EditorManager.registerEditor(CodemirrorEditor);
