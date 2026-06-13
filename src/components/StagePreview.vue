<template>
  <div class="stage-preview" :class="{ 'drum-flash': playbackStore.drumFlash }">
    <div class="stage-header">
      <n-space align="center" justify="space-between" style="width: 100%;">
        <n-space align="center">
          <n-icon size="18" :color="'#C0392B'"><component :is="PlayCircleOutlined" /></n-icon>
          <n-text strong style="color: #F5F0EB; font-size: 14px; letter-spacing: 1px;">舞台预演</n-text>
          <transition name="rehearsal-indicator">
            <n-tag v-if="playbackStore.isPlaying" size="tiny" round :bordered="false" type="error" class="rehearsal-tag">
              ● 预演中
            </n-tag>
          </transition>
        </n-space>
        <n-space align="center" size="small">
          <n-tag size="tiny" round :bordered="false" type="info" v-if="playbackStore.currentBackdrop">
            🏞️ {{ playbackStore.currentBackdrop.name }}
          </n-tag>
          <n-tag size="tiny" round :bordered="false" type="warning">
            💡 {{ playbackStore.currentBrightness }}%
          </n-tag>
          <n-tag size="tiny" round :bordered="false" type="success" v-if="playbackStore.stageCharacterList.length > 0">
            🎭 {{ playbackStore.stageCharacterList.length }}
          </n-tag>
          <n-tag v-if="playbackStore.conflictPositions.size > 0" size="tiny" round :bordered="false" type="error">
            ⚠️ 冲突
          </n-tag>
        </n-space>
      </n-space>
    </div>

    <div class="stage-canvas" :style="stageStyle">
      <transition name="backdrop-fade" mode="out-in">
        <div class="stage-backdrop" :key="playbackStore.currentBackdropId">
          <div class="backdrop-icon" v-if="playbackStore.currentBackdrop">
            <span class="backdrop-emoji">{{ playbackStore.currentBackdrop.icon }}</span>
            <span class="backdrop-name">{{ playbackStore.currentBackdrop.name }}</span>
          </div>
          <div class="backdrop-placeholder" v-else>
            <span class="placeholder-text">— 幕景未设置 —</span>
          </div>
        </div>
      </transition>

      <div class="lighting-overlay" :style="lightingStyle">
        <div class="spotlight-effect" :style="spotlightStyle" v-if="playbackStore.currentBrightness > 60"></div>
      </div>

      <div class="position-zone zone-upper" data-position="upper">
        <span class="zone-label">上幕位</span>
        <div class="characters-container">
          <div
            v-for="ch in charactersByPosition.upper"
            :key="ch.resourceId"
            class="character-bubble"
            :class="{ 'conflict-char': playbackStore.conflictPositions.has(ch.resourceId) }"
            :style="characterBubbleStyle"
          >
            <span class="char-icon">{{ ch.icon }}</span>
            <span class="char-name">{{ ch.name }}</span>
            <transition name="position-indicator">
              <span v-if="playbackStore.isPlaying" class="move-trail"></span>
            </transition>
          </div>
        </div>
      </div>

      <div class="position-row middle-row">
        <div class="position-zone zone-left" data-position="left">
          <span class="zone-label">左幕位</span>
          <div class="characters-container">
            <div
              v-for="ch in charactersByPosition.left"
              :key="ch.resourceId"
              class="character-bubble"
              :class="{ 'conflict-char': playbackStore.conflictPositions.has(ch.resourceId) }"
              :style="characterBubbleStyle"
            >
              <span class="char-icon">{{ ch.icon }}</span>
              <span class="char-name">{{ ch.name }}</span>
              <transition name="position-indicator">
                <span v-if="playbackStore.isPlaying" class="move-trail"></span>
              </transition>
            </div>
          </div>
        </div>

        <div class="position-zone zone-center" data-position="center">
          <span class="zone-label">中幕位</span>
          <div class="characters-container">
            <div
              v-for="ch in charactersByPosition.center"
              :key="ch.resourceId"
              class="character-bubble center-char"
              :class="{ 'conflict-char': playbackStore.conflictPositions.has(ch.resourceId) }"
              :style="characterBubbleStyle"
            >
              <span class="char-icon">{{ ch.icon }}</span>
              <span class="char-name">{{ ch.name }}</span>
              <transition name="position-indicator">
                <span v-if="playbackStore.isPlaying" class="move-trail"></span>
              </transition>
            </div>
          </div>
        </div>

        <div class="position-zone zone-right" data-position="right">
          <span class="zone-label">右幕位</span>
          <div class="characters-container">
            <div
              v-for="ch in charactersByPosition.right"
              :key="ch.resourceId"
              class="character-bubble"
              :class="{ 'conflict-char': playbackStore.conflictPositions.has(ch.resourceId) }"
              :style="characterBubbleStyle"
            >
              <span class="char-icon">{{ ch.icon }}</span>
              <span class="char-name">{{ ch.name }}</span>
              <transition name="position-indicator">
                <span v-if="playbackStore.isPlaying" class="move-trail"></span>
              </transition>
            </div>
          </div>
        </div>
      </div>

      <div class="position-zone zone-lower" data-position="lower">
        <span class="zone-label">下幕位</span>
        <div class="characters-container">
          <div
            v-for="ch in charactersByPosition.lower"
            :key="ch.resourceId"
            class="character-bubble"
            :class="{ 'conflict-char': playbackStore.conflictPositions.has(ch.resourceId) }"
            :style="characterBubbleStyle"
          >
            <span class="char-icon">{{ ch.icon }}</span>
            <span class="char-name">{{ ch.name }}</span>
            <transition name="position-indicator">
              <span v-if="playbackStore.isPlaying" class="move-trail"></span>
            </transition>
          </div>
        </div>
      </div>

      <transition name="narration-fade">
        <div v-if="playbackStore.narrationVisible && playbackStore.currentNarration" class="narration-bar">
          <span class="narration-label">旁白</span>
          <span class="narration-text">{{ playbackStore.currentNarration }}</span>
          <div class="narration-progress" v-if="playbackStore.isPlaying">
            <div class="narration-progress-bar"></div>
          </div>
        </div>
      </transition>

      <transition name="drum-flash-overlay">
        <div v-if="playbackStore.drumFlash" class="drum-flash-layer">
          <span class="drum-emoji">🥁</span>
          <div class="drum-ripple"></div>
        </div>
      </transition>

      <div class="playback-progress" v-if="playbackStore.isPlaying || playbackStore.currentTime > 0">
        <div class="progress-bar" :style="{ width: playbackStore.progressPercent + '%' }"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { PlayCircleOutlined } from '@vicons/antd'
import { NIcon, NSpace, NTag, NText } from 'naive-ui'
import { usePlaybackStore, type CharacterOnStage } from '@/stores/playback'
import type { StagePosition } from '@/types'

const playbackStore = usePlaybackStore()

const stageStyle = computed(() => ({
  background: playbackStore.currentBackdrop ? '#3d2817' : '#2a1a0f',
}))

const lightingStyle = computed(() => {
  const brightness = playbackStore.currentBrightness
  const opacity = 1 - brightness / 100
  return {
    background: `rgba(0, 0, 0, ${opacity * 0.85})`,
    transition: 'background 0.5s ease',
  }
})

const spotlightStyle = computed(() => {
  const brightness = playbackStore.currentBrightness
  const intensity = (brightness - 60) / 40
  return {
    opacity: intensity * 0.3,
  }
})

const characterBubbleStyle = computed(() => ({
  transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
}))

const charactersByPosition = computed<Record<StagePosition, CharacterOnStage[]>>(() => {
  const result: Record<StagePosition, CharacterOnStage[]> = {
    left: [],
    center: [],
    right: [],
    upper: [],
    lower: [],
  }
  for (const ch of playbackStore.stageCharacterList) {
    if (result[ch.position]) {
      result[ch.position].push(ch)
    }
  }
  return result
})
</script>

<style scoped>
.stage-preview {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: linear-gradient(180deg, #1a1a2e 0%, #20203a 100%);
  border-radius: 8px;
  overflow: hidden;
  position: relative;
}

.stage-preview.drum-flash {
  box-shadow: 0 0 30px rgba(230, 126, 34, 0.6), 0 0 60px rgba(230, 126, 34, 0.2);
}

.stage-header {
  padding: 10px 16px;
  background: rgba(0, 0, 0, 0.3);
  border-bottom: 1px solid rgba(192, 57, 43, 0.3);
  flex-shrink: 0;
}

.rehearsal-tag {
  animation: rehearsalPulse 1.5s ease-in-out infinite;
}

@keyframes rehearsalPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.rehearsal-indicator-enter-active,
.rehearsal-indicator-leave-active {
  transition: all 0.3s ease;
}

.rehearsal-indicator-enter-from,
.rehearsal-indicator-leave-to {
  opacity: 0;
  transform: scale(0.8);
}

.stage-canvas {
  flex: 1;
  position: relative;
  overflow: hidden;
  margin: 12px;
  border-radius: 6px;
  border: 2px solid rgba(212, 165, 116, 0.4);
  box-shadow: inset 0 0 40px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  transition: background 0.5s ease;
}

.stage-backdrop {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 0;
}

.backdrop-icon {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  opacity: 0.3;
}

.backdrop-emoji {
  font-size: 64px;
}

.backdrop-name {
  color: #D4A574;
  font-size: 14px;
  letter-spacing: 4px;
}

.backdrop-placeholder {
  opacity: 0.2;
}

.placeholder-text {
  color: #666;
  font-size: 12px;
  letter-spacing: 2px;
}

.backdrop-fade-enter-active,
.backdrop-fade-leave-active {
  transition: opacity 0.6s ease;
}

.backdrop-fade-enter-from,
.backdrop-fade-leave-to {
  opacity: 0;
}

.lighting-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1;
  pointer-events: none;
}

.spotlight-effect {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 200px;
  height: 200px;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 248, 220, 0.6) 0%, transparent 70%);
  transition: opacity 0.5s ease;
}

.position-zone {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 4px 8px;
  min-height: 36px;
}

.zone-label {
  font-size: 10px;
  color: rgba(212, 165, 116, 0.5);
  letter-spacing: 1px;
  margin-bottom: 2px;
}

.characters-container {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px;
}

.character-bubble {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: linear-gradient(135deg, #C0392B 0%, #922B21 100%);
  padding: 4px 8px;
  border-radius: 12px;
  border: 1px solid rgba(212, 165, 116, 0.5);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  min-width: 44px;
  position: relative;
}

.character-bubble.center-char {
  background: linear-gradient(135deg, #D4A574 0%, #B8860B 100%);
  transform: scale(1.1);
}

.character-bubble.conflict-char {
  border-color: #ff4d4f;
  box-shadow: 0 0 0 2px rgba(255, 77, 79, 0.5), 0 2px 8px rgba(0, 0, 0, 0.3);
  animation: conflictBlink 1s ease-in-out infinite;
}

@keyframes conflictBlink {
  0%, 100% { box-shadow: 0 0 0 2px rgba(255, 77, 79, 0.5), 0 2px 8px rgba(0, 0, 0, 0.3); }
  50% { box-shadow: 0 0 0 4px rgba(255, 77, 79, 0.8), 0 2px 16px rgba(255, 77, 79, 0.4); }
}

.move-trail {
  position: absolute;
  top: -2px;
  left: -2px;
  right: -2px;
  bottom: -2px;
  border-radius: 14px;
  border: 1px solid rgba(212, 165, 116, 0.6);
  animation: moveTrailFade 0.8s ease-out infinite;
}

@keyframes moveTrailFade {
  0% { opacity: 1; transform: scale(1); }
  100% { opacity: 0; transform: scale(1.15); }
}

.position-indicator-enter-active {
  transition: opacity 0.3s ease;
}

.position-indicator-leave-active {
  transition: opacity 0.5s ease;
}

.position-indicator-enter-from,
.position-indicator-leave-to {
  opacity: 0;
}

.char-icon {
  font-size: 18px;
  line-height: 1;
}

.char-name {
  font-size: 10px;
  color: #fff;
  margin-top: 2px;
  white-space: nowrap;
}

.position-row {
  display: flex;
  flex: 1;
  min-height: 0;
}

.middle-row {
  align-items: stretch;
}

.zone-left,
.zone-center,
.zone-right {
  flex: 1;
  justify-content: center;
}

.zone-left {
  border-right: 1px dashed rgba(212, 165, 116, 0.15);
}

.zone-right {
  border-left: 1px dashed rgba(212, 165, 116, 0.15);
}

.zone-upper {
  border-bottom: 1px dashed rgba(212, 165, 116, 0.15);
  padding-top: 8px;
}

.zone-lower {
  border-top: 1px dashed rgba(212, 165, 116, 0.15);
  padding-bottom: 8px;
}

.narration-bar {
  position: absolute;
  left: 50%;
  bottom: 16px;
  transform: translateX(-50%);
  background: rgba(26, 26, 46, 0.95);
  border: 1px solid rgba(192, 57, 43, 0.6);
  border-radius: 20px;
  padding: 8px 20px;
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: 80%;
  z-index: 10;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

.narration-label {
  background: #C0392B;
  color: #fff;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  flex-shrink: 0;
}

.narration-text {
  color: #F5F0EB;
  font-size: 13px;
  line-height: 1.5;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  animation: narrationTyping 0.5s ease-out;
}

@keyframes narrationTyping {
  from { opacity: 0; transform: translateX(-10px); }
  to { opacity: 1; transform: translateX(0); }
}

.narration-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: rgba(255, 255, 255, 0.1);
}

.narration-progress-bar {
  height: 100%;
  background: #C0392B;
  animation: narrationProgress 5s linear forwards;
}

@keyframes narrationProgress {
  from { width: 0%; }
  to { width: 100%; }
}

.narration-fade-enter-active,
.narration-fade-leave-active {
  transition: all 0.3s ease;
}

.narration-fade-enter-from,
.narration-fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(10px);
}

.drum-flash-layer {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(230, 126, 34, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 5;
  pointer-events: none;
}

.drum-emoji {
  font-size: 48px;
  animation: drumBeat 0.3s ease;
}

.drum-ripple {
  position: absolute;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  border: 3px solid rgba(230, 126, 34, 0.6);
  animation: drumRipple 0.6s ease-out;
}

@keyframes drumBeat {
  0% { transform: scale(0.5); opacity: 0; }
  50% { transform: scale(1.3); opacity: 1; }
  100% { transform: scale(1); opacity: 0; }
}

@keyframes drumRipple {
  0% { transform: scale(0.3); opacity: 1; }
  100% { transform: scale(2); opacity: 0; }
}

.drum-flash-overlay-enter-active,
.drum-flash-overlay-leave-active {
  transition: opacity 0.15s ease;
}

.drum-flash-overlay-enter-from,
.drum-flash-overlay-leave-to {
  opacity: 0;
}

.playback-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: rgba(0, 0, 0, 0.3);
  z-index: 8;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #C0392B, #E74C3C);
  transition: width 0.1s linear;
  border-radius: 0 2px 2px 0;
  box-shadow: 0 0 6px rgba(192, 57, 43, 0.5);
}
</style>
