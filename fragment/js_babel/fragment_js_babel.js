/**
 *  JavascriptBabelFragment
 *  Write typescript code and execute it in Codestrates
 * 
 *  Copyright 2024 Janus B. Kristensen, CAVI,
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

/* global webstrate, Fragment, wpm */

wpm.onRemoved(() => {
    Fragment.unRegisterFragmentType(JavascriptBabelFragment);
});

/**
 * A fragment containing Javascript code enchanced by Babel
 *
 * Supports auto - executes require() on load
 * @extends Fragments.Fragment
 * @hideconstructor
 * @memberof Fragments
 */
class JavascriptBabelFragment extends Fragment {
    constructor(html) {
        super(html);
    }

    /**
     * Evaluates the JavaScript code inside this fragment and returns the export object
     * @example
     * let exportedObject = Fragment.one("#myJSFragment").require();
     * @returns {Promise<Object>}
     */
    async require() {
        let self = this;
        
        // Support for css-like imports from other fragments
        function fragmentImports({types,template}){
            return {
                visitor: {
                    ImportDeclaration(path,state){
                        if (path?.node?.source?.value?.startsWith("#")){
                            let fragmentString = path.node.source.value.replaceAll("\"","\\\"");
                            let specifierString = "throw new Error('Couldnt parse import specifier, try something simpler like import {Thing} from \"...\"')";
                            if (path.node.specifiers.length===1 && path.node.specifiers[0].type==="ImportNamespaceSpecifier"){
                                specifierString = "var "+path.node.specifiers[0].local.name+" = fragment.require();";
                                path.scope.removeBinding(path.node.specifiers[0].local.name); // Fix Babel not removing old bindings from scope
                            } else if (path.node.specifiers.length===1 && path.node.specifiers[0].type==="ImportDefaultSpecifier"){
                                specifierString = "var "+path.node.specifiers[0].local.name+" = fragment.require().default;";
                                path.scope.removeBinding(path.node.specifiers[0].local.name); // Fix Babel not removing old bindings from scope
                            } else {
                                let specifiers = path.node.specifiers.map(specifier=>{
                                    let assignment = "var "+specifier.local.name+"=wrapper."+specifier.imported.name;
                                    path.scope.removeBinding(specifier.local.name); // Fix Babel not removing old bindings from scope
                                    return assignment;
                                });
                                specifierString = "let wrapper = await fragment.require();"+specifiers.join(";");
                            }
                            
                            let replacementProgram = Babel.transform(`
                                {try {
                                    let fragment = Fragment.one("`+fragmentString+`");
                                    if (!fragment) throw new Error("Couldn't find fragment");
                                    `+specifierString+`
                                } catch (ex){
                                    throw new Error("Unable to import '`+path.node.source.value.replaceAll("\"","")+"' on line "+path.node.loc.start.line+`: "+ex);
                                }}
                            `, {ast:true,code:false});
                            path.replaceWith(replacementProgram.ast.program.body[0]);
                        }
                    }
                }
            };
        }
        let ast = Babel.transform(self.raw+"/*"+Math.random()+"*/",{presets:["react"], ast:true, code:false, plugins:[fragmentImports]}).ast;

        // Turn into real JS and return it
        let processedCode = Babel.transformFromAst(ast,null, {presets:["react"]}).code;
        processedCode = "let fragmentSelfReference = Fragment.one('code-fragment[transient-fragment-uuid=\""+this.uuid+"\"');"+processedCode;
        //console.log(processedCode);
        let output = await import(`data:text/javascript,${encodeURIComponent(processedCode)}`);
        return output;
    }

    onFragmentsLoaded() {
        if(this.auto && !Fragment.disableAutorun) {
            this.require({
                autoRun: true
            });
        }
    }

    supportsAuto() {
        return true;
    }
    
    supportsRun() {
        return true;
    }

    static type() {
        return "text/javascript+babel";
    }
}; window.JavascriptBabelFragment = JavascriptBabelFragment;

Fragment.registerFragmentType(JavascriptBabelFragment);
