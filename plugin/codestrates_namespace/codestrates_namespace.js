/**
 *  Codestrates Namespace
 *  Easy and early access to the Codestrates namespace
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

/* global webstrate */

let fragmentExport = {
    create: Fragment.create,
    find: Fragment.find,
    one: Fragment.one
};

let editorManagerExport = {
    create: EditorManager.createEditor
};

let codestrates = {
    fragment: fragmentExport,
    editor: editorManagerExport
};

window.codestrates = codestrates;