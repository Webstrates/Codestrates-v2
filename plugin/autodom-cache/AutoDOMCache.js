let BASE_PATH = "autoDOMCache.";
let META_PATH = BASE_PATH+"meta.";
let DATA_PATH = BASE_PATH+"data.";
let KNOWN_EMPTIES = ["text/x-scss"];

async function digest(msg) {
    //Get raw bytes
    let hashBytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(msg));

    //Create uint8 array
    let hashArray = new Uint8Array(hashBytes);

    //Convert to hex
    return Array.prototype.map.call(hashArray, (x)=>{
        return ("0"+x.toString(16)).slice(-2);
    }).join("");
}

class AutoDOMCache {
    static async get(fragment){
        if (AutoDOMCache.DEBUG) console.log("Requesting cache for", fragment);
        let type = fragment.type;
        let currentContent = fragment.raw;
        
        // Hardcode special case known types supporting empty
        if (KNOWN_EMPTIES.includes(type)){
            if (currentContent.trim().length===0){
                if (AutoDOMCache.DEBUG) console.log("Returning known empty for ", fragment);
                return "";
            }
        }
        
        // Otherwise look it up in the cache
        let length = currentContent.length;
        let hash = await digest(currentContent);
        let fragmentPath = type+"."+hash+"."+length;      
        if (AutoDOMCache.DEBUG) console.log("Cache path is ", fragmentPath);
        try {
            let hitDataString = localStorage.getItem(META_PATH+fragmentPath);
            if (!hitDataString) return null; // miss
            let hitData = JSON.parse(hitDataString);
            
            if (hitData.compressed){
                // TODO
                throw new Error("AutoDOMCache compression not implemented yet");
            } else {
                if (AutoDOMCache.DEBUG) console.log("Cache hit for", fragment);
                hitData.hits += 1;
                hitData.lastHit = Date.now();
                localStorage.setItem(META_PATH+fragmentPath, JSON.stringify(hitData));
                return localStorage.getItem(DATA_PATH+fragmentPath);
            }
        } catch (ex){
            console.log(ex);
            return null; // This was still a miss
        }
    }
    
    static async set(fragment, renderedContent){
        if (AutoDOMCache.DEBUG) console.log("Storing cache entry for", fragment);
        
        let type = fragment.type;
        let currentContent = fragment.raw;
        
        // Don't cache known types that support empty->empty
        if (KNOWN_EMPTIES.includes(type)){
            if (currentContent.trim().length===0){
                return;
            }
        }
        
        // Otherwise store it in the cache
        let length = currentContent.length;
        let hash = await digest(currentContent);
        let fragmentPath = type+"."+hash+"."+length;
               
        localStorage.setItem(DATA_PATH+fragmentPath, renderedContent);
        localStorage.setItem(META_PATH+fragmentPath, JSON.stringify({
            hits: 0,
            lastHit: 0,
            created: Date.now(),
            compressed: false
        }));
    }
    
}

// Init cache params
let PARAM_PATH = BASE_PATH+"params";
let defaultParams = {
    maxEntries: 1000,
    maxAge: 3600*24*14,
    maxSize: 1024*512
};
let paramString = localStorage.getItem(PARAM_PATH);
try {
    AutoDOMCache.parameters = JSON.parse(paramString);
    if (!(AutoDOMCache.parameters.maxEntries && AutoDOMCache.parameters.maxAge && AutoDOMCache.parameters.maxSize)) throw new Error("AutoDOMCache could not parse initialization params from localStorage, restoring defaults");
} catch (ex) {
    console.log(ex);
    AutoDOMCache.parameters = defaultParams;
    localStorage.setItem(PARAM_PATH, JSON.stringify(defaultParams));
}

// Schedule cleanups occasionally
// TODO
AutoDOMCache.DEBUG=true;
window.AutoDOMCache = AutoDOMCache;
