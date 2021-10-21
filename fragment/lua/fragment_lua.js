/**
 *  LuaFragment
 *  Execute Lua code in Codestrates
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

/* global webstrate, cQuery, Fragment, wpm, JsEvalEngine */

wpm.onRemoved(()=>{
    Fragment.unRegisterFragmentType(LuaFragment);
});

/**
 * A fragment that contains lua code
 * @hideconstructor
 * @memberof Fragments
 */
class LuaFragment extends Fragment {
    constructor(html) {
        super(html);
    }

    async require(options = {}) {
        let self = this;

        return new Promise((resolve, reject)=>{
            requirejs(["fengari/fengari-web"], (fengari)=>{
                let exports = {};

                function resumeCorutine(L, numArgs) {
                    try {
                        //Start corutine
                        let retVal = fengari.lua.lua_resume(L, null, numArgs);

                        if(retVal === fengari.lua.LUA_OK) {
                            resolve(exports);
                        } else if(retVal !== fengari.lua.LUA_YIELD) {
                            let res = null;
                            for (let i=1; i<=fengari.lua.lua_gettop(L); i++) {
                                let ud = fengari.lua.lua_touserdata(L, i);

                                if(ud != null && ud.data != null && ud.data instanceof Error) {
                                    res = ud.data;
                                    break;
                                }
                            }

                            if(res == null) {
                                res = new Error( fengari.lua.lua_tojsstring(L, -1));
                            }

                            let parsedStack = LuaFragment.parseErrorStack(res, self);
                            EventSystem.triggerEvent("Codestrates.Fragment.Error", {
                                messages: ["Error in lua: ", parsedStack],
                                fragment: self
                            });
                            console.error(res);
                            reject(res);
                        }
                    } catch(e) {
                        console.error(e);
                        let parsedStack = new StackWalker.StackTrace("", [], e);
                        EventSystem.triggerEvent("Codestrates.Fragment.Error", {
                            messages: ["Error in lua: ", parsedStack],
                            fragment: self
                        });
                        reject(e);
                        return;
                    }
                }

                //Create a new Lua State
                let L = fengari.lauxlib.luaL_newstate();
                //Load the standardlibs
                fengari.lualib.luaL_openlibs(L);

                //Load javascript lib and pop it again
                fengari.lauxlib.luaL_requiref(L, fengari.to_luastring("js"), fengari.interop.luaopen_js, 1);
                fengari.lua.lua_pop(L, 1);

                //Setup exports variable
                fengari.interop.push(L, exports)
                fengari.lua.lua_setglobal(L, fengari.to_luastring("exports"));

                //Setup access to console
                fengari.interop.push(L, JsEvalEngine.defaultOptions(self).customConsole);
                fengari.lua.lua_setglobal(L, fengari.to_luastring("console"));

                //Setup promise await function
                fengari.lua.lua_pushjsfunction(L, (L)=>{
                    let promise = fengari.lua.lua_touserdata(L, -1).data;

                    promise.then((result) => {
                        fengari.interop.push(L, result);
                        resumeCorutine(L, 1)
                    }).catch((e)=>{
                        fengari.lua.lua_pushnil(L);
                        fengari.lua.lua_pushliteral(L, '' + e);
                        resumeCorutine(L, 2)
                    });
                    fengari.lua.lua_yield(L, 0);
                });
                fengari.lua.lua_setglobal(L, fengari.to_luastring("pwait"));

                //Prepare lua code
                let luaCode = fengari.to_luastring(this.raw);

                //Load lua code
                let retVal = fengari.lauxlib.luaL_loadstring(L, luaCode);

                let res = null;

                if(retVal === fengari.lua.LUA_ERRSYNTAX) {
                    res = new SyntaxError(fengari.lua.lua_tojsstring(L, -1));
                } else {
                    res = new Error(fengari.lua.lua_tojsstring(L, -1));
                }

                if(retVal !== fengari.lua.LUA_OK) {
                    let parsedStack = LuaFragment.parseErrorStack(res, self);
                    EventSystem.triggerEvent("Codestrates.Fragment.Error", {
                        messages: ["Error in lua: ", parsedStack],
                        fragment: self
                    });
                    console.error(res);
                    reject(res);
                    return;
                } else {
                    //Run the code
                    resumeCorutine(L, 0)
                }
            });
        });
    }

    static parseErrorStack(e, fragment) {
        let stackLines = e.stack.split("\n");
        return new StackWalker.StackTrace("", [], stackLines[0]);
    }

    async onFragmentsLoaded() {
        if(this.auto && !Fragment.disableAutorun) {
            await this.require();
        }
    }

    supportsRun() {
        return true;
    }

    supportsAuto() {
        return true;
    }

    static type() {
        return "application/x-lua";
    }
}; window.LuaFragment = LuaFragment;

Fragment.registerFragmentType(LuaFragment);
