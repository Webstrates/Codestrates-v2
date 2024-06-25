let store = "directoryHandles";
let folderElements = ["CODE-FOLDER","WPM-PACKAGE"];
let extensionTypes = {
  "text/javascript": "js",
  "text/javascript+babel": "jsx",
  "text/x-typescript": "ts",
  "text/python": "py",
  "text/ruby": "rb",
  "application/x-lua": "lua",
  "text/html": "html",
  "text/markdown": "md",
  "text/x-latex": "tex",
  "image/svg+xml": "svg",
  "application/json": "json",
  "wpm/descriptor": "json",
  "text/varv": "json",
  "text/css": "css",
  "text/x-scss": "scss" 
}
let autoCloneAttributes = ["id","data-repository","auto","class","name"];

class FragmentFilesystemSync {
    static isSupported(){
        if (!window) return false;
        if (!window.showDirectoryPicker) return false;
        if (!window.indexedDB) return false;
        if (!window.MutationObserver) return false;
        return true;
    }

    constructor(dbname){
        let self = this;
        this.isSyncing = false;
        this.fragmentLinks = [];
        this.directoryHandle = false;
        this.pathMapping = new Map();
        this.nodeMapping = new Map();

        const request = indexedDB.open(dbname);
        request.onerror = (event) => {
            console.error("Failed to open filesystem sync IndexedDB",event);
        };
        request.onsuccess = (event) => {
            self.db = event.target.result;
            self.onPageLoad();
        };        
        request.onupgradeneeded = (event) =>{
            self.db = event.target.result;

            // Create an objectStore to hold file handles to directories
            self.db.createObjectStore(store, { keyPath: "webstrate" });
        }
    }

    async onPageLoad(){
        this.directoryHandle = await this.getSavedHandle();
        if (this.directoryHandle){
            // Sync immediately
            this.enableSyncing();
        }
    }

    getSavedHandle(){        
        return new Promise((resolve, reject)=>{
            let request = this.db.transaction(store).objectStore(store).get(location.pathname);
            request.onerror = (event) => {
                reject(event);
            };
            request.onsuccess = (event) => {
                resolve(request.result?.handle);
            };            
        });
    }

    setDirectory(handle=false){
        this.directoryHandle = handle;
        return new Promise((resolve, reject)=>{
            let request;
            if (handle){                
                request = this.db.transaction(store,"readwrite").objectStore(store).put(
                    {
                        webstrate: location.pathname,
                        handle: handle
                    }
                );
            } else {
                request = this.db.transaction(store,"readwrite").objectStore(store).delete(location.pathname);
            }
            request.onerror = (event) => {reject(event);};
            request.onsuccess = resolve;
        });
    }

    async popupDirectoryPicker(){
        let directoryHandle = await window.showDirectoryPicker({ mode:"readwrite"});
        if (!directoryHandle) return;

        let needConfirm = true; 

        // Check if folder is empty then it is ok
        let fileCount = 0;
        for await (const key of directoryHandle.keys()) {
            fileCount++;
        }
        if (fileCount===0) needConfirm = false;

        // Check if folder already contains meta file for this webstrate then it is also ok
        try {
            let metaFileHandle = await directoryHandle.getFileHandle("ffs.meta");
            let metaFile = await metaFileHandle.getFile();
            if (JSON.parse(await metaFile.text()).location==location.pathname) needConfirm = false;
        } catch (ex){
            // ignore
        }

        if (needConfirm && !window.confirm('Warning: The contents of the folder '+directoryHandle.name+' you selected will be overwritten with the fragments in this codestrate. All its content will be deleted!')) return;
        return directoryHandle;
    }

    async enableSyncing(){
        let self = this;
        if (this.isSyncing) throw new Error("Cannot start FFS, already syncing, stop it first");
        if (!this.directoryHandle) throw new Error("No sync directory set");
        if (!await this.directoryHandle.requestPermission({mode: "readwrite"})) throw new Error("Must have access to dir");
        console.log("Starting Fragment Filesystem Sync");

        // TODO: Test if out-of-sync and ask for whether to overwrite filesystem or webstrate

        // Clean up the directory
        for await (const entry of this.directoryHandle.values()) {
            await this.directoryHandle.removeEntry(entry.name, { recursive: true });
        }        

        // Observe when fragments are added/removed
        this.observer = new MutationObserver((mutations)=>{
            for (const mutation of mutations) {
                if (mutation.type === "childList") {
                    for (const addedNode of mutation.addedNodes){
                        if (addedNode.matches && addedNode.matches("code-fragment")){
                            self.onWSFragmentElementAdded(addedNode);
                        } else if (addedNode.querySelectorAll) {
                            addedNode.querySelectorAll("code-fragment").forEach((node)=>{
                                self.onWSFragmentElementAdded(node);
                            })
                        }
                    }
                    for (const removedNode of mutation.removedNodes){
                        if (removedNode.matches && removedNode.matches("code-fragment")){
                            self.onWSFragmentElementRemoved(removedNode);
                        } else if (removedNode.querySelectorAll) {
                            removedNode.querySelectorAll("code-fragment").forEach((node)=>{
                                self.onWSFragmentElementRemoved(node);
                            })
                        }
                    }                    
                }
            }            
        });
        this.observer.observe(document.body, {childList:true, subtree:true});
        document.querySelectorAll("body code-fragment").forEach((fragment)=>{
            self.onWSFragmentElementAdded(fragment);
        });

        // Every second synchronize contents
        let ffsUpdateTick = async () => {
            let metaFileHandle = await this.directoryHandle.getFileHandle("ffs.meta", {create:true});
            let metaFile = await metaFileHandle.getFile();
            let oldMeta = {};
            try {
                oldMeta = JSON.parse(await metaFile.text());
            } catch (ex){
                // Ignore this, just create a new one
            }
            let metaChangeDetector = JSON.stringify(oldMeta.paths);

            // Sync FS and WS
            if (oldMeta.paths) await self.synchronizeFSOperations(oldMeta);
            await self.synchronizeWSFragments();

            // Generate new meta file for advanced merging functionality
            let meta = {metaVersion: 1, version:webstrate.version, lastMetaSync: new Date().getTime(), paths:{},location:location.pathname};        
            for (const [path,part] of this.pathMapping){
                let entryMeta = {wid:part.node.webstrate.id};
                if (part.link){
                    entryMeta.type = "fragment";
                    entryMeta.lastModified = part.link.elementLastModified;
                    entryMeta.hash = part.link.hash;
                } else {
                    entryMeta.type = "directory";
                }
                autoCloneAttributes.forEach(attr=>{
                    if (part.node.hasAttribute(attr)) entryMeta[attr] = part.node.getAttribute(attr);
                })
                meta.paths[path] = entryMeta; 
            };
            if (metaChangeDetector!=JSON.stringify(meta.paths)){
                // Meta needs to be rewritten
                await writeFile(metaFileHandle, JSON.stringify(meta));
            }            
            self.updater = setTimeout(ffsUpdateTick,1000);
        };
        ffsUpdateTick();

        this.isSyncing = true;
    }

    disableSyncing(){
        clearTimeout(this.updater);
        this.observer?.disconnect();
        this.fragmentLinks = [];
        this.isSyncing = false;
        console.log("Stopped FFS");
    }

    onWSFragmentElementAdded(fragmentElement){
        // TODO: Check if already exists and ignore
        setTimeout(()=>{this.fragmentLinks.push(new FragmentLink(fragmentElement.fragment))},1);
    }
    onWSFragmentElementRemoved(fragmentElement){
        this.fragmentLinks = this.fragmentLinks.filter((link)=>link.fragment.element!==fragmentElement);
    }

    async synchronizeFSOperations(oldMeta){
        async function addElementFromOldFS(path,element,type){
            let parentPath = path.substring(0,path.lastIndexOf("/"));
            let parentNode = false;
            if (parentPath==""){
                parentNode = document.body;
            } else if (oldMeta.paths[parentPath]) { // Try to find node by WSID
                let wsNode = findFolderNodeByWSID(oldMeta.paths[parentPath].wid);
                if (wsNode) parentNode = wsNode;
            }

            if (!parentNode){
                console.log("Couldn't map parent folder, giving up on adding", path);
            } else {
                // TODO: Check for collisions/duplicates here
                console.log("Adding to", parentNode, path);
                let name = path.split("/");
                name = name[name.length-1];
                let extensionLocation = name.lastIndexOf(".");
                name = name.substring(0,(extensionLocation!=-1)?extensionLocation:undefined);

                element.setAttribute("name",name);
                parentNode.appendChild(element);
                WPMv2.stripProtection(element);

                // continue after webstrates id generation
                await new Promise(resolve => setTimeout(resolve, 0)); 
                oldMeta.paths[path] = {
                    wid: element.webstrate.id,
                    type: type
                };
            }            
        }

        // Check if any new files/dirs in FS with the old mapping from FS
        await traverseDirectoryStructure("",this.directoryHandle, async (path,name,parent,entry)=>{                
            if (!oldMeta.paths[path]){
                // A new directory, create it in the webstrate
                let newFolderElement;
                if (name.endsWith(".wpm")){
                    newFolderElement = document.createElement("wpm-package");
                } else {
                    newFolderElement = document.createElement("code-folder");
                }
                await addElementFromOldFS(path,newFolderElement,"directory");
            }

            // Check again and flag as seen if it exists now
            if (oldMeta.paths[path]) oldMeta.paths[path].seen = true;
            return true;
        }, async (path,name,parent,entry)=>{
            if (!oldMeta.paths[path]){
                // A new file, create the fragment
                if (path==="/ffs.meta") return; // Ignore meta file
                let extension = name.substring(name.lastIndexOf(".")+1);
                let type = Object.keys(extensionTypes).find(key=>extensionTypes[key]==extension);
                if (FragmentFilesystemSync.DEBUG) console.log("New file spotted",extension,type,path,name,parent,entry);
                if (type){
                    // Recognized fragment type
                    let fragmentElement = document.createElement("code-fragment");
                    fragmentElement.setAttribute("data-type",type);
                    await addElementFromOldFS(path,fragmentElement,"fragment");

                    // Check if this is a move/rename op
                    let file = await entry.getFile();
                    let contents = await file.text();
                    if (contents.length>0){
                        let hash = await sha256(contents);
                        if (FragmentFilesystemSync.DEBUG) console.log("Looking for ",hash);
                        let collision = Object.values(oldMeta.paths).find((p)=>{console.log(p.hash,p.type);return p.type=="fragment" && p.hash==hash;});
                        if (collision){                            
                            // Copy over old attributes
                            if (FragmentFilesystemSync.DEBUG) console.log("Found")
                            autoCloneAttributes.forEach(attr=>{
                                if (FragmentFilesystemSync.DEBUG) console.log("Adding attrs")
                                if (collision[attr]===undefined){
                                    if (FragmentFilesystemSync.DEBUG) console.log("removing attrs",attr);
                                    fragmentElement.removeAttribute(attr);
                                } else {
                                    if (FragmentFilesystemSync.DEBUG) console.log("added attrs",attr, collision[attr]);
                                    fragmentElement.setAttribute(attr,collision[attr]);
                                }
                            })
                        }
                    }
                }
            }

            // Check file existance again
            if (oldMeta.paths[path]){
                // Also check for modifications
                let file = await entry.getFile();
                let oldFileMeta = oldMeta.paths[path]
                if ((!oldFileMeta.lastModified) || file.lastModified > oldMeta.lastMetaSync){
                    let element = await findFragmentNodeByWSID(oldFileMeta.wid);
                    if (!element){
                        console.log("Couldn't find element node to push FS contents to",path);
                    } else {
                        element.fragment.raw = await file.text();
                    }
                }

                oldMeta.paths[path].seen = true;
            } 
        });

        // Check if any deleted files in FS with the old mapping from FS
        for (const [path,entry] of Object.entries(oldMeta.paths)){
            if (!entry.seen){
                if (FragmentFilesystemSync.DEBUG) console.log("Detected deleted path in FS",path);
                switch (entry.type){
                    case "directory":
                        let wsDirNode = findFolderNodeByWSID(entry.wid);
                        if (!wsDirNode){
                            console.log("Couldn't find deleted directory in webstrate",entry);
                        } else {
                            wsDirNode.remove();
                        }
                        break;
                    case "fragment":
                        let wsFragNode = findFragmentNodeByWSID(entry.wid);
                        if (!wsFragNode){
                            console.log("Couldn't find deleted fragment in webstrate",entry);
                        } else {
                            wsFragNode.remove();
                        }                        
                        break;
                        default:
                            console.log("Unknown entry type deleted", entry)
                }
            }
        }

        // Yield, to trigger mutation observers for deletions before continueing
        await new Promise(resolve => setTimeout(resolve, 1));
    }

    async synchronizeWSFragments(){
        // Create new filename and directory mapping for fragment links
        let sanitizeFileName = (rawName)=>rawName.replace(/[^()a-z0-9.#\-_ ]/gi, '_');
        let newPathMapping = new Map();
        let newNodeMapping = new Map();
        
        // Recurse through folder elements and map them with unique names
        let registerFolderElements = function registerFolderElements(currentPath, currentElement){
            if (folderElements.includes(currentElement.nodeName)){
                // This is a folder
                let path;
                let counter = 0;
                let extension = "";
                if (currentElement.nodeName==="WPM-PACKAGE") extension = ".wpm";
                do {
                    // Not unique, append a number
                    path = currentPath + "/" + sanitizeFileName(getNodeName(currentElement))+(counter>0?"_"+counter:"")+extension;  
                    counter++;                  
                } while(newPathMapping.get(path));
                newPathMapping.set(path,{node:currentElement});
                newNodeMapping.set(currentElement,path);                
                currentPath = path;
            }
            for (let i = 0; i<currentElement.children.length; i++){
                registerFolderElements(currentPath,currentElement.children[i]);
            }            
        }
        registerFolderElements("",document.body);

        // Map fragments with unique names
        this.fragmentLinks.forEach((link)=>{
            // Find parent path
            let path = "";            
            let parent = link.fragment.element.parentNode;
            while (parent && parent.parentNode != null) {
                if (folderElements.includes(parent.nodeName)){
                    path = newNodeMapping.get(parent);
                    if (!path){
                        console.warn("Weird", parent, link);
                        throw new Error("FIXME: Cannot map fragment inside folder that wasn't detected properly");
                    } 
                    break;
                }
                parent = parent.parentNode;
            }
            
            // Make fragment name unique
            let fragmentPath;
            let counter = 0;
            do {
                fragmentPath = path + "/" + sanitizeFileName(link.getRawName())+(counter>0?"_"+counter:"")+"."+link.getExtension();
                counter++;
            } while (newPathMapping.get(fragmentPath));
            newPathMapping.set(fragmentPath,{node: link.fragment.element, link:link});
            newNodeMapping.set(link.fragment.element,fragmentPath);            
        });
        this.nodeMapping = newNodeMapping;
        this.pathMapping = newPathMapping;




        // Check if there are new dirs that need to be pushed to FS
        let paths = Array.from(this.pathMapping.keys()).sort();
        let sortedDirs = [{path:"",handle:this.directoryHandle}];
        for (const path of paths){
            let entity = this.pathMapping.get(path);
            if (!entity.link){
                // Directory
                sortedDirs.push({path:path, handle:await getOrCreateFSDirectory(this.directoryHandle, path)});
            }
        }

        // Check fragments to push to FS
        for (const dir of sortedDirs){
            if (!dir.handle) {
                console.log("Skipping file sync because directory could not be found",dir);
                continue;
            }            
            for (const path of paths){
                if (path.substr(0,path.lastIndexOf("/"))==dir.path){
                    let entity = this.pathMapping.get(path);
                    if (entity.link){                
                        // File in this dir
                        let fileWasJustCreated = false;
                        let fileName = path.substring(path.lastIndexOf('/')+1);
                        let fileHandle;
                        try {
                            fileHandle = await dir.handle.getFileHandle(fileName);
                        } catch (ex){
                            // Not found
                            // TODO: Test for other things than NotFound
                            try {
                                fileHandle = await dir.handle.getFileHandle(fileName, {create:true});
                                if (FragmentFilesystemSync.DEBUG) console.log("Creating new file in FS because it didnt exist",path)
                                fileWasJustCreated = true;
                            } catch (ex2){
                                console.log("Cannot write file, skipping",path,ex2);
                            }
                        }

                        let file = await fileHandle.getFile();
                        if (fileWasJustCreated || entity.link.elementLastModified>file.lastModified){
                            await writeFile(fileHandle, entity.link.fragment.raw);
                        }
                    }                    
                }
            }
        };

        // Check if FS has fragments/dirs that should be deleted
        let unknownPathDeleter = (path,name,parent,entry)=>{
            if (!this.pathMapping.has(path)){
                if (path=="/ffs.meta") return false; // leave the meta file alone
                parent.removeEntry(name, {recursive:true}); // Delete it
                return false; // Do not continue into the directory
            } 
            return true;
        };
        await traverseDirectoryStructure("",this.directoryHandle, unknownPathDeleter, unknownPathDeleter);
    }
}

class FragmentLink {
    constructor(fragment){
        let self = this;
        this.fragment = fragment;
        if (!fragment) throw Error("Cannot construct FragmentLink without a fragment");
        
        this.fragment.registerOnFragmentChangedHandler(()=>{self.onFragmentUpdated()});
        this.onFragmentUpdated();
        if (FragmentFilesystemSync.DEBUG) console.log("Monitoring",fragment);
    }

    

    async onFragmentUpdated(){
        // Store time and hash
        let newHash = await sha256(this.fragment.raw);
        if (newHash!=this.hash){
            this.hash = newHash;
            this.elementLastModified = new Date().getTime();
        }
    }
    
    getRawName(){
        let name = getNodeName(this.fragment.element);        
        return name?name:this.fragment.type.substring(this.fragment.type.lastIndexOf('/')+1);
    }

    getExtension(){
        let extension = extensionTypes[this.fragment.type];
        if (!extension) extension = "txt";
        return extension;
    }
}


function getNodeName(node){
    let name = node.hasAttribute("name")?node.getAttribute("name").trim():"";
    if (name.length>0) return name;
    let id = node.hasAttribute("id")?node.getAttribute("id").trim():"";
    if (id.length>0) return "#"+id;
    if (folderElements.includes(node.nodeName)) return node.nodeName.toLowerCase();
    return false;
}

function findFolderNodeByWSID(wsid){
    return Array.from(document.querySelectorAll(folderElements.join(","))).find(element=>element.webstrate?.id==wsid);
}
function findFragmentNodeByWSID(wsid){
    return Array.from(document.querySelectorAll("code-fragment")).find(element=>element.webstrate?.id==wsid);
}

async function getOrCreateFSDirectory(base, path){
    let directories = path.split("/");
    let currentDir = base;
    for (let directory of directories){
        if (directory.length===0) continue; // skip initial slash
        currentDir = await currentDir.getDirectoryHandle(directory, {create:true})
    }
    return currentDir;
}

async function writeFile(fileHandle, contents){
    const writable = await fileHandle.createWritable();
    await writable.write(contents);
    await writable.close();     
}

async function traverseDirectoryStructure(currentPath, dirHandle, dirCallback, fileCallback){
    for await (let [name,entry] of dirHandle.entries()){
        let newPath = currentPath+"/"+name
        if (entry instanceof FileSystemFileHandle){
            await fileCallback(newPath, name, dirHandle, entry);
        } else if (entry instanceof FileSystemDirectoryHandle){
            if (await dirCallback(newPath, name, dirHandle, entry)){
                await traverseDirectoryStructure(newPath, entry, dirCallback, fileCallback);
            }
        }
    }
}

async function sha256(input){
    const sourceBytes = new TextEncoder().encode(input);
    const digest = await crypto.subtle.digest("SHA-256", sourceBytes);
    const resultBytes = [...new Uint8Array(digest)];
    return resultBytes.map(x => x.toString(16).padStart(2, '0')).join("");        
}

FragmentFilesystemSync.DEBUG = false;
if (FragmentFilesystemSync.isSupported()){
    Fragment.addAllFragmentsLoadedCallback(()=>{
        window.fragmentFilesystemSync = new FragmentFilesystemSync("FragmentFilesystemSync");
        window.FragmentFilesystemSync = FragmentFilesystemSync;
        
        // Register with Cauldron (when available)
        let item;
        let registerMenuItem = function registerMenuItem(){
            if (!item) item = MenuSystem.MenuManager.registerMenuItem("Cauldron.File.Sync", {
                label: "Fragments to Disk...",
                tooltip: "Copy fragments to a local folder when the page loads and keep them in sync",    
                group: "Codestrates",
                groupOrder: 200,
                order: 200,
                checked: ()=>{
                    return fragmentFilesystemSync.isSyncing;
                },
                onAction: async (menuItem)=>{
                    // Toggle sync
                    if (fragmentFilesystemSync.isSyncing){
                        fragmentFilesystemSync.disableSyncing();
                        fragmentFilesystemSync.setDirectory();
                    } else {
                        let dir = await fragmentFilesystemSync.popupDirectoryPicker();
                        if (dir){
                            await fragmentFilesystemSync.setDirectory(dir);
                            fragmentFilesystemSync.enableSyncing();
                        }
                    }
                }
            });                
        }

        // If Cauldron is there already, run it, otherwise wait
        if (typeof MenuSystem != 'undefined') {
            registerMenuItem();
        } else {
            EventSystem.registerEventCallback('Cauldron.OnInit', registerMenuItem);
        }

        wpm.onRemoved(({detail: packageName})=>{
            fragmentFilesystemSync.disableSyncing();
            item?.delete();
        });        
    });
}

