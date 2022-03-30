// @ts-check

import * as flags from "lib/flags.js"
import * as logging from "lib/logging.js"
import * as hnet from "lib/hacknet.js"

const helpDesc = `Upgrade hacknet nodes indefinitely

This program will upgrade hacknet nodes indefinitely, choosing the best
upgrade each time.`

/**
 * Get the ratio for purchasing a new node
 * 
 * @param {NS} ns The Netscript context
 * @param {number} baseProd The base production of a new node
 * @returns {{cost: number, action: string, ratio: number, nodeIndex: number}}
 */
function getPurchaseNodeRatios(ns, baseProd) {
	const cost = ns.hacknet.getPurchaseNodeCost()
	return {
		"cost": cost,
		"action": "purchase",
		"ratio": baseProd / cost,
		"nodeIndex": -1,
	}
}

/**
 * Get the upgrade ratio for a node with the given action
 * 
 * @param {NS} ns The Netscript context
 * @param {string} action The action to calculate
 * @param {number} index The index of the hacknet node
 * @param {NodeStats} node The hacknet node stats
 * @param {number} prodMult The hacknet production multiplier
 * @returns {{cost: number, action: string, ratio: number, nodeIndex: number}}
 */
function getUpgradeRatio(ns, action, index, node, prodMult) {
	let cost = 0
	let newLevel = node.level
	let newRAM = node.ram
	let newCores = node.cores
	switch(action) {
	case "ram":
		cost = ns.hacknet.getRamUpgradeCost(index, 1)
		newRAM *= 2
		if(newRAM > 64) {
			return {action: action, cost: Infinity, ratio: 0, nodeIndex: index}
		}
		break
	case "cores":
		cost = ns.hacknet.getCoreUpgradeCost(index, 1)
		newCores++
		if(newCores > 16) {
			return {action: action, cost: Infinity, ratio: 0, nodeIndex: index}
		}
		break
	case "level":
		cost = ns.hacknet.getLevelUpgradeCost(index, 1)
		newLevel++
		if(newLevel > 200) {
			return {action: action, cost: Infinity, ratio: 0, nodeIndex: index}
		}
		break
	default:
		throw new Error("invalid action " + JSON.stringify(action))
	}

	const ratio = (hnet.production(newLevel, newRAM, newCores, prodMult) - node.production) / cost

	return {
		action: action,
		cost: cost,
		ratio: ratio,
		nodeIndex: index
	}
}

/**
 * Calculate the best upgrade that may be performed for a hacknet node.
 * 
 * @param {NS} ns The Netscript context
 * @param {number} index The index of the hacknet node to consider
 * @param {number} prodMult The production multiplier of hacknet nodes
 * @returns {{cost: number, action: string, ratio: number, nodeIndex: number}}
 */
function getBestUpgrade(ns, index, prodMult) {
	const node = ns.hacknet.getNodeStats(index)
	
	const level = getUpgradeRatio(ns, "level", index, node, prodMult)
	const ram = getUpgradeRatio(ns, "ram", index, node, prodMult)
	const cores = getUpgradeRatio(ns, "cores", index, node, prodMult)
	return level.ratio > ram.ratio ? (level.ratio > cores.ratio ? level : cores) : (ram.ratio > cores.ratio ? ram : cores)
}

/**
 * @param {NS} ns
 */
export async function main(ns) {
	logging.InitGlobal(ns)
	let logger = logging.GlobalLogger()

    let parser = new flags.Parser(ns)
    parser.description = helpDesc
	parser.integer("delay").shortOpt('d').default("10").help("How long to wait between upgrades in milliseconds")
	parser.number("purchase-adjust").shortOpt('P').default("1.0").help("An adjustment to make purchasing servers more or less likely")
	parser.counter("verbose").shortOpt('v').help("Enable verbose logging")
	parser.flag("quiet").shortOpt('q').help("Disable logging output")
	parser.flag("dry-run").shortOpt('D').help("Don't actually perform any actions, just print them out")
	parser.number("money-factor").shortOpt('M').default("1.0").help("Maximum fraction of player money to use")
	const argdata = parser.parse(ns.args)

	ns.disableLog("sleep")

	/** @type {number} */
	const iterwait = argdata.flags['delay']
	/** @type {number} */
	const purchaseAdjust = argdata.flags['purchase-adjust']
	const dryrun = argdata.flags['dry-run']
	/** @type {number} */
	const moneyFactor = argdata.flags['money-factor']

	if(argdata.flags['quiet']) {
		logger.termVerbosity(0)
	}else {
		logger.termVerbosity(argdata.flags['verbose']+1)
	}
	// Include everything in process log
	logger.logVerbosity(2)

	// The current hacknet production multiplier
	const ProdMult = ns.getHacknetMultipliers().production;
	// The production increase by adding a new hacknet node
	const BaseProd = hnet.production(1, 1, 1, ProdMult)

	while (true) {
		let best = getPurchaseNodeRatios(ns, BaseProd)
		// Make purchasing a server more or less likely, based on purchaseAdjust
		best.ratio *= purchaseAdjust

		// loop through all nodes, updating best if a better action is found
		for (let index = 0; index < ns.hacknet.numNodes(); index++) {
			let node = getBestUpgrade(ns, index, ProdMult)
			if(node.ratio > best.ratio) {
				best = node
			}
		}

		// Handle our cost being literally infinite
		if(best.cost === Infinity) {
			logger.tInfoV(2, "Cost to purchase upgrade too high; exiting")
			break
		}

		if(ns.getPlayer().money < best.cost) {
			logger.tInfoV(2, "Not enough money for upgrade, waiting until money is available")
		}
		while ((ns.getPlayer().money * moneyFactor) < best.cost) {
			// While we don't have enough money, wait for 50 ms (updates 20 times a second)
			await ns.sleep(50);
		}
		// Perform the best action
		switch(best.action) {
		case "purchase":
			logger.tInfoV(2, "Purchasing new node")
			if(!dryrun) {
				ns.hacknet.purchaseNode();
			}
			break
		case "level":
			logger.tInfoV(2, "Upgrading hacknet node %d level", best.nodeIndex)
			if(!dryrun) {
				ns.hacknet.upgradeLevel(best.nodeIndex, 1)
			}
			break
		case "ram":
			logger.tInfoV(2, "Upgrading hacknet node %d RAM", best.nodeIndex)
			if(!dryrun) {
				ns.hacknet.upgradeRam(best.nodeIndex, 1)
			}
			break
		case "cores":
			logger.tInfoV(2, "Upgrading hacknet node %d cores", best.nodeIndex)
			if(!dryrun) {
				ns.hacknet.upgradeCore(best.nodeIndex, 1)
			}
			break
		}

		if(dryrun) {
			break
		}
		// Sleep so we don't kill the game
		await ns.sleep(iterwait);
	}
}