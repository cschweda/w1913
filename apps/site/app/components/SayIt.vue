<script setup lang="ts">
// "Say it": the word spoken by the visitor's own device (Web Speech API).
// Nothing is fetched or sent; it works offline. The 1913 text has no
// reliable pronunciations, so this is the device's reading of the spelling,
// and the caption says so. Hidden where speech is unavailable.
const props = defineProps<{ word: string }>();

const supported = ref(false);
const speaking = ref(false);
let voice: SpeechSynthesisVoice | null = null;

/** Rule: prefer a local English voice (en-US, then en-GB, then any en-*); otherwise the default voice. */
function pickVoice() {
  const voices = window.speechSynthesis.getVoices();
  const en = voices.filter((v) => /^en(-|_|$)/i.test(v.lang));
  voice =
    en.find((v) => /en[-_]US/i.test(v.lang) && v.localService) ??
    en.find((v) => /en[-_]GB/i.test(v.lang) && v.localService) ??
    en.find((v) => v.localService) ??
    en[0] ??
    null;
}

onMounted(() => {
  if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") return;
  supported.value = true;
  pickVoice();
  window.speechSynthesis.addEventListener?.("voiceschanged", pickVoice);
});
onBeforeUnmount(() => {
  if (supported.value) {
    window.speechSynthesis.removeEventListener?.("voiceschanged", pickVoice);
    window.speechSynthesis.cancel();
  }
});

function say() {
  const synth = window.speechSynthesis;
  if (speaking.value) { synth.cancel(); speaking.value = false; return; }
  synth.cancel();
  const u = new SpeechSynthesisUtterance(props.word);
  if (voice) u.voice = voice;
  u.lang = voice?.lang ?? "en-US";
  u.rate = 0.85;
  u.onend = u.onerror = () => { speaking.value = false; };
  speaking.value = true;
  synth.speak(u);
}
</script>

<template>
  <div v-if="supported" class="say">
    <button type="button" :class="['btn', 'sayb', { on: speaking }]" @click="say">
      <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" width="20" height="20">
        <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" />
        <path v-if="!speaking" d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        <path v-else d="M16 9h2v6h-2zM20 9h2v6h-2z" fill="currentColor" />
      </svg>
      <span>{{ speaking ? "Stop" : "Say it" }}</span>
    </button>
    <span class="cap">your device's voice</span>
  </div>
</template>

<style scoped>
.say { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 14px; margin: 0 0 16px; }
.sayb { display: inline-flex; align-items: center; gap: 8px; font-size: 16px; font-weight: 700; }
.sayb.on { border-color: var(--ac); color: var(--ac); }
</style>
