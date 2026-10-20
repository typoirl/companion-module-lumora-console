import { COLORS } from './feedbacks.js'

const style = (text, extra = {}) => ({
	text,
	size: 'auto',
	color: COLORS.white,
	bgcolor: COLORS.panel,
	...extra,
})

const button = (category, name, text, down, up = [], feedbacks = [], extra = {}) => ({
	type: 'button',
	category,
	name,
	style: style(text, extra.style),
	options: extra.options,
	feedbacks,
	steps: [{ down, up, ...(extra.rotate || {}) }],
})

export function presetDefinitions(self) {
	const v = (id) => `$(${self.label}:${id})`
	const presets = {}

	// Executor keys on the current page: the sequence's name and live cue, lit like the console.
	for (const [first, category] of [
		[201, 'Faders 201–210: key 1'],
		[101, 'Keys 101–110'],
	]) {
		for (let n = first; n < first + 10; n++) {
			presets[`exec_${n}_key`] = button(
				category,
				`Executor ${n}`,
				`${n}\\n${v(`exec_${n}_name`)}\\n${v(`exec_${n}_cue`)}`,
				[{ actionId: 'exec_key', options: { page: 0, executor: n, button: 1, edge: 'press' } }],
				[{ actionId: 'exec_key', options: { page: 0, executor: n, button: 1, edge: 'release' } }],
				[
					{
						feedbackId: 'exec_running',
						options: { executor: n },
						style: { bgcolor: COLORS.running, color: COLORS.white },
					},
					{
						feedbackId: 'exec_button_lit',
						options: { executor: n, button: 1 },
						style: { bgcolor: COLORS.live, color: COLORS.black },
					},
				],
				{ style: { size: '14' } },
			)
		}
	}
	for (let n = 201; n <= 210; n++) {
		for (const [what, label] of [
			['go', 'Go'],
			['goback', 'Back'],
			['pause', 'Pause'],
			['off', 'Off'],
		]) {
			presets[`exec_${n}_${what}`] = button(
				`Faders 201–210: ${label}`,
				`${label} ${n}`,
				`${label}\\n${v(`exec_${n}_name`)}`,
				[{ actionId: 'exec_playback', options: { page: 0, executor: n, what } }],
				[],
				what === 'go'
					? [{ feedbackId: 'exec_running', options: { executor: n }, style: { bgcolor: COLORS.running } }]
					: [],
				{ style: { size: '14' } },
			)
		}
		// A knob (or rotary button) moves the fader; pressing it takes it to full or out.
		presets[`exec_${n}_fader`] = {
			type: 'button',
			category: 'Faders 201–210: fader (rotary)',
			name: `Fader ${n}`,
			style: style(`${v(`exec_${n}_name`)}\\n${v(`exec_${n}_fader`)}%`, { size: '14' }),
			options: { rotaryActions: true },
			feedbacks: [
				{
					feedbackId: 'exec_fader_above',
					options: { executor: n, level: 0 },
					style: { bgcolor: COLORS.live, color: COLORS.black },
				},
			],
			steps: [
				{
					down: [{ actionId: 'exec_fader', options: { page: 0, executor: n, level: 100 } }],
					up: [],
					rotate_left: [{ actionId: 'exec_fader_step', options: { executor: n, step: -5 } }],
					rotate_right: [{ actionId: 'exec_fader_step', options: { executor: n, step: 5 } }],
				},
				{
					down: [{ actionId: 'exec_fader', options: { page: 0, executor: n, level: 0 } }],
					up: [],
					rotate_left: [{ actionId: 'exec_fader_step', options: { executor: n, step: -5 } }],
					rotate_right: [{ actionId: 'exec_fader_step', options: { executor: n, step: 5 } }],
				},
			],
		}
	}

	// Command keys.
	const keys = [
		['Go', COLORS.running],
		['GoBack'],
		['Pause'],
		['Clear'],
		['ClearAll'],
		['Store', COLORS.alert],
		['Update'],
		['Delete'],
		['Copy'],
		['Move'],
		['Label'],
		['Assign'],
		['Fixture'],
		['Group'],
		['Preset'],
		['Cue'],
		['Sequence'],
		['Executor'],
		['Effect'],
		['At'],
		['Thru'],
		['Full'],
		['+'],
		['-'],
		['.'],
		['Enter'],
		['Back'],
		['Next'],
		['Prev'],
		['NextY'],
		['Highlight'],
		...'0123456789'.split('').map((d) => [d]),
	]
	for (const [k, bg] of keys) {
		presets[`key_${k}`] = button('Command keys', k, k, [{ actionId: 'key', options: { key: k } }], [], [], {
			style: bg ? { bgcolor: bg } : { size: k.length > 6 ? '14' : '18' },
		})
	}
	presets.cmd_line = {
		type: 'text',
		category: 'Command keys',
		name: 'Command line',
		text: `The command line is in the ${v('command_line')} variable.`,
	}
	presets.undo = button('Command keys', 'Undo', 'Undo', [{ actionId: 'undo', options: { what: 'undo' } }])
	presets.redo = button('Command keys', 'Redo', 'Redo', [{ actionId: 'undo', options: { what: 'redo' } }])

	// Masters: tap tempo (or reset) with the name and value.
	for (let n = 1; n <= 10; n++) {
		presets[`master_${n}_key`] = button(
			'Masters',
			`Master ${n} key`,
			`${v(`master_${n}_name`)}\\n${v(`master_${n}_value`)}`,
			[{ actionId: 'master', options: { master: n, what: 'key' } }],
			[],
			[],
			{ style: { size: '14' } },
		)
	}

	// Grand master, blackout, page, programmer fade.
	presets.blackout = button(
		'Grand master and pages',
		'Blackout',
		'BO',
		[{ actionId: 'blackout', options: { mode: 'toggle' } }],
		[],
		[{ feedbackId: 'blackout_on', options: {}, style: { bgcolor: COLORS.alert, color: COLORS.white } }],
	)
	presets.gm = {
		type: 'button',
		category: 'Grand master and pages',
		name: 'Grand master (rotary)',
		style: style(`GM\\n${v('grand_master')}%`),
		options: { rotaryActions: true },
		feedbacks: [
			{
				feedbackId: 'grand_master_below',
				options: { level: 100 },
				style: { bgcolor: COLORS.alert, color: COLORS.white },
			},
		],
		steps: [
			{
				down: [{ actionId: 'grand_master', options: { level: 100 } }],
				up: [],
				rotate_left: [{ actionId: 'grand_master_step', options: { step: -5 } }],
				rotate_right: [{ actionId: 'grand_master_step', options: { step: 5 } }],
			},
		],
	}
	presets.page_prev = button('Grand master and pages', 'Previous page', `◀ Page\\n${v('page')}`, [
		{ actionId: 'page', options: { mode: 'prev' } },
	])
	presets.page_next = button('Grand master and pages', 'Next page', `Page ▶\\n${v('page')}`, [
		{ actionId: 'page', options: { mode: 'next' } },
	])
	presets.prog_fade = button(
		'Grand master and pages',
		'Programmer fade',
		`Prog fade\\n${v('prog_fade')}`,
		[{ actionId: 'prog_fade', options: { mode: 'toggle', seconds: 2 } }],
		[],
		[{ feedbackId: 'prog_fade_on', options: {}, style: { bgcolor: COLORS.live, color: COLORS.black } }],
		{ style: { size: '14' } },
	)

	// Encoders: turn a knob (or rotary button) for the encoder bar's encoders; press for fine.
	for (let n = 1; n <= 5; n++) {
		presets[`encoder_${n}`] = {
			type: 'button',
			category: 'Encoders',
			name: `Encoder ${n}`,
			style: style(`${v(`encoder_${n}_name`)}\\n${v(`encoder_${n}_value`)}`, { size: '14' }),
			options: { rotaryActions: true },
			feedbacks: [],
			steps: [
				{
					down: [],
					up: [],
					rotate_left: [{ actionId: 'encoder', options: { encoder: n, steps: -1, fine: false } }],
					rotate_right: [{ actionId: 'encoder', options: { encoder: n, steps: 1, fine: false } }],
				},
			],
		}
	}
	return presets
}
