<template>
  <section class="comments-root" aria-label="Comments section">
    <section class="composer-row" aria-label="Add comment">
      <img
        :src="userPhoto"
        alt="User avatar"
        class="composer-avatar"
      />

      <div class="composer-wrap">
        <div
          class="composer-input-shell"
          :class="isComposerActive ? 'py-1.5 min-h-[56px]' : 'py-1.5 min-h-[42px]'"
        >
          <button
            v-if="isComposerActive"
            type="button"
            class="composer-close"
            aria-label="Close comment composer"
            @click="closeComposer"
          >
            ✕
          </button>

          <input
            v-model="newCommentText"
            class="composer-input"
            :class="isComposerActive ? 'pr-6' : ''"
            type="text"
            placeholder="Add a comment"
            @focus="isComposerActive = true"
            @keydown.enter="submitComment"
          />
        </div>

        <div v-if="isComposerActive" class="composer-actions">
          <button
            type="button"
            class="send-btn"
            :disabled="!newCommentText.trim()"
            @click="submitComment"
          >
            Send
          </button>
        </div>
      </div>
    </section>

    <div class="tabs-wrap">
      <!-- mobile dropdown -->
      <div class="mobile-tabs">
        <button
          type="button"
          class="mobile-tabs-trigger"
          style="box-shadow: inset 0 -4px 0 #000;"
          @click="tabDropdownOpen = !tabDropdownOpen"
        >
          {{ activeTab }}
          <svg class="w-3 h-3 transition-transform" :class="tabDropdownOpen ? 'rotate-180' : ''" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
        </button>
        <div
          v-if="tabDropdownOpen"
          class="mobile-tabs-menu"
        >
          <button
            v-for="tab in tabs"
            :key="tab"
            type="button"
            class="mobile-tabs-item"
            :class="tab === activeTab ? 'text-black' : 'text-[#8b94a6]'"
            @click="activeTab = tab; tabDropdownOpen = false"
          >{{ tab }}</button>
        </div>
      </div>
      <!-- desktop tabs -->
      <nav
        class="desktop-tabs"
        aria-label="Comment sort options"
      >
        <button
          v-for="tab in tabs"
          :key="tab"
          type="button"
          class="desktop-tab"
          :class="tab === activeTab ? 'text-black' : 'text-[#8b94a6] hover:text-black hover:border-black'"
          :style="tab === activeTab ? 'box-shadow: inset 0 -4px 0 #000;' : ''"
          @click="activeTab = tab"
        >{{ tab }}</button>
      </nav>
    </div>

    <section class="comments-list" aria-label="Comments list">
      <Comment
        v-for="comment in sortedComments"
        :key="comment.id"
        :comment="comment"
        @like="likeComment"
        @save-edit="saveEdit"
        @add-reply="addReply"
      />
    </section>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue';
import Comment from './Comment.vue';
import initialComments from '../data/comments.json';
import userPhoto from '../../images/userphoto.jpg';

const activeTab = ref('Newest');
const tabs = ['Newest', 'Oldest', 'Popular'];
const newCommentText = ref('');
const isComposerActive = ref(false);
const tabDropdownOpen = ref(false);

const parseCommentDate = (value) => {
  const trimmed = String(value || '').trim();

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    const [day, month, year] = trimmed.split('/').map(Number);
    return new Date(year, month - 1, day).getTime();
  }

  if (/^\d{4}$/.test(trimmed)) {
    return new Date(Number(trimmed), 0, 1).getTime();
  }

  const parsed = Date.parse(trimmed);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const comments = ref(
  initialComments.map((c) => ({
    ...c,
    likedByMe: false,
    replies: c.replies || [],
    createdAt: parseCommentDate(c.date),
  })),
);

const sortedComments = computed(() => {
  if (activeTab.value === 'Popular') {
    return [...comments.value].sort((a, b) => b.likes - a.likes);
  }

  if (activeTab.value === 'Oldest') {
    return [...comments.value].sort((a, b) => a.createdAt - b.createdAt);
  }

  return [...comments.value].sort((a, b) => b.createdAt - a.createdAt);
});

const submitComment = () => {
  const text = newCommentText.value.trim();
  if (!text) return;

  const now = Date.now();

  const nextId = comments.value.length ? Math.max(...comments.value.map((c) => c.id)) + 1 : 1;

  comments.value.unshift({
    id: nextId,
    name: 'You',
    date: new Date().toLocaleDateString('en-GB'),
    createdAt: now,
    likes: 0,
    likedByMe: false,
    text,
    isMine: true,
    replies: [],
  });

  newCommentText.value = '';
  isComposerActive.value = false;
};

const closeComposer = () => {
  isComposerActive.value = false;
  newCommentText.value = '';
};

const likeComment = (id) => {
  const target = comments.value.find((c) => c.id === id);
  if (!target) return;
  if (target.likedByMe) {
    target.likes = Math.max(0, target.likes - 1);
    target.likedByMe = false;
    return;
  }

  target.likes += 1;
  target.likedByMe = true;
};

const saveEdit = ({ id, text }) => {
  const target = comments.value.find((c) => c.id === id && c.isMine);
  if (!target) return;
  target.text = text;
};

const addReply = ({ id, text }) => {
  const target = comments.value.find((c) => c.id === id);
  if (!target || !text.trim()) return;

  const nextReplyId = target.replies.length
    ? Math.max(...target.replies.map((r) => r.id)) + 1
    : id * 100;

  target.replies.push({
    id: nextReplyId,
    name: 'You',
    date: new Date().toLocaleDateString('en-GB'),
    text: text.trim(),
  });
};
</script>

<style scoped>
.comments-root {
  @apply mt-[26px] pt-2 w-[min(1205px,100%)] mx-auto;
}

.composer-row {
  @apply mt-3.5 flex items-start gap-3;
}

.composer-avatar {
  @apply w-14 h-14 rounded-full object-cover shrink-0 border border-[#d8e0ea];
}

.composer-wrap {
  @apply relative flex-1;
}

.composer-input-shell {
  @apply relative border-[1px] border-[#ccc] rounded-none bg-white px-3 transition-all duration-150;
}

.composer-close {
  @apply absolute right-2 top-1 text-[#94a3b8] hover:text-[#475569] text-[0.72rem] leading-none;
}

.composer-input {
  @apply w-full h-5 border-none outline-none font-[inherit] text-[0.92rem] leading-5 text-gray-900 placeholder:text-gray-400 bg-transparent;
}

.composer-actions {
  @apply mt-2 flex justify-end;
}

.send-btn {
  @apply py-3 px-10 border border-black bg-black text-white text-[0.9rem] font-semibold disabled:bg-[#cbd5e1] disabled:border-[#cbd5e1] disabled:text-white disabled:cursor-not-allowed;
}

.tabs-wrap {
  @apply mt-2;
}

.mobile-tabs {
  @apply sm:hidden relative border-b-2 border-[#d1d8e2];
}

.mobile-tabs-trigger {
  @apply border-none bg-transparent px-3 pb-1 text-[0.92rem] font-semibold cursor-pointer text-black relative -mb-[2px] flex items-center gap-1;
}

.mobile-tabs-menu {
  @apply absolute left-0 top-full mt-1 bg-white border border-[#d1d8e2] rounded shadow-md z-20 min-w-[120px];
}

.mobile-tabs-item {
  @apply w-full text-left px-4 py-2 text-[0.92rem] font-semibold cursor-pointer hover:bg-[#f1f5f9] transition-colors;
}

.desktop-tabs {
  @apply hidden sm:flex items-center gap-0 border-b-2 border-[#d1d8e2];
}

.desktop-tab {
  @apply border-none bg-transparent px-3 pb-1 text-[0.92rem] font-semibold cursor-pointer transition-colors hover:text-black relative -mb-[2px] border-b-4 border-transparent;
}

.comments-list {
  @apply mt-0 grid;
}
</style>
