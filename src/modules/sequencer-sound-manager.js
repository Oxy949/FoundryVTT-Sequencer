import { sequencerSocket, SOCKET_HANDLERS } from "../sockets.js";
import SequencerAnimationEngine from "./sequencer-animation-engine.js";
import * as lib from "../lib/lib.js";
import SequenceManager from "./sequence-manager.js";
import { EffectsUIApp } from "../formapplications/effects-ui/effects-ui-app.js";
import * as canvaslib from "../lib/canvas-lib.js";

export default class SequencerSoundManager {
	/**
	 * Returns all the currently running sounds
	 *
	 * @returns {Array}
	 */
	static get sounds() {
		return Array.from(SequenceManager.RunningSounds.values());
	}

	/**
	 * Opens the Sequencer Manager with the sounds tab open
	 */
	static show() {
		return EffectsUIApp.show({ tab: "manager" });
	}

	/**
	 * Play an audio file.
	 *
	 * @param {Object} data The data that describes the audio to play.
	 * @param {boolean} [push=false] A flag indicating whether to make other clients play the audio, too.
	 * @returns {Number} A promise that resolves when the audio file has finished playing.
	 */
	static async play(data, push = true) {
		if (push)
			sequencerSocket.executeForOthers(SOCKET_HANDLERS.PLAY_SOUND, data);
		return this._play(data);
	}

	/**
	 * @param {Object} data
	 * @returns {Number}
	 * @private
	 */
	static async _play(data) {

		if (data.delete) return false;

		Hooks.callAll("createSequencerSound", data);

		lib.debug(`Playing sound:`, data);

		const playSound = game.settings.get("sequencer", "soundsEnabled") &&
			game.user.viewedScene === data.sceneId &&
			(!data?.users?.length || data?.users?.includes(game.userId));

		data.volume = playSound
			? (data.volume ?? 0.8) * game.settings.get("core", "globalInterfaceVolume")
			: 0.0;

		let sound;

		if(data.location){
			let location = fromUuidSync(data.location) ?? { x: 0, y: 0, width: canvas.grid.size, height: canvas.grid.size };
			if(data.offset){
				location.x += data.offset.x * (data.offset.gridUnits ? canvas.grid.size : 1);
				location.y += data.offset.y * (data.offset.gridUnits ? canvas.grid.size : 1);
			}
			if(data.randomOffset){
				location = canvaslib.get_random_offset(location, data.randomOffset);
			}
			sound = await canvas.sounds.playAtPosition(data.src, location, data.radius || 5, {
				gmAlways: false,
				walls: false,
				easing: true,
				muffledEffect: { type: "lowpass" },
				...data.locationOptions,
				volume: data.volume
			});
		}else {
			sound = await game.audio.play(data.src, {
				...data.locationOptions,
				volume: data.fadeIn ? 0 : data.volume,
				loop: data.loop,
				offset: data.startTime,
			});
		}

		if(!sound) return false;

		sound.sound_id = data.id;
		sound.sound_playing = playSound || game.user.isGM;

		SequenceManager.RunningSounds.add(data.id, sound);

		if (data.fadeIn && playSound) {
			SequencerAnimationEngine.addAnimation(data.id, {
				target: sound,
				propertyName: "volume",
				from: 0.0,
				to: data.volume,
				duration: Math.min(data.fadeIn.duration, data.duration),
				ease: data.fadeIn.ease,
				delay: Math.min(data.fadeIn.delay, data.duration),
			});
		}

		if (data.fadeOut && playSound) {
			SequencerAnimationEngine.addAnimation(data.id, {
				target: sound,
				propertyName: "volume",
				from: data.volume,
				to: 0.0,
				duration: Math.min(data.fadeOut.duration, data.duration),
				ease: data.fadeOut.ease,
				delay: Math.max(
					data.duration - data.fadeOut.duration + data.fadeOut.delay,
					0,
				),
			});
		}

		if (data.duration) {
			setTimeout(() => {
				sound.stop();
			}, data.duration);
		}

		new Promise((resolve) => {
			sound.addEventListener("stop", resolve);
			sound.addEventListener("end", resolve);
		}).then(() => {
			SequenceManager.RunningSounds.delete(data.id);
			Hooks.callAll("endedSequencerSound", data);
		});

		return data.duration;
	}

	static _validateFilters(inFilter) {

		if (inFilter?.sounds) {
			if (!Array.isArray(inFilter.sounds)) {
				inFilter.sounds = [inFilter.sounds];
			}
			inFilter.sounds = inFilter.sounds.map((sound) => {
				if (!(typeof sound === "string" || sound instanceof foundry.audio.Sound))
					throw lib.custom_error(
						"Sequencer",
						"SoundManager | collections in inFilter.sounds must be of type string or Sound",
					);
				if (sound instanceof foundry.audio.Sound) return sound.sound_id;
				return sound;
			});
		}

		if (inFilter?.name && typeof inFilter?.name !== "string")
			throw lib.custom_error(
				"Sequencer",
				"SoundManager | inFilter.name must be of type string",
			);

		if (inFilter?.sceneId) {
			if (typeof inFilter.sceneId !== "string")
				throw lib.custom_error(
					"Sequencer",
					"SoundManager | inFilter.sceneId must be of type string",
				);
			if (!game.scenes.get(inFilter.sceneId))
				throw lib.custom_error(
					"Sequencer",
					"SoundManager | inFilter.sceneId must be a valid scene id (could not find scene)",
				);
		} else {
			inFilter.sceneId = game.user.viewedScene;
		}

		if (inFilter?.origin && typeof inFilter?.origin !== "string")
			throw lib.custom_error(
				"Sequencer",
				"SoundManager | inFilter.origin must be of type string",
			);

		if (
			!inFilter.sounds &&
			!inFilter.name &&
			!inFilter.sceneId &&
			!inFilter.origin
		) {
			return false;
		}

		return foundry.utils.mergeObject(
			{
				sounds: false,
				name: false,
				sceneId: false,
				origin: false,
			},
			inFilter,
		);
	}

	static _filterSounds(inFilter) {
		if (inFilter.name) {
			inFilter.name = new RegExp(
				lib.str_to_search_regex_str(lib.safe_str(inFilter.name)),
				"gu",
			);
		}
		return this.sounds.filter((sound) => {
			return (
				(!inFilter.sounds || inFilter.sounds.includes(sound.sound_id)) &&
				(!inFilter.name || (sound.data.name && sound.data.name.match(inFilter.name)?.length)) &&
				(!inFilter.origin || inFilter.origin === sound.data.origin)
			);
		});
	}

	static getSounds(inFilter = {}) {
		const filters = this._validateFilters(inFilter);
		if (!inFilter)
			throw lib.custom_error(
				"Sequencer",
				"SoundManager | getSounds | Incorrect or incomplete parameters provided",
			);
		return this._filterSounds(filters);
	}

	static stop(ids) {
		lib.custom_warning(
			"Sequencer",
			"SoundManager | stop | This method is becoming deprecated, please use Sequencer.SoundManager.endSounds instead",
			false,
		);
		return this.endSounds({ sounds: ids });
	}

	static endSounds(inFilter, push = true) {
		const filters = this._validateFilters(inFilter);
		const sounds = this._filterSounds(filters);
		if (!sounds?.length) return;
		const ids = sounds.map(sound => sound.sound_id);
		if (push && game.user.isGM) {
			sequencerSocket.executeForOthers(SOCKET_HANDLERS.END_SOUNDS, ids);
		}
		return this._endSounds(ids);
	}

	/**
	 * @param ids
	 * @private
	 */
	static _endSounds(ids) {
		for (const id of ids) {
			const sound = SequenceManager.RunningSounds.get(id);
			if (sound) {
				sound.stop();
			}
		}
	}

	static endAllSounds(push = true) {
		const ids = SequenceManager.RunningSounds.values();
		if (push && game.user.isGM) {
			sequencerSocket.executeForOthers(SOCKET_HANDLERS.END_SOUNDS, ids);
		}
		return this._endSounds(ids);
	}
}
