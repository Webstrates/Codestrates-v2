/**
 *  EventSystem
 *  General system for registering and handling events
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

/**
 * Handles sending / recieving named events
 * @hideconstructor
 */
class EventSystem {
    /**
     * Register a callback to be called when the given event is triggered
     *
     * @example
     * registerEventCallback("myEvent", ({detail: detail})=>{
     *     //My event has triggered
     *     console.log("MyEvent triggered with details:", detail);
     * });
     *
     * @param {string} eventName - The name of the event to register
     * @param {Function} callback - The callback to call when the event triggers
     *
     * @returns {object} - An object with a method delete(), that removes the registered callback
     */
    static registerEventCallback(eventName, callback) {
        let callbacks = EventSystem.callbackMap.get(eventName);
        if(callbacks == null){
            callbacks = new Set();
            EventSystem.callbackMap.set(eventName, callbacks);
        }

        callbacks.add(callback);

        return {
            delete: () => {
                callbacks.delete(callback);
            }
        };
    }

    /**
     * Trigger the event with the given name
     *
     * @example
     * triggerEvent("myEvent", {
     *     someData: "MyEventData"
     * });
     *
     * @param {string} eventName - The name of the event to trigger
     * @param {*} [detail] - The event detail to supply to the CustomEvent
     * @returns {boolean} - true/false depending on if any callback asked to prevent default
     */
    static triggerEvent(eventName, detail = null){
        let event = new CustomEvent(eventName, {
            detail: detail
        });

        let preventDefault = false;

        let callbacks = EventSystem.callbackMap.get(eventName);
        if(callbacks != null) {
            for(let callback of callbacks) {
                if(callback(event) === true) {
                    preventDefault = true;
                }
            }
        }

        return preventDefault;
    }

    /**
     * Trigger the event with the given name
     *
     * @example
     * triggerEvent("myEvent", {
     *     someData: "MyEventData"
     * });
     *
     * @param {string} eventName - The name of the event to trigger
     * @param {*} [detail] - The event detail to supply to the CustomEvent
     * @returns {Promise<boolean>} - true/false depending on if any callback asked to prevent default
     */
    static async triggerEventAsync(eventName, detail = null){
        let event = new CustomEvent(eventName, {
            detail: detail
        });

        let preventDefault = false;

        let callbacks = EventSystem.callbackMap.get(eventName);
        let waitPromises = [];
        if(callbacks != null) {
            for(let callback of callbacks) {
                let result = callback(event);
                if(result instanceof Promise) {
                    waitPromises.push(result);
                } else if(result === true) {
                    preventDefault = true;
                }
            }
        }

        if(waitPromises.length > 0) {
            let waitResult = await Promise.all(waitPromises);

            if (waitResult.find((result) => {
                return result === true
            })) {
                preventDefault = true;
            }
        }

        return preventDefault;
    }}

EventSystem.callbackMap = new Map();

window.EventSystem = EventSystem;
