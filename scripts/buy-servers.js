import * as flags from "/scripts/flags.js"

import {
    leftpad,
    getThreads
} from "./utils.js"

const MaxPower = 20

class Purchaser {
    /**
     * 
     * @param {NS} ns 
     */
    constructor(ns) {
        this.ns = ns
        this.baseRAM = 8
        this.basename = "pserve-"
        this.script = null
        this.args = []
        this.moneyFactor = 0.9
        this.delay = 1000
        this.maxThreads = -1

        // The maximum number of servers you can purchase
        this.maxServers = ns.getPurchasedServerLimit()
    }

    async purchaseInitial() {
        // Get cost of an 8gb server
        const price = this.ns.getPurchasedServerCost(this.baseRAM)
        const sWidth = this.maxServers.toString().length
        const scriptMem = this.script ? this.ns.getScriptRam(this.script) : 1
        const threads = getThreads(this.baseRAM, scriptMem, this.maxThreads)

        let names = []
        for(let i = 0; i < this.maxServers; ++i) {
            names.push(this.basename + leftpad(i.toString(), "0", sWidth))
        }

        for(let name of names) {
            if(this.ns.serverExists(name)) {
                // Skip existing servers
                continue
            }
            // Ensure we won't drain all the money - wait until we have enough
            while(this.ns.getPlayer().money * this.moneyFactor < price) {
                await this.ns.sleep(this.delay)
            }
            let newBox = this.ns.purchaseServer(name, this.baseRAM)
            this.ns.tprintf("INFO Purchased %v GB server %s", this.baseRAM, newBox)
            if(this.script) {
                await this.ns.scp(this.script, newBox)
                this.ns.exec(this.script, newBox, threads, ...this.args)
                this.ns.tprintf("INFO Exec `%s %s` on %s with %v threads", this.script, JSON.stringify(this.args), newBox, threads)
            }
        }
    }

    async purchaseUpgrades() {
        const scriptMem = this.script ? this.ns.getScriptRam(this.script) : 1

        for(let ramPower = 4; ramPower < MaxPower; ramPower++) {
            // Get actual RAM value from ramPower
            let ram = Math.pow(2, ramPower)

            // Get threads we can run
            let threads = getThreads(ram, scriptMem, this.maxThreads)

            // Get price for the RAM we want to do this iteration
            let price = this.ns.getPurchasedServerCost(ram)

            // Get list of servers
            let servers = this.ns.getPurchasedServers()

            // Iterate the servers, upgrading as possible
            for(let name of servers) {
                let serverRam = this.ns.getServerMaxRam(name)
                if(serverRam >= ram) {
                    // Skip any server with more RAM than we're buying now
                    continue
                }

                // Wait until we have enough money
                while(this.ns.getPlayer().money * this.moneyFactor < price) {
                    await this.ns.sleep(this.delay)
                }
                // Kill any running scripts
                this.ns.killall(name)
                // Delete the server
                this.ns.deleteServer(name)
                // Purchase new server
                this.ns.purchaseServer(name, ram)
                this.ns.tprintf("INFO Upgraded %s to %v GB server", name, ram)
                if(this.script) {
                    // Start the script on this server
                    await this.ns.scp(this.script, name)
                    this.ns.exec(this.script, name, threads, ...this.args)
                    this.ns.tprintf("INFO Exec `%s %s` on %s with %v threads", this.script, JSON.stringify(this.args), name, threads)
                }
            }
        }
    }
}

/**
 * @param {NS} ns
 */
export async function main(ns) {
    let parser = new flags.Parser(ns)
    parser.number("money-factor").shortOpt('m').default("0.9")
    parser.integer("max-threads").shortOpt('T').default("-1")
    parser.integer("delay").shortOpt('d').default("1000")
    parser.integer("base-ram").shortOpt('R').default("8")
    parser.string("base-name").shortOpt('N').default("pserv-")

    let flagdata = parser.parse(ns.args)
    // Handle args
    const script = (flagdata.args.length > 0) ? flagdata.args.shift() : null
    const scriptargs = flagdata.args

    let prog = new Purchaser(ns)
    prog.script = script
    prog.args = scriptargs
    prog.baseRAM = flagdata.flags['base-ram']
    prog.basename = flagdata.flags['base-name']
    prog.delay = flagdata.flags['delay']
    prog.maxThreads = flagdata.flags['max-threads']
    prog.moneyFactor = Math.max(Math.min(flagdata.flags['money-factor'], 1.0), 0.01)

    await prog.purchaseInitial()
    await prog.purchaseUpgrades()
}