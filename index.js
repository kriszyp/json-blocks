/*
Types in a struct:
0 - Pass through, value treated as is (can replaced with a direct key, but this is used for tentative slots)
1 - Defining an object
2 - Defining an array of object
5 - Defining a custom type

6 - Escape out of type

{
	"prop1": {
		foo: "value",
	"prop2": 533,
	"prop3": [{
		"bar": 44
	}]
}
[0, ["prop1", 0, "foo"], "prop2", ["prop3", 1, "bar"]]

[3, 1,"value",533,1,1,44]


*/
let parser = require('./parse')
let parse = parser.parse
let readObjectWithStruct = parser.readObjectWithStruct
let readArrayWithStruct = parser.readArrayWithStruct
let createWithStruct = parser.createWithStruct
let blockDeferrer
let asJSON = Symbol('asJSON')
function BlockGenerator(options) {
	function blockFromJSON(jsonString) {
		let handler = new BlockFromJSONHandler()
		handler.json = jsonString
		return new Proxy({}, handler)
	}
	function blockFromObject(object) {
		let target = new BlockFromObject()
		return Object.assign(target, object)
	}
	class BlockFromObject {
		toJSON() {
			if (blockDeferrer) {
				return blockDeferrer(this)
			} else {
				return this
			}
		}
	}
	let propertyHandler = BlockFromObject.prototype

	class BlockFromJSONHandler {
		get(target, key) {
			let value = target[key]
			if (value)
				return value
			if (propertyHandler[key]) {
				return propertyHandler[key]
			}
			if (this.isParsed)
				return value
			parse(this.json, target)
			this.isParsed = true
			return target[key]
		}
	}
	let isStructureUpdated
	let values
	let dependent = options.dependent
	let rootStruct = [10]
	function writeRoot(value) {
		if (rootStruct[1] == 1)
			writeObjectWithStruct(value, rootStruct)
		else if (rootStruct[1] == 2)
			writeArrayWithStruct(value, rootStruct)
		else {
			if (value.constructor == Array && value[0] && value[0].constructor == Object) {
				rootStruct[1] = 2
				writeArrayWithStruct(value, rootStruct)
			} else if (value.constructor == Object) {
				rootStruct[1] = 1
				writeObjectWithStruct(value, rootStruct)
			} else
				throw new Error('Unknown object type')
		}
	}
	function writeObjectWithStruct(object, struct) {
		if (object.constructor !== Object) {
			values.push(-1)
			values.push(object)
			return -1
		}
		let index = values.length
		let initialSlot = index++
		values.push(0) // initial slot for length
		let failedToSequence
		let structIndex = 2
		let childScore, score = 0
		for (let key in object) {
			let value = object[key]
			let childStruct = struct[structIndex]
			if (typeof childStruct == 'string') {
				if (childStruct == key) {
					// fast path
					values.push(value)
				} else {
					// break out and just write the current object
					values.splice(initialSlot, values.length - initialSlot, object)
					return 0
				}
			} else if(childStruct) {
				if (childStruct[0] == key) {
					if (childStruct[1] === 2) { // an array
						if (value && value.constructor == Array) {
							// TODO: Consider inlining
							writeArrayWithStruct(value, childStruct)
						} else if (typeof value == 'number') {
							values.push(-1)
							values.push(value)
						} else
							values.push(value)
					} else if (childStruct[1] == 1) {
						if (value && value.constructor == Object) {
							writeObjectWithStruct(value, childStruct)
						} else if (typeof value == 'number') {
							values.push(-1)
							values.push(value)
						} else
							values.push(value)
					} else {
						// right key, but unknown type
						if (typeof value == 'object') {
							if (!value)
								values.push(value)
							else if (value.constructor == Object) {
								childScore = writeObjectWithStruct(value, childStruct)
								if (childScore) {
									childStruct[1] = 1
								}
							} else if (value.constructor == Array) {
								if (value[0] && value[0].constructor == Object) {
									childStruct[1] = 2
									childScore = writeArrayWithStruct(value, childStruct)
								} else if (value[0]) {
									struct[structIndex] = key
									values.push(value)
								} else {
									childStruct[1] = 0
									values.push(value)
								}
							} else {
								childStruct[1] = 0
								values.push(value)								
							}
						} else {
							if (value !== undefined)
								struct[structIndex] = key
							values.push(value)
						}
					}
				} else if (childStruct.tentativeKey) {
					if (childStruct.tentativeKey == key)
						childStruct.matches++
					childStruct.attempts++
				} else {
					// break out and just write the current object
					values.splice(initialSlot, values.length - initialSlot, object)
					return 0
				}
			} else {
				if (typeof value == 'object') {
					if (!value)
						values.push(value)
					else if (value.constructor == Array) {
						if (value[0] && value[0].constructor == Object) {
							childStruct = struct[structIndex] = [key, 2]
							childScore = writeArrayWithStruct(value, childStruct)
						} else if (value[0]) {
							struct[structIndex] = key
							values.push(value)
						} else {
							childStruct = struct[structIndex] = [key, 0]
							values.push(value)
						}
						/*if (!childScore) {
							childStruct[1] = 2
						}*/
					} else if (value.constructor == Object) {
						childStruct = struct[structIndex] = [key, 1]
						childScore = writeObjectWithStruct(value, childStruct)
						/*if (!childScore) {
							childStruct[1] = 1
						}*/
					} else {
						childStruct = struct[structIndex] = [key, 0]
						values.push(value)

						//throw new Error('Unknown object type')
					}
				} else {
					struct[structIndex] = key
					//struct[structIndex] = [key, 0]
				}
				failedToSequence = true
			}
			structIndex++
		}
		if (failedToSequence) {
			values.splice(initialSlot, values.length - initialSlot, object)
			return 0
		} {
			values[initialSlot] = structIndex - 2
			return 1
		}
	}
	function writeArrayWithStruct(array, struct) {
		var l = array.length
		values.push(l)
		var value, score = 0
		for (let i = 0; i < l; i++) {
			value = array[i]
			if (value && typeof value == 'object')
				score += writeObjectWithStruct(value, struct)
			else {
				values.push(value)
			}
		}
		return score
	}
	function parse(jsonString) {
		return createWithStruct(JSON.parse(jsonString), rootStruct)
	}
	function serialize(value) {
		if (value && typeof value == 'object') {
			try {
				let deferredBlocks
				blockDeferrer = function() {
					if (!deferredBlocks) {
						deferredBlocks = []
					}
					deferredBlocks.push()
				}
				values = []
				writeRoot(value)
				let rootString = JSON.stringify(values)
				if (deferredBlocks) {
					for (var i = 0; i < deferredBlocks.length; i++) {
						writeToStream(deferredBlocks[i][asJSON])
					}
				}
				if (dependent) {
					return rootString
				}
				let struct = JSON.stringify(rootStruct)
				return '\t['  + struct + ',' + rootString + ']'
			} finally {
				blockDeferrer = null
			}
		}
		return JSON.stringify(value)
	}
	return {
		parse,
		serialize,
		blockFromJSON,
		blockFromObject,
	}
}

function serialize(value) {
	return blockGenerator().serialize(value)
}
function createStruct(object) {
	let struct = []
	for (let key in object)	{
		let value = object[key]
		let childStruct
		if (value && typeof value == 'object') {
			childStruct = {
				key
			}
			if (value instanceof Array) {
				if (value[0] && typeof value[0] == 'object') {
					childStruct.struct = true
					childStruct.items = createStruct(value[0])
				}
			} else {
				childStruct.struct = true
				childStruct.structure = createStruct(value)
			}
		} else {
			childStruct = key
		}
		struct.push(childStruct)
	}
	return struct
}
exports.BlockGenerator = BlockGenerator
exports.serialize = serialize
exports.parse = parse