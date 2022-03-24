
var ns

/**
 * 
 * @param {NS} newNS 
 */
export function initDebug(newNS) {
    ns = newNS
}

/**
 * 
 * @param {any} msg 
 */
export function debug(msg) {
    if(ns) {
        ns.tprint("DEBUG " + msg)
    }
}

/**
 * Get total number of threads that can be used
 * 
 * @param {number} freeMem 
 * @param {number} scriptMem 
 * @param {number} maxThreads 
 * @returns The number of threads to use
 */
 export function getThreads(freeMem, scriptMem, maxThreads=-1) {
    const threads = Math.floor(freeMem / scriptMem)
    return maxThreads > 0 ? Math.min(maxThreads, threads) : threads
}

/**
 * Left-pad the given string value
 * 
 * @param {string} value
 * @param {string} padding
 * @param {number} width
 */
export function leftpad(value, padding, sWidth) {
    const pad = (padding.length > 0) ? padding[0] : " "
    let prefix = ""
    for(let i = 0; i < (sWidth - value.length); i++) {
        prefix += pad
    }
    return prefix + value
}