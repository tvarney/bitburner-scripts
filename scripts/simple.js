// @ts-check

import * as flags from "lib/flags.js"

/**
 * @param {NS} ns
 */
export async function main(ns) {
    let p = new flags.Parser(ns)
    p.argsString = "HOSTNAME"
    p.description = "Run a simple weaken-grow-hack loop against the given server."

    p.number("money-factor").shortOpt('m').default("1.0").help("A factor between 0 and 1 of server maxMoney to grow to")
    p.integer("security-offset").shortOpt("s").default("5").help("The amount above minSecurity to stop weakening at")

    let data = p.parse(ns.args)

    let hostname = (data.args.length > 0) ? data.args[0] : "self"
    if(hostname == "self") {
        hostname = ns.getHostname()
    }
    const maxSecurity = ns.getServerMinSecurityLevel(hostname) + data.flags['security-offset']
    const minMoney = ns.getServerMaxMoney(hostname) * data.flags['money-factor']
    while(true) {
        if(ns.getServerSecurityLevel(hostname) > maxSecurity) {
            await ns.weaken(hostname)
        }else if(ns.getServerMoneyAvailable(hostname) < minMoney) {
            await ns.grow(hostname)
        }else {
            await ns.hack(hostname)
        }
    }
}