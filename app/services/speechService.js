"use strict";
/**
 * Speech service: wraps modules/speech.js and voices.js to provide a clean API.
 * This file does not change existing modules; it only composes them.
 */
import { Speech } from "../../modules/speech.js";
import { Voices } from "../../modules/voices.js";
import { Logger } from "../core/logger.js";
import { SpeechError } from "../core/errors.js";

export function createSpeechService() {
  function getVoices() {
    try { return Voices.getAll(); }
    catch (e) { Logger.error("Voices.getAll failed", e); throw new SpeechError("Voices unavailable", e); }
  }

  function speak(text, options = {}) {
    try { return Speech.speak(text, options); }
    catch (e) { Logger.error("Speech.speak failed", e); throw new SpeechError("Speak failed", e); }
  }

  function stop() {
    try { return Speech.stop(); }
    catch (e) { Logger.error("Speech.stop failed", e); }
  }

  function isSpeaking() {
    try { return Speech.isSpeaking(); }
    catch { return false; }
  }

  return { getVoices, speak, stop, isSpeaking };
}
