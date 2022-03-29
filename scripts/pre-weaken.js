// @ts-check

/**
 * @param {NS} ns
 */
export async function main(ns) {
    const hostname = ns.args[0].toString()
    const minSecurity = ns.getServerMinSecurityLevel(hostname)
    while(ns.getServerSecurityLevel(hostname) > minSecurity) {
        await ns.weaken(hostname)
    }
}