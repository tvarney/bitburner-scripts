// @ts-check

/**
 * @param {NS} ns
 */
export async function main(ns) {
    const server = ns.args[0].toString()
    const delay = parseInt(ns.args[1].toString())
    await ns.sleep(delay)
    await ns.hack(server)
}