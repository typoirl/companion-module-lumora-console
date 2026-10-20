import { combineRgb } from '@companion-module/base'

export const COLORS = {
	live: combineRgb(232, 168, 58), // Lumora's amber
	running: combineRgb(40, 120, 70),
	alert: combineRgb(200, 50, 40),
	black: combineRgb(0, 0, 0),
	white: combineRgb(255, 255, 255),
	panel: combineRgb(28, 32, 40),
}

const executorOption = {
	type: 'number',
	id: 'executor',
	label: 'Executor (on the current page)',
	default: 201,
	min: 101,
	max: 499,
}

export function feedbackDefinitions(self) {
	const exec = (fb) => self.state.execs.get(Number(fb.options.executor))
	return {
		exec_button_lit: {
			type: 'boolean',
			name: 'Executor: key lit',
			description: "One of an executor's keys is lit (its playback on, a Flash held, a Toggle on…)",
			defaultStyle: { bgcolor: COLORS.live, color: COLORS.black },
			options: [
				executorOption,
				{
					type: 'dropdown',
					id: 'button',
					label: 'Key',
					default: 1,
					choices: [
						{ id: 1, label: 'Key 1' },
						{ id: 2, label: 'Key 2' },
						{ id: 3, label: 'Key 3' },
					],
				},
			],
			callback: (fb) => !!exec(fb)?.buttons[Number(fb.options.button) - 1],
		},
		exec_running: {
			type: 'boolean',
			name: 'Executor: a cue is live',
			defaultStyle: { bgcolor: COLORS.running, color: COLORS.white },
			options: [executorOption],
			callback: (fb) => !!exec(fb)?.cue,
		},
		exec_fader_above: {
			type: 'boolean',
			name: 'Executor: fader above a level',
			defaultStyle: { bgcolor: COLORS.live, color: COLORS.black },
			options: [executorOption, { type: 'number', id: 'level', label: 'Above (%)', default: 0, min: 0, max: 100 }],
			callback: (fb) => (exec(fb)?.fader ?? 0) * 100 > Number(fb.options.level),
		},
		blackout_on: {
			type: 'boolean',
			name: 'Blackout is on',
			defaultStyle: { bgcolor: COLORS.alert, color: COLORS.white },
			options: [],
			callback: () => self.state.blackout,
		},
		grand_master_below: {
			type: 'boolean',
			name: 'Grand master below a level',
			defaultStyle: { bgcolor: COLORS.alert, color: COLORS.white },
			options: [{ type: 'number', id: 'level', label: 'Below (%)', default: 100, min: 0, max: 100 }],
			callback: (fb) => self.state.gm * 100 < Number(fb.options.level) - 0.5,
		},
		prog_fade_on: {
			type: 'boolean',
			name: 'Programmer fade is on',
			defaultStyle: { bgcolor: COLORS.live, color: COLORS.black },
			options: [],
			callback: () => self.state.progFade > 0,
		},
		page_is: {
			type: 'boolean',
			name: 'Executor page is',
			defaultStyle: { bgcolor: COLORS.live, color: COLORS.black },
			options: [{ type: 'number', id: 'page', label: 'Page', default: 1, min: 1, max: 9999 }],
			callback: (fb) => self.state.page === Number(fb.options.page),
		},
	}
}
