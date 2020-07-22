var values
var index
function readObjectWithStruct(struct, length) {
	if (length === -1)
		return values[index++]
	var target = {}
	length += 2
	for (var i = 2; i < length; i++) {
		var childStruct = struct[i]
		var value = values[index++]
		if (typeof childStruct === 'string')
			target[childStruct] = value
		else {
			if (typeof value == 'number') {
				if (childStruct[1] === 2)
					// TODO: Inline this?
					value = readArrayWithStruct(childStruct, value)
				else if (childStruct[1] === 1)
					value = readObjectWithStruct(childStruct, value)
			}
			target[childStruct[0]] = value
		}
	}
	return target
}
function readArrayWithStruct(struct, length) {
	if (length === -1)
		return values[index++]
	var value, target = new Array(length)
	for (var i = 0; i < length; i++) {
		value = values[index++]
		if (typeof value == 'number')
			target[i] = readObjectWithStruct(struct, value)
		else
			target[i] = value
	}
	return target
}
function internalize(object) {
	return eval('(' + JSON.stringify(object) +')')
}
function setValues(useValues) {
	values = useValues
	index = 0
}
function parse(jsonString) {
	var hasSchema = true
	var parsed = JSON.parse(jsonString)
	if (hasSchema) {
		return parseWithStruct(parsed[1], parsed[0])
		index = 1
		return readObjectWithStruct(parsed[0], values[0])
	}
}
function createWithStruct(useValues, rootStruct) {
	values = useValues
	index = 1
	return readObjectWithStruct(rootStruct, values[0])
}
function parseProgressive(jsonBlocksString, options) {
	var jsonBlocks = jsonBlocksString.split('\n')
	var structure = options && options.structure
	for (var i = 0, l = jsonBlocks.length; i < l; i++) {
		var jsonBlock = jsonBlocks[i]
		switch(jsonBlock[0]) {
			case 's':
				struct = JSON.parse(jsonBlock.slice(1))
				continue;
		}
		var parsed = JSON.parse(jsonBlock)
		if (structure)
			parsed = readObjectWithStruct(parsed, structure)
	}
}
exports.readArrayWithStruct = readArrayWithStruct
exports.readObjectWithStruct = readObjectWithStruct
exports.parse = parse
exports.parseProgressive = parseProgressive
exports.createWithStruct = createWithStruct