
export function createSpeechController({ stateManager, UI }) {
  function initSpeech() {
    console.log("Speech controller initialized");
  }
  function startRecognition() {
    console.log("Speech recognition started");
  }
  function stopRecognition() {
    console.log("Speech recognition stopped");
  }
  return {
    initSpeech,
    startRecognition,
    stopRecognition
  };
}
