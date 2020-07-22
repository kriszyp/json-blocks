var ITERATIONS = 2000
if (typeof chai === 'undefined') { chai = require('chai') }
assert = chai.assert
if (typeof JSONBlocks === 'undefined') { JSONBlocks = require('..') }
var serialize = JSONBlocks.serialize
var parse = JSONBlocks.parse
var BlockGenerator = JSONBlocks.BlockGenerator

suite('json-blocks basic tests', function(){
	test('serialize/parse data', function(){
		var data = {
			data: [
				{ a: 1, name: 'one', type: 'odd', isOdd: true },
				{ a: 2, name: 'two', type: 'even'},
				{ a: 3, name: 'three', type: 'odd', isOdd: true },
				{ a: 4, name: 'four', type: 'even'},
				{ a: 5, name: 'five', type: 'odd', isOdd: true },
				{ a: 6, name: 'six', type: 'even', isOdd: null }
			],
			description: 'some names',
			types: ['odd', 'even'],
			convertEnumToNum: [
				{ prop: 'test' },
				{ prop: 'test' },
				{ prop: 'test' },
				{ prop: 1 },
				{ prop: 2 },
				{ prop: [undefined] },
				{ prop: null }
			]
		}
		var generator = new BlockGenerator({ dependent: true })

		var serialized = generator.serialize(data)
		var serialized = generator.serialize(data)
		console.log({serialized})
		var parsed = generator.parse(serialized)
		assert.deepEqual(parsed, data)
	})

	test('mixed array', function(){
		var data = [
			'one',
			'two',
			'one',
			10,
			11,
			null,
			true,
			'three',
			'one'
		]
		var serialized = serialize(data)
		var parsed = parse(serialized)
		assert.deepEqual(parsed, data)
	})
})