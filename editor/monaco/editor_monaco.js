/**
 *  MonacoEditor
 *  Wrapper for using the Monaco editor in Codestrates
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
    EditorManager.unregisterEditor(MonacoEditor, "monaco-editor");
});

/**
 * An editor implementation using Monaco
 *
 * @memberof Editors
 * @extends Editors.Editor
 */
class MonacoEditor extends Editor {
    constructor(fragment, options = {}) {
        super("monaco-editor", fragment, options);

        this.options = options;

        this.foreignDecorators = new Map();

        this.setupEditor();
    }

    async setupEditor() {
        let self = this;

        let language = "text";

        switch (self.fragment.type) {
            case "text/x-latex":
                language = "plaintext";
                break;

            case "text/javascript":
                language = "javascript";
                break;

            case "text/javascript":
                language = "javascript";
                break;

            case "text/p5js":
                language = "javascript";
                break;

            case "text/whenjs":
                language = "javascript";
                break;

            case "text/python":
                language = "python";
                break;
                
            case "text/markdown":
                language = "markdown";
                break;

            case "text/html":
                language = "html";
                break;

            case "text/css":
                language = "css";
                break;

            case "text/x-scss":
                language = "scss";
                break;
                
            case "application/x-lua":
                language = "lua";
                break;                

            case "text/ruby":
                language = "ruby";
                break;

            case "text/x-typescript":
                language = "typescript";
                break;

            case "wpm/descriptor":
            case "application/json":
            case "text/whenv2":
                language = "json";
                break;
        }

        requirejs(["vs/editor/editor.main"], () => {
            EventSystem.triggerEvent("Codestrates.Editor.Monaco.Loaded", {
                monaco: monaco
            });

            let theme = "vs";

            if (self.options.theme === "dark") {
                theme = "vs-dark";
            }

            monaco.languages.json.jsonDefaults.diagnosticsOptions.enableSchemaRequest = true;

            self.editor = monaco.editor.create(self.editorDiv[0], {
                value: this.fragment.raw,
                language: language,
                theme: theme,
                minimap: {
                    enabled: false
                },
                automaticLayout: false,
                fixedOverflowWidgets: true,
                contextmenu: false,
                scrollBeyondLastLine: false,
                scrollBeyondLastColumn: 0,
                occurrencesHighlight: false,
                selectionHighlight: false,
                accessibilitySupport: "off",
                folding: false,
                guides: {
                    bracketPairs: true
                },
                readOnly: this.options.readOnly,
                bracketPairColorization: {
                    enabled: true
                },
                scrollbar: {
                    alwaysConsumeMouseWheel: false,
                    horizontal: 'auto',
                    vertical: 'auto',
                    horizontalScrollbarSize: 17
                }
            });

            self.editor.getModel().setEOL(0);

            if (self.options.mode === "full") {
                //Setup resizeing for all the lines

                self.editor.getModel().onDidChangeContent(()=>{self.updateSize();});
                self.editor.getModel().onDidChangeDecorations(()=>{
                    setTimeout(()=>{
                        self.updateSize();
                    }, 0);
                });

                self.updateSize();
            }

            self.editor.getModel().onDidChangeContent((evt) => {
                self.handleModelChanged();
            });

            self.editor.onDidChangeCursorSelection((evt)=>{
                self.triggerCursorSelection({
                    startLine: evt.selection.startLineNumber,
                    startColumn: evt.selection.startColumn,
                    endLine: evt.selection.endLineNumber,
                    endColumn: evt.selection.endColumn,
                    positionLine: evt.selection.positionLineNumber,
                    positionColumn: evt.selection.positionColumn
                });
            });

            self.triggerEditorOpened();
        });
    }

    focus() {
        let self = this;

        if(this.editor == null) {
            //Try to focus the editor as soon as its created.
            setTimeout(()=>{
                self.focus();
            }, 100);
        } else {
            this.editor.focus();
        }
    }

    setLine(line, column=1) {
        let self = this;

        if(this.editor == null) {
            //Try to focus the editor as soon as its created.
            setTimeout(()=>{
                self.setLine(line);
            }, 100);
        } else {
            this.editor.revealLineNearTop(line);
            this.editor.setPosition({
                column: column,
                lineNumber: line
            });
        }
    }   

    updateSize() {
        let oldWidth = this.editor.getLayoutInfo().width;
        let numLines = this.editor._modelData.viewModel._lines.getViewLineCount();

        let height = 19;

        let viewLines = this.editorDiv.find("div.view-line");

        if (viewLines.length > 0) {
            height = viewLines[0].offsetHeight;
        }

        this.editor.layout({
            width: oldWidth,
            height: numLines * height
        });

        let scrollHeight = this.editor.getScrollHeight();

        if(this.editor.getLayoutInfo().height !== scrollHeight) {
            this.editor.layout({
                width: oldWidth,
                height: scrollHeight
            });
        }
    }

    onSizeChanged() {
        if (typeof this.editor!=="undefined"){

            this.editor.layout();

            if(this.mode === "full") {
                this.updateSize();
            }
        }
    }
    
    setTheme(themeName){
        // STUB: Monaco does not support individual themes yet
        // See this on why this will change all editors simultaneously: https://github.com/Microsoft/monaco-editor/issues/338
        switch (themeName){
            case "dark":
                // this.editor._themeService
                monaco.editor.setTheme("vs-dark");
                break
            default:
                monaco.editor.setTheme("vs");
        }
    }

    updateForeignSelections(remoteClient = null) {
        let self = this;

        if(this.editor == null) {
            //Editor not ready yet.
            return;
        }

        let clientsToUpdate = [];

        if(remoteClient != null) {
            clientsToUpdate.push(remoteClient);
        } else {
            clientsToUpdate = Array.from(this.foreignSelections.keys());
        }

        clientsToUpdate.forEach((client)=>{
            let cursorSelection = self.foreignSelections.get(client);
            let decorations = self.foreignDecorators.get(client);

            if(decorations == null) {
                decorations = [];
            }

            let updatedDecoration = [];

            if(cursorSelection != null) {
                updatedDecoration.push({
                    range: new monaco.Range(cursorSelection.positionLine, cursorSelection.positionColumn, cursorSelection.positionLine, cursorSelection.positionColumn),
                    options: {
                        className: "otherCursor_" + client,
                        zIndex: 1
                    }
                });

                if (cursorSelection.startLine != cursorSelection.endLine || cursorSelection.startColumn != cursorSelection.endColumn) {
                    updatedDecoration.push({
                        range: new monaco.Range(cursorSelection.startLine, cursorSelection.startColumn, cursorSelection.endLine, cursorSelection.endColumn),
                        options: {
                            className: "otherSelection_" + client,
                            zIndex: 0
                        }
                    });
                }
            }

            decorations = self.editor.deltaDecorations(decorations, updatedDecoration);

            self.foreignDecorators.set(client, decorations);
        });
    }

    getValue() {
        if(this.editor == null) {
            return null;
        }
        
        return this.editor.getModel().getValue();
    }

    setValue(value) {
        if(this.editor == null) {
            return;
        }
        
        this.editor.getModel().setValue(value);
    }

    insertText(pos, val) {
        if(this.editor == null) {
            return;
        }
        
        let startPosition = this.editor.getModel().getPositionAt(pos);
        let range = monaco.Range.fromPositions(startPosition, startPosition);
        
        this.editor.getModel().applyEdits([{
            forceMoveMarkers: true,
            range: range,
            text: val
        }]);

        this.updateForeignSelections();
    }
    
    deleteText(pos, val) {
        if(this.editor == null) {
            return;
        }
        
        let startPosition = this.editor.getModel().getPositionAt(pos);
        let endPosition = this.editor.getModel().getPositionAt(pos+val.length);
        let range = monaco.Range.fromPositions(startPosition, endPosition);
        
        this.editor.getModel().applyEdits([{
            range: range,
            text: ""
        }]);

        this.updateForeignSelections();
    }

    insertAtSelection(text) {
        this.editor.executeEdits("draggedIntoEditor", [{
            identifier: {
                major: 1,
                minor: 1
            },
            range: this.editor.getSelection(),
            text: text,
            forceMoveMarkers: true
        }]);
    }

    unload() {
        //Kill monaco?
        if(this.editor != null) {
            this.editor.getModel().dispose();
            this.editor.dispose();
            this.editor = null;
        }

        super.unload();
    }

    setWordwrap(state) {
        if(this.editor != null) {
            this.editor.updateOptions({"wordWrap": state?"on":"off"});
        }
    }

    static types() {
        return [
            "text/javascript",
            "text/p5js",
            "text/whenjs",
            "text/whenv2",
            "text/varv",
            "text/varvscript",
            "text/python",
            "text/markdown",
            "text/html",
            "text/css",
            "text/ruby",
            "text/x-scss",
            "text/x-typescript",
            "application/x-lua",
            "wpm/descriptor",
            "application/json",
            "text/x-latex"
        ];
    }
}; window.MonacoEditor = MonacoEditor;

EditorManager.registerEditor(MonacoEditor);
