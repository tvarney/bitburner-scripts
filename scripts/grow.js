/**
 * @param {NS} ns
 */
export async function main(ns) {
    const hostname = ns.args[0]
    const delay = parseInt(ns.args[1])
    await ns.sleep(delay)
    await ns.grow(hostname)
}