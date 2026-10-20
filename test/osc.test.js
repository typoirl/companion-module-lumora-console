import { test } from 'node:test'
import assert from 'node:assert/strict'
import { encodeMessage, decodePacket, slipEncode, SlipDecoder, argsFrom } from '../src/osc.js'
import { applyMessage, emptyState } from '../src/state.js'
import { parseValues } from '../src/actions.js'

test('messages round trip', () => {
	const buf = encodeMessage('/exec/1/201/fader', [
		{ type: 'i', value: 50 },
		{ type: 'f', value: 0.25 },
		{ type: 's', value: 'Group 1 At Full' },
		{ type: 'T' },
	])
	assert.equal(buf.length % 4, 0)
	const [m] = decodePacket(buf)
	assert.equal(m.address, '/exec/1/201/fader')
	assert.deepEqual(m.args, [50, 0.25, 'Group 1 At Full', true])
})

test('no arguments', () => {
	const [m] = decodePacket(encodeMessage('/exec/201/go'))
	assert.equal(m.address, '/exec/201/go')
	assert.deepEqual(m.args, [])
})

test('bundles are flattened', () => {
	const a = encodeMessage('/out/gm', [{ type: 'f', value: 1 }])
	const b = encodeMessage('/out/page', [{ type: 'i', value: 2 }])
	const size = (x) => {
		const s = Buffer.alloc(4)
		s.writeInt32BE(x.length)
		return s
	}
	const bundle = Buffer.concat([Buffer.from('#bundle\0'), Buffer.alloc(8), size(a), a, size(b), b])
	const msgs = decodePacket(bundle)
	assert.deepEqual(
		msgs.map((m) => m.address),
		['/out/gm', '/out/page'],
	)
})

test('SLIP frames survive being split and escaped', () => {
	const p1 = encodeMessage('/a', [{ type: 'i', value: 0xc0db }])
	const p2 = encodeMessage('/b')
	const stream = Buffer.concat([slipEncode(p1), slipEncode(p2)])
	const dec = new SlipDecoder()
	const got = [...dec.push(stream.subarray(0, 7)), ...dec.push(stream.subarray(7))]
	assert.equal(got.length, 2)
	assert.deepEqual(decodePacket(got[0])[0].args, [0xc0db])
	assert.equal(decodePacket(got[1])[0].address, '/b')
})

test('argument types from values', () => {
	assert.deepEqual(argsFrom([1, 0.5, 'x', false]), [
		{ type: 'i', value: 1 },
		{ type: 'f', value: 0.5 },
		{ type: 's', value: 'x' },
		{ type: 'F' },
	])
	assert.deepEqual(parseValues('1 -2 0.5 "two words" go'), [1, -2, 0.5, 'two words', 'go'])
})

test('feedback fills the state', () => {
	const s = emptyState()
	applyMessage(s, { address: '/out/exec/1/201/name', args: ['Pars'] })
	applyMessage(s, { address: '/out/exec/1/201/cue', args: ['1 Blue wash'] })
	const r = applyMessage(s, { address: '/out/exec/1/201/button/2', args: [1] })
	assert.equal(s.execs.get(201).name, 'Pars')
	assert.equal(s.execs.get(201).buttons[1], true)
	assert.equal(r.variables.exec_201_cue, '1 Blue wash')
	assert.ok(r.feedbacks.has('exec_button_lit'))
	// Another page's executors aren't this page's.
	applyMessage(s, { address: '/out/exec/2/202/name', args: ['Other'] })
	assert.equal(s.execs.has(202), false)
	// Changing page forgets them until Lumora sends the new page's.
	const p = applyMessage(s, { address: '/out/page', args: [2] })
	assert.equal(p.pageChanged, true)
	assert.equal(s.execs.get(201).name, '')
	applyMessage(s, { address: '/out/gm', args: [0.5] })
	applyMessage(s, { address: '/out/blackout', args: [1] })
	assert.equal(s.gm, 0.5)
	assert.equal(s.blackout, true)
})

test('definitions build, and presets only use actions and feedbacks that exist', async () => {
	const { actionDefinitions } = await import('../src/actions.js')
	const { feedbackDefinitions } = await import('../src/feedbacks.js')
	const { presetDefinitions } = await import('../src/presets.js')
	const sent = []
	const self = {
		label: 'lumora',
		state: emptyState(),
		send: (a, args) => sent.push([a, args]),
		parseVariablesInString: async (s) => s,
	}
	const actions = actionDefinitions(self)
	const feedbacks = feedbackDefinitions(self)
	const presets = presetDefinitions(self)
	for (const p of Object.values(presets)) {
		if (p.type !== 'button') continue
		for (const step of p.steps)
			for (const list of [step.down, step.up, step.rotate_left ?? [], step.rotate_right ?? []])
				for (const a of list) assert.ok(actions[a.actionId], `${p.name}: ${a.actionId}`)
		for (const f of p.feedbacks) assert.ok(feedbacks[f.feedbackId], `${p.name}: ${f.feedbackId}`)
	}
	// A few actions send what Lumora expects.
	await actions.exec_key.callback({ options: { page: 0, executor: 201, button: 1, edge: 'press' } })
	await actions.exec_fader.callback({ options: { page: 2, executor: 205, level: 50 } })
	await actions.preset.callback({ options: { pool: 4, preset: 2 } })
	await actions.command.callback({ options: { command: 'Go Executor 201', fresh: false } })
	assert.deepEqual(sent, [
		['/exec/201/button/1', [{ type: 'i', value: 1 }]],
		['/exec/2/205/fader', [{ type: 'i', value: 50 }]],
		['/preset/4/2/fire', []],
		['/cmd', [{ type: 's', value: 'Go Executor 201' }]],
	])
})
