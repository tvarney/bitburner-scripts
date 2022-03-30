// @ts-check

/**
 * Calculate the production of a hacknet node with the given traits
 * 
 * @param {number} level The level of the hacknet node
 * @param {number} ram The RAM of the hacknet node
 * @param {number} cores The cores of the hacknet node
 * @param {number} [mult=3.0] The hacknet multiplier to use
 * @returns The production of a hacknet node with these traits
 */
export function production(level, ram, cores, mult=3.0) {
    return mult * ((level * 1.5) * Math.pow(1.035, ram - 1) * ((cores + 5) / 6))
}