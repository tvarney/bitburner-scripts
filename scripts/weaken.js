// @ts-check

/**
 * @param {NS} ns
 */
export async function main(ns) {
    const hostname = ns.args[0].toString()
    const delay = parseInt(ns.args[1].toString())
    await ns.sleep(delay)
    await ns.weaken(hostname)
}