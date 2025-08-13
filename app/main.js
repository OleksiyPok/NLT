"use strict";
import { Voices } from "../modules/voices.js";
import { Speech } from "../modules/speech.js";
import { Config } from "../modules/config.js";
import { Utils } from "../modules/utils.js";
import { Storage } from "../modules/storage.js";
import { createUI } from "../modules/ui.js";
import { createHandlers } from "../modules/handlers.js";
import { createKeyboard } from "../modules/keyboard.js";
import { createWakeLock } from "../modules/wakelock.js";
import { createApp } from "./app.js";
import { createState } from "./state.js";
import { createNLTApp } from "./nltapp.js";

const NLTApp = createNLTApp({ Voices, Speech, Config, Utils, Storage, createUI, createHandlers, createKeyboard, createWakeLock, createApp, createState });
NLTApp.init();
