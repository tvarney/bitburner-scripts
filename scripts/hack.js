/**
 * @param {NS} ns
 */
export async function main(ns) {
    const server = ns.args[0]
    const delay = parseInt(ns.args[1])
    await ns.sleep(delay)
    await ns.hack(server)
}